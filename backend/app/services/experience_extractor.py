
import time
from typing import Literal

from google import genai
from google.genai.errors import ServerError
from pydantic import BaseModel, Field

from app.core.config import settings


class ExtractedExperience(BaseModel):
    organization: str = Field(
        description="Company or organization name"
    )
    job_title: str = Field(
        description="Job role or position"
    )
    experience_type: Literal[
        "full_time",
        "part_time",
        "internship",
        "contract",
        "freelance",
        "other",
        "not_specified",
    ]
    start_date: str = Field(
        description="Starting date exactly as mentioned, or not specified"
    )
    end_date: str = Field(
        description="Ending date, Present, or not specified"
    )
    description: str = Field(
        description="Short summary of responsibilities or work"
    )
    evidence: str = Field(
        description="Supporting phrase from the resume"
    )


class ExperienceExtractionResult(BaseModel):
    experiences: list[ExtractedExperience]


def extract_experience(resume_text: str) -> dict:
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
You are a resume experience analysis assistant.

Extract work experience and internships explicitly mentioned
in the resume.

Rules:
1. Do not invent companies, roles, or dates.
2. Include internships and professional experience.
3. Do not treat academic projects as employment.
4. Preserve dates as written in the resume.
5. Use not specified when information is missing.
6. Include supporting evidence from the resume.
7. Return an empty experiences list if no experience is found.

Resume text:
{resume_text}
""",
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": ExperienceExtractionResult.model_json_schema(),
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

        result = ExperienceExtractionResult.model_validate_json(
            interaction.output_text
        )

        return result.model_dump()

    finally:
        client.close()
