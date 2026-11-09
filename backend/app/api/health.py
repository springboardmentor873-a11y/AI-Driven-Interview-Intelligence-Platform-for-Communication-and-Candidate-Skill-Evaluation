import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def readiness(session: Annotated[AsyncSession, Depends(get_session)]):
    try:
        await session.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError):
        logger.exception("Readiness check failed: database unreachable")
        return JSONResponse(
            status_code=503,
            content={
                "error": {"code": "database_unavailable", "message": "Database is not reachable."}
            },
        )
    return {"status": "ready"}
