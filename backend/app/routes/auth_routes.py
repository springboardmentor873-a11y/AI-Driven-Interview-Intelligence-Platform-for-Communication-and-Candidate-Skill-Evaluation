import secrets
import hashlib

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, PasswordReset

from app.schemas import (
    UserCreate,
    UserResponse,
    UserLogin,
    TokenResponse,
    UserProfileUpdate,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)

from app.auth import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user, require_roles
from app.email_utils import send_password_reset_email
from app.auth import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user, require_roles


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# =========================
# REGISTER API
# =========================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):

    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(user_data.password)

    # Create new user
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


# =========================
# LOGIN API
# =========================

@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):

    # Check if user exists
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(
        user_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check account status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Generate JWT token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =========================
# GET CURRENT USER API
# =========================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


# =========================
# CANDIDATE DASHBOARD API
# =========================

@router.get("/candidate/dashboard")
def candidate_dashboard(
    current_user: User = Depends(require_roles("candidate"))
):
    return {
        "message": "Welcome to Candidate Dashboard",
        "user": current_user.full_name,
        "role": current_user.role
    }


# =========================
# RECRUITER DASHBOARD API
# =========================

@router.get("/recruiter/dashboard")
def recruiter_dashboard(
    current_user: User = Depends(require_roles("recruiter"))
):
    return {
        "message": "Welcome to Recruiter Dashboard",
        "user": current_user.full_name,
        "role": current_user.role
    }


# =========================
# ADMIN DASHBOARD API
# =========================

@router.get("/admin/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_roles("admin"))
):
    return {
        "message": "Welcome to Admin Dashboard",
        "user": current_user.full_name,
        "role": current_user.role
    }


# =========================
# GET ALL USERS (ADMIN ONLY)
# =========================

@router.get(
    "/users/all",
    response_model=list[UserResponse]
)
def get_all_users(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users

# =========================
# UPDATE USER PROFILE API
# =========================

@router.patch(
    "/profile",
    response_model=UserResponse
)
def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = profile_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least one field to update"
        )

    if "full_name" in update_data:
        if update_data["full_name"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name cannot be empty"
            )

        current_user.full_name = update_data["full_name"]

    if "email" in update_data:
        if update_data["email"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email cannot be empty"
            )

        existing_user = db.query(User).filter(
            User.email == update_data["email"],
            User.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

        current_user.email = update_data["email"]

    try:
        db.commit()
        db.refresh(current_user)

        return current_user

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed"
        )

@router.patch("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not verify_password(
        password_data.current_password,
        current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    try:
        # Hash and update new password
        current_user.password_hash = hash_password(
            password_data.new_password
        )

        db.commit()
        db.refresh(current_user)

        return {
            "message": "Password changed successfully"
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password update failed"
        )


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    # Find user by email
    user = db.query(User).filter(
        User.email == request.email
    ).first()

    # Do not reveal whether an email is registered
    if not user:
        return {
            "message": "If the email is registered, a password reset link will be sent."
        }

    try:
        # Invalidate previous unused reset tokens
        db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id,
            PasswordReset.is_used == False
        ).update({"is_used": True})

        # Generate secure random token
        reset_token = secrets.token_urlsafe(32)

        # Store only the token hash
        token_hash = hashlib.sha256(
            reset_token.encode()
        ).hexdigest()

        # Token expires after 15 minutes
        expiry_time = datetime.now(timezone.utc) + timedelta(minutes=15)

        reset_record = PasswordReset(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expiry_time,
            is_used=False
        )

        db.add(reset_record)
        db.commit()

        # Create frontend reset link
        reset_link = (
            f"http://localhost:5173/reset-password?token={reset_token}"
        )

        # Send reset email
        send_password_reset_email(
            receiver_email=user.email,
            reset_link=reset_link
        )

        return {
            "message": "If the email is registered, a password reset link will be sent."
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process password reset request. Please try again later."
        )



@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    # Hash the received reset token
    token_hash = hashlib.sha256(
        request.token.encode()
    ).hexdigest()

    # Find the matching reset token
    reset_record = db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.is_used == False
    ).first()

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used reset link"
        )

    # Check token expiry
    current_time = datetime.now(timezone.utc)

    if reset_record.expires_at <= current_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired. Please request a new one."
        )

    # Find associated user
    user = db.query(User).filter(
        User.id == reset_record.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found"
        )

    try:
        # Update password securely
        user.password_hash = hash_password(
            request.new_password
        )

        # Mark this token as used
        reset_record.is_used = True

        # Invalidate all other reset tokens for this user
        db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id,
            PasswordReset.id != reset_record.id,
            PasswordReset.is_used == False
        ).update({"is_used": True})

        db.commit()

        return {
            "message": "Password reset successfully. Please login with your new password."
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )
