from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from app.db.database import get_db
from app.models.user import User
from app.models.email_otp import EmailOTP
from app.schemas.auth import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
    AuthResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services.otp_service import (
    generate_otp,
    hash_otp,
    otp_expiry,
    verify_otp
)
from app.services.email_service import send_otp_email
from app.core.security import create_access_token
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

password_hash = PasswordHash.recommended()


# USER REGISTRATION
@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED
)
async def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    if data.role not in ["job_seeker", "recruiter"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    otp = generate_otp()

    new_user = User(
        full_name=data.full_name,
        email=email,
        hashed_password=password_hash.hash(data.password),
        role=data.role,
        is_verified=False
    )

    db.add(new_user)
    db.flush()

    new_otp = EmailOTP(
        user_id=new_user.id,
        otp_hash=hash_otp(otp),
        expires_at=otp_expiry(),
        is_used=False,
        attempts=0
    )

    db.add(new_otp)

    try:
        await send_otp_email(email, otp)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Unable to complete registration or send verification email."
        )

    return {
        "message": "Registration successful. Please verify your email."
    }


# EMAIL OTP VERIFICATION
@router.post(
    "/verify-otp",
    response_model=AuthResponse
)
def verify_email_otp(
    data: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Email already verified"
        )

    otp_record = db.query(EmailOTP).filter(
        EmailOTP.user_id == user.id,
        EmailOTP.is_used == False
    ).order_by(
        EmailOTP.created_at.desc()
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found")

    if otp_record.attempts >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts")

    otp_record.attempts += 1
    expiry = otp_record.expires_at

    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if expiry <= datetime.now(timezone.utc):
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired")

    if not verify_otp(data.otp, otp_record.otp_hash):
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")

    otp_record.is_used = True
    user.is_verified = True

    db.commit()

    return {"message": "Email verified successfully!"}


# USER LOGIN
@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not password_hash.verify(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email first"
        )

    token = create_access_token(
        user_id=user.id,
        role=user.role
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Login successful"
    }


# FORGOT PASSWORD - SEND RESET OTP
@router.post(
    "/forgot-password",
    response_model=AuthResponse
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    user = db.query(User).filter(
        User.email == email,
        User.is_verified == True
    ).first()

    # Same response whether account exists or not
    if not user:
        return {
            "message": "If the account exists, a password reset OTP has been sent."
        }

    otp = generate_otp()

    # Invalidate older unused OTP records
    db.query(EmailOTP).filter(
        EmailOTP.user_id == user.id,
        EmailOTP.is_used == False
    ).update(
        {"is_used": True},
        synchronize_session=False
    )

    new_otp = EmailOTP(
        user_id=user.id,
        otp_hash=hash_otp(otp),
        expires_at=otp_expiry(),
        is_used=False,
        attempts=0
    )

    db.add(new_otp)

    try:
        await send_otp_email(email, otp)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Unable to send password reset email."
        )

    return {
        "message": "If the account exists, a password reset OTP has been sent."
    }


# RESET PASSWORD
@router.post(
    "/reset-password",
    response_model=AuthResponse
)
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    email = data.email.lower().strip()

    user = db.query(User).filter(
        User.email == email,
        User.is_verified == True
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset OTP"
        )

    otp_record = db.query(EmailOTP).filter(
        EmailOTP.user_id == user.id,
        EmailOTP.is_used == False
    ).order_by(
        EmailOTP.created_at.desc()
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset OTP"
        )

    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many OTP attempts"
        )

    expiry = otp_record.expires_at

    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)

    if expiry <= datetime.now(timezone.utc):
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Reset OTP expired"
        )

    otp_record.attempts += 1

    if not verify_otp(data.otp, otp_record.otp_hash):
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Invalid reset OTP"
        )

    # Save new password securely
    user.hashed_password = password_hash.hash(data.new_password)

    # OTP can only be used once
    otp_record.is_used = True

    db.commit()

    return {
        "message": "Password reset successful. Please login with your new password."
    }


# PROTECTED USER PROFILE
@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at
    }