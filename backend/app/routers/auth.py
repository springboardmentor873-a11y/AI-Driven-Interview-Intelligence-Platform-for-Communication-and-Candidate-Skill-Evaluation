import hashlib
import secrets
from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import PasswordResetToken, User, utcnow
from ..ratelimit import limit
from ..security import create_access_token, get_current_user, hash_password, password_problem, verify_password
from ..serializers import user_out
from ..services.notify import audit, send_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_limit = Depends(limit("rate_limit_auth"))


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=120)
    role: str = "candidate"
    consent: bool = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class GoogleIn(BaseModel):
    credential: str
    consent: bool = False


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class PasswordIn(BaseModel):
    current_password: str = ""
    new_password: str = Field(min_length=8, max_length=128)


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


def _token_response(user: User) -> dict:
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": user_out(user),
            "expires_in": settings.access_token_minutes * 60}


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.get("/config")
def public_config():
    return {"google_client_id": settings.google_client_id,
            "allow_recruiter_signup": settings.allow_recruiter_signup,
            "company_name": settings.company_name, "support_email": settings.support_email,
            "grievance_officer": settings.grievance_officer,
            "retention": {"audio_days": settings.retention_audio_days, "recording_days": settings.retention_recording_days},
            "demo": settings.seed_demo and not settings.is_production}


@router.post("/register", dependencies=[auth_limit])
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if not body.consent:
        raise HTTPException(400, "Please accept the privacy notice to create an account")
    role = body.role if body.role in ("candidate", "recruiter") else "candidate"
    if role == "recruiter" and not settings.allow_recruiter_signup:
        raise HTTPException(403, "Recruiter accounts are created by an administrator")
    if problem := password_problem(body.password):
        raise HTTPException(400, problem)
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(400, "An account with this email already exists. Sign in or reset your password.")
    user = User(email=body.email.lower(), name=body.name.strip(), hashed_password=hash_password(body.password),
                role=role, last_login=utcnow(), consent_at=utcnow())
    db.add(user)
    db.commit()
    audit(db, user.id, "register", role)
    return _token_response(user)


@router.post("/login", dependencies=[auth_limit])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    now = utcnow()
    if user and user.locked_until and user.locked_until > now:
        mins = int((user.locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(423, f"Too many failed attempts. Try again in {mins} minutes or reset your password.")
    if not user or not verify_password(body.password, user.hashed_password):
        if user:
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= settings.max_failed_logins:
                user.locked_until = now + timedelta(minutes=settings.lockout_minutes)
                user.failed_logins = 0
                audit(db, user.id, "account_locked", "too many failed logins")
            db.commit()
        raise HTTPException(401, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been disabled. Contact your administrator.")
    user.failed_logins, user.locked_until, user.last_login = 0, None, now
    db.commit()
    audit(db, user.id, "login")
    return _token_response(user)


@router.post("/google", dependencies=[auth_limit])
def google_login(body: GoogleIn, db: Session = Depends(get_db)):
    """OAuth2 / OpenID Connect sign-in with a Google ID token from Google Identity Services."""
    if not settings.google_client_id:
        raise HTTPException(400, "Google sign-in is not configured on this server")
    try:
        r = httpx.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": body.credential}, timeout=10)
        info = r.json()
    except Exception:
        raise HTTPException(502, "Could not reach Google to verify sign-in")
    if r.status_code != 200 or info.get("aud") != settings.google_client_id or info.get("email_verified") not in ("true", True):
        raise HTTPException(401, "Google sign-in could not be verified")
    email = info["email"].lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        if not body.consent:
            raise HTTPException(400, "Please accept the privacy notice to create an account")
        user = User(email=email, name=info.get("name") or email.split("@")[0], auth_provider="google", consent_at=utcnow())
        db.add(user)
    if not user.is_active:
        raise HTTPException(403, "This account has been disabled. Contact your administrator.")
    user.last_login, user.failed_logins, user.locked_until = utcnow(), 0, None
    db.commit()
    audit(db, user.id, "login_google")
    return _token_response(user)


@router.post("/forgot-password", dependencies=[auth_limit])
def forgot_password(body: ForgotIn, db: Session = Depends(get_db)):
    """Always answers the same way so the endpoint cannot be used to discover accounts."""
    user = db.query(User).filter(User.email == body.email.lower(), User.is_active.is_(True)).first()
    if user:
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(user_id=user.id, token_hash=_hash(token),
                                  expires_at=utcnow() + timedelta(minutes=settings.reset_token_minutes)))
        db.commit()
        link = f"{settings.app_url.rstrip('/')}/reset-password?token={token}"
        send_email(user.email, f"Reset your {settings.company_name} password",
                   f"Hi {user.name},\n\nUse this link to set a new password. It expires in {settings.reset_token_minutes} minutes "
                   f"and works once.\n\n{link}\n\nIf you did not ask for this, ignore this email; your password is unchanged.")
        audit(db, user.id, "password_reset_requested")
    return {"ok": True, "message": "If that email has an account, a reset link is on its way."}


@router.post("/reset-password", dependencies=[auth_limit])
def reset_password(body: ResetIn, db: Session = Depends(get_db)):
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == _hash(body.token)).first()
    if not row or row.used or row.expires_at < utcnow():
        raise HTTPException(400, "This reset link is invalid or has expired. Request a new one.")
    if problem := password_problem(body.new_password):
        raise HTTPException(400, problem)
    user = db.get(User, row.user_id)
    user.hashed_password = hash_password(body.new_password)
    user.token_version = (user.token_version or 0) + 1  # signs out every device
    user.failed_logins, user.locked_until = 0, None
    row.used = True
    db.commit()
    audit(db, user.id, "password_reset")
    return _token_response(user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.put("/me")
def update_me(body: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.name = body.name.strip()
    db.commit()
    return user_out(user)


@router.post("/change-password")
def change_password(body: PasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.hashed_password and not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    if problem := password_problem(body.new_password):
        raise HTTPException(400, problem)
    user.hashed_password = hash_password(body.new_password)
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    audit(db, user.id, "change_password")
    return _token_response(user)


@router.post("/logout-all")
def logout_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    audit(db, user.id, "logout_all")
    return {"ok": True}
