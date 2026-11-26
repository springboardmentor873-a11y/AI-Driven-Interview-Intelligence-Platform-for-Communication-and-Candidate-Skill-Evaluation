
from typing import Literal

from groq import Groq
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


GROQ_EXPERIENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "experiences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "organization": {"type": "string"},
                    "job_title": {"type": "string"},
                    "experience_type": {
                        "type": "string",
                        "enum": [
                            "full_time",
                            "part_time",
                            "internship",
                            "contract",
                            "freelance",
                            "other",
                            "not_specified",
                        ],
                    },
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "description": {"type": "string"},
                    "evidence": {"type": "string"},
                },
                "required": [
                    "organization",
                    "job_title",
                    "experience_type",
                    "start_date",
                    "end_date",
                    "description",
                    "evidence",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["experiences"],
    "additionalProperties": False,
}


def extract_experience_with_groq(resume_text: str) -> dict:
    if not settings.GROQ_API_KEY:
        raise ValueError("Groq API key is not configured")

    if not resume_text or not resume_text.strip():
        raise ValueError("Resume text is empty")

    client = Groq(
        api_key=settings.GROQ_API_KEY,
        timeout=60,
    )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": """
You are a resume experience analysis assistant.

Extract work experience and internships explicitly mentioned
in the resume.

Rules:
1. Do not invent companies, roles, or dates.
2. Include internships and professional experience.
3. Do not treat academic projects as employment.
4. Preserve dates as written in the resume.
5. Use "not specified" when information is missing.
6. Include supporting evidence from the resume.
7. Return an empty experiences list if no experience is found.
8. Return only data matching the supplied JSON schema.
""",
                },
                {
                    "role": "user",
                    "content": (
                        "Extract work experience from this resume:\n\n"
                        f"{resume_text}"
                    ),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "resume_experience_extraction",
                    "strict": True,
                    "schema": GROQ_EXPERIENCE_SCHEMA,
                },
            },
        )

        result_text = response.choices[0].message.content

        if not result_text:
            raise ValueError("Groq returned an empty response")

        result = ExperienceExtractionResult.model_validate_json(
            result_text
        )

        return result.model_dump()

    finally:
        client.close()
