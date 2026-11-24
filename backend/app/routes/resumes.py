import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.schemas.resume import ResumeResponse
from app.services.file_service import FileService
from app.core.dependencies import get_current_user, require_candidate, verify_resource_ownership

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX, max 5MB)"),
    is_primary: bool = Form(True, description="Mark as primary default resume"),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Upload a new resume for the authenticated candidate."""
    original_filename, stored_filename, file_size, destination_path = await FileService.save_resume_file(file)

    resume_record = Resume(
        user_id=current_user.id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=destination_path,
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        upload_status="uploaded",
    )
    db.add(resume_record)
    db.commit()
    db.refresh(resume_record)
    return resume_record


@router.get("/my-resumes", response_model=List[ResumeResponse])
def get_my_resumes(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """List all resumes uploaded by the current candidate."""
    return db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.uploaded_at.desc()).all()


@router.get("/download/{resume_id}")
def download_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a resume file (Candidate owner or Recruiter/Admin)."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume record not found.",
        )

    # RBAC: Candidates may only download their own resumes. Recruiters and Admins are permitted to view/download.
    if current_user.role == UserRole.CANDIDATE.value and resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Candidates can only access their own uploaded resumes.",
        )

    if not os.path.exists(resume.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file does not exist on disk storage.",
        )

    return FileResponse(
        path=resume.file_path,
        filename=resume.original_filename,
        media_type=resume.file_type,
    )


@router.delete("/{resume_id}", status_code=status.HTTP_200_OK)
def delete_resume(
    resume_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Delete a candidate's resume (Candidate owner or Admin only)."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # Enforce strict resource ownership: Candidates can only delete their own resume
    verify_resource_ownership(resume.user_id, current_user, "resume")

    FileService.delete_file(resume.file_path)
    db.delete(resume)
    db.commit()

    return {"status": "success", "message": "Resume successfully deleted."}

