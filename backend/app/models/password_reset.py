
from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func
)

from app.database import Base


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(BigInteger, primary_key=True, index=True)

    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    token_hash = Column(
        String(255),
        unique=True,
        nullable=False
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )

    is_used = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
