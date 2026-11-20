"""
Standard interview templates for quick session generation.
"""

INTERVIEW_TEMPLATES = [
    {
        "id": "quick_technical",
        "name": "Quick Technical Screen",
        "description": "3 focused technical questions for a rapid skill check (15 min).",
        "interview_type": "TECHNICAL",
        "difficulty": "MEDIUM",
        "total_questions": 3,
        "time_limit_seconds": 900,
        "domain": "backend_developer",
    },
    {
        "id": "full_technical",
        "name": "Full Technical Assessment",
        "description": "5 rigorous technical questions covering design, edge cases, and architecture (30 min).",
        "interview_type": "TECHNICAL",
        "difficulty": "HARD",
        "total_questions": 5,
        "time_limit_seconds": 1800,
        "domain": "backend_developer",
    },
    {
        "id": "behavioral_screen",
        "name": "Behavioral & Leadership",
        "description": "4 scenario-based questions evaluating collaboration, conflict resolution, and teamwork (20 min).",
        "interview_type": "BEHAVIORAL",
        "difficulty": "MEDIUM",
        "total_questions": 4,
        "time_limit_seconds": 1200,
        "domain": "",
    },
    {
        "id": "hr_round",
        "name": "HR Fit & Communication",
        "description": "3 HR questions evaluating cultural fit, motivation, and career expectations (15 min).",
        "interview_type": "HR",
        "difficulty": "EASY",
        "total_questions": 3,
        "time_limit_seconds": 900,
        "domain": "",
    },
    {
        "id": "aptitude_reasoning",
        "name": "Analytical & Problem Solving",
        "description": "3 logical, prioritization, and problem-solving reasoning challenges (15 min).",
        "interview_type": "APTITUDE",
        "difficulty": "MEDIUM",
        "total_questions": 3,
        "time_limit_seconds": 900,
        "domain": "",
    },
]
