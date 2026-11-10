import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.users.models import Role, RoleName
from tests.db.factories import expect_violation


async def test_migration_seeds_exactly_the_platform_roles(session):
    names = set((await session.execute(select(Role.name))).scalars())
    assert names == {r.value for r in RoleName}


async def test_duplicate_role_name_rejected(session):
    session.add(Role(name="admin"))
    await expect_violation(session, "uq_roles_name")


async def test_role_defaults(session):
    role = Role(name="auditor")
    session.add(role)
    await session.flush()
    assert role.description == ""
    assert role.created_at.tzinfo is not None
    await session.rollback()


async def test_role_name_cannot_be_null(session):
    session.add(Role(name=None))
    with pytest.raises(IntegrityError):
        await session.flush()
    await session.rollback()
