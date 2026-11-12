from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Table,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UserStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class RoleName(StrEnum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    ADMIN = "admin"


def _in_list(column: str, enum: type[StrEnum]) -> str:
    return f"{column} IN ({', '.join(repr(m.value) for m in enum)})"


class Role(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="", server_default="")


# Association table (not a mapped class) so `user.roles` can be used directly. The extra
# columns (assigned_at, assigned_by) are populated by explicit inserts in the admin service.
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "role_id",
        Uuid,
        ForeignKey("roles.id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    ),
    Column("assigned_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
    Column("assigned_by", Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "email = lower(btrim(email)) AND strpos(email, '@') > 1", name="email_format"
        ),
        CheckConstraint(_in_list("status", UserStatus), name="status_valid"),
        CheckConstraint("failed_login_attempts >= 0", name="failed_attempts_nonnegative"),
        CheckConstraint("length(btrim(full_name)) > 0", name="full_name_not_blank"),
        # Guard against ever persisting a plaintext password: only Argon2id PHC strings pass.
        CheckConstraint(
            "password_hash IS NULL OR left(password_hash, 10) = '$argon2id$'",
            name="password_hash_argon2id",
        ),
    )

    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str | None] = mapped_column(Text)  # NULL for OAuth-only accounts
    full_name: Mapped[str] = mapped_column(String(255))
    google_id: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    auth_provider: Mapped[str] = mapped_column(
        String(30), default="local", server_default="local"
    )
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default=UserStatus.ACTIVE.value, server_default=UserStatus.ACTIVE.value
    )
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_attempts: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Always load explicitly (selectinload); implicit lazy IO is not allowed in async.
    roles: Mapped[list[Role]] = relationship(
        secondary=user_roles,
        primaryjoin=lambda: User.id == user_roles.c.user_id,
        secondaryjoin=lambda: Role.id == user_roles.c.role_id,
        lazy="raise",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # never include password_hash
        return f"<User id={self.id} email={self.email!r}>"
