from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User, UserRole, AccountStatus
from app.models.profile import CandidateProfile, RecruiterProfile
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserStatusUpdate,
    AdminUserCreate,
    RegistrationSuccessResponse,
)
from app.core.security import hash_password
from app.schemas.profile import (
    CandidateProfileUpdate,
    CandidateProfileResponse,
    RecruiterProfileUpdate,
    RecruiterProfileResponse,
)
from app.core.dependencies import (
    get_current_user,
    require_candidate,
    require_recruiter,
    require_admin,
    verify_resource_ownership,
)

router = APIRouter(prefix="/users", tags=["Users & Profiles"])


# =====================================================================
# 1. Common Authenticated User Endpoints (All Logged-in Users)
# =====================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
    description="Retrieve account details and domain-specific profile of the currently logged-in user.",
)
def read_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve details and domain profile of the currently logged-in user."""
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update Personal Account Details",
    description="Update personal details (name, email, phone). Security Note: Users cannot alter their assigned role.",
)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update core personal account details.
    Security: Users cannot change their own role to Admin through this endpoint.
    """
    if user_update.email and user_update.email.lower() != current_user.email:
        existing = db.query(User).filter(User.email == user_update.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already in use by another account.",
            )
        current_user.email = user_update.email.lower()

    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    if user_update.phone_number is not None:
        current_user.phone_number = user_update.phone_number

    db.commit()
    db.refresh(current_user)
    return current_user


# =====================================================================
# 2. Candidate Role Specific Endpoints (Candidate / Admin)
# =====================================================================

@router.get(
    "/me/candidate-profile",
    response_model=CandidateProfileResponse,
    summary="Get Candidate Profile",
    description="Retrieve the domain-specific profile for the authenticated candidate.",
)
def get_candidate_profile(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Retrieve candidate profile (headline, skills, experience, portfolio links)."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put(
    "/me/candidate-profile",
    response_model=CandidateProfileResponse,
    summary="Update Candidate Profile",
    description="Update candidate-specific profile details (headline, skills, experience, links).",
)
def update_candidate_profile(
    profile_data: CandidateProfileUpdate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Update candidate-specific profile (headline, skills, experience, links)."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)

    update_dict = profile_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


# =====================================================================
# 3. Recruiter Role Specific Endpoints (Recruiter / Admin)
# =====================================================================

@router.get(
    "/me/recruiter-profile",
    response_model=RecruiterProfileResponse,
    summary="Get Recruiter Profile",
    description="Retrieve recruiter-specific profile (company name, website, designation).",
)
def get_recruiter_profile(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Retrieve recruiter-specific profile details."""
    profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).first()
    if not profile:
        profile = RecruiterProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put(
    "/me/recruiter-profile",
    response_model=RecruiterProfileResponse,
    summary="Update Recruiter Profile",
    description="Update recruiter company name, designation, website, and company bio.",
)
def update_recruiter_profile(
    profile_data: RecruiterProfileUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Update recruiter company and professional metadata."""
    profile = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == current_user.id).first()
    if not profile:
        profile = RecruiterProfile(user_id=current_user.id)
        db.add(profile)

    update_dict = profile_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get(
    "/candidates",
    response_model=List[UserResponse],
    summary="Search & List Candidates",
    description="Recruiter / Admin access to discover active candidates with resumes and profiles.",
)
def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by candidate name or email"),
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Search and list registered candidates for recruiters."""
    query = db.query(User).filter(
        User.role == UserRole.CANDIDATE.value,
        User.account_status == AccountStatus.ACTIVE.value
    )
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_filter)) | (User.email.ilike(search_filter))
        )
    return query.offset(skip).limit(limit).all()


@router.get(
    "/candidates/{candidate_id}",
    response_model=UserResponse,
    summary="View Candidate Details",
    description="Permitted view of a specific candidate's profile and resumes for authorized recruiters/admins.",
)
def get_candidate_details(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    """Retrieve detailed candidate information for authorized recruiters and admins."""
    candidate = db.query(User).filter(
        User.id == candidate_id,
        User.role == UserRole.CANDIDATE.value,
        User.account_status == AccountStatus.ACTIVE.value
    ).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found or candidate account is not active.",
        )
    return candidate


# =====================================================================
# 4. Administrator Role Endpoints (Admin Only)
# =====================================================================

@router.get(
    "/admin/stats",
    summary="Platform User Statistics",
    description="Administrative metrics showing user counts categorized by role and account status.",
)
def get_platform_stats_admin(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Administrative metrics: user counts by role and account status."""
    total_users = db.query(User).count()
    total_candidates = db.query(User).filter(User.role == UserRole.CANDIDATE.value).count()
    total_recruiters = db.query(User).filter(User.role == UserRole.RECRUITER.value).count()
    total_admins = db.query(User).filter(User.role == UserRole.ADMIN.value).count()
    active_users = db.query(User).filter(User.account_status == AccountStatus.ACTIVE.value).count()
    suspended_users = db.query(User).filter(User.account_status == AccountStatus.SUSPENDED.value).count()

    return {
        "status": "success",
        "data": {
            "total_users": total_users,
            "candidates": total_candidates,
            "recruiters": total_recruiters,
            "admins": total_admins,
            "active_users": active_users,
            "suspended_users": suspended_users,
        }
    }


@router.get(
    "/admin/users",
    response_model=List[UserResponse],
    summary="Admin User Management: List All Users",
    description="Full administrative overview of all registered accounts with role and status filtering.",
)
def get_all_users_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = Query(None, description="Filter by role: candidate, recruiter, admin"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Administrative overview of all platform users."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role.lower())
    return query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()


@router.get(
    "/admin/users/{user_id}",
    response_model=UserResponse,
    summary="Admin Inspection: Get User by ID",
    description="Administrative inspection of any registered user account on the platform.",
)
def get_user_by_id_admin(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin inspection: Retrieve full details for any user account on the platform."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )
    return user


@router.patch(
    "/admin/users/{user_id}/status",
    response_model=UserResponse,
    summary="Admin Control: Update Account Status & Role",
    description="Allows administrators to activate, deactivate, suspend users, or promote/demote roles.",
)
def update_user_status_admin(
    user_id: str,
    status_in: UserStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin control: Activate/deactivate an account or change role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Prevent admin from deactivating their own administrative account
    if user.id == current_user.id and (
        status_in.account_status == AccountStatus.SUSPENDED or status_in.is_active is False
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate or suspend your own administrative account.",
        )

    # Prevent admin from removing their own admin role
    if user.id == current_user.id and status_in.role is not None and status_in.role.value != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote your own administrative role.",
        )

    if status_in.account_status is not None:
        user.account_status = status_in.account_status.value
    elif status_in.is_active is not None:
        user.account_status = AccountStatus.ACTIVE.value if status_in.is_active else AccountStatus.INACTIVE.value

    if status_in.role is not None:
        user.role = status_in.role.value

    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/admin/create-admin",
    response_model=RegistrationSuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Authorized Admin Provisioning",
    description="Authorized endpoint: Allows an authenticated Admin to create a new Administrator account.",
)
def create_admin_user(
    admin_in: AdminUserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Authorized Administrative Endpoint:
    Allows an existing Admin to provision a new Administrator account.
    Restricted: Unauthenticated or non-admin users receive 403 Forbidden.
    """
    existing_user = db.query(User).filter(User.email == admin_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{admin_in.email}' already exists.",
        )

    user = User(
        full_name=admin_in.full_name,
        email=admin_in.email.lower(),
        phone_number=admin_in.phone_number,
        hashed_password=hash_password(admin_in.password),
        role=UserRole.ADMIN.value,
        account_status=AccountStatus.ACTIVE.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegistrationSuccessResponse(
        status="success",
        message="New Administrator account provisioned successfully.",
        user=user,
    )
