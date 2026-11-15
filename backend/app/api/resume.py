
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.schemas.resume import ResumeResponse, ParsedResumeResponse
from app.services.resume_parser import parse_resume


router = APIRouter(prefix="/resumes", tags=["Resumes"])

# Store resumes inside the backend directory
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "resumes"

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def get_owned_resume(
    resume_id: int,
    user_id: int,
    db: Session
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == user_id
    ).first()

    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )

    return resume


# ==========================================
# UPLOAD RESUME
# ==========================================

@router.post(
    "/upload",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.CANDIDATE)
    )
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )

    if Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size must not exceed 5 MB"
        )

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF file"
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}.pdf"
    file_path = UPLOAD_DIR / stored_filename

    try:
        file_path.write_bytes(content)

        resume = Resume(
            user_id=current_user.id,
            original_filename=Path(file.filename).name,
            file_path=str(
                file_path.relative_to(UPLOAD_DIR.parents[1])
            ),
            file_type="application/pdf"
        )

        db.add(resume)
        db.commit()
        db.refresh(resume)

        return resume

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise

    finally:
        await file.close()


# ==========================================
# LIST MY RESUMES
# ==========================================

@router.get(
    "/my-resumes",
    response_model=list[ResumeResponse]
)
def get_my_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.CANDIDATE)
    )
):
    return db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).order_by(Resume.uploaded_at.desc()).all()


# ==========================================
# DOWNLOAD MY RESUME
# ==========================================

@router.get("/{resume_id}/download")
def download_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.CANDIDATE)
    )
):
    resume = get_owned_resume(
        resume_id,
        current_user.id,
        db
    )

    file_path = (
        UPLOAD_DIR / Path(resume.file_path).name
    ).resolve()

    if file_path.parent != UPLOAD_DIR.resolve():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file is missing"
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=resume.original_filename
    )


# ==========================================
# DELETE MY RESUME
# ==========================================

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.CANDIDATE)
    )
):
    resume = get_owned_resume(
        resume_id,
        current_user.id,
        db
    )

    file_path = (
        UPLOAD_DIR / Path(resume.file_path).name
    ).resolve()

    if file_path.parent != UPLOAD_DIR.resolve():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )

    # Remove database record first
    db.delete(resume)
    db.commit()

    # Remove physical file
    if file_path.is_file():
        file_path.unlink()

    return {
        "message": "Resume deleted successfully",
        "resume_id": resume_id
    }


# ==========================================
# PARSE MY RESUME
# ==========================================

@router.get(
    "/{resume_id}/parse",
    response_model=ParsedResumeResponse
)
def parse_my_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.CANDIDATE)
    )
):
    # Verify that the resume belongs to this candidate
    resume = get_owned_resume(
        resume_id,
        current_user.id,
        db
    )

    # Resolve the stored PDF path safely
    file_path = (
        UPLOAD_DIR / Path(resume.file_path).name
    ).resolve()

    if file_path.parent != UPLOAD_DIR.resolve():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file is missing"
        )

    # Extract resume information
    try:
        parsed_data = parse_resume(str(file_path))

        return parsed_data

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

