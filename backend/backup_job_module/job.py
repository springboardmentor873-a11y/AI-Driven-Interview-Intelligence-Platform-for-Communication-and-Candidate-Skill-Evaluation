from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    company_name: str = Field(min_length=2, max_length=200)
    location: str = Field(min_length=2, max_length=200)
    job_type: str = Field(min_length=2, max_length=100)
    experience_level: str = Field(min_length=2, max_length=100)
    salary: Optional[str] = Field(default=None, max_length=100)
    description: str = Field(min_length=20)
    requirements: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    company_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    location: Optional[str] = Field(default=None, min_length=2, max_length=200)
    job_type: Optional[str] = Field(default=None, min_length=2, max_length=100)
    experience_level: Optional[str] = Field(default=None, min_length=2, max_length=100)
    salary: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, min_length=20)
    requirements: Optional[str] = None


class JobResponse(BaseModel):
    id: int
    title: str
    company_name: str
    location: str
    job_type: str
    experience_level: str
    salary: Optional[str]
    description: str
    requirements: Optional[str]
    recruiter_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)