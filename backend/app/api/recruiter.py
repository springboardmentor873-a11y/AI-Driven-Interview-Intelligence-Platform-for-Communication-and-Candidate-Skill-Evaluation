
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.dependencies import require_roles
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.profiles import CandidateProfile, RecruiterProfile
from app.models.resume import Resume
from app.schemas.resume import ParsedResumeResponse
from app.services.resume_parser import parse_resume


router = APIRouter(prefix="/recruiter", tags=["Recruiter"])

UPLOAD_DIR = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "resumes"
)


# ==========================================
# VERIFY APPROVED RECRUITER
# ==========================================

def get_approved_recruiter(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.RECRUITER)
    )
):
    profile = db.query(RecruiterProfile).filter(
        RecruiterProfile.user_id == current_user.id
    ).first()

    if profile is None or profile.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only approved recruiters can access candidates"
        )

    return current_user


# ==========================================
# VERIFY RESUME FILE PATH
# ==========================================

def get_safe_resume_path(resume: Resume) -> Path:
    file_path = (
        UPLOAD_DIR / Path(resume.file_path).name
    ).resolve()

    if file_path.parent != UPLOAD_DIR.resolve():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid resume file path"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file is missing"
        )

    return file_path


# ==========================================
# LIST CANDIDATES
# ==========================================

@router.get("/candidates")
def list_candidates(
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    query = (
        db.query(User, CandidateProfile)
        .outerjoin(
            CandidateProfile,
            CandidateProfile.user_id == User.id
        )
        .filter(User.role == UserRole.CANDIDATE)
    )

    if search and search.strip():
        term = f"%{search.strip()}%"

        query = query.filter(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                CandidateProfile.education.ilike(term),
                CandidateProfile.bio.ilike(term)
            )
        )

    candidates = query.order_by(User.created_at.desc()).all()

    results = []

    for candidate, profile in candidates:
        resumes = (
            db.query(Resume)
            .filter(Resume.user_id == candidate.id)
            .order_by(Resume.uploaded_at.desc())
            .all()
        )

        results.append({
            "candidate_id": candidate.id,
            "full_name": candidate.full_name,
            "email": candidate.email,
            "created_at": candidate.created_at,
            "profile": {
                "phone": profile.phone if profile else None,
                "education": profile.education if profile else None,
                "experience_years": (
                    profile.experience_years if profile else 0
                ),
                "bio": profile.bio if profile else None
            },
            "resumes": [
                {
                    "id": resume.id,
                    "original_filename": resume.original_filename,
                    "file_type": resume.file_type,
                    "uploaded_at": resume.uploaded_at
                }
                for resume in resumes
            ],
            "resume_count": len(resumes)
        })

    return {
        "total": len(results),
        "candidates": results
    }


# ==========================================
# VIEW CANDIDATE DETAILS
# ==========================================

@router.get("/candidates/{candidate_id}")
def get_candidate_details(
    candidate_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    candidate = db.query(User).filter(
        User.id == candidate_id,
        User.role == UserRole.CANDIDATE
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    profile = db.query(CandidateProfile).filter(
        CandidateProfile.user_id == candidate.id
    ).first()

    resumes = db.query(Resume).filter(
        Resume.user_id == candidate.id
    ).order_by(Resume.uploaded_at.desc()).all()

    return {
        "candidate_id": candidate.id,
        "full_name": candidate.full_name,
        "email": candidate.email,
        "created_at": candidate.created_at,
        "profile": {
            "phone": profile.phone if profile else None,
            "education": profile.education if profile else None,
            "experience_years": (
                profile.experience_years if profile else 0
            ),
            "bio": profile.bio if profile else None
        },
        "resumes": [
            {
                "id": resume.id,
                "original_filename": resume.original_filename,
                "file_type": resume.file_type,
                "uploaded_at": resume.uploaded_at
            }
            for resume in resumes
        ]
    }


# ==========================================
# DOWNLOAD CANDIDATE RESUME
# ==========================================

@router.get("/resumes/{resume_id}/download")
def download_candidate_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    resume = (
        db.query(Resume)
        .join(User, Resume.user_id == User.id)
        .filter(
            Resume.id == resume_id,
            User.role == UserRole.CANDIDATE
        )
        .first()
    )

    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate resume not found"
        )

    file_path = get_safe_resume_path(resume)

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=resume.original_filename
    )


# ==========================================
# AI ANALYSIS OF CANDIDATE RESUME
# ==========================================

@router.get(
    "/resumes/{resume_id}/parse",
    response_model=ParsedResumeResponse
)
def analyze_candidate_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    resume = (
        db.query(Resume)
        .join(User, Resume.user_id == User.id)
        .filter(
            Resume.id == resume_id,
            User.role == UserRole.CANDIDATE
        )
        .first()
    )

    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate resume not found"
        )

    file_path = get_safe_resume_path(resume)

    try:
        return parse_resume(str(file_path))

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc)
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found"
        )
