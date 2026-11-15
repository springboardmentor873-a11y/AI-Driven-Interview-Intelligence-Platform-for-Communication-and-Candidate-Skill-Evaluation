
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.recruiter import get_approved_recruiter
from app.database.database import get_db
from app.models.user import User
from app.models.interview_template import InterviewTemplate
from app.schemas.interview_template import (
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    InterviewTemplateResponse,
)


router = APIRouter(
    prefix="/recruiter/templates",
    tags=["Interview Templates"]
)


@router.post(
    "",
    response_model=InterviewTemplateResponse,
    status_code=status.HTTP_201_CREATED
)
def create_template(
    template_data: InterviewTemplateCreate,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    template = InterviewTemplate(
        recruiter_id=recruiter.id,
        title=template_data.title,
        description=template_data.description,
        category=template_data.category,
        difficulty=template_data.difficulty,
        duration_minutes=template_data.duration_minutes,
        questions=[
            question.model_dump()
            for question in template_data.questions
        ]
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return template


@router.get(
    "",
    response_model=list[InterviewTemplateResponse]
)
def list_templates(
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    return (
        db.query(InterviewTemplate)
        .filter(InterviewTemplate.recruiter_id == recruiter.id)
        .order_by(InterviewTemplate.created_at.desc())
        .all()
    )


@router.put(
    "/{template_id}",
    response_model=InterviewTemplateResponse
)
def update_template(
    template_id: int,
    template_data: InterviewTemplateUpdate,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    template = (
        db.query(InterviewTemplate)
        .filter(
            InterviewTemplate.id == template_id,
            InterviewTemplate.recruiter_id == recruiter.id
        )
        .first()
    )

    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview template not found"
        )

    template.title = template_data.title
    template.description = template_data.description
    template.category = template_data.category
    template.difficulty = template_data.difficulty
    template.duration_minutes = template_data.duration_minutes
    template.questions = [
        question.model_dump()
        for question in template_data.questions
    ]

    db.commit()
    db.refresh(template)

    return template


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_200_OK
)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    template = (
        db.query(InterviewTemplate)
        .filter(
            InterviewTemplate.id == template_id,
            InterviewTemplate.recruiter_id == recruiter.id
        )
        .first()
    )

    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview template not found"
        )

    db.delete(template)
    db.commit()

    return {
        "message": "Interview template deleted successfully"
    }
