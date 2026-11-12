from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SmartHire AI"
    environment: Literal["development", "test", "production"] = "development"

    database_url: SecretStr
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_echo: bool = False

    cors_origins: str = ""
    frontend_url: str = "http://localhost:5173"

    # --- Google OAuth ---
    google_client_id: str = ""

    # --- JWT access tokens (algorithm is fixed to HS256 in code, never configurable) ---
    jwt_secret_key: SecretStr
    jwt_issuer: str = "smarthire-ai"
    jwt_audience: str = "smarthire-ai-api"
    access_token_ttl_minutes: int = Field(15, ge=1, le=60)

    # --- Refresh sessions ---
    refresh_token_ttl_days: int = Field(7, ge=1, le=90)
    session_absolute_ttl_days: int = Field(30, ge=1, le=365)
    refresh_grace_seconds: int = Field(10, ge=0, le=60)
    refresh_cookie_name: str = "refresh_token"
    cookie_secure: bool = True  # secure by default; set COOKIE_SECURE=false for local HTTP dev
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # --- Passwords and lockout ---
    argon2_time_cost: int = Field(3, ge=1)
    argon2_memory_cost_kib: int = Field(65536, ge=8192)
    argon2_parallelism: int = Field(4, ge=1)
    max_failed_logins: int = Field(5, ge=3, le=20)
    lockout_minutes: int = Field(15, ge=1, le=1440)
    password_reset_ttl_minutes: int = Field(30, ge=5, le=120)

    # --- Rate limits: max requests per minute per client IP, per endpoint group ---
    rate_limit_register: int = Field(5, ge=1)
    rate_limit_login: int = Field(10, ge=1)
    rate_limit_refresh: int = Field(30, ge=1)
    rate_limit_password: int = Field(5, ge=1)

    @field_validator("database_url")
    @classmethod
    def _require_asyncpg_url(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must start with 'postgresql+asyncpg://'")
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def _require_strong_secret(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if len(secret) < 32 or "REPLACE_WITH" in secret:
            raise ValueError("JWT_SECRET_KEY must be a random value of at least 32 characters")
        return value

    @field_validator("frontend_url")
    @classmethod
    def _require_http_url(cls, value: str) -> str:
        if urlsplit(value).scheme not in {"http", "https"} or not urlsplit(value).netloc:
            raise ValueError("FRONTEND_URL must be an absolute http(s) URL")
        return value.rstrip("/")

    @model_validator(mode="after")
    def _cross_field_checks(self) -> "Settings":
        if self.refresh_token_ttl_days > self.session_absolute_ttl_days:
            raise ValueError("REFRESH_TOKEN_TTL_DAYS cannot exceed SESSION_ABSOLUTE_TTL_DAYS")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")
        if self.environment == "production" and not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def frontend_origin(self) -> str:
        parts = urlsplit(self.frontend_url)
        return f"{parts.scheme}://{parts.netloc}"

    @property
    def rate_limits(self) -> dict[str, int]:
        return {
            "register": self.rate_limit_register,
            "login": self.rate_limit_login,
            "refresh": self.rate_limit_refresh,
            "password": self.rate_limit_password,
        }

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
