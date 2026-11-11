from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.interview import InterviewType, DifficultyLevel, SessionStatus

class InterviewTemplateBase(BaseModel):
    title: str
    description: Optional[str] = None
    interview_type: InterviewType = InterviewType.TECHNICAL
    difficulty: DifficultyLevel = DifficultyLevel.MID
    domain: str = "Software Engineering"
    duration_minutes: int = 30
    questions: List[Dict[str, Any]] = []

class InterviewTemplateCreate(InterviewTemplateBase):
    pass

class InterviewTemplateOut(InterviewTemplateBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewSessionCreate(BaseModel):
    title: str
    template_id: Optional[int] = None
    interview_type: InterviewType = InterviewType.TECHNICAL
    difficulty: DifficultyLevel = DifficultyLevel.MID
    scheduled_at: Optional[datetime] = None

class InterviewSessionOut(BaseModel):
    id: int
    candidate_id: int
    template_id: Optional[int] = None
    title: str
    status: SessionStatus
    interview_type: InterviewType
    difficulty: DifficultyLevel
    communication_score: float
    confidence_score: float
    technical_score: float
    professionalism_score: float
    overall_score: float
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_suggestions: List[str] = []
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
