from pydantic import BaseModel, ConfigDict, Field


class CandidateProfileUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=20)
    education: str | None = Field(default=None, max_length=255)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    bio: str | None = None


class CandidateProfileResponse(BaseModel):
    id: int
    user_id: int
    phone: str | None
    education: str | None
    experience_years: int
    bio: str | None

    model_config = ConfigDict(from_attributes=True)


class RecruiterProfileUpdate(BaseModel):
    company_name: str | None = Field(default=None, max_length=255)
    designation: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=20)


class RecruiterProfileResponse(BaseModel):
    id: int
    user_id: int
    company_name: str | None
    designation: str | None
    phone: str | None
    approval_status: str

    model_config = ConfigDict(from_attributes=True)
