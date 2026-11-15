
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


ALLOWED_CATEGORIES = ["Technical", "HR", "Behavioral", "Aptitude"]
ALLOWED_DIFFICULTIES = ["Easy", "Medium", "Hard"]


class InterviewQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


class InterviewTemplateCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    category: str
    difficulty: str
    duration_minutes: int = Field(default=30, ge=5, le=180)
    questions: list[InterviewQuestion] = Field(default_factory=list)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value):
        if value not in ALLOWED_CATEGORIES:
            raise ValueError("Invalid interview category")
        return value

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, value):
        if value not in ALLOWED_DIFFICULTIES:
            raise ValueError("Invalid difficulty level")
        return value


class InterviewTemplateUpdate(InterviewTemplateCreate):
    pass


class InterviewTemplateResponse(BaseModel):
    id: int
    recruiter_id: int
    title: str
    description: str | None
    category: str
    difficulty: str
    duration_minutes: int
    questions: list[InterviewQuestion]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
