import os
import json
import logging
from openai import OpenAI

PREFERRED_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
]


def get_groq_client():
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_api_key and groq_api_key != "your_groq_api_key_here":
        return OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_api_key,
        )
    # Check fallback to OPENAI_API_KEY if configured
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key and openai_key != "your_openai_api_key_here":
        return OpenAI(api_key=openai_key)
    return None


def extract_resume_intelligence(resume_text):
    """
    Parses resume text using Groq Llama-3.3-70B.
    Returns structured JSON with summary, categorized skills, experience, education, and recommended roles.
    """
    if not resume_text or not resume_text.strip():
        return {
            "summary": "No text content available in resume.",
            "skills": {"technical": [], "languages": [], "frameworks": [], "databases": [], "tools": [], "soft_skills": []},
            "experience": [],
            "education": [],
            "technologies": [],
            "recommended_roles": [],
        }

    client = get_groq_client()
    if client:
        truncated_text = resume_text[:8000]
        system_prompt = (
            "You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter. "
            "Analyze the provided resume text and extract structured information. "
            "Return a strict JSON object with these exact keys:\n"
            "- summary (string: a concise 2-3 sentence executive summary of the candidate)\n"
            "- skills (object with keys: technical, languages, frameworks, databases, tools, soft_skills, each containing an array of strings)\n"
            "- experience (array of objects with: role, company, duration, description)\n"
            "- education (array of objects with: degree, institution, year, field)\n"
            "- technologies (flat array of all detected technologies/libraries/languages)\n"
            "- recommended_roles (array of 3-5 job roles the candidate is best suited for)"
        )

        for model_name in PREFERRED_MODELS:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Resume Text:\n{truncated_text}"},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
                result_text = response.choices[0].message.content
                return json.loads(result_text)
            except Exception as e:
                logger.warning(f"Groq API resume extraction with {model_name} failed: {e}. Trying next model...")

    # Smart fallback heuristic parser if API key is not configured or fails
    return _fallback_resume_parser(resume_text)


def generate_interview_questions(target_role, interview_type="technical", difficulty="medium", resume_skills=None, total_questions=5):
    """
    Generates dynamic interview questions tailored to the candidate's target role, round type, difficulty, and resume skills.
    Returns a list of dicts: [ { order, question_text, question_type, difficulty, expected_answer_points } ]
    """
    client = get_groq_client()
    skills_context = ""
    if resume_skills:
        if isinstance(resume_skills, dict):
            flat_skills = []
            for k, v in resume_skills.items():
                if isinstance(v, list):
                    flat_skills.extend(v)
            skills_context = ", ".join(flat_skills[:15])
        elif isinstance(resume_skills, list):
            skills_context = ", ".join(resume_skills[:15])

    if client:
        system_prompt = (
            "You are an AI Interviewer conducting a professional mock interview for SmartHire AI. "
            "Your objective is to generate challenging, realistic, and highly relevant interview questions. "
            "Follow the specific interview round type:\n"
            "- Technical: In-depth technical architecture, problem solving, data structures, debugging, real-world edge cases.\n"
            "- HR: Culture fit, career motivation, teamwork, salary, professional growth, work ethics.\n"
            "- Behavioral: Situational & STAR method questions (conflict resolution, overcoming failure, leadership under pressure).\n"
            "- Aptitude: Analytical thinking, quantitative estimation, logical deductions, system reasoning.\n"
            "- Mixed: A balanced combination of technical, architectural, and behavioral questions.\n\n"
            "Return a strict JSON object with a single key 'questions', which is an array of objects. Each object must have:\n"
            "- order (integer 1 to N)\n"
            "- question_text (string: clear, engaging question)\n"
            "- question_type (string: 'technical', 'hr', 'behavioral', or 'aptitude')\n"
            "- difficulty (string: 'easy', 'medium', or 'hard')\n"
            "- expected_answer_points (array of 3-4 strings detailing key concepts expected in a strong answer)"
        )

        user_prompt = (
            f"Target Role: {target_role}\n"
            f"Interview Round: {interview_type}\n"
            f"Difficulty: {difficulty}\n"
            f"Candidate Known Skills: {skills_context or 'Standard industry baseline'}\n"
            f"Total Questions: {total_questions}\n\n"
            f"Generate exactly {total_questions} interview questions."
        )

        for model_name in PREFERRED_MODELS:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.5,
                )

                parsed = json.loads(response.choices[0].message.content)
                questions = parsed.get("questions", [])
                if questions:
                    return questions
            except Exception as e:
                logger.warning(f"Groq API question generation with {model_name} failed: {e}. Trying next model...")

    # Fallback generator if Groq key is absent or offline
    return _fallback_question_generator(target_role, interview_type, difficulty, skills_context, total_questions)


def _fallback_resume_parser(text):
    text_lower = text.lower()
    tech_keywords = {
        "languages": ["python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "php", "ruby", "sql", "html", "css"],
        "frameworks": ["django", "react", "fastapi", "flask", "node.js", "express", "angular", "vue", "spring boot", "next.js", "tailwind"],
        "databases": ["postgresql", "mysql", "mongodb", "redis", "sqlite", "oracle", "cassandra", "dynamodb"],
        "tools": ["git", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "postman", "jira", "github actions", "ci/cd"],
        "soft_skills": ["communication", "leadership", "problem solving", "teamwork", "agile", "time management", "critical thinking"],
    }

    detected_skills = {k: [] for k in tech_keywords}
    flat_tech = []

    for category, terms in tech_keywords.items():
        for term in terms:
            if term in text_lower:
                detected_skills[category].append(term.title())
                if category != "soft_skills":
                    flat_tech.append(term.title())

    detected_skills["technical"] = flat_tech

    return {
        "summary": "Experienced candidate with technical proficiency in modern software development and engineering workflows.",
        "skills": detected_skills,
        "experience": [
            {
                "role": "Software Developer / Engineer",
                "company": "Industry Experience",
                "duration": "Detected in resume",
                "description": "Contributed to core application development, bug fixes, and feature releases.",
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Technology / Computer Science or Related",
                "institution": "University / College",
                "year": "Graduated",
                "field": "Engineering / Technology",
            }
        ],
        "technologies": flat_tech,
        "recommended_roles": ["Full Stack Developer", "Software Engineer", "Backend Developer", "Frontend Developer"],
    }


def _fallback_question_generator(target_role, interview_type, difficulty, skills_context, total_questions):
    bank = {
        "technical": [
            {
                "question_text": f"How would you architect a scalable backend service for a {target_role} application handling high concurrent traffic?",
                "question_type": "technical",
                "difficulty": difficulty,
                "expected_answer_points": ["Load balancing & caching", "Database indexing & sharding", "Asynchronous task queues", "Graceful degradation"],
            },
            {
                "question_text": "Can you explain the difference between synchronous and asynchronous processing, and when you would choose one over the other?",
                "question_type": "technical",
                "difficulty": difficulty,
                "expected_answer_points": ["Event loops and non-blocking I/O", "CPU-bound vs I/O-bound tasks", "Latency and user experience", "Resource utilization"],
            },
            {
                "question_text": "What strategies do you use for database optimization, query performance tuning, and indexing in relational databases?",
                "question_type": "technical",
                "difficulty": difficulty,
                "expected_answer_points": ["EXPLAIN query plans", "B-tree indexing and compound indexes", "N+1 query problem resolution", "Connection pooling"],
            },
            {
                "question_text": "How do you ensure application security against vulnerabilities like SQL injection, CSRF, and broken authentication?",
                "question_type": "technical",
                "difficulty": difficulty,
                "expected_answer_points": ["Parameterized queries & ORM safety", "JWT tokens and secure storage", "CORS & CSRF tokens", "Input sanitization and validation"],
            },
            {
                "question_text": "Describe your approach to unit testing, integration testing, and CI/CD automated deployments.",
                "question_type": "technical",
                "difficulty": difficulty,
                "expected_answer_points": ["Test pyramid concept", "Mocking external services", "Automated pipeline stages", "Rollback and canary deployment strategies"],
            },
        ],
        "hr": [
            {
                "question_text": f"Why are you interested in pursuing a career as a {target_role}, and what makes our company a great fit for you?",
                "question_type": "hr",
                "difficulty": difficulty,
                "expected_answer_points": ["Clear career vision", "Alignment with company culture", "Passion for continuous learning", "Demonstrated research about the role"],
            },
            {
                "question_text": "Tell me about a time you had to adapt quickly to a major change or unexpected roadblock in a project.",
                "question_type": "hr",
                "difficulty": difficulty,
                "expected_answer_points": ["Positive attitude towards change", "Agile mindset", "Communication with stakeholders", "Effective problem re-framing"],
            },
            {
                "question_text": "Where do you see your technical and leadership skills evolving over the next two to three years?",
                "question_type": "hr",
                "difficulty": difficulty,
                "expected_answer_points": ["Clear roadmap of growth", "Desire for mentorship or technical leadership", "Ownership of business outcomes", "Balance of breadth and depth"],
            },
            {
                "question_text": "How do you manage stress and prioritize deadlines when multiple critical tasks compete for your attention?",
                "question_type": "hr",
                "difficulty": difficulty,
                "expected_answer_points": ["Eisenhower matrix / prioritization", "Proactive communication with team lead", "Focus on high-impact items", "Healthy work-life balance"],
            },
            {
                "question_text": "What workplace environment or team dynamic brings out your absolute best performance?",
                "question_type": "hr",
                "difficulty": difficulty,
                "expected_answer_points": ["Collaborative and transparent culture", "Constructive feedback loops", "Autonomy with clear goals", "Respect for diversity of ideas"],
            },
        ],
        "behavioral": [
            {
                "question_text": "Describe a difficult conflict you had with a team member or stakeholder regarding a technical decision. How did you resolve it?",
                "question_type": "behavioral",
                "difficulty": difficulty,
                "expected_answer_points": ["Active listening", "Focusing on data and user requirements over ego", "Finding a constructive compromise", "Preserving team morale"],
            },
            {
                "question_text": "Tell me about a time when a project or feature you delivered failed or had a critical bug in production. What did you learn?",
                "question_type": "behavioral",
                "difficulty": difficulty,
                "expected_answer_points": ["Immediate ownership and incident response", "Root cause analysis without blame", "Preventative measures implemented", "Long-term resilience improvements"],
            },
            {
                "question_text": "Give an example of a situation where you had to persuade someone to adopt your technical proposal without having formal authority.",
                "question_type": "behavioral",
                "difficulty": difficulty,
                "expected_answer_points": ["Building a prototype or proof-of-concept", "Framing benefits in terms of developer velocity/reliability", "Empathy towards existing pain points", "Consensus building"],
            },
            {
                "question_text": "Describe a scenario where you received tough critical feedback on your work. How did you process and act on it?",
                "question_type": "behavioral",
                "difficulty": difficulty,
                "expected_answer_points": ["Open and non-defensive demeanor", "Seeking specific actionable clarification", "Implementing concrete adjustments", "Follow-up review"],
            },
            {
                "question_text": "Can you share an experience where you had to learn an entirely new technology or framework under tight deadline pressure?",
                "question_type": "behavioral",
                "difficulty": difficulty,
                "expected_answer_points": ["Structured rapid learning approach", "Consulting official documentation and community solutions", "Delivering MVP first", "Documenting learnings for team"],
            },
        ],
        "aptitude": [
            {
                "question_text": f"How would you estimate the amount of storage required daily by an application like {target_role} serving 10 million active users?",
                "question_type": "aptitude",
                "difficulty": difficulty,
                "expected_answer_points": ["Breaking down user actions into payload sizes", "Multiplying daily interactions by average bytes", "Factoring in metadata, indexes, and replication", "Margin of safety"],
            },
            {
                "question_text": "If a critical API endpoint suddenly experiences a 500% increase in latency without any code changes, what structured debugging steps do you take?",
                "question_type": "aptitude",
                "difficulty": difficulty,
                "expected_answer_points": ["Check monitoring / APM metrics", "Database connection pool & slow query logs", "External third-party API dependencies", "CPU/Memory/Disk I/O bottlenecks"],
            },
            {
                "question_text": "You have two candidate algorithms: one has O(N log N) time and O(1) space, the other O(N) time and O(N) space. How do you decide which to use?",
                "question_type": "aptitude",
                "difficulty": difficulty,
                "expected_answer_points": ["Memory constraints vs execution speed requirements", "Size of N in production", "Cache locality and garbage collection impact", "Readability and maintainability"],
            },
            {
                "question_text": "How do you approach decomposing a large monolithic problem into independently testable components?",
                "question_type": "aptitude",
                "difficulty": difficulty,
                "expected_answer_points": ["Single responsibility principle", "Defining clear interfaces/contracts", "Decoupling business logic from framework details", "Testability by design"],
            },
            {
                "question_text": "A feature has high business value but also brings substantial technical debt. How do you evaluate whether to build it now?",
                "question_type": "aptitude",
                "difficulty": difficulty,
                "expected_answer_points": ["Short-term vs long-term ROI", "Cost of refactoring later", "Risk mitigation and guardrails", "Aligning engineering with product goals"],
            },
        ],
    }

    selected = bank.get(interview_type, bank["technical"])
    questions = []
    for i in range(min(total_questions, len(selected))):
        q = selected[i].copy()
        q["order"] = i + 1
        questions.append(q)

    while len(questions) < total_questions:
        idx = len(questions) % len(selected)
        q = selected[idx].copy()
        q["order"] = len(questions) + 1
        questions.append(q)

    return questions
