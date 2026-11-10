import uuid
from datetime import datetime

from pydantic import BaseModel

from app.users.models import User


class UserRead(BaseModel):
    """Public view of a user. Never includes password hashes or token material."""

    id: uuid.UUID
    email: str
    full_name: str
    status: str
    email_verified: bool
    roles: list[str]
    created_at: datetime

    @classmethod
    def from_user(cls, user: User) -> "UserRead":
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            status=user.status,
            email_verified=user.email_verified_at is not None,
            roles=sorted(r.name for r in user.roles),
            created_at=user.created_at,
        )
