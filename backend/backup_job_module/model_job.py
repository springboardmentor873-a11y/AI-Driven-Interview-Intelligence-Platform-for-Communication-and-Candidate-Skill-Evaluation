from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(200), nullable=False)
    company_name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=False)

    job_type = Column(String(100), nullable=False)
    experience_level = Column(String(100), nullable=False)

    salary = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)

    recruiter_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    recruiter = relationship("User")