from fastapi import APIRouter
from app.api import auth, users, resumes, interviews, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Roles"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resume Management"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["Interview Sessions & Templates"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & System"])
