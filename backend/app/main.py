from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.audit_log import SystemSetting
from app.api import api_router

def seed_initial_data():
    """Seed initial demo accounts for Candidate, Recruiter, and Admin if not present."""
    db = SessionLocal()
    try:
        # Check Admin
        admin = db.query(User).filter(User.email == "admin@smarthire.ai").first()
        if not admin:
            admin = User(
                email="admin@smarthire.ai",
                hashed_password=get_password_hash("Admin@12345"),
                full_name="Platform Administrator",
                role=UserRole.ADMIN,
                organization="SmartHire AI Platform",
                is_active=True
            )
            db.add(admin)

        # Check Recruiter
        recruiter = db.query(User).filter(User.email == "recruiter@smarthire.ai").first()
        if not recruiter:
            recruiter = User(
                email="recruiter@smarthire.ai",
                hashed_password=get_password_hash("Recruiter@12345"),
                full_name="Sarah Jenkins",
                role=UserRole.RECRUITER,
                organization="TechCorp Talent Partners",
                is_active=True
            )
            db.add(recruiter)

        # Check Candidate
        candidate = db.query(User).filter(User.email == "candidate@smarthire.ai").first()
        if not candidate:
            candidate = User(
                email="candidate@smarthire.ai",
                hashed_password=get_password_hash("Candidate@12345"),
                full_name="Alex Rivera",
                role=UserRole.CANDIDATE,
                organization="Apex Engineering College",
                is_active=True
            )
            db.add(candidate)

        # Seed initial system settings
        existing_setting = db.query(SystemSetting).filter(SystemSetting.key == "scoring_weights").first()
        if not existing_setting:
            db.add(SystemSetting(
                key="scoring_weights",
                value={
                    "communication": 0.30,
                    "confidence": 0.25,
                    "technical": 0.30,
                    "professionalism": 0.15
                },
                description="Evaluation rubric weight distribution"
            ))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding initial data: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize tables and seed data
    init_db()
    seed_initial_data()
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for SmartHire AI: AI-Powered Mock Interview and Candidate Assessment Platform",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "smarthire-backend"}
