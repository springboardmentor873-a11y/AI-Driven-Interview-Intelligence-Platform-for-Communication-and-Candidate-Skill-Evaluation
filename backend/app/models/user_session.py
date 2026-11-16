from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func
from app.database import Base


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    token_jti = Column(String(255), unique=True, nullable=False)

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )