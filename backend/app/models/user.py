import uuid
from enum import Enum
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from app.database.database import Base


class UserRole(str, Enum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class User(Base):
    """
    Users Table:
    Core authentication and identity entity for Candidates, Recruiters, and Admins.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.CANDIDATE.value, nullable=False, index=True)
    account_status = Column(String(50), default=AccountStatus.ACTIVE.value, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @hybrid_property
    def is_active(self) -> bool:
        return self.account_status == AccountStatus.ACTIVE.value

    @is_active.expression
    def is_active(cls):
        return cls.account_status == AccountStatus.ACTIVE.value

    @is_active.setter
    def is_active(self, val: bool):
        self.account_status = AccountStatus.ACTIVE.value if val else AccountStatus.INACTIVE.value

    # Relationships
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan", order_by="desc(Resume.uploaded_at)")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan", order_by="desc(UserSession.created_at)")
    candidate_profile = relationship("CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    recruiter_profile = relationship("RecruiterProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan", order_by="desc(InterviewSession.created_at)")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role} status={self.account_status}>"
