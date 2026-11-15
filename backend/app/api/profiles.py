
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.profiles import CandidateProfile, RecruiterProfile

from app.schemas.profiles import (
    CandidateProfileUpdate,
    CandidateProfileResponse,
    RecruiterProfileUpdate,
    RecruiterProfileResponse,
)

router = APIRouter(prefix="/profiles", tags=["Profiles"])


# CANDIDATE PROFILE

@router.get(
    "/candidate/me",
    response_model=CandidateProfileResponse
)
def get_candidate_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE))
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )

    return profile


@router.put(
    "/candidate/me",
    response_model=CandidateProfileResponse
)
def update_candidate_profile(
    profile_data: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE))
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )

    update_data = profile_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile


# RECRUITER PROFILE

@router.get(
    "/recruiter/me",
    response_model=RecruiterProfileResponse
)
def get_recruiter_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RECRUITER))
):
    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter profile not found"
        )

    return profile


@router.put(
    "/recruiter/me",
    response_model=RecruiterProfileResponse
)
def update_recruiter_profile(
    profile_data: RecruiterProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.RECRUITER))
):
    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter profile not found"
        )

    update_data = profile_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile
