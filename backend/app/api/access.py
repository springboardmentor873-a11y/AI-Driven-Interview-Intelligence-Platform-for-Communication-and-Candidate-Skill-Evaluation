"""Minimal protected endpoints demonstrating each role. Not business modules.

They show the pattern future modules should copy: declare the required role as a dependency.
There is no hierarchy; each endpoint admits only users who hold the named role.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.dependencies import AuthContext, require_admin, require_candidate, require_recruiter

router = APIRouter(
    tags=["access-demo"],
    responses={
        401: {"description": "Missing, invalid or expired credentials"},
        403: {"description": "Authenticated, but lacks the required role"},
    },
)


class AccessPing(BaseModel):
    area: str
    user_id: uuid.UUID
    roles: list[str]


def _ping(area: str, ctx: AuthContext) -> AccessPing:
    return AccessPing(
        area=area, user_id=ctx.user.id, roles=sorted(role.name for role in ctx.user.roles)
    )


@router.get("/candidate/ping", response_model=AccessPing, summary="Candidates only")
async def candidate_ping(ctx: Annotated[AuthContext, Depends(require_candidate)]) -> AccessPing:
    return _ping("candidate", ctx)


@router.get("/recruiter/ping", response_model=AccessPing, summary="Recruiters only")
async def recruiter_ping(ctx: Annotated[AuthContext, Depends(require_recruiter)]) -> AccessPing:
    return _ping("recruiter", ctx)


@router.get("/admin/ping", response_model=AccessPing, summary="Admins only")
async def admin_ping(ctx: Annotated[AuthContext, Depends(require_admin)]) -> AccessPing:
    return _ping("admin", ctx)
