import uuid
from enum import Enum
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.database.database import Base


class UploadStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    VERIFIED = "verified"
    FAILED = "failed"


class Resume(Base):
    """
    Resumes Table:
    Stores metadata and storage pointers for candidate uploaded resumes.
    """
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)   # Name as uploaded by candidate
    stored_filename = Column(String(255), nullable=False)     # Safe UUID filename on disk
    file_path = Column(String(500), nullable=False)           # Full path on local disk or cloud bucket
    file_type = Column(String(100), nullable=False)           # MIME type (e.g., application/pdf)
    file_size = Column(Integer, nullable=False)               # Size in bytes
    upload_status = Column(String(50), default=UploadStatus.UPLOADED.value, nullable=False, index=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Backward-compatible property alias for file_name
    @property
    def file_name(self) -> str:
        return self.original_filename

    @file_name.setter
    def file_name(self, val: str):
        self.original_filename = val

    user = relationship("User", back_populates="resumes")

    def __repr__(self):
        return f"<Resume id={self.id} file={self.original_filename} user_id={self.user_id} status={self.upload_status}>"
