import pytest
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import create_engine


@pytest.fixture(autouse=True)
async def clean_auth_tables():
    engine = create_engine(get_settings())

    try:
        async with engine.begin() as connection:
            await connection.execute(text("TRUNCATE TABLE users CASCADE"))

        yield

        async with engine.begin() as connection:
            await connection.execute(text("TRUNCATE TABLE users CASCADE"))

    finally:
        await engine.dispose()
