from urllib.parse import urlencode, quote
import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import User, Role
from ..schemas import (RegisterIn, LoginIn, RefreshIn, TokenOut, UserOut,
                       ProfileUpdate, PasswordChange)
from ..security import (hash_password, verify_password, create_access_token,
                        create_refresh_token, decode_token, create_state_token)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _tokens(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(full_name=data.full_name.strip(), email=email,
                hashed_password=hash_password(data.password), role=Role(data.role))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _tokens(user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    return _tokens(user)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    try:
        user_id = decode_token(data.refresh_token, "refresh")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return _tokens(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.full_name = data.full_name.strip()
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", status_code=204)
def change_password(data: PasswordChange, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if not user.hashed_password or not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return Response(status_code=204)


# ---------------- Google OAuth2 (authorization-code flow) ----------------
def _google_enabled() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


@router.get("/providers")
def providers():
    return {"google": _google_enabled()}


@router.get("/google/login")
def google_login():
    if not _google_enabled():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google login is not configured")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": create_state_token(),
        "prompt": "select_account",
    }
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))


@router.get("/google/callback")
def google_callback(code: str | None = None, state: str | None = None,
                    error: str | None = None, db: Session = Depends(get_db)):
    if not _google_enabled():
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google login is not configured")

    def fail(msg: str):
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error={quote(msg)}")

    if error or not code or not state:
        return fail("Google sign-in was cancelled")
    try:
        decode_token(state, "oauth_state")
    except jwt.PyJWTError:
        return fail("Sign-in session expired. Try again")
    try:
        tok = httpx.post("https://oauth2.googleapis.com/token", timeout=10, data={
            "code": code, "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI, "grant_type": "authorization_code"})
        tok.raise_for_status()
        info = httpx.get("https://www.googleapis.com/oauth2/v3/userinfo", timeout=10,
                         headers={"Authorization": f"Bearer {tok.json()['access_token']}"})
        info.raise_for_status()
        info = info.json()
    except (httpx.HTTPError, KeyError):
        return fail("Could not verify your Google account")
    if not info.get("email") or not info.get("email_verified"):
        return fail("Your Google email is not verified")

    email = info["email"].lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(full_name=info.get("name") or email.split("@")[0], email=email,
                    hashed_password=None, auth_provider="google", role=Role.candidate)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_active:
        return fail("Account is disabled")
    t = _tokens(user)
    frag = urlencode({"access_token": t.access_token, "refresh_token": t.refresh_token})
    return RedirectResponse(f"{settings.FRONTEND_URL}/oauth/callback#{frag}")
