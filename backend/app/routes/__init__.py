from fastapi import APIRouter
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.resumes import router as resumes_router
from app.routes.interviews import router as interviews_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(resumes_router)
api_router.include_router(interviews_router)

__all__ = ["api_router"]
