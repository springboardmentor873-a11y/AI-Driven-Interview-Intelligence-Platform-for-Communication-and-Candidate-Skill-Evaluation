from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from typing import Literal
from datetime import datetime


# User Registration Schema
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Literal["candidate", "recruiter"]


# User Login Schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# User Response Schema
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# JWT Token Response Schema
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Update User Profile Schema
class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    email: EmailStr | None = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match")

        if self.current_password == self.new_password:
            raise ValueError("New password must be different from current password")

        return self

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.new_password != self.confirm_password:
            raise ValueError(
                "New password and confirm password do not match"
            )

        return self