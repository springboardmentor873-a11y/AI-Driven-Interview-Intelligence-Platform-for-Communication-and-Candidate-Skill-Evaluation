
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.profiles import RecruiterProfile


router = APIRouter(prefix="/admin", tags=["Admin"])


# LIST ALL USERS
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN))
):
    users = db.query(User).order_by(User.id.desc()).all()

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        for user in users
    ]


# LIST PENDING RECRUITER APPLICATIONS
@router.get("/recruiters/pending")
def pending_recruiters(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN))
):
    applications = (
        db.query(RecruiterProfile, User)
        .join(User, RecruiterProfile.user_id == User.id)
        .filter(RecruiterProfile.approval_status == "pending")
        .order_by(RecruiterProfile.id.desc())
        .all()
    )

    return [
        {
            "profile_id": profile.id,
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "company_name": profile.company_name,
            "designation": profile.designation,
            "phone": profile.phone,
            "approval_status": profile.approval_status,
            "is_active": user.is_active
        }
        for profile, user in applications
    ]


# APPROVE RECRUITER
@router.put("/recruiters/{user_id}/approve")
def approve_recruiter(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN))
):
    user = db.query(User).filter(
        User.id == user_id,
        User.role == UserRole.RECRUITER
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter not found"
        )

    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == user_id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter profile not found"
        )

    if profile.approval_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rejected application cannot be approved"
        )

    profile.approval_status = "approved"
    profile.approved_by = admin.id
    profile.approved_at = datetime.now(timezone.utc)
    user.is_active = True

    db.commit()

    return {
        "message": "Recruiter approved successfully",
        "user_id": user.id,
        "approval_status": profile.approval_status,
        "is_active": user.is_active
    }


# REJECT RECRUITER
@router.put("/recruiters/{user_id}/reject")
def reject_recruiter(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN))
):
    user = db.query(User).filter(
        User.id == user_id,
        User.role == UserRole.RECRUITER
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter not found"
        )

    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == user_id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter profile not found"
        )

    profile.approval_status = "rejected"
    profile.approved_by = None
    profile.approved_at = None
    user.is_active = False

    db.commit()

    return {
        "message": "Recruiter application rejected",
        "user_id": user.id,
        "approval_status": profile.approval_status,
        "is_active": user.is_active
    }


# ACTIVATE / DEACTIVATE USER
@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN))
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.role == UserRole.RECRUITER:
        profile = db.query(RecruiterProfile).filter(
            RecruiterProfile.user_id == user_id
        ).first()

        if is_active and (
            profile is None or profile.approval_status != "approved"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Recruiter must be approved before activation"
            )

    user.is_active = is_active
    db.commit()

    return {
        "message": "User status updated successfully",
        "user_id": user.id,
        "is_active": user.is_active
    }
