import pytest
from pydantic import ValidationError

from app.core.config import Settings

VALID_URL = "postgresql+asyncpg://user:s3cret@localhost:5432/db"


def make(**overrides):
    return Settings(_env_file=None, **overrides)


def test_valid_settings_and_defaults(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)  # conftest sets it to "test"
    s = make(database_url=VALID_URL)
    assert s.environment == "development"
    assert s.database_url.get_secret_value() == VALID_URL
    assert not s.is_production


def test_database_url_is_required(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        make()


@pytest.mark.parametrize(
    "bad", ["postgres://u:p@h/db", "postgresql://u:p@h/db", "sqlite+aiosqlite:///x.db"]
)
def test_rejects_non_asyncpg_urls(bad):
    with pytest.raises(ValidationError):
        make(database_url=bad)


def test_password_not_exposed_in_repr():
    s = make(database_url=VALID_URL)
    assert "s3cret" not in repr(s)
    assert "s3cret" not in str(s)


def test_rejects_unknown_environment():
    with pytest.raises(ValidationError):
        make(database_url=VALID_URL, environment="staging")


def test_cors_origin_parsing():
    s = make(database_url=VALID_URL, cors_origins=" http://a.com, http://b.com ,,")
    assert s.cors_origin_list == ["http://a.com", "http://b.com"]
    assert make(database_url=VALID_URL).cors_origin_list == []
