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


# Job Schemas

from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Literal
from datetime import datetime


class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=20)

    location: str = Field(..., min_length=2, max_length=150)

    employment_type: Literal[
        "Full-time",
        "Part-time",
        "Internship",
        "Contract"
    ]

    experience_required: str | None = None

    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)

    skills_required: str | None = None

    @model_validator(mode="after")
    def validate_salary(self):
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("Minimum salary cannot exceed maximum salary")

        return self


class JobResponse(BaseModel):
    id: int
    recruiter_id: int

    title: str
    description: str
    location: str
    employment_type: str

    experience_required: str | None
    salary_min: int | None
    salary_max: int | None
    skills_required: str | None

    status: str
    posted_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, min_length=20)
    location: str | None = Field(default=None, min_length=2, max_length=150)

    employment_type: Literal[
        "Full-time",
        "Part-time",
        "Internship",
        "Contract"
    ] | None = None

    experience_required: str | None = None
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    skills_required: str | None = None

    status: Literal["active", "closed"] | None = None

    @model_validator(mode="after")
    def validate_salary(self):
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("Minimum salary cannot exceed maximum salary")

        return self



from typing import Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class InterviewSessionCreate(BaseModel):
    interview_type: str
    difficulty: str
    questions: list[dict[str, Any]] = Field(default_factory=list)


class InterviewSessionUpdate(BaseModel):
    answers: list[dict[str, Any]] | None = None
    evaluation: dict[str, Any] | None = None
    status: Literal["in_progress", "completed"] | None = None



class InterviewSessionResponse(BaseModel):
    id: int
    candidate_id: int
    interview_type: str
    difficulty: str
    status: str
    questions: list[dict[str, Any]] | None
    answers: list[dict[str, Any]] | None
    evaluation: dict[str, Any] | None = None
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
