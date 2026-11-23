
from sqlalchemy import (
    Column,
    BigInteger,
    String,
    DateTime,
    ForeignKey,
    JSON,
    func
)

from app.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(BigInteger, primary_key=True, index=True)

    candidate_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    interview_type = Column(String(50), nullable=False)
    difficulty = Column(String(30), nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="in_progress"
    )

    questions = Column(JSON, nullable=True)
    answers = Column(JSON, nullable=True)
    evaluation = Column(JSON, nullable=True)

    started_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
