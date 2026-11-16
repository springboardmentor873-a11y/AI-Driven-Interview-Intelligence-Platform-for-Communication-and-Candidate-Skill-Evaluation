
import json
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from google import genai
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Resume, ResumeSkill


load_dotenv()

router = APIRouter(
    prefix="/api/interview-ai",
    tags=["AI Interview Question Generation"]
)


# Request body validation
class GenerateQuestionsRequest(BaseModel):
    difficulty: Literal["easy", "medium", "hard"] = "medium"

    question_count: int = Field(
        default=10,
        ge=1,
        le=20
    )

    question_type: Literal[
        "technical",
        "behavioral",
        "mixed"
    ] = "mixed"


def validate_generated_questions(data, requested_count):
    """
    Validate and normalize Gemini's JSON response.
    """

    if not isinstance(data, dict):
        raise ValueError("Invalid response format")

    questions = data.get("questions")

    if not isinstance(questions, list):
        raise ValueError("Questions must be a list")

    if len(questions) != requested_count:
        raise ValueError("Incorrect number of generated questions")

    validated_questions = []

    for index, item in enumerate(questions, start=1):

        if not isinstance(item, dict):
            raise ValueError("Invalid question item")

        question = item.get("question")
        category = item.get("category")
        expected_points = item.get("expected_answer_points")

        if not isinstance(question, str) or not question.strip():
            raise ValueError("Question text is missing")

        if not isinstance(category, str) or not category.strip():
            raise ValueError("Question category is missing")

        if not isinstance(expected_points, list):
            raise ValueError("Expected answer points must be a list")

        expected_points = [
            point.strip()
            for point in expected_points
            if isinstance(point, str) and point.strip()
        ]

        validated_questions.append({
            "question_number": index,
            "question": question.strip(),
            "category": category.strip(),
            "difficulty": item.get("difficulty", "medium"),
            "expected_answer_points": expected_points
        })

    return validated_questions


@router.post("/generate-questions")
def generate_interview_questions(
    request: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Generate personalized interview questions
    using the candidate's extracted resume skills.
    """

    # 1. Candidate role verification
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can generate interview questions"
        )

    # 2. Check Gemini API key
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured"
        )

    # 3. Find candidate's resume
    resume = db.query(Resume).filter(
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Please upload your resume first"
        )

    # 4. Fetch extracted resume skills
    resume_skills = db.query(ResumeSkill).filter(
        ResumeSkill.resume_id == resume.id,
        ResumeSkill.user_id == current_user.id
    ).first()

    if not resume_skills:
        raise HTTPException(
            status_code=404,
            detail="Please extract your resume skills first"
        )

    skills_data = resume_skills.skills

    if not isinstance(skills_data, dict):
        raise HTTPException(
            status_code=422,
            detail="Invalid resume skills data"
        )

    available_skills = {
        category: skills
        for category, skills in skills_data.items()
        if isinstance(skills, list) and skills
    }

    if not available_skills:
        raise HTTPException(
            status_code=422,
            detail="No skills found in your resume"
        )

    # 5. Prepare Gemini prompt
    prompt = f"""
You are an experienced technical interviewer
and AI interview assessment expert.

Generate personalized interview questions using
ONLY the candidate skills provided below.

CANDIDATE SKILLS:
{json.dumps(available_skills, indent=2)}

INTERVIEW REQUIREMENTS:

Difficulty: {request.difficulty}
Number of questions: {request.question_count}
Question type: {request.question_type}

INSTRUCTIONS:

1. Generate exactly {request.question_count} questions.
2. Questions must be relevant to the candidate's skills.
3. Do not assume experience, projects, or knowledge
   that is not supported by the provided skills.
4. Avoid duplicate or repetitive questions.
5. Use clear and natural interview language.
6. For technical questions, test concepts,
   practical understanding, and problem-solving.
7. For behavioral questions, use realistic
   workplace situations.
8. For mixed questions, include both technical
   and behavioral questions.
9. Keep every question at the requested difficulty.
10. Provide 2-5 short expected answer points
    for each question.
11. Do not provide the complete answer to a question.

Return ONLY valid JSON in this exact structure:

{{
    "questions": [
        {{
            "question": "Question text",
            "category": "Java / OOP / Behavioral etc.",
            "difficulty": "{request.difficulty}",
            "expected_answer_points": [
                "Expected point 1",
                "Expected point 2"
            ]
        }}
    ]
}}
"""

    # 6. Call Gemini AI
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config={
                "temperature": 0.4,
                "response_mime_type": "application/json"
            }
        )

        if not response.text:
            raise ValueError("Empty response received from Gemini")

        generated_data = json.loads(response.text)

        questions = validate_generated_questions(
            generated_data,
            request.question_count
        )

        return {
            "message": "Interview questions generated successfully",
            "candidate_id": current_user.id,
            "resume_id": resume.id,
            "difficulty": request.difficulty,
            "question_type": request.question_type,
            "total_questions": len(questions),
            "questions": questions
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned an invalid JSON response"
        )

    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to validate generated questions: {str(error)}"
        )

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to generate interview questions using Gemini AI"
        )




# ==========================================
# AI INTERVIEW ANSWER EVALUATION
# ==========================================

class InterviewAnswerItem(BaseModel):
    question_number: int = Field(ge=1)
    question: str = Field(min_length=5, max_length=2000)
    category: str = Field(min_length=1, max_length=100)
    difficulty: Literal["easy", "medium", "hard"]
    expected_answer_points: list[str] = Field(min_length=1, max_length=10)
    answer: str = Field(default="", max_length=10000)


class EvaluateAnswersRequest(BaseModel):
    questions: list[InterviewAnswerItem] = Field(
        min_length=1,
        max_length=20
    )


def validate_evaluation_response(data, requested_count):
    """
    Validate Gemini evaluation and calculate the overall score.
    """

    if not isinstance(data, dict):
        raise ValueError("Invalid evaluation response")

    category_scores = data.get("category_scores")
    evaluations = data.get("question_evaluations")

    if not isinstance(category_scores, dict):
        raise ValueError("Category scores are missing")

    if not isinstance(evaluations, list):
        raise ValueError("Question evaluations are missing")

    if len(evaluations) != requested_count:
        raise ValueError("Incorrect number of question evaluations")

    def validate_score(value, field_name):
        if (
            not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not 0 <= value <= 100
        ):
            raise ValueError(f"Invalid score: {field_name}")

        return round(value, 2)

    validated_scores = {
        "communication": validate_score(
            category_scores.get("communication"),
            "communication"
        ),
        "technical_relevance": validate_score(
            category_scores.get("technical_relevance"),
            "technical_relevance"
        ),
        "professionalism": validate_score(
            category_scores.get("professionalism"),
            "professionalism"
        )
    }

    validated_evaluations = []

    for index, item in enumerate(evaluations):

        if not isinstance(item, dict):
            raise ValueError("Invalid question evaluation")

        strengths = item.get("strengths", [])
        missing_points = item.get("missing_points", [])

        if not isinstance(strengths, list):
            raise ValueError("Invalid strengths format")

        if not isinstance(missing_points, list):
            raise ValueError("Invalid missing points format")

        validated_evaluations.append({
            "question_number": index + 1,
            "score": validate_score(
                item.get("score"),
                "question score"
            ),
            "verdict": str(item.get("verdict", "")),
            "strengths": [
                str(point) for point in strengths[:3]
            ],
            "missing_points": [
                str(point) for point in missing_points[:3]
            ],
            "feedback": str(item.get("feedback", "")),
            "improved_answer": str(
                item.get("improved_answer", "")
            )
        })

    overall_strengths = data.get("overall_strengths", [])
    areas_to_improve = data.get("areas_to_improve", [])
    recommendations = data.get("recommendations", [])

    for field_name, value in [
        ("overall_strengths", overall_strengths),
        ("areas_to_improve", areas_to_improve),
        ("recommendations", recommendations)
    ]:
        if not isinstance(value, list):
            raise ValueError(f"Invalid {field_name} format")

    # Weighted text-based evaluation.
    # Communication = 30%
    # Technical Relevance = 30%
    # Professionalism = 15%
    # Confidence = not evaluated (text-only interview).

    overall_score = (
        validated_scores["communication"] * 30
        + validated_scores["technical_relevance"] * 30
        + validated_scores["professionalism"] * 15
    ) / 75

    overall_score = round(overall_score, 2)

    if overall_score >= 90:
        rating = "Excellent"
    elif overall_score >= 75:
        rating = "Good"
    elif overall_score >= 60:
        rating = "Average"
    elif overall_score >= 40:
        rating = "Needs Improvement"
    else:
        rating = "Poor"

    return {
        "overall_score": overall_score,
        "rating": rating,
        "category_scores": {
            **validated_scores,
            "confidence": None
        },
        "question_evaluations": validated_evaluations,
        "overall_strengths": [
            str(item) for item in overall_strengths[:5]
        ],
        "areas_to_improve": [
            str(item) for item in areas_to_improve[:5]
        ],
        "recommendations": [
            str(item) for item in recommendations[:5]
        ]
    }


@router.post("/evaluate-answers")
def evaluate_interview_answers(
    request: EvaluateAnswersRequest,
    current_user=Depends(get_current_user)
):
    """
    Evaluate candidate answers using Gemini AI.

    Evaluates:
    - Communication
    - Technical relevance
    - Professionalism

    Confidence is not evaluated because only text answers
    are available.
    """

    # 1. Verify candidate role
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=403,
            detail="Only candidates can evaluate interview answers"
        )

    # 2. Check Gemini API key
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured"
        )

    # 3. Prepare compact interview data
    interview_data = []

    for item in request.questions:
        interview_data.append({
            "question_number": item.question_number,
            "question": item.question,
            "category": item.category,
            "difficulty": item.difficulty,
            "expected_points": item.expected_answer_points,
            "answer": item.answer.strip()
        })

    # 4. Optimized short prompt
    prompt = f"""
You are a professional technical interviewer.

Evaluate the candidate's answers using the questions
and expected points provided below.

INTERVIEW DATA:
{json.dumps(interview_data)}

EVALUATION RULES:
1. Evaluate every answer against its expected points.
2. Give each answer a score from 0 to 100.
3. Empty answers must receive score 0.
4. Check correctness, relevance and completeness.
5. Accept technically correct alternative explanations.
6. Do not reward technical keywords without understanding.
7. Evaluate behavioral answers on clarity, actions and results.
8. Communication means written clarity and grammar.
9. Technical relevance means accuracy and concept coverage.
10. Professionalism means structured and professional language.
11. Do not evaluate voice, confidence, eye contact or expressions.
12. Do not invent candidate experiences.
13. Keep all feedback concise and actionable.

Return ONLY valid JSON in this structure:

{{
    "category_scores": {{
        "communication": 75,
        "technical_relevance": 80,
        "professionalism": 85
    }},
    "question_evaluations": [
        {{
            "score": 80,
            "verdict": "Good",
            "strengths": ["Correct explanation"],
            "missing_points": ["Token expiration handling"],
            "feedback": "Explain token expiry and logout strategy.",
            "improved_answer": "A concise improved sample answer."
        }}
    ],
    "overall_strengths": ["Good conceptual understanding"],
    "areas_to_improve": ["Explain implementation details more clearly"],
    "recommendations": ["Practice practical authentication scenarios"]
}}

Return exactly {len(interview_data)} question evaluations.
Keep each improved answer short.
Do not include Markdown or text outside JSON.
"""

    # 5. Single Gemini API call
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config={
                "temperature": 0.1,
                "response_mime_type": "application/json",
                "max_output_tokens": 3072
            }
        )

        if not response.text:
            raise ValueError("Empty evaluation response from Gemini")

        generated_data = json.loads(response.text)

        evaluation = validate_evaluation_response(
            generated_data,
            len(interview_data)
        )

        return {
            "message": "Interview answers evaluated successfully",
            "candidate_id": current_user.id,
            "total_questions": len(interview_data),
            **evaluation
        }

    except json.JSONDecodeError:
        print("GEMINI EVALUATION ERROR: Invalid JSON")

        raise HTTPException(
            status_code=502,
            detail="Gemini returned invalid evaluation JSON"
        )

    except ValueError as error:
        print("GEMINI EVALUATION VALIDATION ERROR:", repr(error))

        raise HTTPException(
            status_code=502,
            detail=f"Unable to validate evaluation: {str(error)}"
        )

    except Exception as error:
        print("GEMINI EVALUATION ERROR:", repr(error))

        raise HTTPException(
            status_code=502,
            detail="Unable to evaluate interview answers using Gemini AI"
        )
