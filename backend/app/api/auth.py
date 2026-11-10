from app.core.dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])



@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered"
        )

    if user_data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public admin registration is not allowed"
        )

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        is_active=(user_data.role == UserRole.CANDIDATE)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user




@router.post("/login", response_model=TokenResponse)
def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if not user or not verify_password(
        user_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    if user.role != user_data.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is not registered as a {user_data.role.value}"
        )

    access_token = create_access_token(
        user_id=user.id,
        role=user.role.value
    )

    return TokenResponse(access_token=access_token)



@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.get("/admin-test")
def admin_test(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    )
):
    return {
        "message": "Admin access granted",
        "user": current_user.full_name,
        "role": current_user.role.value
    }

@router.get("/recruiter-test")
def recruiter_test(
    current_user: User = Depends(
        require_roles(UserRole.RECRUITER)
    )
):
    return {
        "message": "Recruiter access granted",
        "user": current_user.full_name,
        "role": current_user.role.value
    }
