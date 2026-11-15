
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResumeResponse(BaseModel):
    id: int
    user_id: int
    original_filename: str
    file_type: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParsedResumeResponse(BaseModel):
    candidate_name: str | None = None
    email: str | None = None
    phone: str | None = None
    skills: list[str]
    education: list[str]
    experience_years: float | None = None
    experience_details: list[str]
    summary: str
    extracted_text: str
