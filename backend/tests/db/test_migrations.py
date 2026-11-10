import asyncio

from alembic import command
from sqlalchemy import CheckConstraint, inspect, text

from app.db.base import Base
from app.users.models import RoleName

EXPECTED_TABLES = {"users", "roles", "user_roles", "refresh_sessions"}


async def _tables(engine) -> set[str]:
    async with engine.connect() as conn:
        names = await conn.run_sync(lambda c: set(inspect(c).get_table_names()))
    return names - {"alembic_version"}


async def test_head_schema_has_exactly_the_expected_tables(engine):
    assert await _tables(engine) == EXPECTED_TABLES
    assert set(Base.metadata.tables) == EXPECTED_TABLES


async def test_models_and_migrations_have_no_drift(alembic_cfg):
    # Raises CommandError if autogenerate would produce any change.
    await asyncio.to_thread(command.check, alembic_cfg)


async def test_check_constraints_in_database_match_models(engine):
    expected = {
        (table.name, c.name)
        for table in Base.metadata.tables.values()
        for c in table.constraints
        if isinstance(c, CheckConstraint)
    }
    found = set()
    async with engine.connect() as conn:
        for table in EXPECTED_TABLES:
            checks = await conn.run_sync(lambda c, t=table: inspect(c).get_check_constraints(t))
            found |= {(table, ck["name"]) for ck in checks}
    assert expected, "no check constraints found on models"
    assert found == expected


async def test_expected_indexes_exist_including_partial_index(engine):
    async with engine.connect() as conn:
        rows = (
            await conn.execute(
                text("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'")
            )
        ).all()
    defs = {name: d for name, d in rows}
    for name in (
        "ix_refresh_sessions_user_id",
        "ix_refresh_sessions_expires_at",
        "ix_refresh_sessions_previous_token_hash",
        "ix_user_roles_role_id",
        "uq_users_email",
        "uq_refresh_sessions_token_hash",
        "uq_roles_name",
    ):
        assert name in defs, f"missing index {name}"
    assert (
        "WHERE (previous_token_hash IS NOT NULL)" in defs["ix_refresh_sessions_previous_token_hash"]
    )


async def test_timestamp_columns_are_timezone_aware(engine):
    async with engine.connect() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT table_name, column_name, data_type FROM information_schema.columns "
                    "WHERE table_schema='public' AND (column_name LIKE '%\\_at' ESCAPE '\\')"
                )
            )
        ).all()
    assert rows
    assert {r.data_type for r in rows} == {"timestamp with time zone"}


async def test_downgrade_then_upgrade_round_trip(engine, alembic_cfg):
    try:
        await asyncio.to_thread(command.downgrade, alembic_cfg, "base")
        assert await _tables(engine) == set()
    finally:
        await asyncio.to_thread(command.upgrade, alembic_cfg, "head")
    assert await _tables(engine) == EXPECTED_TABLES
    async with engine.connect() as conn:
        names = set((await conn.execute(text("SELECT name FROM roles"))).scalars())
    assert names == {r.value for r in RoleName}
