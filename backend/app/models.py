"""Full SmartHire AI schema (finalized in Milestone 1).

Milestone 1 uses: User, Resume.
Later milestones fill: InterviewTemplate/Session/Question/Answer (M2-M3),
Assessment (M3), Notification (M4).
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import (String, Boolean, DateTime, Enum, ForeignKey, Integer, Float, Text, JSON)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    candidate = "candidate"
    recruiter = "recruiter"
    admin = "admin"


class InterviewType(str, enum.Enum):
    hr = "hr"
    technical = "technical"
    behavioral = "behavioral"
    aptitude = "aptitude"


class Difficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class SessionStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)  # null for OAuth-only users
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")  # local | google
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.candidate)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))       # original name shown to the user
    stored_name: Mapped[str] = mapped_column(String(100))    # uuid name on disk
    size_bytes: Mapped[int] = mapped_column(Integer)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    parsed_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # M2: skills, experience, education
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)         # the "primary" resume
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="resumes")


class InterviewTemplate(Base):
    __tablename__ = "interview_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    interview_type: Mapped[InterviewType] = mapped_column(Enum(InterviewType))
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium)
    domain: Mapped[str] = mapped_column(String(100), default="general")
    num_questions: Mapped[int] = mapped_column(Integer, default=5)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=20)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("interview_templates.id", ondelete="SET NULL"), nullable=True)
    resume_id: Mapped[int | None] = mapped_column(ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    interview_type: Mapped[InterviewType] = mapped_column(Enum(InterviewType))
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium)
    domain: Mapped[str] = mapped_column(String(100), default="general")
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.scheduled)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    video_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audio_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True)
    order_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), default="general")
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=120)


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), unique=True)
    transcript: Mapped[str] = mapped_column(Text, default="")
    duration_seconds: Mapped[float] = mapped_column(Float, default=0)
    words_per_minute: Mapped[float | None] = mapped_column(Float, nullable=True)
    filler_word_count: Mapped[int] = mapped_column(Integer, default=0)
    grammar_issues: Mapped[int] = mapped_column(Integer, default=0)
    eye_contact_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    dominant_emotion: Mapped[str | None] = mapped_column(String(30), nullable=True)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True)
    communication_score: Mapped[float] = mapped_column(Float, default=0)   # weight 30%
    confidence_score: Mapped[float] = mapped_column(Float, default=0)      # weight 25%
    technical_score: Mapped[float] = mapped_column(Float, default=0)       # weight 30%
    professionalism_score: Mapped[float] = mapped_column(Float, default=0) # weight 15%
    overall_score: Mapped[float] = mapped_column(Float, default=0)
    rating: Mapped[str] = mapped_column(String(30), default="")            # Excellent/Good/Average/Needs Improvement/Poor
    strengths: Mapped[list | None] = mapped_column(JSON, nullable=True)
    weaknesses: Mapped[list | None] = mapped_column(JSON, nullable=True)
    suggestions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    resources: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(40))  # reminder | report_ready | system
    title: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(Text, default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
