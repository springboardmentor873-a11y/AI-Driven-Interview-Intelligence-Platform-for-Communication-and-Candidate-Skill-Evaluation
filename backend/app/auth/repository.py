import uuid
from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import OneTimeToken, RefreshSession, RevokeReason, TokenPurpose
from app.users.models import User

# ------------------------------------------------------------------ refresh sessions


async def add_session(db: AsyncSession, session: RefreshSession) -> RefreshSession:
    db.add(session)
    await db.flush()  # populates the server-generated id
    return session


async def get_session_by_token_hash(
    db: AsyncSession, token_hash: str, *, for_update: bool = False
) -> RefreshSession | None:
    stmt = select(RefreshSession).where(RefreshSession.token_hash == token_hash)
    if for_update:
        stmt = stmt.with_for_update()
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_session_by_previous_hash(
    db: AsyncSession, token_hash: str, *, for_update: bool = False
) -> RefreshSession | None:
    stmt = select(RefreshSession).where(RefreshSession.previous_token_hash == token_hash)
    if for_update:
        stmt = stmt.with_for_update()
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_active_session_with_user(
    db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID, now: datetime
) -> tuple[RefreshSession, User] | None:
    """The per-request check behind every access token: session live, user loaded with roles."""
    stmt = (
        select(RefreshSession, User)
        .join(User, User.id == RefreshSession.user_id)
        .where(
            RefreshSession.id == session_id,
            RefreshSession.user_id == user_id,
            RefreshSession.revoked_at.is_(None),
            RefreshSession.expires_at > now,
            RefreshSession.absolute_expires_at > now,
        )
        .options(selectinload(User.roles))
    )
    row = (await db.execute(stmt)).one_or_none()
    return (row[0], row[1]) if row else None


async def revoke_session(
    db: AsyncSession, session_id: uuid.UUID, reason: RevokeReason, now: datetime
) -> None:
    await db.execute(
        update(RefreshSession)
        .where(RefreshSession.id == session_id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=now, revoked_reason=reason.value)
    )


async def revoke_user_sessions(
    db: AsyncSession,
    user_id: uuid.UUID,
    reason: RevokeReason,
    now: datetime,
    *,
    except_session_id: uuid.UUID | None = None,
) -> None:
    stmt = (
        update(RefreshSession)
        .where(RefreshSession.user_id == user_id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=now, revoked_reason=reason.value)
    )
    if except_session_id is not None:
        stmt = stmt.where(RefreshSession.id != except_session_id)
    await db.execute(stmt)


# ------------------------------------------------------------------ one-time tokens


async def delete_unused_tokens(db: AsyncSession, user_id: uuid.UUID, purpose: TokenPurpose) -> None:
    await db.execute(
        delete(OneTimeToken).where(
            OneTimeToken.user_id == user_id,
            OneTimeToken.purpose == purpose.value,
            OneTimeToken.used_at.is_(None),
        )
    )


async def get_token_for_update(
    db: AsyncSession, token_hash: str, purpose: TokenPurpose
) -> OneTimeToken | None:
    stmt = (
        select(OneTimeToken)
        .where(OneTimeToken.token_hash == token_hash, OneTimeToken.purpose == purpose.value)
        .with_for_update()
    )
    return (await db.execute(stmt)).scalar_one_or_none()
