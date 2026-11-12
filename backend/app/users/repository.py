import uuid
from datetime import datetime

from sqlalchemy import case, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.users.models import Role, User


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    """Fetch a user by email without locking the database row."""
    stmt = select(User).where(User.email == email).options(selectinload(User.roles))
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_by_google_id(db: AsyncSession, google_id: str) -> User | None:
    """Fetch a user by their Google OAuth subject identifier."""
    stmt = select(User).where(User.google_id == google_id).options(selectinload(User.roles))
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_by_email_for_update(db: AsyncSession, email: str) -> User | None:
    """Fetch a user while locking the row until the current transaction ends."""
    stmt = (
        select(User).where(User.email == email).options(selectinload(User.roles)).with_for_update()
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def get_role_by_name(db: AsyncSession, name: str) -> Role | None:
    return (await db.execute(select(Role).where(Role.name == name))).scalar_one_or_none()


async def register_failed_login(
    db: AsyncSession, user_id: uuid.UUID, max_attempts: int, lock_until: datetime
) -> bool:
    """Atomically count a failed login; lock the account when the limit is reached.

    A single UPDATE avoids lost increments under concurrent attempts. Returns True if this
    attempt triggered a lock (the counter then restarts from zero).
    """
    reached = User.failed_login_attempts + 1 >= max_attempts
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(
            failed_login_attempts=case((reached, 0), else_=User.failed_login_attempts + 1),
            locked_until=case((reached, lock_until), else_=User.locked_until),
        )
        .returning(User.locked_until)
    )
    locked_until = (await db.execute(stmt)).scalar_one()
    return locked_until == lock_until
