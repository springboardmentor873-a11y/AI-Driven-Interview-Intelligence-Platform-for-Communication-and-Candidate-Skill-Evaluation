
from sqlalchemy import Column, BigInteger, ForeignKey, JSON, DateTime, func
from app.database import Base


class ResumeSkill(Base):
    __tablename__ = "resume_skills"

    id = Column(BigInteger, primary_key=True, index=True)

    resume_id = Column(
        BigInteger,
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    skills = Column(JSON, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
