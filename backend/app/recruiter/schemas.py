import uuid
from datetime import datetime

from pydantic import BaseModel

from app.candidate.schemas import InterviewRead, ResumeRead


class CandidateSummary(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    status: str
    created_at: datetime
    resume_count: int = 0
    interview_count: int = 0
    average_score: float | None = None


class CandidatePage(BaseModel):
    items: list[CandidateSummary]
    total: int
    limit: int
    offset: int


class CandidateDetail(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    status: str
    created_at: datetime
    roles: list[str]
    resumes: list[ResumeRead]
    interviews: list[InterviewRead]


class RecruiterStats(BaseModel):
    total_candidates: int
    active_candidates: int
    total_interviews: int
    average_candidate_score: float | None

