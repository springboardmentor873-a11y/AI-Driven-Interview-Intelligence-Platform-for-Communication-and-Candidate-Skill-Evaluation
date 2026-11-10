import hashlib
import secrets
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.models import RefreshSession
from app.users.models import Role, User

# Structurally valid Argon2id PHC string (not a real password hash).
ARGON2_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$aGFzaGhhc2hoYXNoaGFzaA"


def token_hash() -> str:
    return hashlib.sha256(secrets.token_bytes(32)).hexdigest()


def make_user(email: str | None = None, **kwargs) -> User:
    kwargs.setdefault("full_name", "Test User")
    return User(email=email or f"user-{secrets.token_hex(4)}@example.com", **kwargs)


def make_refresh_session(user_id, **kwargs) -> RefreshSession:
    now = datetime.now(UTC)
    values = {
        "user_id": user_id,
        "token_hash": token_hash(),
        "expires_at": now + timedelta(days=7),
        "absolute_expires_at": now + timedelta(days=30),
    }
    values.update(kwargs)
    return RefreshSession(**values)


async def get_role(session, name: str) -> Role:
    return (await session.execute(select(Role).where(Role.name == name))).scalar_one()


async def expect_violation(session, constraint: str) -> None:
    """Flush pending work, require an IntegrityError naming constraint, then roll back."""
    with pytest.raises(IntegrityError) as exc:
        await session.flush()
    await session.rollback()
    assert constraint in str(exc.value), f"expected {constraint!r} in: {exc.value}"


@asynccontextmanager
async def violates(session, constraint: str):
    """Expect the wrapped statements (and following flush) to violate constraint."""
    with pytest.raises(IntegrityError) as exc:
        yield
        await session.flush()
    await session.rollback()
    assert constraint in str(exc.value), f"expected {constraint!r} in: {exc.value}"
