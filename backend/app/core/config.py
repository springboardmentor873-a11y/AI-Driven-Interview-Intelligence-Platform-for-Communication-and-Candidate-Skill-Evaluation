import os
from pathlib import Path
from typing import List, Union, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

# Base project directory (where backend/ is located)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartHire AI Backend"
    API_V1_STR: str = "/api/v1"

    # Security & JWT
    SECRET_KEY: str = "smarthire_ai_super_secret_jwt_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # PostgreSQL Database Credentials (Environment Variables)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "smarthire_ai"

    # Optional full database connection string override
    DATABASE_URL: Optional[str] = None

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # Uploads
    UPLOAD_DIR: str = str(BASE_DIR / "uploads" / "resumes")
    MAX_UPLOAD_SIZE_MB: int = 5
    ALLOWED_EXTENSIONS: Union[str, List[str]] = ".pdf,.docx"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def sync_database_url(self) -> str:
        """
        Dynamically returns the effective database connection URL.
        Normalizes postgresql:// to postgresql+psycopg2:// for SQLAlchemy.
        Falls back to assembling credentials if DATABASE_URL is not explicitly set.
        """
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            url = self.DATABASE_URL.strip()
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url

        # Assemble from individual parameters
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("ALLOWED_EXTENSIONS", mode="after")
    @classmethod
    def assemble_allowed_extensions(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [ext.strip().lower() for ext in v.split(",") if ext.strip()]
        return [ext.lower() for ext in v]


settings = Settings()

# Ensure uploads directory exists on disk
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
