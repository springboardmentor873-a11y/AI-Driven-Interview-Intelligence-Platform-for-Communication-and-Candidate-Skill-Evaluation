
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine, Base

# Import all models so SQLAlchemy registers their tables
from app.models import (
    User,
    Resume,
    UserSession,
    PasswordReset,
    ResumeSkill
)

# Import routers
from app.routes.auth_routes import router as auth_router
from app.routes.resume_routes import router as resume_router
from app.routes.resume_ai_routes import router as resume_ai_router
from app.routes.interview_ai_routes import router as interview_ai_router


app = FastAPI(
    title="SmartHire AI",
    description="AI-Driven Interview Intelligence Platform",
    version="1.0.0"
)


# Create database tables if they do not exist
@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Register API Routers
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(resume_ai_router)
app.include_router(interview_ai_router)


@app.get("/models-check")
def models_check():
    return {
        "tables": list(Base.metadata.tables.keys()),
        "status": "Models registered successfully"
    }


@app.get("/")
def home():
    return {
        "message": "Welcome to SmartHire AI Backend!",
        "status": "Running Successfully"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/db-check")
def database_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "message": "PostgreSQL connected successfully!",
            "database": "smarthire_ai",
            "status": "connected"
        }

    except Exception:
        return {
            "message": "Database connection failed",
            "status": "disconnected"
        }
