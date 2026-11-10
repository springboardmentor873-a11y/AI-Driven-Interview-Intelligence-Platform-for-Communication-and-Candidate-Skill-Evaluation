import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import repository
from app.core.clock import utcnow
from app.core.config import Settings, get_settings
from app.core.exceptions import InvalidTokenError, NotAuthenticatedError, OriginNotAllowedError
from app.core.security import decode_access_token
from app.db.session import get_session
from app.users.models import User, UserStatus

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
        raise NotAuthenticatedError
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
