
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import zipfile

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeResponse
from app.services.resume_parser import extract_resume_text
from app.services.groq_skill_extractor import extract_skills_with_groq
from app.services.groq_experience_extractor import extract_experience_with_groq
from app.services.groq_education_extractor import extract_education_with_groq
from app.services.groq_technology_extractor import extract_technologies_with_groq

router = APIRouter(
    prefix="/api/resumes",
    tags=["Resumes"],
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "resumes"

MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def validate_resume(content: bytes, extension: str):
    if extension == ".pdf":
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="Invalid PDF file",
            )

    elif extension == ".docx":
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                names = archive.namelist()

                if (
                    "[Content_Types].xml" not in names
                    or "word/document.xml" not in names
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid DOCX file",
                    )

        except zipfile.BadZipFile:
            raise HTTPException(
                status_code=400,
                detail="Invalid DOCX file",
            )


@router.post(
    "/upload",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required",
        )

    original_filename = file.filename.replace("\\", "/").split("/")[-1]
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed",
        )

    content = await file.read(MAX_FILE_SIZE + 1)
    await file.close()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Resume file must not exceed 5 MB",
        )

    validate_resume(content, extension)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_filename

    try:
        file_path.write_bytes(content)

        resume = Resume(
            user_id=current_user.id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(file_path),
            file_type=extension,
        )

        db.add(resume)
        db.commit()
        db.refresh(resume)

        return resume

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Resume upload failed",
        )


@router.get(
    "/",
    response_model=list[ResumeResponse],
)
def get_my_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    return (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.uploaded_at.desc())
        .all()
    )


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
        .first()
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found",
        )

    file_path = Path(resume.file_path).resolve()

    try:
        file_path.relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid resume storage path",
        )

    db.delete(resume)
    db.commit()

    if file_path.is_file():
        file_path.unlink()

    return {"message": "Resume deleted successfully"}


@router.post("/{resume_id}/parse")
def parse_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("job_seeker")),
):
    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
        .first()
    )

    if resume is None:
        raise HTTPException(
            status_code=404,
            detail="Resume not found",
        )

    file_path = Path(resume.file_path).resolve()

    try:
        file_path.relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid resume storage path",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Resume file not found",
        )

    # Step 1: Extract resume text
    try:
        extracted_text = extract_resume_text(
            str(file_path),
            resume.file_type,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Unable to parse this resume",
        )

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail="No readable text found in resume",
        )

    # Step 2: Extract technical skills
    try:
        extracted_skills = extract_skills_with_groq(extracted_text)

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except Exception as error:
        print("GROQ SKILL EXTRACTION ERROR:", repr(error))
        raise HTTPException(
            status_code=503,
            detail="Groq skill extraction is temporarily unavailable. Please try again.",
        )

    # Step 3: Extract work experience
    try:
        extracted_experience = extract_experience_with_groq(extracted_text)

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except Exception as error:
        print("GROQ EXPERIENCE EXTRACTION ERROR:", repr(error))
        raise HTTPException(
            status_code=503,
            detail="Groq experience extraction is temporarily unavailable. Please try again.",
        )

    # Step 4: Extract education
    try:
        extracted_education = extract_education_with_groq(extracted_text)

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except Exception as error:
        print("GROQ EDUCATION EXTRACTION ERROR:", repr(error))
        raise HTTPException(
            status_code=503,
            detail="Groq education extraction is temporarily unavailable. Please try again.",
        )

    # Step 5: Extract technologies
    try:
        extracted_technologies = extract_technologies_with_groq(extracted_text)

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        )

    except Exception as error:
        print("GROQ TECHNOLOGY EXTRACTION ERROR:", repr(error))
        raise HTTPException(
            status_code=503,
            detail="Groq technology extraction is temporarily unavailable. Please try again.",
        )

    # Step 6: Return all extracted information
    return {
        "resume_id": resume.id,
        "filename": resume.original_filename,
        "extracted_text": extracted_text,
        "character_count": len(extracted_text),
        "skills": extracted_skills["skills"],
        "experiences": extracted_experience["experiences"],
        "education": extracted_education["education"],
        "technologies": extracted_technologies["technologies"],
    }
