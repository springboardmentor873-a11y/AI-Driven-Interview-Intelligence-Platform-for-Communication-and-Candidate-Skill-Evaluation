from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import require_roles
from ..models import User, Role
from ..schemas import UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    return db.scalars(select(User).order_by(User.id)).all()


@router.patch("/{user_id}/active", response_model=UserOut)
def set_active(user_id: int, is_active: bool, db: Session = Depends(get_db),
               admin: User = Depends(require_roles(Role.admin))):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "You can't disable your own account")
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/candidates", response_model=list[UserOut])
def list_candidates(db: Session = Depends(get_db),
                    _: User = Depends(require_roles(Role.recruiter, Role.admin))):
    return db.scalars(select(User).where(User.role == Role.candidate).order_by(User.id)).all()
