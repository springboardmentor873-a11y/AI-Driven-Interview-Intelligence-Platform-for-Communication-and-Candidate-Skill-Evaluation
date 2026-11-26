
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.profiles import router as profiles_router
from app.api.resume import router as resume_router
from app.api.recruiter import router as recruiter_router
from app.api.interview_templates import router as interview_templates_router
from app.api.interview_sessions import router as interview_sessions_router


app = FastAPI(
    title="SmartHire AI",
    description="AI-Powered Mock Interview and Candidate Assessment Platform",
    version="1.0.0"
)


# CORS CONFIGURATION
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


# REGISTER API ROUTERS
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(profiles_router)
app.include_router(resume_router)
app.include_router(recruiter_router)
app.include_router(interview_templates_router)
app.include_router(interview_sessions_router)

@app.get("/")
def home():
    return {
        "project": "SmartHire AI",
        "message": "Welcome to SmartHire AI Backend",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FastAPI Backend"
    }

