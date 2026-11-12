import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import repository
from app.core.clock import utcnow
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    ForbiddenError,
    InvalidTokenError,
    NotAuthenticatedError,
    OriginNotAllowedError,
)
from app.core.security import decode_access_token
from app.db.session import get_session
from app.users.models import RoleName, User, UserStatus

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user: User
    session_id: uuid.UUID


async def get_auth_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthContext:
    """Verify the JWT, then confirm against the database that session and user are still valid.

    The database check is what makes logout, suspension and expiry take effect immediately
    instead of waiting for the access token to run out.
    """
    if credentials is None:
        raise NotAuthenticatedError(headers={"WWW-Authenticate": "Bearer"})
    claims = decode_access_token(credentials.credentials, settings)
    found = await repository.get_active_session_with_user(
        db, claims.session_id, claims.user_id, utcnow()
    )
    if found is None:
        raise InvalidTokenError
    session, user = found
    if user.status != UserStatus.ACTIVE.value:
        raise InvalidTokenError
    return AuthContext(user=user, session_id=session.id)


async def get_current_user(ctx: Annotated[AuthContext, Depends(get_auth_context)]) -> User:
    return ctx.user


RoleLike = RoleName | str


def require_roles(*roles: RoleLike) -> Callable[..., Awaitable[AuthContext]]:
    """Build a dependency that admits users holding AT LEAST ONE of `roles`.

    Layering: this sits on top of `get_auth_context`, so every check below has already
    passed (valid JWT, live session, active account) and `ctx.user.roles` was loaded from
    the database during this very request. Roles are never read from the token, so a role
    change or a suspension takes effect on the next request.

    - missing/invalid credentials -> 401 (raised by `get_auth_context`)
    - authenticated but no matching role -> 403 `forbidden`
    - unknown role names raise ValueError when the route is defined (typo protection)
    - there is no role hierarchy: holding `admin` does not imply `candidate`
    """
    if not roles:
        raise ValueError("require_roles() needs at least one role")
    allowed = frozenset(RoleName(role).value for role in roles)  # ValueError on unknown names

    async def dependency(ctx: Annotated[AuthContext, Depends(get_auth_context)]) -> AuthContext:
        if allowed.isdisjoint(role.name for role in ctx.user.roles):
            raise ForbiddenError
        return ctx

    dependency.__name__ = "require_" + "_or_".join(sorted(allowed))
    return dependency


def require_role(role: RoleLike) -> Callable[..., Awaitable[AuthContext]]:
    """Single-role form of `require_roles`, e.g. `Depends(require_role("recruiter"))`."""
    return require_roles(role)


# Ready-made instances. Reuse these objects (rather than calling require_role again) so FastAPI
# resolves the dependency once per request even when it is used at router and handler level.
require_candidate = require_role(RoleName.CANDIDATE)
require_recruiter = require_role(RoleName.RECRUITER)
require_admin = require_role(RoleName.ADMIN)


async def verify_origin(request: Request, settings: Annotated[Settings, Depends(get_settings)]):
    """CSRF defence for the cookie-authenticated endpoints (refresh, logout).

    Browsers always send Origin on cross-origin POSTs. Requests without an Origin header
    (curl, mobile apps, server-to-server) are not browser-driven CSRF and are allowed.
    """
    origin = request.headers.get("origin")
    if origin is None:
        return
    allowed = {
        *settings.cors_origin_list,
        settings.frontend_origin,
        str(request.base_url).rstrip("/"),
    }
    if origin not in allowed:
        raise OriginNotAllowedError
