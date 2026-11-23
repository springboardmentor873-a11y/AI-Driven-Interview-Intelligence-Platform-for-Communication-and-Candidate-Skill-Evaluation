
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.schemas import JobCreate, JobResponse, JobUpdate
from app.dependencies import require_roles


router = APIRouter(
    prefix="/api/jobs",
    tags=["Jobs"]
)


@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED
)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("recruiter"))
):
    try:
        new_job = Job(
            recruiter_id=current_user.id,
            title=job_data.title,
            description=job_data.description,
            location=job_data.location,
            employment_type=job_data.employment_type,
            experience_required=job_data.experience_required,
            salary_min=job_data.salary_min,
            salary_max=job_data.salary_max,
            skills_required=job_data.skills_required,
            status="active"
        )

        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        return new_job

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create job. Please try again."
        )



@router.get(
    "/my-jobs",
    response_model=list[JobResponse]
)
def get_my_jobs(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("recruiter"))
):
    jobs = (
        db.query(Job)
        .filter(Job.recruiter_id == current_user.id)
        .order_by(Job.posted_at.desc())
        .all()
    )

    return jobs


@router.put(
    "/{job_id}",
    response_model=JobResponse
)
def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("recruiter"))
):
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.recruiter_id == current_user.id
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    update_data = job_data.model_dump(exclude_unset=True)

    min_salary = update_data.get("salary_min", job.salary_min)
    max_salary = update_data.get("salary_max", job.salary_max)

    if (
        min_salary is not None
        and max_salary is not None
        and min_salary > max_salary
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Minimum salary cannot exceed maximum salary"
        )

    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)

    return job



@router.delete(
    "/{job_id}",
    status_code=status.HTTP_200_OK
)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("recruiter"))
):
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.recruiter_id == current_user.id
        )
        .first()
    )

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    db.delete(job)
    db.commit()

    return {
        "message": "Job deleted successfully",
        "job_id": job_id
    }
