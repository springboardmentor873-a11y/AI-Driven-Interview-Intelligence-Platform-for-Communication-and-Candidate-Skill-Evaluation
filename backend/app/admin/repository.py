import uuid

from sqlalchemy import Select, delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.users.models import Role, RoleName, User, UserStatus, user_roles

# Arbitrary constant identifying the advisory lock that serialises every change able to remove
# an admin (revoking the admin role, suspending an admin).
ADMIN_CHANGE_LOCK_KEY = 0x534D4852


async def lock_admin_changes(db: AsyncSession) -> None:
    """Take a transaction-scoped PostgreSQL advisory lock; released on commit/rollback.

    Two admins demoting each other at the same instant would otherwise each see "another admin
    exists" and both succeed, leaving none. Serialising these operations and re-counting after
    the lock is acquired closes that race.
    """
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": ADMIN_CHANGE_LOCK_KEY})


def _admin_user_ids() -> Select:
    return (
        select(user_roles.c.user_id)
        .join(Role, Role.id == user_roles.c.role_id)
        .where(Role.name == RoleName.ADMIN.value)
    )


async def get_user(
    db: AsyncSession, user_id: uuid.UUID, *, for_update: bool = False, reload: bool = False
) -> User | None:
    """Load a user together with their current roles. `for_update` locks the user row."""
    stmt = select(User).where(User.id == user_id).options(selectinload(User.roles))
    if for_update:
        stmt = stmt.with_for_update()
    if reload:  # bypass anything already cached in this session
        stmt = stmt.execution_options(populate_existing=True)
    return (await db.execute(stmt)).scalar_one_or_none()


async def search_users(
    db: AsyncSession,
    *,
    q: str | None,
    role: RoleName | None,
    status: UserStatus | None,
    limit: int,
    offset: int,
) -> tuple[list[User], int]:
    conditions = []
    if q:
        # Emails are stored lowercase; escape LIKE wildcards so "%" and "_" match literally.
        escaped = q.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        conditions.append(User.email.like(f"%{escaped}%", escape="\\"))
    if status is not None:
        conditions.append(User.status == status.value)
    if role is not None:
        role_users = (
            select(user_roles.c.user_id)
            .join(Role, Role.id == user_roles.c.role_id)
            .where(Role.name == role.value)
        )
        conditions.append(User.id.in_(role_users))

    total = (
        await db.execute(select(func.count()).select_from(User).where(*conditions))
    ).scalar_one()
    stmt = (
        select(User)
        .where(*conditions)
        .options(selectinload(User.roles))
        .order_by(User.created_at.desc(), User.id)
        .limit(limit)
        .offset(offset)
    )
    return list((await db.execute(stmt)).scalars()), total


async def count_other_active_admins(db: AsyncSession, exclude_user_id: uuid.UUID) -> int:
    stmt = (
        select(func.count())
        .select_from(User)
        .where(
            User.status == UserStatus.ACTIVE.value,
            User.id != exclude_user_id,
            User.id.in_(_admin_user_ids()),
        )
    )
    return (await db.execute(stmt)).scalar_one()


async def add_user_role(
    db: AsyncSession, user_id: uuid.UUID, role_id: uuid.UUID, assigned_by: uuid.UUID
) -> None:
    await db.execute(
        user_roles.insert().values(user_id=user_id, role_id=role_id, assigned_by=assigned_by)
    )


async def remove_user_role(db: AsyncSession, user_id: uuid.UUID, role_id: uuid.UUID) -> None:
    await db.execute(
        delete(user_roles).where(user_roles.c.user_id == user_id, user_roles.c.role_id == role_id)
    )


async def get_platform_stats(db: AsyncSession) -> dict:
    from datetime import timedelta

    from app.candidate.models import InterviewSession, Resume
    from app.core.clock import utcnow

    now = utcnow()
    seven_days_ago = now - timedelta(days=7)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    active_users = (
        await db.execute(
            select(func.count()).select_from(User).where(User.status == UserStatus.ACTIVE.value)
        )
    ).scalar_one()
    suspended_users = total_users - active_users

    recent_signups = (
        await db.execute(
            select(func.count()).select_from(User).where(User.created_at >= seven_days_ago)
        )
    ).scalar_one()

    total_interviews = (
        await db.execute(select(func.count()).select_from(InterviewSession))
    ).scalar_one()
    total_resumes = (
        await db.execute(select(func.count()).select_from(Resume))
    ).scalar_one()

    async def _count_role(role_name: str) -> int:
        stmt = (
            select(func.count())
            .select_from(user_roles)
            .join(Role, Role.id == user_roles.c.role_id)
            .where(Role.name == role_name)
        )
        return (await db.execute(stmt)).scalar_one()

    candidates_count = await _count_role(RoleName.CANDIDATE.value)
    recruiters_count = await _count_role(RoleName.RECRUITER.value)
    admins_count = await _count_role(RoleName.ADMIN.value)

    return {
        "total_users": total_users,
        "candidates_count": candidates_count,
        "recruiters_count": recruiters_count,
        "admins_count": admins_count,
        "active_users": active_users,
        "suspended_users": suspended_users,
        "recent_signups_count": recent_signups,
        "total_interviews": total_interviews,
        "total_resumes": total_resumes,
    }
