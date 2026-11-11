from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ResumeBase(BaseModel):
    filename: str
    file_size: int

class ResumeSkillExtraction(BaseModel):
    skills: List[str] = []
    technologies: List[str] = []
    experience_years: float = 0.0
    experience_details: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    summary: Optional[str] = None

class ResumeOut(ResumeBase, ResumeSkillExtraction):
    id: int
    user_id: int
    uploaded_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ResumeUploadResponse(BaseModel):
    message: str
    resume: ResumeOut
