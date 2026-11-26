from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.recruiter import get_approved_recruiter
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.interview_template import InterviewTemplate
from app.models.interview_session import InterviewSession
from app.schemas.interview_session import (
    InterviewSessionCreate,
    InterviewSessionUpdate,
    InterviewSessionResponse,
)


router = APIRouter(
    prefix="/recruiter/sessions",
    tags=["Interview Sessions"]
)


def get_recruiter_session(
    session_id: int,
    recruiter: User,
    db: Session
):
    interview = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.recruiter_id == recruiter.id
        )
        .first()
    )

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found"
        )

    return interview


# ==========================================
# CREATE AND ASSIGN INTERVIEW SESSION
# ==========================================

@router.post(
    "",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_session(
    session_data: InterviewSessionCreate,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    candidate = db.query(User).filter(
        User.id == session_data.candidate_id,
        User.role == UserRole.CANDIDATE,
        User.is_active.is_(True)
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active candidate not found"
        )

    if session_data.template_id is not None:
        template = db.query(InterviewTemplate).filter(
            InterviewTemplate.id == session_data.template_id,
            InterviewTemplate.recruiter_id == recruiter.id
        ).first()

        if template is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview template not found"
            )

    interview = InterviewSession(
        recruiter_id=recruiter.id,
        candidate_id=candidate.id,
        template_id=session_data.template_id,
        title=session_data.title,
        scheduled_at=session_data.scheduled_at,
        duration_minutes=session_data.duration_minutes,
        notes=session_data.notes,
        status="scheduled"
    )

    db.add(interview)
    db.commit()
    db.refresh(interview)

    return interview


# ==========================================
# LIST SESSIONS AND INTERVIEW HISTORY
# ==========================================

@router.get(
    "",
    response_model=list[InterviewSessionResponse]
)
def list_sessions(
    session_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(scheduled|in_progress|completed|cancelled)$"
    ),
    candidate_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    query = db.query(InterviewSession).filter(
        InterviewSession.recruiter_id == recruiter.id
    )

    if session_status:
        query = query.filter(
            InterviewSession.status == session_status
        )

    if candidate_id:
        query = query.filter(
            InterviewSession.candidate_id == candidate_id
        )

    return query.order_by(
        InterviewSession.scheduled_at.desc()
    ).all()


# ==========================================
# VIEW SESSION DETAILS
# ==========================================

@router.get(
    "/{session_id}",
    response_model=InterviewSessionResponse
)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    return get_recruiter_session(
        session_id, recruiter, db
    )


# ==========================================
# UPDATE / RESCHEDULE / TRACK STATUS
# ==========================================

@router.put(
    "/{session_id}",
    response_model=InterviewSessionResponse
)
def update_session(
    session_id: int,
    session_data: InterviewSessionUpdate,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    interview = get_recruiter_session(
        session_id, recruiter, db
    )

    updates = session_data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided"
        )

    for field, value in updates.items():
        setattr(interview, field, value)

    db.commit()
    db.refresh(interview)

    return interview


# ==========================================
# CANCEL SESSION (PRESERVE HISTORY)
# ==========================================

@router.delete(
    "/{session_id}",
    status_code=status.HTTP_200_OK
)
def cancel_session(
    session_id: int,
    db: Session = Depends(get_db),
    recruiter: User = Depends(get_approved_recruiter)
):
    interview = get_recruiter_session(
        session_id, recruiter, db
    )

    if interview.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed interviews cannot be cancelled"
        )

    interview.status = "cancelled"

    db.commit()

    return {
        "message": "Interview session cancelled successfully",
        "session_id": interview.id,
        "status": interview.status
    }
