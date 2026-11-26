
import json
import os

from groq import Groq, BadRequestError


def extract_technologies_with_groq(resume_text: str):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured")

    client = Groq(api_key=api_key)

    prompt = f"""
Extract technologies explicitly mentioned in this resume.

Return a JSON object with exactly this structure:

{{
    "technologies": [
        {{
            "name": "Python",
            "category": "Programming Language"
        }}
    ]
}}

Allowed categories:
Programming Language, Framework, Library, Database,
Web Technology, Cloud Platform, Developer Tool, Other.

Rules:
- Include only explicitly mentioned technologies.
- Do not invent or duplicate technologies.
- Use short, clear names.
- Return an empty array if none are found.
- Return JSON only. No markdown or explanations.

Resume text:
{resume_text}
"""

    last_error = None

    # Try twice if Groq produces invalid JSON.
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You extract technologies from resumes. "
                            "Return only a valid JSON object."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content

            if not content:
                raise ValueError("Groq returned an empty response")

            result = json.loads(content)

            technologies = result.get("technologies")

            if not isinstance(technologies, list):
                raise ValueError(
                    "Invalid technology extraction response"
                )

            for technology in technologies:
                if (
                    not isinstance(technology, dict)
                    or not isinstance(technology.get("name"), str)
                    or not isinstance(technology.get("category"), str)
                ):
                    raise ValueError(
                        "Invalid technology entry returned by Groq"
                    )

            return result

        except (BadRequestError, json.JSONDecodeError, ValueError) as error:
            last_error = error
            print(
                f"Technology extraction attempt {attempt + 1} failed:",
                repr(error),
            )

    raise last_error
