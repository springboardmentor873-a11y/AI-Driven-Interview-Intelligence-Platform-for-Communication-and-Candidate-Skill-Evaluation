# Database Schema

PostgreSQL in Docker (SQLite fallback in development). Models live in `backend/apps/`.

```mermaid
erDiagram
    USER ||--o{ RESUME : uploads
    USER ||--o{ INTERVIEW_TEMPLATE : creates
    USER ||--o{ INTERVIEW_SESSION : attends
    INTERVIEW_TEMPLATE ||--o{ INTERVIEW_SESSION : "used by"
    RESUME ||--o{ INTERVIEW_SESSION : "basis for"
    INTERVIEW_SESSION ||--o{ QUESTION : contains
    QUESTION ||--o| ANSWER : "answered by"
    INTERVIEW_SESSION ||--o| SCORE : "scored as"
    INTERVIEW_SESSION ||--o| FEEDBACK : "gets"

    USER {
        int id PK
        string email UK
        string role "candidate, recruiter, admin"
        string first_name
        string last_name
        bool is_active
        datetime created_at
    }
    RESUME {
        int id PK
        int user_id FK
        file file
        string original_name
        bool is_primary
        json skills
        json technologies
        json experience
        json education
        text summary
    }
    INTERVIEW_TEMPLATE {
        int id PK
        int created_by FK
        string title
        string interview_type "hr, technical, behavioral, aptitude"
        string difficulty
        string domain
        int duration_minutes
    }
    INTERVIEW_SESSION {
        int id PK
        int candidate_id FK
        int template_id FK
        int resume_id FK
        string status
        datetime started_at
        datetime ended_at
        file video_file
        file audio_file
    }
    QUESTION {
        int id PK
        int session_id FK
        text text
        int order
        int time_limit_seconds
    }
    ANSWER {
        int id PK
        int question_id FK
        text transcript
        json analysis
    }
    SCORE {
        int id PK
        int session_id FK
        float communication_score
        float confidence_score
        float technical_relevance_score
        float professionalism_score
        float overall_score
        string rating
    }
    FEEDBACK {
        int id PK
        int session_id FK
        json strengths
        json weaknesses
        json suggestions
        json practice_recommendations
        json learning_resources
    }
```

## Scoring formula (from the SR document)
Overall = Communication x 30% + Confidence x 25% + Technical Relevance x 30% + Professionalism x 15%

| Score | Rating |
|---|---|
| 90 to 100 | Excellent |
| 75 to 89 | Good |
| 60 to 74 | Average |
| 40 to 59 | Needs Improvement |
| Below 40 | Poor |

## Status
- Milestone 1: User and Resume tables are in use.
- Interview, Question, Answer, Score and Feedback tables exist so later milestones need no schema rework.