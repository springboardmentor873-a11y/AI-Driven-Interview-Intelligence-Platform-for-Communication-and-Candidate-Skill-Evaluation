import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import relationship

from app.database.database import Base


class UserSession(Base):
    """
    User Sessions Table:
    Tracks active authentication sessions, devices, and token lifespans for auditing and revocation.
    """
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(500), unique=True, index=True, nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    session_info = Column(Text, nullable=True)  # Device / browser / client metadata JSON or string
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<UserSession id={self.id} user_id={self.user_id} active={self.is_active}>"

