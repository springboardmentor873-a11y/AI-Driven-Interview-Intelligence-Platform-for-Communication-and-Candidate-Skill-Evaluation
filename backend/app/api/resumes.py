import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.schemas.resume import ResumeOut, ResumeUploadResponse, ResumeSkillExtraction
from app.services.resume_parser import parse_resume
from app.api.deps import get_current_user, require_roles, log_activity

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}

@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a resume (PDF, TXT, MD) and execute AI skill extraction,
    experience parsing, technology detection, and education analysis.
    """
    # Validate extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Unique filename
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save to disk
    contents = await file.read()
    file_size = len(contents)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    # Parse and extract skills & metadata
    parsed_data = parse_resume(file_path)

    # Save to Database
    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        summary=parsed_data["summary"],
        skills=parsed_data["skills"],
        technologies=parsed_data["technologies"],
        experience_years=parsed_data["experience_years"],
        experience_details=parsed_data["experience_details"],
        education=parsed_data["education"],
        raw_text=parsed_data["raw_text"]
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    log_activity(
        db,
        "RESUME_UPLOAD",
        user_id=current_user.id,
        details={
            "resume_id": resume.id,
            "filename": resume.filename,
            "skills_count": len(parsed_data["skills"])
        },
        request=request
    )

    return ResumeUploadResponse(
        message="Resume uploaded and skills extracted successfully",
        resume=ResumeOut.model_validate(resume)
    )

@router.get("/", response_model=List[ResumeOut])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List resumes: Candidates see their own; Recruiters and Admins see all candidate resumes."""
    if current_user.role in [UserRole.RECRUITER, UserRole.ADMIN]:
        resumes = db.query(Resume).order_by(Resume.uploaded_at.desc()).all()
    else:
        resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).all()
    return [ResumeOut.model_validate(r) for r in resumes]

@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details for a single resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if current_user.role not in [UserRole.RECRUITER, UserRole.ADMIN] and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this resume")

    return ResumeOut.model_validate(resume)

@router.get("/{resume_id}/skills", response_model=ResumeSkillExtraction)
def get_resume_skills(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get parsed skills, technologies, and experience breakdown."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if current_user.role not in [UserRole.RECRUITER, UserRole.ADMIN] and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this resume")

    return ResumeSkillExtraction(
        skills=resume.skills or [],
        technologies=resume.technologies or [],
        experience_years=resume.experience_years or 0.0,
        experience_details=resume.experience_details or [],
        education=resume.education or [],
        summary=resume.summary
    )

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a resume and remove stored file."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if current_user.role != UserRole.ADMIN and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this resume")

    # Clean up local file if exists
    if os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except OSError:
            pass

    db.delete(resume)
    db.commit()
    log_activity(db, "RESUME_DELETE", user_id=current_user.id, details={"resume_id": resume_id}, request=request)
    return {"message": "Resume deleted successfully"}
