from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    
    # AI Extracted Data
    summary = Column(Text, nullable=True)
    skills = Column(JSON, default=list)            # List of skill strings
    technologies = Column(JSON, default=list)      # Detected tech stack/frameworks
    experience_years = Column(Float, default=0.0)
    experience_details = Column(JSON, default=list) # List of roles/companies parsed
    education = Column(JSON, default=list)          # Degrees, institutions, years
    raw_text = Column(Text, nullable=True)         # Extracted raw text

    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="resumes")
