import os
from pathlib import Path

import pytest
from dotenv import dotenv_values
from sqlalchemy import text

# Point the app at the TEST database before any app module is imported.
_env = {**dotenv_values(Path(__file__).resolve().parents[1] / ".env"), **os.environ}
_test_url = _env.get("TEST_DATABASE_URL")

if not _test_url:
    pytest.exit("TEST_DATABASE_URL is not set (see .env.example).", returncode=2)

if not _test_url.split("?")[0].endswith("_test"):
    pytest.exit(
        "TEST_DATABASE_URL must point to a database whose name ends with '_test'.",
        2,
    )

if "JWT_SECRET_KEY" in _env:
    os.environ.setdefault("JWT_SECRET_KEY", str(_env["JWT_SECRET_KEY"]))
if "GOOGLE_CLIENT_ID" in _env:
    os.environ.setdefault("GOOGLE_CLIENT_ID", str(_env["GOOGLE_CLIENT_ID"]))

os.environ["DATABASE_URL"] = _test_url
os.environ["ENVIRONMENT"] = "test"
os.environ["COOKIE_SECURE"] = "false"

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db.session import create_engine, create_session_factory  # noqa: E402
from app.main import create_app  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def alembic_cfg() -> Config:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    return cfg


@pytest.fixture(scope="session", autouse=True)
def _migrated_schema(alembic_cfg):
    """Build the test schema from scratch with Alembic."""
    command.downgrade(alembic_cfg, "base")
    command.upgrade(alembic_cfg, "head")


@pytest.fixture(autouse=True)
async def _fresh_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
async def engine():
    db_engine = create_engine(get_settings())
    yield db_engine
    await db_engine.dispose()


@pytest.fixture
async def session(engine):
    async with create_session_factory(engine)() as db_session:
        yield db_session


@pytest.fixture(autouse=True)
async def _clean_user_tables(engine):
    """Keep tests isolated while preserving the seeded platform roles."""
    async with engine.begin() as connection:
        await connection.execute(text("TRUNCATE TABLE users CASCADE"))

    yield

    async with engine.begin() as connection:
        await connection.execute(text("TRUNCATE TABLE users CASCADE"))


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    async with (
        app.router.lifespan_context(app),
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as test_client,
    ):
        yield test_client
