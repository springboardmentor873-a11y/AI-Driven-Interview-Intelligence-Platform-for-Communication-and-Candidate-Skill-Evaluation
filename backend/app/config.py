from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./smarthire.db"
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_MINUTES: int = 30
    REFRESH_TOKEN_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"
    ADMIN_EMAIL: str = "admin@smarthire.ai"
    ADMIN_PASSWORD: str = "Admin@12345"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 5
    MAX_RESUMES_PER_USER: int = 5

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
