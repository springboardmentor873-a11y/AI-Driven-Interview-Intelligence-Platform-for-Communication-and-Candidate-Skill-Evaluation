
import time
from typing import Literal

from google import genai
from google.genai.errors import ServerError
from pydantic import BaseModel, Field

from app.core.config import settings


class ExtractedSkill(BaseModel):
    name: str
    category: Literal[
        "programming_language",
        "framework",
        "database",
        "tool",
        "cloud",
        "other",
    ]
    evidence: str = Field(
        description="Short phrase supporting this skill from the resume"
    )


class SkillExtractionResult(BaseModel):
    skills: list[ExtractedSkill]


def extract_skills(resume_text: str) -> dict:
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured")

    if not resume_text or not resume_text.strip():
        raise ValueError("Resume text is empty")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    try:
        for attempt in range(3):
            try:
                interaction = client.interactions.create(
                    model="gemini-3.8-flash",
                    input=f"""
Extract technical skills explicitly mentioned in this resume.

Rules:
1. Extract only skills supported by the resume.
2. Never invent or assume skills.
3. Remove duplicate skills.
4. Assign the correct category.
5. Include a short evidence phrase from the resume.
6. Return an empty skills list if no technical skills are found.

Resume text:
{resume_text}
""",
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": SkillExtractionResult.model_json_schema(),
                    },
                    timeout=60,
                )
                break

            except ServerError:
                if attempt == 2:
                    raise
                time.sleep(2 ** (attempt + 1))

        if not interaction.output_text:
            raise ValueError("Gemini returned an empty response")

        result = SkillExtractionResult.model_validate_json(
            interaction.output_text
        )

        return result.model_dump()

    finally:
        client.close()
