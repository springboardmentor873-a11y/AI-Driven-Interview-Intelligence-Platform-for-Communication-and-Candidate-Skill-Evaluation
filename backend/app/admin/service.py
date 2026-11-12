"""Administrative user management: the only code path that changes roles or suspends accounts.

Every function receives the acting admin's `AuthContext` (already authorised by the router's
`require_admin` dependency) and runs in one transaction.
"""

import logging
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import repository
from app.auth import repository as auth_repo
from app.auth.dependencies import AuthContext
from app.auth.models import RevokeReason
from app.core.clock import utcnow
from app.core.exceptions import (
    CannotModifySelfError,
    LastAdminError,
    NotFoundError,
    RoleAlreadyAssignedError,
    RoleNotAssignedError,
)
from app.users import repository as users_repo
from app.users.models import RoleName, User, UserStatus

logger = logging.getLogger(__name__)


def _holds(user: User, role: RoleName) -> bool:
    return any(r.name == role.value for r in user.roles)


async def _require_user(db: AsyncSession, user_id: uuid.UUID, *, for_update: bool = True) -> User:
    user = await repository.get_user(db, user_id, for_update=for_update)
    if user is None:
        raise NotFoundError("User not found.")
    return user


async def _ensure_another_active_admin(db: AsyncSession, target: User) -> None:
    """Refuse the change if `target` is the last active admin. Must hold the admin lock."""
    if target.status == UserStatus.ACTIVE.value and not await repository.count_other_active_admins(
        db, target.id
    ):
        raise LastAdminError


async def grant_role(
    db: AsyncSession, actor: AuthContext, user_id: uuid.UUID, role: RoleName
) -> User:
    """Give `role` to a user, recording who granted it. This is how recruiters are created."""
    user = await _require_user(db, user_id)
    if _holds(user, role):
        raise RoleAlreadyAssignedError
    role_row = await users_repo.get_role_by_name(db, role.value)
    if role_row is None:  # roles are seeded by the migration / `python -m app.cli seed-roles`
        raise RuntimeError(f"Role {role.value!r} is missing; run `python -m app.cli seed-roles`.")
    try:
        await repository.add_user_role(db, user.id, role_row.id, actor.user.id)
        await db.commit()
    except IntegrityError as exc:  # lost a race with an identical concurrent grant
        await db.rollback()
        raise RoleAlreadyAssignedError from exc
    logger.info("Role granted role=%s target=%s actor=%s", role.value, user_id, actor.user.id)
    return await _reload(db, user_id)


async def revoke_role(
    db: AsyncSession, actor: AuthContext, user_id: uuid.UUID, role: RoleName
) -> User:
    """Remove `role` from a user. Takes effect on the user's very next request."""
    if role is RoleName.ADMIN:
        if user_id == actor.user.id:
            raise CannotModifySelfError
        await repository.lock_admin_changes(db)  # before any row lock, to keep lock order stable
    user = await _require_user(db, user_id)
    if not _holds(user, role):
        raise RoleNotAssignedError
    if role is RoleName.ADMIN:
        await _ensure_another_active_admin(db, user)  # evaluated AFTER the lock is held
    role_row = await users_repo.get_role_by_name(db, role.value)
    assert role_row is not None  # the user holds it, so it exists  # noqa: S101
    await repository.remove_user_role(db, user.id, role_row.id)
    await db.commit()
    logger.info("Role revoked role=%s target=%s actor=%s", role.value, user_id, actor.user.id)
    return await _reload(db, user_id)


async def set_status(
    db: AsyncSession, actor: AuthContext, user_id: uuid.UUID, status: UserStatus
) -> User:
    """Suspend or reactivate an account. Suspending also revokes every session of the user."""
    if user_id == actor.user.id:
        raise CannotModifySelfError
    if status is UserStatus.SUSPENDED:
        await repository.lock_admin_changes(db)
    user = await _require_user(db, user_id)
    if user.status != status.value:
        if status is UserStatus.SUSPENDED:
            if _holds(user, RoleName.ADMIN):
                await _ensure_another_active_admin(db, user)
            await auth_repo.revoke_user_sessions(
                db, user.id, RevokeReason.ADMIN_SUSPENDED, utcnow()
            )
        user.status = status.value
        await db.commit()
        logger.info(
            "Status changed status=%s target=%s actor=%s", status.value, user_id, actor.user.id
        )
    return await _reload(db, user_id)


async def _reload(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await repository.get_user(db, user_id, reload=True)
    assert user is not None  # noqa: S101
    return user
