"""SmartHire API foundation. Supabase owns credentials, sessions, and user identity."""
import asyncio
import time
from app.interviews import InterviewSetup, generate_questions
from contextlib import asynccontextmanager
from app.resume_service import fetch_resume, analyze_pdf
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-6-astra"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    frontend_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


@asynccontextmanager
async def lifespan(application: FastAPI):
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        application.state.http = client
        application.state.resume_slots = asyncio.Semaphore(2)
        application.state.generation_slots = asyncio.Semaphore(2)
        application.state.generation_times = {}
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
        "interviews": bool(settings.openai_api_key),
        "resume_analysis": False,
        "resume_skill_extraction": True,
        "speech_analysis": False,
        "reports": False,
    }


@app.post('/api/resume/analyze')
async def analyze_resume(
    request: Request,
    user: Annotated[VerifiedUser, Depends(current_user)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
):
    assert credentials is not None
    slots = request.app.state.resume_slots
    if slots.locked():
        raise HTTPException(429, 'Resume extraction is busy. Try again shortly.')
    async with slots:
        data = await fetch_resume(request.app.state.http, settings.supabase_url,
                                  settings.supabase_publishable_key, credentials.credentials, str(user.id))
        return await analyze_pdf(data)


@app.post('/api/interviews/questions')
async def interview_questions(
    setup: InterviewSetup,
    request: Request,
    user: Annotated[VerifiedUser, Depends(current_user)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
):
    assert credentials is not None
    if not settings.openai_api_key:
        raise HTTPException(503, 'AI question generation is not configured yet.')
    try:
        profile = await request.app.state.http.get(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles",
            params={'id': f'eq.{user.id}', 'select': 'role'},
            headers={'apikey': settings.supabase_publishable_key, 'Authorization': f'Bearer {credentials.credentials}'},
        )
        if profile.status_code != 200:
            raise HTTPException(503, 'Could not verify candidate account.')
        if profile.json() != [{'role': 'candidate'}]:
            raise HTTPException(403, 'Interview practice is available to candidate accounts.')
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(503, 'Could not verify candidate account.') from exc
    now = time.monotonic()
    recent = request.app.state.generation_times
    for identity, stamp in list(recent.items()):
        if now - stamp >= 60:
            del recent[identity]
    if str(user.id) in recent or request.app.state.generation_slots.locked():
        raise HTTPException(429, 'Please wait a minute before generating another interview.')
    recent[str(user.id)] = now
    async with request.app.state.generation_slots:
        return await generate_questions(request.app.state.http, settings.openai_api_key, settings.openai_model, setup)
