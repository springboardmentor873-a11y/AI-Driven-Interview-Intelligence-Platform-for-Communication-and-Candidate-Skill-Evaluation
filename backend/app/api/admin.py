from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.resume import Resume
from app.models.interview import InterviewSession, InterviewTemplate
from app.models.audit_log import AuditLog, SystemSetting
from app.api.deps import require_roles

router = APIRouter()

@router.get("/metrics")
def get_platform_metrics(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get platform overview statistics for admin dashboard."""
    total_users = db.query(User).count()
    candidates = db.query(User).filter(User.role == UserRole.CANDIDATE).count()
    recruiters = db.query(User).filter(User.role == UserRole.RECRUITER).count()
    admins = db.query(User).filter(User.role == UserRole.ADMIN).count()
    
    total_resumes = db.query(Resume).count()
    total_sessions = db.query(InterviewSession).count()
    total_templates = db.query(InterviewTemplate).count()
    recent_activities = db.query(AuditLog).count()

    return {
        "users": {
            "total": total_users,
            "candidates": candidates,
            "recruiters": recruiters,
            "admins": admins
        },
        "resumes": {
            "total": total_resumes
        },
        "interviews": {
            "total_sessions": total_sessions,
            "total_templates": total_templates
        },
        "system": {
            "audit_logs_count": recent_activities,
            "version": "1.0.0",
            "status": "Healthy"
        }
    }

@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Retrieve system activity logs."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        }
        for l in logs
    ]

@router.get("/settings")
def get_system_settings(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Get active platform AI and scoring configurations."""
    settings_records = db.query(SystemSetting).all()
    if not settings_records:
        # Default configuration seeded if empty
        defaults = {
            "scoring_weights": {
                "communication": 0.30,
                "confidence": 0.25,
                "technical": 0.30,
                "professionalism": 0.15
            },
            "ai_providers": {
                "speech_to_text": "whisper",
                "facial_monitoring": "mediapipe",
                "llm_engine": "gpt-4o-mini"
            },
            "rate_limits": {
                "max_interviews_per_day": 5
            }
        }
        return defaults
    return {s.key: s.value for s in settings_records}
