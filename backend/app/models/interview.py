
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    resume_id = Column(
        Integer,
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
    )

    interview_type = Column(String(30), nullable=False)
    difficulty = Column(String(30), nullable=False)
    domain = Column(String(100), nullable=False)

    question_count = Column(Integer, nullable=False)

    questions = Column(JSON, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="active",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    answers = relationship(
        "InterviewAnswer",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_number = Column(Integer, nullable=False)

    question = Column(Text, nullable=False)

    answer_text = Column(Text, nullable=False)

    submitted_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    session = relationship(
        "InterviewSession",
        back_populates="answers",
    )

    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "question_number",
            name="uq_interview_session_question",
        ),
    )
