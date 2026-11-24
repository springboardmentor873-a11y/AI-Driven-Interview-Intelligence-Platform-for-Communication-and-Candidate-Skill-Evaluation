from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User, UserRole, AccountStatus
from app.models.session import UserSession
from app.models.profile import CandidateProfile, RecruiterProfile
from app.schemas.user import UserRegister, UserLogin, UserResponse, RegistrationSuccessResponse
from app.schemas.token import Token, UserSummary
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user, security_scheme
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegistrationSuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Public User Registration",
    description="Registers a new Candidate or Recruiter account with password strength and email uniqueness checks.",
)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Public Registration Endpoint:
    - Supported roles: Candidate, Recruiter.
    - Security: Admin accounts cannot be registered publicly.
    - Enforces: Password complexity, matching confirmation, and unique email.
    - Hashes password with bcrypt before persisting to PostgreSQL.
    """
    # 1. Check whether the email address already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with the email '{user_in.email}' already exists. Please log in or use a different email.",
        )

    # 2. Hash password securely (bcrypt with 12 salt rounds)
    hashed_pwd = hash_password(user_in.password)

    # 3. Create the User entity
    user = User(
        full_name=user_in.full_name,
        email=user_in.email.lower(),
        phone_number=user_in.phone_number,
        hashed_password=hashed_pwd,
        role=user_in.role.value,
        account_status=AccountStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()  # Flush so user.id is generated for relational profile

    # 4. Initialize domain profile based on role
    if user.role == UserRole.CANDIDATE.value:
        candidate_profile = CandidateProfile(user_id=user.id)
        db.add(candidate_profile)
    elif user.role == UserRole.RECRUITER.value:
        recruiter_profile = RecruiterProfile(user_id=user.id)
        db.add(recruiter_profile)

    # 5. Commit transaction to database
    db.commit()
    db.refresh(user)

    return RegistrationSuccessResponse(
        status="success",
        message=f"User account created successfully as {user.role.capitalize()}.",
        user=user,
    )


@router.post(
    "/login",
    response_model=Token,
    summary="User Login & JWT Issuance",
    description="Authenticates credentials, verifies active status, issues JWT token, and records session.",
)
def login_user(user_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    User Login:
    - Verifies email and bcrypt password hash.
    - Checks account_status is 'active'.
    - Returns JWT access token and records session in user_sessions table.
    """
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != AccountStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: User account is currently {user.account_status}. Please contact support.",
        )

    # Generate JWT access token with user_id, role, and email
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        email=user.email,
    )

    # Record User Session in PostgreSQL
    expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    user_session = UserSession(
        user_id=user.id,
        session_token=access_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        session_info=f"Client: {request.headers.get('sec-ch-ua', 'Standard Client')}",
        expires_at=expires_at,
        is_active=True,
    )
    db.add(user_session)
    db.commit()

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        expires_in=expires_seconds,
        user=UserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            account_status=user.account_status,
        ),
    )


@router.post(
    "/logout",
    summary="User Logout & Token Revocation",
    description="Revokes the current authentication token and deactivates the session in PostgreSQL.",
)
def logout_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    User Logout:
    - Identifies active session token from Authorization Bearer header.
    - Sets is_active = False in user_sessions table.
    - Token is permanently rejected for future requests.
    """
    if credentials:
        token = credentials.credentials
        session_record = (
            db.query(UserSession)
            .filter(UserSession.session_token == token, UserSession.user_id == current_user.id)
            .first()
        )
        if session_record:
            session_record.is_active = False
            db.commit()

    return {
        "status": "success",
        "message": f"Successfully logged out {current_user.email}. Authentication session revoked.",
    }


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Authenticated User Profile",
    description="Returns full profile of currently authenticated user.",
)
def get_current_authenticated_user(current_user: User = Depends(get_current_user)):
    """Returns profile data of the currently logged-in user."""
    return current_user
