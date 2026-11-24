import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PracticeQuestionBase(BaseModel):
    category: str = Field(..., example="Behavioral")
    role_target: str = Field(default="All", example="Full Stack Engineer")
    difficulty: str = Field(default="Medium", example="Medium")
    question_text: str = Field(..., example="Tell me about a time you resolved a critical production outage.")
    rubric_guide: Optional[str] = Field(None, example="Evaluate Situation, Task, Action, and quantifiable Result (STAR).")
    sample_answer: Optional[str] = None


class PracticeQuestionCreate(PracticeQuestionBase):
    pass


class PracticeQuestionResponse(PracticeQuestionBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewSessionStartRequest(BaseModel):
    role_title: str = Field(default="Full Stack Engineer", example="Frontend Engineer")
    difficulty: str = Field(default="Medium", example="Medium")
    questions_count: int = Field(default=3, ge=1, le=10)


class InterviewAnswerSubmitRequest(BaseModel):
    question_id: Optional[str] = None
    question_text: str
    category: str = "Behavioral"
    transcript: str = Field(..., min_length=1, example="In my previous role, our primary payment gateway crashed...")
    duration_seconds: int = Field(default=60, ge=5, le=600)


class InterviewAnswerResponse(BaseModel):
    id: str
    session_id: str
    question_id: Optional[str] = None
    question_text: str
    category: str
    transcript: str
    duration_seconds: int
    wpm: float
    filler_count: int
    filler_words: List[str] = []
    score: float
    ai_feedback: str
    star_breakdown: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InterviewSessionResponse(BaseModel):
    id: str
    user_id: str
    role_title: str
    difficulty: str
    status: str
    overall_score: float
    cadence_wpm: float
    clarity_score: float
    star_score: float
    behavioral_score: float
    technical_score: float
    filler_words_count: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    answers: List[InterviewAnswerResponse] = []

    class Config:
        from_attributes = True


class AssessmentReportResponse(BaseModel):
    session_id: str
    candidate_name: str
    role_title: str
    difficulty: str
    completed_at: Optional[datetime] = None
    overall_score: float
    status: str
    metrics: Dict[str, Any]
    strengths: List[str]
    improvements: List[str]
    recommendations: List[str]
    questions_evaluated: List[Dict[str, Any]]
