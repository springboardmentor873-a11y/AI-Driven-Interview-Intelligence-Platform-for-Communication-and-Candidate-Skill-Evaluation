import uuid
from io import BytesIO
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pypdf import PdfReader
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Resume, Role, User
from ..schemas import ResumeOut

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _path(resume: Resume) -> Path:
    return Path(settings.UPLOAD_DIR) / resume.stored_name


def _own(db: Session, resume_id: int, user: User) -> Resume:
    r = db.get(Resume, resume_id)
    if not r or r.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    return r


@router.post("", response_model=ResumeOut, status_code=201)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db),
                        user: User = Depends(require_roles(Role.candidate))):
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            f"File is larger than {settings.MAX_UPLOAD_MB} MB")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only PDF files are accepted")
    count = db.scalar(select(func.count(Resume.id)).where(Resume.user_id == user.id)) or 0
    if count >= settings.MAX_RESUMES_PER_USER:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"You can keep up to {settings.MAX_RESUMES_PER_USER} resumes. Delete one first")
    try:
        reader = PdfReader(BytesIO(data))
        pages = len(reader.pages)
        text = "\n".join((p.extract_text() or "") for p in reader.pages).strip()
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not read this PDF. Is it corrupted or password protected?")

    folder = Path(settings.UPLOAD_DIR)
    folder.mkdir(parents=True, exist_ok=True)
    stored = f"{uuid.uuid4().hex}.pdf"
    (folder / stored).write_bytes(data)

    resume = Resume(user_id=user.id, filename=Path(file.filename or "resume.pdf").name[:200],
                    stored_name=stored, size_bytes=len(data), page_count=pages,
                    extracted_text=text, is_active=(count == 0))
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("", response_model=list[ResumeOut])
def my_resumes(db: Session = Depends(get_db), user: User = Depends(require_roles(Role.candidate))):
    return db.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.uploaded_at.desc())).all()


@router.get("/candidate/{user_id}", response_model=list[ResumeOut])
def candidate_resumes(user_id: int, db: Session = Depends(get_db),
                      _: User = Depends(require_roles(Role.recruiter, Role.admin))):
    return db.scalars(select(Resume).where(Resume.user_id == user_id).order_by(Resume.uploaded_at.desc())).all()


@router.get("/{resume_id}/download")
def download_resume(resume_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(Resume, resume_id)
    allowed = r and (r.user_id == user.id or user.role in (Role.recruiter, Role.admin))
    if not allowed or not _path(r).exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    return FileResponse(_path(r), media_type="application/pdf", filename=r.filename)


@router.patch("/{resume_id}/active", response_model=ResumeOut)
def set_primary(resume_id: int, db: Session = Depends(get_db),
                user: User = Depends(require_roles(Role.candidate))):
    r = _own(db, resume_id, user)
    for other in db.scalars(select(Resume).where(Resume.user_id == user.id)):
        other.is_active = other.id == r.id
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: int, db: Session = Depends(get_db),
                  user: User = Depends(require_roles(Role.candidate))):
    r = _own(db, resume_id, user)
    was_primary = r.is_active
    _path(r).unlink(missing_ok=True)
    db.delete(r)
    db.commit()
    if was_primary:  # promote the newest remaining resume
        nxt = db.scalar(select(Resume).where(Resume.user_id == user.id).order_by(Resume.uploaded_at.desc()))
        if nxt:
            nxt.is_active = True
            db.commit()
