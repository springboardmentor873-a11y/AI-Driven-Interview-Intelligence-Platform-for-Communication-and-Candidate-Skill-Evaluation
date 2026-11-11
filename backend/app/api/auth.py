from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, OAuth2LoginRequest
from app.api.deps import get_current_user, log_activity

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user account with role-based access."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone,
        organization=user_in.organization,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_activity(db, "USER_REGISTER", user_id=new_user.id, details={"role": new_user.role.value}, request=request)

    token = create_access_token(subject=new_user.id, role=new_user.role.value)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(new_user)
    )

@router.post("/login", response_model=Token)
def login(
    user_in: Optional[UserLogin] = None,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Authenticate via JSON payload or OAuth2 standard form data."""
    email = None
    password = None

    if user_in:
        email = user_in.email.lower()
        password = user_in.password
    elif form_data:
        email = form_data.username.lower()
        password = form_data.password

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email/username and password required"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    log_activity(db, "USER_LOGIN", user_id=user.id, details={"email": user.email}, request=request)

    token = create_access_token(subject=user.id, role=user.role.value)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/oauth2", response_model=Token)
def oauth2_login(oauth_in: OAuth2LoginRequest, request: Request, db: Session = Depends(get_db)):
    """OAuth2 Social Authentication (Google, GitHub)."""
    email = oauth_in.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Auto-provision new OAuth2 user
        user = User(
            email=email,
            hashed_password=get_password_hash("OAUTH_EXTERNAL_SESSION"),
            full_name=oauth_in.full_name,
            role=oauth_in.role or UserRole.CANDIDATE,
            organization="Social Login",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_activity(db, "OAUTH_USER_CREATED", user_id=user.id, details={"provider": oauth_in.provider}, request=request)
    else:
        log_activity(db, "OAUTH_LOGIN", user_id=user.id, details={"provider": oauth_in.provider}, request=request)

    token = create_access_token(subject=user.id, role=user.role.value)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user profile."""
    return UserOut.model_validate(current_user)

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Log out current user and create audit trail."""
    log_activity(db, "USER_LOGOUT", user_id=current_user.id, request=request)
    return {"message": "Successfully logged out"}
