
from typing import Literal

from groq import Groq
from pydantic import BaseModel, Field

from app.core.config import settings


InterviewType = Literal[
    "Technical",
    "HR",
    "Behavioral",
    "Aptitude",
]

DifficultyLevel = Literal[
    "Beginner",
    "Intermediate",
    "Advanced",
]


class GeneratedQuestion(BaseModel):
    question_number: int
    category: str
    question: str
    expected_answer_points: list[str]


class InterviewGenerationResult(BaseModel):
    questions: list[GeneratedQuestion]


INTERVIEW_QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question_number": {"type": "integer"},
                    "category": {"type": "string"},
                    "question": {"type": "string"},
                    "expected_answer_points": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": [
                    "question_number",
                    "category",
                    "question",
                    "expected_answer_points",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["questions"],
    "additionalProperties": False,
}


def generate_interview_questions(
    interview_type: InterviewType,
    difficulty: DifficultyLevel,
    domain: str,
    question_count: int,
    resume_skills: list[str] | None = None,
    resume_experience: list[dict] | None = None,
) -> dict:

    if not settings.GROQ_API_KEY:
        raise ValueError("Groq API key is not configured")

    if question_count not in (5, 10, 15):
        raise ValueError("Question count must be 5, 10, or 15")

    if not domain or not domain.strip():
        raise ValueError("Interview domain is required")

    skills = resume_skills or []
    experiences = resume_experience or []

    client = Groq(
        api_key=settings.GROQ_API_KEY,
        timeout=90,
    )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": """
You are an experienced technical and HR interviewer.

Generate realistic interview questions based on the
candidate's selected preferences and available resume data.

Rules:
1. Generate exactly the requested number of questions.
2. Follow the selected interview type.
3. Match the selected difficulty level.
4. Customize questions to the selected domain.
5. Use supplied resume skills and experience when relevant.
6. Never invent candidate qualifications or work experience.
7. Do not assume a skill unless it is supplied.
8. Avoid duplicate or nearly identical questions.
9. Keep questions clear and suitable for an interview.
10. Expected answer points are evaluation guidance,
    not answers that should be shown as questions.
11. Return only valid data matching the JSON schema.
""",
                },
                {
                    "role": "user",
                    "content": f"""
Generate an interview with these settings:

Interview type: {interview_type}
Difficulty: {difficulty}
Domain: {domain}
Number of questions: {question_count}

Candidate resume skills:
{skills}

Candidate work experience:
{experiences}

Generate exactly {question_count} questions.
""",
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "interview_question_generation",
                    "strict": True,
                    "schema": INTERVIEW_QUESTION_SCHEMA,
                },
            },
        )

        result_text = response.choices[0].message.content

        if not result_text:
            raise ValueError("Groq returned an empty response")

        result = InterviewGenerationResult.model_validate_json(
            result_text
        )

        if len(result.questions) != question_count:
            raise ValueError(
                "AI returned an incorrect number of questions"
            )

        return result.model_dump()

    finally:
        client.close()
