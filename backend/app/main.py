import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import engine, get_db, Base, init_db, check_db_connection
from app.routes import api_router
from app.web_routes import router as web_router
from app.middleware.logging_middleware import RequestLoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smarthire_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Event:
    Automatically initializes database tables on server startup,
    and handles graceful cleanup on shutdown.
    """
    logger.info(f"Starting {settings.PROJECT_NAME}...")
    # Initialize database
    init_db()
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


# FastAPI Application Instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SmartHire AI Backend – AI-Powered Mock Interview & Candidate Assessment Platform (Milestone 1).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Custom Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# Cross-Origin Resource Sharing (CORS) Middleware for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all Milestone 1 API routes (/api/v1/auth, /api/v1/users, /api/v1/resumes)
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount Frontend Website Routes (Serves Google Stitch AI UI screens directly)
app.include_router(web_router)


# ==========================================
# Health Check & Service Status Endpoints
# ==========================================

@app.get("/api/status", tags=["Health & Status"])
def api_service_status():
    """Service status endpoint: General service health and API version."""
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "milestone": "Milestone 1 (PostgreSQL, Auth, RBAC, Profiles, Resumes)",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


@app.get("/health", tags=["Health & Status"])
def health_check():
    """
    Database Health Check Endpoint:
    Pings the configured PostgreSQL database, tests latency, and returns connection status.
    """
    db_health = check_db_connection()
    is_healthy = db_health["status"] == "connected"

    return {
        "api_status": "healthy" if is_healthy else "degraded",
        "database": db_health,
    }
