from typing import Optional
from pydantic import BaseModel


class UserSummary(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    account_status: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str
    expires_in: int = 86400  # Default 24 hours in seconds
    user: Optional[UserSummary] = None


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None
