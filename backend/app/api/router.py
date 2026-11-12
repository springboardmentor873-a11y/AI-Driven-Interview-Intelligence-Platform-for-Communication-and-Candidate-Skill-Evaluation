from fastapi import APIRouter

from app.admin.router import router as admin_router
from app.api import access, health
from app.auth.router import router as auth_router
from app.candidate.router import router as candidate_router
from app.recruiter.router import router as recruiter_router
from app.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(access.router)
api_router.include_router(candidate_router)
api_router.include_router(recruiter_router)
api_router.include_router(admin_router)
