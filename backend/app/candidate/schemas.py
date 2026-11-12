import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QuestionResponse(BaseModel):
    question: str
    answer: str
    duration_seconds: int = 0


class InterviewCreateRequest(BaseModel):
    category: str = Field(min_length=2, max_length=50)
    difficulty: str = Field(default="Intermediate", max_length=30)
    question_count: int = Field(default=5, ge=1, le=20)
    duration_seconds: int = Field(default=0, ge=0)
    responses: list[QuestionResponse] = Field(default_factory=list)
    score: int | None = Field(default=None, ge=0, le=100)
    notes: str | None = None


class InterviewRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category: str
    difficulty: str
    question_count: int
    duration_seconds: int
    status: str
    score: int | None
    responses: list[dict[str, Any]] | None
    notes: str | None
    created_at: datetime


class ResumeUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_size: int = Field(default=0, ge=0)
    content_type: str = Field(default="application/pdf", max_length=100)


class ResumeRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    file_size: int
    content_type: str
    status: str
    extracted_skills: list[str] | None
    created_at: datetime


class CandidateStats(BaseModel):
    interviews_completed: int
    resumes_uploaded: int
    total_practice_time_seconds: int
    average_score: float | None
    latest_interview: InterviewRead | None

