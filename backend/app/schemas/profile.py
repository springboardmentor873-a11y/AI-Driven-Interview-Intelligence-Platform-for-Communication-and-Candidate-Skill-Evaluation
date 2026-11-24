from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl, ConfigDict


# ==========================================
# Candidate Profile Schemas
# ==========================================

class CandidateProfileBase(BaseModel):
    headline: Optional[str] = None
    phone_number: Optional[str] = None
    skills: Optional[str] = None
    experience_years: Optional[int] = 0
    education: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None


class CandidateProfileUpdate(CandidateProfileBase):
    pass


class CandidateProfileResponse(CandidateProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Recruiter Profile Schemas
# ==========================================

class RecruiterProfileBase(BaseModel):
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None


class RecruiterProfileUpdate(RecruiterProfileBase):
    pass


class RecruiterProfileResponse(RecruiterProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

