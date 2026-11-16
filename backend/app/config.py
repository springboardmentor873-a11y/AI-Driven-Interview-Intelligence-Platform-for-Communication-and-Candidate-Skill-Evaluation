from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET = "change-this-secret-in-production"
DEFAULT_ADMIN_PASSWORD = "Admin@123"


class Settings(BaseSettings):
    """All configuration comes from environment variables (or a .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "SmartHire AI"
    environment: str = "development"  # development | production
    app_url: str = "http://localhost:5173"  # public URL of the web app, used in emails

    # Database: SQLite for development, PostgreSQL in production
    database_url: str = "sqlite:///./smarthire.db"
    run_migrations: bool = True

    # Auth
    jwt_secret: str = DEFAULT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 12
    allow_recruiter_signup: bool = False
    google_client_id: str | None = None
    max_failed_logins: int = 5
    lockout_minutes: int = 15
    reset_token_minutes: int = 30

    # Data retention (DPDP Act 2023 / GDPR storage limitation)
    retention_audio_days: int = 30
    retention_recording_days: int = 90

    # CORS and proxy
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"
    trust_proxy: bool = True

    # Rate limits (requests per window, per client IP)
    rate_limit_auth: str = "10/60"     # login, register, password reset

    # Email. If smtp_host is empty, emails are logged instead of sent.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "SmartHire AI <no-reply@smarthire.local>"
    smtp_use_ssl: bool = False

    # First admin and demo data
    seed_demo: bool = True
    admin_email: str = "admin@smarthire.ai"
    admin_password: str = DEFAULT_ADMIN_PASSWORD
    admin_name: str = "Platform Admin"

    # Company / legal
    company_name: str = "SmartHire AI"
    support_email: str = "support@smarthire.local"
    grievance_officer: str = "Grievance Officer"

    sentry_dsn: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def production_problems(self) -> list[str]:
        """Settings that must be fixed before running in production."""
        p = []
        if self.jwt_secret == DEFAULT_SECRET or len(self.jwt_secret) < 32:
            p.append("JWT_SECRET must be a random string of at least 32 characters")
        if self.admin_password == DEFAULT_ADMIN_PASSWORD:
            p.append("ADMIN_PASSWORD must be changed from the default")
        if self.seed_demo:
            p.append("SEED_DEMO must be false (demo accounts have public passwords)")
        if self.database_url.startswith("sqlite"):
            p.append("DATABASE_URL must point to PostgreSQL (SQLite is single-server and loses data on redeploy)")
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
