import pytest
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import create_engine, create_session_factory


@pytest.fixture
async def engine():
    engine = create_engine(get_settings())
    yield engine
    await engine.dispose()


@pytest.fixture(autouse=True)
async def _clean_tables(engine):
    """Empty user-owned tables after each test. Seeded roles are kept."""
    yield
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE users CASCADE"))


@pytest.fixture
async def session(engine):
    async with create_session_factory(engine)() as s:
        yield s
