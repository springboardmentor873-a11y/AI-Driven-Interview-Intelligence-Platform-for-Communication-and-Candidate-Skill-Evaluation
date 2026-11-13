"""SmartHire API foundation. Supabase owns credentials, sessions, and user identity."""
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    frontend_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


@asynccontextmanager
async def lifespan(application: FastAPI):
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        application.state.http = client
        yield


app = FastAPI(title="SmartHire AI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origins.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
bearer = HTTPBearer(auto_error=False)


class VerifiedUser(BaseModel):
    id: UUID
    email: str | None = None


async def current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> VerifiedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "A bearer access token is required", headers={"WWW-Authenticate": "Bearer"})
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(503, "Authentication is not configured")
    # Online validation supports current asymmetric and legacy signing keys.
    # Never trust decoded-only JWT claims or browser-supplied role metadata.
    try:
        response = await request.app.state.http.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {credentials.credentials}",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(503, "Authentication service is temporarily unavailable") from exc
    if response.status_code in (401, 403):
        raise HTTPException(401, "Invalid or expired access token", headers={"WWW-Authenticate": "Bearer"})
    if response.status_code != 200:
        raise HTTPException(503, "Authentication service is temporarily unavailable")
    try:
        return VerifiedUser.model_validate(response.json())
    except (ValueError, TypeError) as exc:
        raise HTTPException(503, "Authentication service returned an invalid response") from exc


@app.get("/health")
def health():
    return {"status": "ok", "service": "smarthire-api"}


@app.get("/api/me", response_model=VerifiedUser)
async def me(user: Annotated[VerifiedUser, Depends(current_user)]):
    """A protected endpoint ready for future AI services."""
    return user


@app.get("/api/capabilities")
async def capabilities(user: Annotated[VerifiedUser, Depends(current_user)]):
    return {
        "interviews": False,
        "resume_analysis": False,
        "speech_analysis": False,
        "reports": False,
    }
