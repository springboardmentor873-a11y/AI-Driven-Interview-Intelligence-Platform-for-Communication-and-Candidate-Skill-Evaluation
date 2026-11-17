from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["candidate", "recruiter"] = "candidate"  # admin can't self-register


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: EmailStr
    role: str
    auth_provider: str
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    filename: str
    size_bytes: int
    page_count: int
    is_active: bool
    uploaded_at: datetime
