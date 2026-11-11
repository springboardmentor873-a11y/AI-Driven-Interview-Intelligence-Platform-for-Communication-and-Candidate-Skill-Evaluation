from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.interview import InterviewTemplate, InterviewSession, SessionStatus
from app.schemas.interview import (
    InterviewTemplateCreate, InterviewTemplateOut,
    InterviewSessionCreate, InterviewSessionOut
)
from app.api.deps import get_current_user, require_roles, log_activity

router = APIRouter()

# ----------------- TEMPLATES (Recruiter & Admin) -----------------

@router.post("/templates", response_model=InterviewTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    template_in: InterviewTemplateCreate,
    request: Request,
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new reusable interview template."""
    template = InterviewTemplate(
        title=template_in.title,
        description=template_in.description,
        interview_type=template_in.interview_type,
        difficulty=template_in.difficulty,
        domain=template_in.domain,
        duration_minutes=template_in.duration_minutes,
        questions=template_in.questions,
        created_by=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    log_activity(db, "TEMPLATE_CREATE", user_id=current_user.id, details={"template_id": template.id}, request=request)
    return InterviewTemplateOut.model_validate(template)

@router.get("/templates", response_model=List[InterviewTemplateOut])
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List available interview templates."""
    templates = db.query(InterviewTemplate).order_by(InterviewTemplate.created_at.desc()).all()
    return [InterviewTemplateOut.model_validate(t) for t in templates]

# ----------------- SESSIONS (Candidate & Recruiter) -----------------

@router.post("/sessions", response_model=InterviewSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: InterviewSessionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or schedule a mock interview session for the candidate."""
    session = InterviewSession(
        candidate_id=current_user.id,
        template_id=session_in.template_id,
        title=session_in.title,
        status=SessionStatus.PENDING,
        interview_type=session_in.interview_type,
        difficulty=session_in.difficulty,
        scheduled_at=session_in.scheduled_at,
        communication_score=0.0,
        confidence_score=0.0,
        technical_score=0.0,
        professionalism_score=0.0,
        overall_score=0.0
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    log_activity(db, "SESSION_CREATE", user_id=current_user.id, details={"session_id": session.id}, request=request)
    return InterviewSessionOut.model_validate(session)

@router.get("/sessions", response_model=List[InterviewSessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List mock interview sessions."""
    if current_user.role in [UserRole.RECRUITER, UserRole.ADMIN]:
        sessions = db.query(InterviewSession).order_by(InterviewSession.created_at.desc()).all()
    else:
        sessions = db.query(InterviewSession).filter(InterviewSession.candidate_id == current_user.id).order_by(InterviewSession.created_at.desc()).all()
    return [InterviewSessionOut.model_validate(s) for s in sessions]

@router.get("/sessions/{session_id}", response_model=InterviewSessionOut)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single interview session details."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    if current_user.role not in [UserRole.RECRUITER, UserRole.ADMIN] and session.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    return InterviewSessionOut.model_validate(session)
