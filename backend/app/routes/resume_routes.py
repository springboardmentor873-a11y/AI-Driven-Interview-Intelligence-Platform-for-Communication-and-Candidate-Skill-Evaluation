
import uuid
from pathlib import Path
from sqlalchemy import func

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resume, ResumeSkill
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/api/resumes",
    tags=["Resume Management"]
)

BASE_DIR = Path(__file__).resolve().parents[2]
RESUME_DIR = BASE_DIR / "uploads" / "resumes"
MAX_FILE_SIZE = 5 * 1024 * 1024


# Get logged-in candidate's resume
@router.get("/me")
def get_my_resume(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can access resumes"
        )

    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        return {"resume": None}

    return {
        "resume": {
            "id": resume.id,
            "file_name": resume.file_name,
            "uploaded_at": resume.uploaded_at
        }
    }


# Upload or replace resume
@router.post("/upload")
async def upload_resume(
    response: Response,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can upload resumes"
        )

    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    RESUME_DIR.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}.pdf"
    destination = RESUME_DIR / stored_filename

    total_size = 0
    first_chunk = b""
    committed = False

    try:
        # Save uploaded PDF
        with destination.open("wb") as output_file:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Resume file must not exceed 5 MB"
                    )

                if not first_chunk:
                    first_chunk = chunk[:5]

                output_file.write(chunk)

        # Validate actual PDF signature
        if not first_chunk.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid PDF"
            )

        new_file_path = f"uploads/resumes/{stored_filename}"
        original_file_name = Path(file.filename).name

        # Find existing resume
        existing_resume = db.query(Resume).filter(
            Resume.user_id == current_user.id
        ).first()

        if existing_resume:

            old_file_path = BASE_DIR / existing_resume.file_path

            # Update existing resume record
            existing_resume.file_name = original_file_name
            existing_resume.file_path = new_file_path
            existing_resume.uploaded_at = func.now()           

            # Remove old AI skills because resume has changed
            db.query(ResumeSkill).filter(
                ResumeSkill.resume_id == existing_resume.id,
                ResumeSkill.user_id == current_user.id
            ).delete(synchronize_session=False)

            db.commit()
            committed = True
            db.refresh(existing_resume)

            # Delete old PDF after successful database update
            if (
                old_file_path != destination
                and old_file_path.exists()
                and old_file_path.is_file()
            ):
                try:
                    old_file_path.unlink()
                except OSError:
                    pass

            resume = existing_resume
            message = "Resume replaced successfully"

            response.status_code = status.HTTP_200_OK

        else:

            # First-time upload
            resume = Resume(
                user_id=current_user.id,
                file_name=original_file_name,
                file_path=new_file_path
            )

            db.add(resume)
            db.commit()
            committed = True
            db.refresh(resume)

            message = "Resume uploaded successfully"

            response.status_code = status.HTTP_201_CREATED

        return {
            "message": message,
            "resume": {
                "id": resume.id,
                "file_name": resume.file_name,
                "uploaded_at": resume.uploaded_at
            }
        }

    except Exception:
        db.rollback()

        # Delete newly uploaded file if database operation failed
        if not committed and destination.exists():
            destination.unlink()

        raise

    finally:
        await file.close()
