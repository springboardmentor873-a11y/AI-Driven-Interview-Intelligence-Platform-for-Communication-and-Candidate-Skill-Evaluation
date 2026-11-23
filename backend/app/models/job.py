
from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    func
)

from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(BigInteger, primary_key=True, index=True)

    recruiter_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)

    location = Column(String(150), nullable=False)
    employment_type = Column(String(50), nullable=False)

    experience_required = Column(String(100), nullable=True)

    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)

    skills_required = Column(Text, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="active"
    )

    posted_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
