import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterviewType(str, enum.Enum):
    TECHNICAL = "technical"
    HR = "hr"
    BEHAVIORAL = "behavioral"
    APTITUDE = "aptitude"
    COMPREHENSIVE = "comprehensive"

class DifficultyLevel(str, enum.Enum):
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"

class SessionStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class InterviewTemplate(Base):
    __tablename__ = "interview_templates"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    interview_type = Column(Enum(InterviewType), default=InterviewType.TECHNICAL, nullable=False)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.MID, nullable=False)
    domain = Column(String(100), default="Software Engineering")
    duration_minutes = Column(Integer, default=30)
    questions = Column(JSON, default=list)  # Predefined or AI-generated question list
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = relationship("User", back_populates="created_templates")
    sessions = relationship("InterviewSession", back_populates="template")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(Integer, ForeignKey("interview_templates.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.PENDING, nullable=False)
    interview_type = Column(Enum(InterviewType), default=InterviewType.TECHNICAL)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.MID)
    
    # Milestone 3 & 4 Rubric Scores (0 - 100)
    communication_score = Column(Float, default=0.0)      # 30%
    confidence_score = Column(Float, default=0.0)         # 25%
    technical_score = Column(Float, default=0.0)          # 30%
    professionalism_score = Column(Float, default=0.0)    # 15%
    overall_score = Column(Float, default=0.0)            # Weighted composite score

    # AI Feedback
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    improvement_suggestions = Column(JSON, default=list)
    detailed_metrics = Column(JSON, default=dict)

    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    candidate = relationship("User", back_populates="interview_sessions")
    template = relationship("InterviewTemplate", back_populates="sessions")
