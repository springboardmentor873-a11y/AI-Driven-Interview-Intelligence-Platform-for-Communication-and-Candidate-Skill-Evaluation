import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import repository, service
from app.admin.schemas import AdminStats, RoleAssignment, StatusUpdate, UserPage
from app.auth.dependencies import AuthContext, require_admin
from app.core.exceptions import NotFoundError
from app.db.session import get_session
from app.users.models import RoleName, UserStatus
from app.users.schemas import UserRead

# Router-level dependency: every route below is admin-only, including any added later.
router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
    responses={
        401: {"description": "Missing, invalid or expired credentials"},
        403: {"description": "Authenticated, but not an admin"},
    },
)

DB = Annotated[AsyncSession, Depends(get_session)]
Actor = Annotated[AuthContext, Depends(require_admin)]  # same object as above: resolved once


@router.get("/stats", response_model=AdminStats, summary="Platform statistics")
async def platform_stats(db: DB) -> AdminStats:
    stats = await repository.get_platform_stats(db)
    return AdminStats(**stats)


@router.get("/users", response_model=UserPage, summary="List users")
async def list_users(
    db: DB,
    q: Annotated[str | None, Query(max_length=100, description="Email contains")] = None,
    role: RoleName | None = None,
    status: UserStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> UserPage:
    users, total = await repository.search_users(
        db, q=q, role=role, status=status, limit=limit, offset=offset
    )
    return UserPage(
        items=[UserRead.from_user(u) for u in users], total=total, limit=limit, offset=offset
    )


@router.get("/users/{user_id}", response_model=UserRead, summary="Get one user")
async def get_user(user_id: uuid.UUID, db: DB) -> UserRead:
    user = await repository.get_user(db, user_id)
    if user is None:
        raise NotFoundError("User not found.")
    return UserRead.from_user(user)


@router.post("/users/{user_id}/roles", response_model=UserRead, summary="Grant a role")
async def grant_role(user_id: uuid.UUID, body: RoleAssignment, actor: Actor, db: DB) -> UserRead:
    return UserRead.from_user(await service.grant_role(db, actor, user_id, body.role))


@router.delete("/users/{user_id}/roles/{role}", response_model=UserRead, summary="Revoke a role")
async def revoke_role(user_id: uuid.UUID, role: RoleName, actor: Actor, db: DB) -> UserRead:
    return UserRead.from_user(await service.revoke_role(db, actor, user_id, role))


@router.patch(
    "/users/{user_id}/status", response_model=UserRead, summary="Suspend or reactivate a user"
)
async def update_status(user_id: uuid.UUID, body: StatusUpdate, actor: Actor, db: DB) -> UserRead:
    return UserRead.from_user(await service.set_status(db, actor, user_id, body.status))
