from typing import List, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import get_db
from app.models.user import User, AccountStatus
from app.models.session import UserSession

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Reusable FastAPI dependency that authenticates the user via JWT Bearer token:
    1. Extracts Bearer token from Authorization header.
    2. Cryptographically verifies JWT signature and expiration.
    3. Checks if the session has been revoked (e.g. logged out).
    4. Retrieves user from PostgreSQL and verifies active account status.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Decode and verify JWT
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is invalid (missing user ID).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if session was revoked in PostgreSQL (logout)
    revoked_session = (
        db.query(UserSession)
        .filter(UserSession.session_token == token, UserSession.is_active.is_(False))
        .first()
    )
    if revoked_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or logged out. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from PostgreSQL
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this token no longer exists.",
        )

    # Check account status
    if not user.is_active or user.account_status != AccountStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: User account is currently {user.account_status}. Please contact support.",
        )

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that guarantees the current user has an active account status."""
    return current_user


class RoleChecker:
    """Dependency class to enforce Role-Based Access Control (RBAC)."""

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [role.lower() for role in allowed_roles]

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.lower()
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User with role '{current_user.role}' lacks permission for this endpoint. Required role(s): {self.allowed_roles}.",
            )
        return current_user


# Role-Based Access Control (RBAC) guards
require_candidate = RoleChecker(["candidate", "admin"])
require_recruiter = RoleChecker(["recruiter", "admin"])
require_admin = RoleChecker(["admin"])

# Strict single-role guards
require_candidate_only = RoleChecker(["candidate"])
require_recruiter_only = RoleChecker(["recruiter"])


def verify_resource_ownership(resource_user_id: str, current_user: User, resource_name: str = "resource") -> None:
    """
    Enforces resource isolation: Users can only manage their own data.
    Admins are permitted administrative bypass.
    """
    if current_user.role.lower() != "admin" and str(current_user.id) != str(resource_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: You do not have permission to manage this {resource_name}.",
        )

