
import json
import os

from groq import Groq


def extract_education_with_groq(resume_text: str):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    prompt = f"""
Extract education details from the resume.

Return ONLY valid JSON in this format:
{{
    "education": [
        {{
            "degree": "",
            "field_of_study": "",
            "institution": "",
            "start_year": "",
            "graduation_year": "",
            "cgpa_or_percentage": ""
        }}
    ]
}}

Rules:
- Extract only information supported by the resume.
- Do not invent missing information.
- Use empty strings for unavailable fields.
- Return an empty education array if no education is found.

Resume:
{resume_text}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": "You are a resume education information extraction assistant. Return valid JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)

    if not isinstance(result.get("education"), list):
        raise ValueError("Invalid education extraction response")

    return result
