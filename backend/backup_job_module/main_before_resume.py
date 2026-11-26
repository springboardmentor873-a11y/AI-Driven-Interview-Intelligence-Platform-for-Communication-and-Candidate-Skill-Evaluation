from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db.database import engine, Base

# Import models
from app.models.user import User
from app.models.email_otp import EmailOTP

# Import authentication router
from app.routes.auth import router as auth_router


app = FastAPI(
    title="SmartHire AI",
    description="AI-powered recruitment platform",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)


# Register authentication router
app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "Welcome to SmartHire AI API"}


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "SmartHire AI",
        "message": "Backend is running successfully"
    }


@app.get("/api/db-check")
def database_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "success",
            "database": "PostgreSQL",
            "message": "Database connected successfully"
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }