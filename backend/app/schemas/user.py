import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator

from app.models.user import UserRole, AccountStatus
from app.schemas.profile import CandidateProfileResponse, RecruiterProfileResponse
from app.schemas.resume import ResumeResponse
from app.schemas.session import UserSessionResponse


# ==========================================
# Base User Properties
# ==========================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return str(v).strip().lower()

    @field_validator("full_name", mode="after")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters long")
        return cleaned

    @field_validator("phone_number", mode="after")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        cleaned = v.strip()
        if not re.match(r"^\+?[0-9\s\-\(\)]{7,20}$", cleaned):
            raise ValueError("Invalid phone number format. Provide a valid 7-20 digit phone number (e.g., +919876543210)")
        return cleaned


# ==========================================
# Public User Registration Request
# ==========================================

class UserRegister(UserBase):
    password: str = Field(..., description="Strong password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)")
    confirm_password: str = Field(..., description="Must match the password exactly")
    role: UserRole = Field(default=UserRole.CANDIDATE, description="Role: candidate or recruiter (admin not allowed via public registration)")

    @field_validator("role", mode="after")
    @classmethod
    def validate_public_role(cls, v: UserRole) -> UserRole:
        """Security: Block Admin creation via unrestricted public registration."""
        role_str = str(v.value if hasattr(v, "value") else v).lower()
        if role_str == UserRole.ADMIN.value or role_str == "admin":
            raise ValueError(
                "Security Restriction: Admin accounts cannot be created through public registration. "
                "Admin accounts must be provisioned through an authorized administrative process."
            )
        return v

    @field_validator("password", mode="after")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Enforces robust password complexity rules."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z)")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter (a-z)")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one numerical digit (0-9)")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&* etc.)")
        return v

    @model_validator(mode="after")
    def check_passwords_match(self):
        """Verifies that password and confirm_password are identical."""
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match")
        return self


# ==========================================
# Authorized Admin Creation Request
# ==========================================

class AdminUserCreate(UserBase):
    password: str = Field(..., description="Strong password for the new admin")
    confirm_password: str = Field(..., description="Must match password")

    @field_validator("password", mode="after")
    @classmethod
    def validate_admin_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z)")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter (a-z)")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number (0-9)")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and Confirm Password do not match")
        return self


# ==========================================
# Login Request
# ==========================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return str(v).strip().lower()


# ==========================================
# Profile & Status Updates
# ==========================================

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None


class UserStatusUpdate(BaseModel):
    account_status: Optional[AccountStatus] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# ==========================================
# Response Models
# ==========================================

class UserResponse(UserBase):
    id: str
    role: str
    account_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    candidate_profile: Optional[CandidateProfileResponse] = None
    recruiter_profile: Optional[RecruiterProfileResponse] = None
    resumes: Optional[List[ResumeResponse]] = []
    sessions: Optional[List[UserSessionResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class RegistrationSuccessResponse(BaseModel):
    status: str = "success"
    message: str = "User account registered successfully"
    user: UserResponse
