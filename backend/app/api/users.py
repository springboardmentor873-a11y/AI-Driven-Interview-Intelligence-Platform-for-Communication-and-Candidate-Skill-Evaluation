from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserOut, UserUpdate
from app.api.deps import get_current_user, require_roles, log_activity

router = APIRouter()

@router.get("/", response_model=List[UserOut])
def get_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[UserRole] = None,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER])),
    db: Session = Depends(get_db)
):
    """List platform users (Admin or Recruiter access)."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.offset(skip).limit(limit).all()
    return [UserOut.model_validate(u) for u in users]

@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user by ID (Self or Admin/Recruiter)."""
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER] and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this user profile")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile information."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this user")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    # Only admins can toggle is_active
    if "is_active" in update_data and current_user.role != UserRole.ADMIN:
        del update_data["is_active"]

    for field, val in update_data.items():
        setattr(user, field, val)
    
    db.commit()
    db.refresh(user)
    log_activity(db, "USER_UPDATE", user_id=user.id, details={"updated_fields": list(update_data.keys())}, request=request)
    return UserOut.model_validate(user)

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a user account (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    log_activity(db, "USER_DELETE", user_id=current_user.id, details={"deleted_user_id": user_id}, request=request)
    return {"message": f"User {user_id} deleted successfully"}
