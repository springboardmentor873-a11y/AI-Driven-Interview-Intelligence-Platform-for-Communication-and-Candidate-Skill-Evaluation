import uuid

from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import selectinload

from app.users.models import User, user_roles
from tests.db.factories import get_role, make_user, violates


async def _count(session, table="user_roles") -> int:
    return (await session.execute(text(f"SELECT count(*) FROM {table}"))).scalar_one()  # noqa: S608


async def test_assign_and_load_roles_via_relationship(session):
    candidate, admin = await get_role(session, "candidate"), await get_role(session, "admin")
    user = make_user()
    user.roles = [candidate, admin]
    session.add(user)
    await session.commit()

    session.expunge_all()
    loaded = (
        await session.execute(
            select(User).options(selectinload(User.roles)).where(User.id == user.id)
        )
    ).scalar_one()
    assert {r.name for r in loaded.roles} == {"candidate", "admin"}


async def test_assigned_at_is_set_and_assigned_by_defaults_to_null(session):
    user = make_user()
    user.roles = [await get_role(session, "candidate")]
    session.add(user)
    await session.commit()
    row = (await session.execute(select(user_roles))).one()
    assert row.assigned_at.tzinfo is not None
    assert row.assigned_by is None


async def test_duplicate_assignment_rejected(session):
    user, role = make_user(), await get_role(session, "candidate")
    session.add(user)
    await session.flush()
    await session.execute(user_roles.insert().values(user_id=user.id, role_id=role.id))
    async with violates(session, "pk_user_roles"):
        await session.execute(user_roles.insert().values(user_id=user.id, role_id=role.id))


async def test_unknown_user_rejected(session):
    role = await get_role(session, "candidate")
    async with violates(session, "fk_user_roles_user_id_users"):
        await session.execute(user_roles.insert().values(user_id=uuid.uuid4(), role_id=role.id))


async def test_unknown_role_rejected(session):
    user = make_user()
    session.add(user)
    await session.flush()
    async with violates(session, "fk_user_roles_role_id_roles"):
        await session.execute(user_roles.insert().values(user_id=user.id, role_id=uuid.uuid4()))


async def test_unknown_assigned_by_rejected(session):
    user, role = make_user(), await get_role(session, "candidate")
    session.add(user)
    await session.flush()
    async with violates(session, "fk_user_roles_assigned_by_users"):
        await session.execute(
            user_roles.insert().values(user_id=user.id, role_id=role.id, assigned_by=uuid.uuid4())
        )


async def test_deleting_user_cascades_to_assignments_but_keeps_roles(session):
    user = make_user()
    user.roles = [await get_role(session, "candidate")]
    session.add(user)
    await session.commit()
    assert await _count(session) == 1

    await session.execute(delete(User).where(User.id == user.id))
    await session.commit()
    assert await _count(session) == 0
    assert await _count(session, "roles") == 3


async def test_deleting_assigned_role_is_restricted(session):
    user = make_user()
    user.roles = [await get_role(session, "candidate")]
    session.add(user)
    await session.commit()
    async with violates(session, "fk_user_roles_role_id_roles"):
        await session.execute(text("DELETE FROM roles WHERE name = 'candidate'"))


async def test_deleting_assigner_sets_assigned_by_null(session):
    admin, grantee = make_user(), make_user()
    session.add_all([admin, grantee])
    await session.flush()
    role = await get_role(session, "recruiter")
    await session.execute(
        user_roles.insert().values(user_id=grantee.id, role_id=role.id, assigned_by=admin.id)
    )
    await session.commit()

    await session.execute(delete(User).where(User.id == admin.id))
    await session.commit()
    row = (await session.execute(select(user_roles))).one()
    assert row.user_id == grantee.id
    assert row.assigned_by is None
    assert (await session.execute(select(func.count()).select_from(user_roles))).scalar_one() == 1
