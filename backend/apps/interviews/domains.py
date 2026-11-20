"""
Domain profiles for specialized mock interview generation.
Enriches candidate skills and focus areas based on target technical domain.
"""

DOMAIN_PROFILES = {
    "frontend_developer": {
        "id": "frontend_developer",
        "label": "Frontend Developer",
        "description": "Modern web UI engineering, component architecture, state management, and web performance.",
        "primary_skills": ["React", "JavaScript", "TypeScript", "CSS", "HTML", "REST"],
        "focus_areas": [
            "Component lifecycle and state management",
            "Performance optimization (lazy loading, memoization, bundle size)",
            "Responsive design and cross-browser accessibility (a11y)",
            "Asynchronous state and API error handling",
            "Modern CSS architecture (Tailwind CSS, CSS modules)",
        ],
    },
    "backend_developer": {
        "id": "backend_developer",
        "label": "Backend Developer",
        "description": "Server-side services, database architecture, authentication, API design, and system scalability.",
        "primary_skills": ["Python", "Django", "PostgreSQL", "REST", "Docker", "SQL"],
        "focus_areas": [
            "RESTful API design and status code contracts",
            "Relational schema design, indexes, and query optimization",
            "Authentication, authorization, and data validation",
            "Caching strategies and concurrency handling",
            "Error handling, logging, and transactional integrity",
        ],
    },
    "data_engineer": {
        "id": "data_engineer",
        "label": "Data Engineer",
        "description": "ETL pipelines, data warehousing, big data processing, and stream handling.",
        "primary_skills": ["Python", "SQL", "PostgreSQL", "Docker", "AWS", "Pandas"],
        "focus_areas": [
            "Batch and streaming data pipeline architecture",
            "Data modeling for analytics (star, snowflake schemas)",
            "Data validation, deduplication, and quality monitoring",
            "Distributed query performance and partitioning",
            "Cloud data storage and ingestion patterns",
        ],
    },
    "devops_engineer": {
        "id": "devops_engineer",
        "label": "DevOps Engineer",
        "description": "CI/CD pipelines, container orchestration, cloud infrastructure, and observability.",
        "primary_skills": ["Docker", "Kubernetes", "Linux", "Git", "AWS", "CI/CD"],
        "focus_areas": [
            "Continuous integration and automated delivery pipelines",
            "Containerization best practices and multi-stage builds",
            "Infrastructure as Code and cloud resource provisioning",
            "Zero-downtime deployments and rollback strategies",
            "Monitoring, alerting, and incident response runbooks",
        ],
    },
    "fullstack_developer": {
        "id": "fullstack_developer",
        "label": "Full-Stack Developer",
        "description": "End-to-end web engineering, frontend UI to backend services, databases, and deployment.",
        "primary_skills": ["React", "JavaScript", "Python", "Django", "PostgreSQL", "Docker"],
        "focus_areas": [
            "End-to-end feature architecture from DB to UI",
            "API contract alignment and TypeScript/data typing",
            "User session management, JWT authentication, and CORS",
            "Database querying and UI state synchronization",
            "Full-stack debugging, automated testing, and CI/CD",
        ],
    },
}
