import uuid

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin
from app.users.models import User


class InterviewSession(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user: Mapped[User] = relationship(lazy="raise")

    category: Mapped[str] = mapped_column(String(50))
    difficulty: Mapped[str] = mapped_column(String(30), default="Intermediate")
    question_count: Mapped[int] = mapped_column(Integer, default=5)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="completed")
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    responses: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Resume(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user: Mapped[User] = relationship(lazy="raise")

    filename: Mapped[str] = mapped_column(String(255))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    content_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    status: Mapped[str] = mapped_column(String(60), default="uploaded_pending_parsing")
    extracted_skills: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
