
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import InterviewSession
from app.schemas import (
    InterviewSessionCreate,
    InterviewSessionUpdate,
    InterviewSessionResponse
)
from app.dependencies import require_roles


router = APIRouter(
    prefix="/api/interview-sessions",
    tags=["Interview Sessions"]
)


# 1. Create Interview Session
@router.post(
    "/",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_interview_session(
    session_data: InterviewSessionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("candidate"))
):
    new_session = InterviewSession(
        candidate_id=current_user.id,
        interview_type=session_data.interview_type,
        difficulty=session_data.difficulty,
        questions=session_data.questions,
        answers=[],
        status="in_progress"
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session


# 2. Get All Sessions of Logged-in Candidate
@router.get(
    "/my-sessions",
    response_model=list[InterviewSessionResponse]
)
def get_my_sessions(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("candidate"))
):
    sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.candidate_id == current_user.id
        )
        .order_by(InterviewSession.started_at.desc())
        .all()
    )

    return sessions


# 3. Get Single Interview Session
@router.get(
    "/{session_id}",
    response_model=InterviewSessionResponse
)
def get_interview_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("candidate"))
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.candidate_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    return session


# 4. Update Interview Session
@router.patch(
    "/{session_id}",
    response_model=InterviewSessionResponse
)
def update_interview_session(
    session_id: int,
    session_data: InterviewSessionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("candidate"))
):
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.candidate_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    if session.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="Completed interview cannot be modified"
        )

    update_data = session_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(session, field, value)

    if update_data.get("status") == "completed":
        session.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)

    return session
