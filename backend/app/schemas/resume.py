from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, computed_field


class ResumeResponse(BaseModel):
    id: str
    user_id: str
    original_filename: str
    file_type: str
    file_size: int
    upload_status: str
    uploaded_at: datetime

    @computed_field
    @property
    def file_name(self) -> str:
        """Alias for backward compatibility."""
        return self.original_filename

    model_config = ConfigDict(from_attributes=True)
