from pydantic import BaseModel, ConfigDict

from app.users.models import RoleName, UserStatus
from app.users.schemas import UserRead


class RoleAssignment(BaseModel):
    """Body of POST /admin/users/{id}/roles. Unknown fields are rejected."""

    model_config = ConfigDict(extra="forbid")
    role: RoleName


class StatusUpdate(BaseModel):
    """Body of PATCH /admin/users/{id}/status. Only the two defined statuses are accepted."""

    model_config = ConfigDict(extra="forbid")
    status: UserStatus


class UserPage(BaseModel):
    items: list[UserRead]
    total: int
    limit: int
    offset: int
