import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.database.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    headline = Column(String(255), nullable=True)  # e.g. "Full Stack Developer | Python & React"
    phone_number = Column(String(30), nullable=True)
    skills = Column(Text, nullable=True)  # Comma-separated or JSON string of skills
    experience_years = Column(Integer, default=0, nullable=False)
    education = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="candidate_profile")

    def __repr__(self):
        return f"<CandidateProfile user_id={self.user_id}>"


class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    company_website = Column(String(255), nullable=True)
    designation = Column(String(150), nullable=True)  # e.g. "Technical Recruiter", "HR Manager"
    phone_number = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="recruiter_profile")

    def __repr__(self):
        return f"<RecruiterProfile company={self.company_name} user_id={self.user_id}>"

