import asyncio

import pytest
from sqlalchemy import delete, func, select, update

from app import cli
from app.core.security import verify_password
from app.db.session import create_session_factory
from app.users.bootstrap import ROLE_DESCRIPTIONS, create_admin_user, seed_roles
from app.users.models import Role, RoleName, User, user_roles
from tests.auth.helpers import PASSWORD, bearer, create_user, login_ok, ping, role_names

ALL_ROLES = sorted(r.value for r in RoleName)


async def _roles_in_db(session) -> list[str]:
    return sorted((await session.execute(select(Role.name))).scalars())


# --------------------------------------------------------------------------- seeding


def test_seed_definitions_cover_exactly_the_role_enum():
    assert set(ROLE_DESCRIPTIONS) == set(RoleName)


async def test_seeding_is_idempotent(session):
    assert await _roles_in_db(session) == ALL_ROLES  # the migration already seeded them
    assert await seed_roles(session) == []  # nothing to create
    assert await seed_roles(session) == []
    assert await _roles_in_db(session) == ALL_ROLES
    assert (await session.execute(select(func.count()).select_from(Role))).scalar_one() == 3


async def test_seeding_recreates_only_what_is_missing(session):
    try:
        await session.execute(delete(Role).where(Role.name == "recruiter"))
        await session.commit()
        assert await seed_roles(session) == ["recruiter"]
        description = (
            await session.execute(select(Role.description).where(Role.name == "recruiter"))
        ).scalar_one()
        assert description == ROLE_DESCRIPTIONS[RoleName.RECRUITER]
    finally:
        await seed_roles(session)
    assert await _roles_in_db(session) == ALL_ROLES


async def test_seeding_never_touches_assignments_or_edited_descriptions(session):
    user = await create_user(session, roles=("candidate", "recruiter"))
    await session.execute(
        update(Role).where(Role.name == "candidate").values(description="edited by an operator")
    )
    await session.commit()
    try:
        assert await seed_roles(session) == []
        assert await role_names(session, user.id) == ["candidate", "recruiter"]
        description = (
            await session.execute(select(Role.description).where(Role.name == "candidate"))
        ).scalar_one()
        assert description == "edited by an operator"
    finally:
        await session.execute(
            update(Role)
            .where(Role.name == "candidate")
            .values(description=ROLE_DESCRIPTIONS[RoleName.CANDIDATE])
        )
        await session.commit()


async def test_concurrent_seeding_creates_each_role_exactly_once(session, engine):
    try:
        await session.execute(delete(Role))  # no users exist, so nothing blocks the delete
        await session.commit()
        factory = create_session_factory(engine)

        async def run() -> list[str]:
            async with factory() as db:
                return await seed_roles(db)

        results = await asyncio.gather(run(), run(), run())
        assert sorted(name for created in results for name in created) == ALL_ROLES
    finally:
        await seed_roles(session)
    assert await _roles_in_db(session) == ALL_ROLES


# --------------------------------------------------------------------------- create_admin_user


async def test_create_admin_user_creates_an_admin_only_account(session):
    result = await create_admin_user(
        session, email="boss@example.com", full_name="The Boss", password=PASSWORD
    )
    assert result.created and not result.granted
    assert await role_names(session, result.user.id) == ["admin"]
    assert result.user.password_hash.startswith("$argon2id$")
    assert await verify_password(result.user.password_hash, PASSWORD)
    (row,) = (await session.execute(select(user_roles))).all()
    assert row.assigned_by is None  # bootstrap grants have no granting user


async def test_existing_account_is_promoted_without_changing_its_password(session):
    user = await create_user(session, email="boss@example.com")
    before = user.password_hash

    result = await create_admin_user(
        session,
        email="boss@example.com",
        full_name="x",
        password=None,
        promote_existing=True,
    )

    assert result.granted and not result.created
    assert result.user.password_hash == before
    assert "admin" in await role_names(session, user.id)


async def test_existing_account_cannot_be_promoted_without_explicit_authorization(
    session,
):
    user = await create_user(session, email="candidate@example.com")
    before = user.password_hash

    with pytest.raises(
        ValueError,
        match="explicit authorization",
    ):
        await create_admin_user(
            session,
            email="candidate@example.com",
            full_name="Candidate",
            password=None,
        )

    assert "admin" not in await role_names(session, user.id)
    assert user.password_hash == before


async def test_create_admin_user_is_idempotent(session):
    await create_admin_user(session, email="boss@example.com", full_name="B", password=PASSWORD)
    again = await create_admin_user(session, email="boss@example.com", full_name="B", password=None)
    assert not again.created and not again.granted
    assert (await session.execute(select(func.count()).select_from(user_roles))).scalar_one() == 1
    assert (await session.execute(select(func.count()).select_from(User))).scalar_one() == 1


async def test_new_account_requires_a_password(session):
    with pytest.raises(ValueError):
        await create_admin_user(session, email="boss@example.com", full_name="B", password=None)


async def test_create_admin_repairs_a_missing_admin_role(session):
    try:
        await session.execute(delete(Role).where(Role.name == "admin"))
        await session.commit()
        result = await create_admin_user(
            session, email="boss@example.com", full_name="B", password=PASSWORD
        )
        assert await role_names(session, result.user.id) == ["admin"]
    finally:
        await seed_roles(session)


# --------------------------------------------------------------------------- CLI


def _answers(monkeypatch, *values):
    answers = iter(values)
    monkeypatch.setattr(cli.getpass, "getpass", lambda prompt="": next(answers))


def _never_prompt(monkeypatch):
    def fail(prompt=""):
        raise AssertionError("the CLI must not prompt here")

    monkeypatch.setattr(cli.getpass, "getpass", fail)


async def _run_cli(*argv: str) -> int:
    return await asyncio.to_thread(cli.main, list(argv))


async def test_cli_creates_a_working_admin(client, session, monkeypatch, capsys):
    _answers(monkeypatch, PASSWORD, PASSWORD)
    code = await _run_cli("create-admin", "--email", "Boss@Example.com", "--full-name", "The Boss")
    out = capsys.readouterr()
    assert code == 0
    assert "Created admin account boss@example.com" in out.out
    assert PASSWORD not in out.out + out.err  # the password is never echoed

    user = (
        await session.execute(select(User).where(User.email == "boss@example.com"))
    ).scalar_one()
    assert user.full_name == "The Boss"
    assert await role_names(session, user.id) == ["admin"]
    access, _ = await login_ok(client, "boss@example.com", PASSWORD)
    assert (await ping(client, "admin", access)).status_code == 200
    assert (await client.get("/api/v1/admin/users", headers=bearer(access))).status_code == 200


@pytest.mark.parametrize(
    ("answers", "message"),
    [
        ((PASSWORD, "different-password-9"), "passwords do not match"),
        (("short", "short"), "10-128"),
    ],
)
async def test_cli_rejects_bad_passwords_and_creates_nothing(
    session, monkeypatch, capsys, answers, message
):
    _answers(monkeypatch, *answers)
    assert await _run_cli("create-admin", "--email", "boss@example.com") == 1
    assert message in capsys.readouterr().err
    assert (await session.execute(select(func.count()).select_from(User))).scalar_one() == 0


@pytest.mark.parametrize(
    "argv",
    [
        ["create-admin", "--email", "not-an-email"],
        ["create-admin", "--email", "boss@example.com", "--full-name", "   "],
    ],
)
async def test_cli_rejects_invalid_input_before_prompting(session, monkeypatch, argv):
    _never_prompt(monkeypatch)
    assert await _run_cli(*argv) == 1
    assert (await session.execute(select(func.count()).select_from(User))).scalar_one() == 0


async def test_cli_promotes_an_existing_account_without_prompting(
    client, session, monkeypatch, capsys
):
    _never_prompt(monkeypatch)
    user = await create_user(session, email="boss@example.com")
    assert await _run_cli("create-admin", "--email", "boss@example.com", "--promote-existing") == 0
    assert "Granted the admin role" in capsys.readouterr().out
    assert await role_names(session, user.id) == ["admin", "candidate"]
    access, _ = await login_ok(client, "boss@example.com", PASSWORD)  # old password still works
    assert (await ping(client, "admin", access)).status_code == 200


async def test_cli_refuses_to_promote_an_existing_account_without_the_flag(
    session, monkeypatch, capsys
):
    """Emails are unverified: a stranger may have registered the address first."""
    _never_prompt(monkeypatch)
    user = await create_user(session, email="boss@example.com")
    assert await _run_cli("create-admin", "--email", "boss@example.com") == 1
    assert "--promote-existing" in capsys.readouterr().err
    assert await role_names(session, user.id) == ["candidate"]


async def test_cli_is_safe_to_run_twice(session, monkeypatch, capsys):
    _answers(monkeypatch, PASSWORD, PASSWORD)
    assert await _run_cli("create-admin", "--email", "boss@example.com") == 0
    _never_prompt(monkeypatch)
    assert await _run_cli("create-admin", "--email", "boss@example.com") == 0
    assert "already an admin" in capsys.readouterr().out
    assert (await session.execute(select(func.count()).select_from(User))).scalar_one() == 1
    assert (await session.execute(select(func.count()).select_from(user_roles))).scalar_one() == 1


async def test_cli_seed_roles(session, capsys):
    assert await _run_cli("seed-roles") == 0
    assert "All roles already exist." in capsys.readouterr().out
    try:
        await session.execute(delete(Role).where(Role.name == "recruiter"))
        await session.commit()
        assert await _run_cli("seed-roles") == 0
        assert "Created roles: recruiter" in capsys.readouterr().out
    finally:
        await seed_roles(session)


def test_cli_requires_a_command():
    with pytest.raises(SystemExit) as exc:
        cli.main([])
    assert exc.value.code == 2
