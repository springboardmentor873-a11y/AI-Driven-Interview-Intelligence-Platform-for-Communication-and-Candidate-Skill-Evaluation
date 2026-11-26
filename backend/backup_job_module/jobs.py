from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobResponse
from app.core.dependencies import get_current_user, require_role


router = APIRouter(
    prefix="/api/jobs",
    tags=["Job Management"]
)


# CREATE JOB - RECRUITER ONLY
@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED
)
def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("recruiter"))
):
    new_job = Job(
        **data.model_dump(),
        recruiter_id=current_user.id
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return new_job


# GET ALL JOBS - AUTHENTICATED USERS
@router.get("/", response_model=list[JobResponse])
def get_all_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Job).order_by(Job.created_at.desc()).all()


# GET SINGLE JOB
@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    return job


# UPDATE JOB - RECRUITER OWNER ONLY
@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("recruiter"))
):
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.recruiter_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or access denied"
        )

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)

    return job


# DELETE JOB - RECRUITER OWNER ONLY
@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("recruiter"))
):
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.recruiter_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or access denied"
        )

    db.delete(job)
    db.commit()

    return {
        "message": "Job deleted successfully"
    }


# GET JOBS POSTED BY CURRENT RECRUITER
@router.get("/my/jobs", response_model=list[JobResponse])
def get_my_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("recruiter"))
):
    return db.query(Job).filter(
        Job.recruiter_id == current_user.id
    ).order_by(Job.created_at.desc()).all()