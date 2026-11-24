from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserSessionBase(BaseModel):
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_info: Optional[str] = None


class UserSessionCreate(UserSessionBase):
    user_id: str
    session_token: str
    expires_at: datetime


class UserSessionResponse(UserSessionBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)

