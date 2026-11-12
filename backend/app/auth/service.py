import logging
import uuid
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.auth import repository
from app.auth.dependencies import AuthContext
from app.auth.email import EmailSender
from app.auth.models import OneTimeToken, RefreshSession, RevokeReason, TokenPurpose
from app.core.clock import utcnow
from app.core.config import Settings
from app.core.exceptions import (
    AccountSuspendedError,
    EmailTakenError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidResetTokenError,
    PasswordUnchangedError,
    RefreshConflictError,
    WrongPasswordError,
)
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    needs_rehash,
    new_opaque_token,
    verify_dummy,
    verify_password,
)
from app.users import repository as users_repo
from app.users.models import RoleName, User, UserStatus

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


@dataclass(frozen=True)
class LoginResult:
    user: User
    access_token: str
    expires_in: int
    refresh_token: str


@dataclass(frozen=True)
class RefreshResult:
    access_token: str
    expires_in: int
    refresh_token: str


# ----------------------------------------------------------------------------- registration


async def register_user(db: AsyncSession, *, email: str, password: str, full_name: str) -> User:
    password_hash = await hash_password(password)
    role = await users_repo.get_role_by_name(db, RoleName.CANDIDATE.value)
    if role is None:  # the migration seeds roles; a missing one is a deployment error
        raise RuntimeError("Role 'candidate' is missing; run `alembic upgrade head`.")
    user = User(email=email, password_hash=password_hash, full_name=full_name)
    user.roles = [role]  # public registration only ever grants the candidate role
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if "uq_users_email" in str(exc.orig):
            raise EmailTakenError from exc
        raise
    return user


# ----------------------------------------------------------------------------- login


async def _create_session(
    db: AsyncSession, settings: Settings, user_id: uuid.UUID, client: ClientInfo
) -> tuple[RefreshSession, str]:
    now = utcnow()
    raw, token_hash = new_opaque_token()
    absolute = now + timedelta(days=settings.session_absolute_ttl_days)
    expires = min(now + timedelta(days=settings.refresh_token_ttl_days), absolute)
    session = RefreshSession(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires,
        absolute_expires_at=absolute,
        user_agent=client.user_agent,
        ip_address=client.ip,
    )
    await repository.add_session(db, session)
    return session, raw


async def login(
    db: AsyncSession, settings: Settings, *, email: str, password: str, client: ClientInfo
) -> LoginResult:
    now = utcnow()
    user = await users_repo.get_by_email(db, email)

    # Every failure below returns the same generic error, after doing comparable work,
    # so neither the message nor the response time reveals whether the account exists.
    if user is None:
        await verify_dummy(password)
        raise InvalidCredentialsError
    if user.locked_until is not None and user.locked_until > now:
        await verify_dummy(password)
        raise InvalidCredentialsError
    if not await verify_password(user.password_hash, password):
        locked = await users_repo.register_failed_login(
            db,
            user.id,
            settings.max_failed_logins,
            now + timedelta(minutes=settings.lockout_minutes),
        )
        await db.commit()
        if locked:
            logger.warning("Account locked after repeated failed logins user_id=%s", user.id)
        raise InvalidCredentialsError

    if user.status != UserStatus.ACTIVE.value:  # only revealed once the password is correct
        raise AccountSuspendedError

    assert user.password_hash is not None  # verified above  # noqa: S101
    if needs_rehash(user.password_hash):  # parameters were strengthened since this was stored
        user.password_hash = await hash_password(password)
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    session, raw_refresh = await _create_session(db, settings, user.id, client)
    await db.commit()
    access, expires_in = create_access_token(
        user_id=user.id, session_id=session.id, settings=settings, now=now
    )
    return LoginResult(user, access, expires_in, raw_refresh)


# ----------------------------------------------------------------------------- refresh


async def refresh_session(db: AsyncSession, settings: Settings, raw_token: str) -> RefreshResult:
    """Rotate the refresh token in one transaction.

    The session row is locked (SELECT ... FOR UPDATE) so two concurrent refreshes with the
    same token cannot both succeed.
    """
    now = utcnow()
    token_hash = hash_token(raw_token)
    session = await repository.get_session_by_token_hash(db, token_hash, for_update=True)

    if session is None:
        # Not the current token. It may be the *previous* one: either a harmless race between
        # two tabs (within the grace window) or a replay of a stolen, already-rotated token.
        old = await repository.get_session_by_previous_hash(db, token_hash, for_update=True)
        if old is None or old.revoked_at is not None:
            raise InvalidRefreshTokenError
        assert old.rotated_at is not None  # guaranteed by ck_refresh_sessions_rotation_consistent  # noqa: S101
        if now - old.rotated_at <= timedelta(seconds=settings.refresh_grace_seconds):
            raise RefreshConflictError
        await repository.revoke_session(db, old.id, RevokeReason.REUSE_DETECTED, now)
        await db.commit()  # persist the revocation even though we are about to raise
        logger.warning(
            "Refresh token reuse detected; session revoked session_id=%s user_id=%s",
            old.id,
            old.user_id,
        )
        raise InvalidRefreshTokenError

    if (
        session.revoked_at is not None
        or session.expires_at <= now
        or session.absolute_expires_at <= now
    ):
        raise InvalidRefreshTokenError
    user = await users_repo.get_by_id(db, session.user_id)
    if user is None or user.status != UserStatus.ACTIVE.value:
        raise InvalidRefreshTokenError

    new_raw, new_hash = new_opaque_token()
    session.previous_token_hash = session.token_hash
    session.token_hash = new_hash
    session.rotated_at = now
    session.last_used_at = now
    session.expires_at = min(
        now + timedelta(days=settings.refresh_token_ttl_days), session.absolute_expires_at
    )
    await db.commit()
    access, expires_in = create_access_token(
        user_id=user.id, session_id=session.id, settings=settings, now=now
    )
    return RefreshResult(access, expires_in, new_raw)


# ----------------------------------------------------------------------------- logout


async def logout(db: AsyncSession, raw_token: str | None) -> None:
    """Revoke the session this cookie belongs to. Idempotent; unknown tokens are ignored."""
    if not raw_token:
        return
    token_hash = hash_token(raw_token)
    session = await repository.get_session_by_token_hash(db, token_hash)
    if session is None:
        session = await repository.get_session_by_previous_hash(db, token_hash)
    if session is not None and session.revoked_at is None:
        await repository.revoke_session(db, session.id, RevokeReason.LOGOUT, utcnow())
        await db.commit()


async def logout_all(db: AsyncSession, ctx: AuthContext) -> None:
    await repository.revoke_user_sessions(db, ctx.user.id, RevokeReason.LOGOUT_ALL, utcnow())
    await db.commit()


# ----------------------------------------------------------------------------- passwords


async def change_password(
    db: AsyncSession, ctx: AuthContext, *, current_password: str, new_password: str
) -> None:
    user = ctx.user
    if not await verify_password(user.password_hash, current_password):
        raise WrongPasswordError
    if current_password == new_password:
        raise PasswordUnchangedError
    now = utcnow()
    user.password_hash = await hash_password(new_password)
    user.password_changed_at = now
    # Every other device is signed out; the session making this request stays alive.
    await repository.revoke_user_sessions(
        db, user.id, RevokeReason.PASSWORD_CHANGED, now, except_session_id=ctx.session_id
    )
    await db.commit()


def build_reset_url(settings: Settings, raw_token: str) -> str:
    return f"{settings.frontend_url}/reset-password?token={raw_token}"


async def request_password_reset(
    session_factory: async_sessionmaker[AsyncSession],
    settings: Settings,
    email_sender: EmailSender,
    email: str,
) -> None:
    """Background job behind POST /auth/password/forgot.

    Runs after the HTTP response is sent, so the response is identical (and equally fast)
    whether or not the account exists. It must never raise or log the token or link.
    """
    try:
        async with session_factory() as db:
            user = await users_repo.get_by_email_for_update(db, email)
            if user is None or user.status != UserStatus.ACTIVE.value:
                return
            raw, token_hash = new_opaque_token()
            await repository.delete_unused_tokens(db, user.id, TokenPurpose.PASSWORD_RESET)
            db.add(
                OneTimeToken(
                    user_id=user.id,
                    purpose=TokenPurpose.PASSWORD_RESET.value,
                    token_hash=token_hash,
                    expires_at=utcnow() + timedelta(minutes=settings.password_reset_ttl_minutes),
                )
            )
            await db.commit()
            to_email = user.email
        await email_sender.send_password_reset(to_email, build_reset_url(settings, raw))
    except Exception as exc:  # background task: log the type only, never the message
        logger.error("Password reset processing failed: %s", type(exc).__name__)


async def confirm_password_reset(db: AsyncSession, *, raw_token: str, new_password: str) -> None:
    now = utcnow()
    token = await repository.get_token_for_update(
        db, hash_token(raw_token), TokenPurpose.PASSWORD_RESET
    )
    if token is None or token.used_at is not None or token.expires_at <= now:
        raise InvalidResetTokenError
    user = await users_repo.get_by_id(db, token.user_id)
    if user is None:
        raise InvalidResetTokenError

    new_hash = await hash_password(new_password)
    token.used_at = now  # single use: consumed in the same transaction as the password change
    await db.flush()
    await repository.delete_unused_tokens(db, user.id, TokenPurpose.PASSWORD_RESET)
    user.password_hash = new_hash
    user.password_changed_at = now
    user.failed_login_attempts = 0
    user.locked_until = None
    await repository.revoke_user_sessions(db, user.id, RevokeReason.PASSWORD_RESET, now)
    await db.commit()
