from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from .config import settings
from .database import Base, engine, SessionLocal
from . import models  # noqa: F401  (registers all tables)
from .models import User, Role
from .routers import auth, users, resumes
from .security import hash_password


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)  # swap for Alembic migrations later
    with SessionLocal() as db:  # seed the first admin
        if not db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL)):
            db.add(User(full_name="Platform Admin", email=settings.ADMIN_EMAIL,
                        hashed_password=hash_password(settings.ADMIN_PASSWORD), role=Role.admin))
            db.commit()
    yield


app = FastAPI(title="SmartHire AI API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(resumes.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
