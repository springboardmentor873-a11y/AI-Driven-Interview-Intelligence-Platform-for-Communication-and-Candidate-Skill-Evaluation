from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


SessionStatus = Literal[
    "scheduled",
    "in_progress",
    "completed",
    "cancelled"
]


class InterviewSessionCreate(BaseModel):
    candidate_id: int = Field(gt=0)
    template_id: int | None = Field(default=None, gt=0)
    title: str = Field(min_length=3, max_length=200)
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=5, le=180)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, value):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone")
        return value


class InterviewSessionUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=5, le=180)
    status: SessionStatus | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, value):
        if value is not None and (
            value.tzinfo is None or value.utcoffset() is None
        ):
            raise ValueError("scheduled_at must include a timezone")
        return value


class InterviewSessionResponse(BaseModel):
    id: int
    recruiter_id: int
    candidate_id: int
    template_id: int | None
    title: str
    scheduled_at: datetime
    duration_minutes: int
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
