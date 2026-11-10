import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin
from app.users.models import User


class RevokeReason(StrEnum):
    LOGOUT = "logout"
    LOGOUT_ALL = "logout_all"
    PASSWORD_CHANGED = "password_changed"  # noqa: S105 (label, not a secret)
    PASSWORD_RESET = "password_reset"  # noqa: S105 (label, not a secret)
    REUSE_DETECTED = "reuse_detected"
    ADMIN_SUSPENDED = "admin_suspended"


_HEX64 = "'^[0-9a-f]{64}$'"
_REASONS = ", ".join(repr(r.value) for r in RevokeReason)


class RefreshSession(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """One row per login/device. `id` is the `sid` claim carried by access tokens.

    Only SHA-256 hex digests of refresh tokens are stored, never the tokens themselves.
    """

    __tablename__ = "refresh_sessions"
    __table_args__ = (
        # Shape checks reject raw (base64url) tokens: a digest is exactly 64 lowercase hex chars.
        CheckConstraint(f"token_hash ~ {_HEX64}", name="token_hash_format"),
        CheckConstraint(
            f"previous_token_hash IS NULL OR previous_token_hash ~ {_HEX64}",
            name="previous_token_hash_format",
        ),
        CheckConstraint(
            "previous_token_hash IS NULL OR previous_token_hash <> token_hash",
            name="previous_differs",
        ),
        CheckConstraint(
            "(previous_token_hash IS NULL) = (rotated_at IS NULL)", name="rotation_consistent"
        ),
        CheckConstraint(
            "(revoked_at IS NULL) = (revoked_reason IS NULL)", name="revocation_consistent"
        ),
        CheckConstraint(
            f"revoked_reason IS NULL OR revoked_reason IN ({_REASONS})", name="revoked_reason_valid"
        ),
        CheckConstraint("expires_at <= absolute_expires_at", name="expiry_within_absolute"),
        Index("ix_refresh_sessions_expires_at", "expires_at"),
        Index(
            "ix_refresh_sessions_previous_token_hash",
            "previous_token_hash",
            postgresql_where="previous_token_hash IS NOT NULL",
        ),
    )

    # Plain FK index: also serves the ON DELETE CASCADE lookup for revoked rows.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user: Mapped[User] = relationship(lazy="raise")

    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    previous_token_hash: Mapped[str | None] = mapped_column(String(64))
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    absolute_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_reason: Mapped[str | None] = mapped_column(String(30))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    # INET (PostgreSQL-specific): validates the value and stores IPv4/IPv6 compactly.
    ip_address: Mapped[str | None] = mapped_column(INET)
