
from typing import Literal

from groq import Groq
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


GROQ_SKILL_SCHEMA = {
    "type": "object",
    "properties": {
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": [
                            "programming_language",
                            "framework",
                            "database",
                            "tool",
                            "cloud",
                            "other",
                        ],
                    },
                    "evidence": {"type": "string"},
                },
                "required": ["name", "category", "evidence"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["skills"],
    "additionalProperties": False,
}


def extract_skills_with_groq(resume_text: str) -> dict:
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
You are a resume skill extraction assistant.

Extract only technical skills explicitly supported
by the resume.

Rules:
1. Never invent or assume skills.
2. Remove duplicate skills.
3. Assign the correct category.
4. Include a short evidence phrase from the resume.
5. Return an empty skills list if no technical skills are found.
6. Return only data matching the supplied JSON schema.
""",
                },
                {
                    "role": "user",
                    "content": f"Extract technical skills from this resume:\n\n{resume_text}",
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "resume_skill_extraction",
                    "strict": True,
                    "schema": GROQ_SKILL_SCHEMA,
                },
            },
        )

        result_text = response.choices[0].message.content

        if not result_text:
            raise ValueError("Groq returned an empty response")

        result = SkillExtractionResult.model_validate_json(result_text)

        return result.model_dump()

    finally:
        client.close()
