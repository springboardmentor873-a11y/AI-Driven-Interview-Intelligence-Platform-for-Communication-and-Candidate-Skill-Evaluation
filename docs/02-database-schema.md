# 2. Database schema (finalized)

Implemented in `backend/app/models.py` (SQLAlchemy). Milestone 1 uses `users` and `resumes`; the rest are created now so later milestones don't need schema redesign.

```mermaid
erDiagram
    USERS ||--o{ RESUMES : uploads
    USERS ||--o{ INTERVIEW_TEMPLATES : creates
    USERS ||--o{ INTERVIEW_SESSIONS : attends
    USERS ||--o{ NOTIFICATIONS : receives
    RESUMES ||--o{ INTERVIEW_SESSIONS : "used for"
    INTERVIEW_TEMPLATES ||--o{ INTERVIEW_SESSIONS : "based on"
    INTERVIEW_SESSIONS ||--o{ QUESTIONS : has
    QUESTIONS ||--o| ANSWERS : "answered by"
    INTERVIEW_SESSIONS ||--o| ASSESSMENTS : scored

    USERS { int id PK
            string full_name
            string email UK
            string hashed_password "null for Google users"
            string auth_provider "local|google"
            enum role "candidate|recruiter|admin"
            bool is_active
            datetime created_at }
    RESUMES { int id PK
              int user_id FK
              string filename
              string stored_name
              int size_bytes
              int page_count
              text extracted_text
              json parsed_data "M2 skills/experience/education"
              bool is_active "primary resume"
              datetime uploaded_at }
    INTERVIEW_TEMPLATES { int id PK
                          int created_by FK
                          string title
                          enum interview_type
                          enum difficulty
                          string domain
                          int num_questions
                          int duration_minutes }
    INTERVIEW_SESSIONS { int id PK
                         int candidate_id FK
                         int template_id FK
                         int resume_id FK
                         enum interview_type
                         enum difficulty
                         string domain
                         enum status
                         datetime started_at
                         datetime ended_at
                         string video_path
                         string audio_path }
    QUESTIONS { int id PK
                int session_id FK
                int order_index
                text text
                string category
                int time_limit_seconds }
    ANSWERS { int id PK
              int question_id FK
              text transcript
              float duration_seconds
              float words_per_minute
              int filler_word_count
              int grammar_issues
              float eye_contact_pct
              string dominant_emotion
              json metrics }
    ASSESSMENTS { int id PK
                  int session_id FK
                  float communication_score
                  float confidence_score
                  float technical_score
                  float professionalism_score
                  float overall_score
                  string rating
                  json strengths
                  json weaknesses
                  json suggestions
                  json resources }
    NOTIFICATIONS { int id PK
                    int user_id FK
                    string kind
                    string title
                    text message
                    bool is_read }
```

Notes
- Deleting a user cascades to their resumes, templates, sessions and notifications.
- Deleting a resume keeps past sessions (`resume_id` set to NULL).
- Migrations: tables are auto-created now; switch to Alembic before the first real deployment.
