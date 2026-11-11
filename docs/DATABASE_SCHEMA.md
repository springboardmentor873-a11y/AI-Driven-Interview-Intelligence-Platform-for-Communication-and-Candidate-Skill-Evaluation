# SmartHire AI: Database Schema Specification

This document details the complete relational database schema design implemented for SmartHire AI, supporting both **PostgreSQL** in production/Docker and **SQLite** in development.

---

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ RESUMES : "uploads"
    USERS ||--o{ INTERVIEW_SESSIONS : "participates"
    USERS ||--o{ INTERVIEW_TEMPLATES : "creates"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    INTERVIEW_TEMPLATES ||--o{ INTERVIEW_SESSIONS : "instantiates"

    USERS {
        int id PK
        string email UK
        string hashed_password
        string full_name
        enum role "candidate | recruiter | admin"
        boolean is_active
        string phone
        string organization
        timestamp created_at
        timestamp updated_at
    }

    RESUMES {
        int id PK
        int user_id FK
        string filename
        string file_path
        int file_size
        text summary
        json skills
        json technologies
        float experience_years
        json experience_details
        json education
        text raw_text
        timestamp uploaded_at
        timestamp updated_at
    }

    INTERVIEW_TEMPLATES {
        int id PK
        int created_by FK
        string title
        text description
        enum interview_type "technical | hr | behavioral | aptitude | comprehensive"
        enum difficulty "entry | mid | senior | lead"
        string domain
        int duration_minutes
        json questions
        timestamp created_at
        timestamp updated_at
    }

    INTERVIEW_SESSIONS {
        int id PK
        int candidate_id FK
        int template_id FK
        string title
        enum status "pending | in_progress | completed | cancelled"
        enum interview_type
        enum difficulty
        float communication_score
        float confidence_score
        float technical_score
        float professionalism_score
        float overall_score
        json strengths
        json weaknesses
        json improvement_suggestions
        json detailed_metrics
        timestamp scheduled_at
        timestamp completed_at
        timestamp created_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        json details
        string ip_address
        timestamp created_at
    }

    SYSTEM_SETTINGS {
        string key PK
        json value
        text description
        timestamp updated_at
    }
```

---

## 2. Table Definitions & Constraints

### 2.1 `users` Table
Stores authentication credentials, user profiles, and assigned access roles.
- `id` (INTEGER, Primary Key, Auto-increment)
- `email` (VARCHAR(255), Unique, Not Null, Indexed)
- `hashed_password` (VARCHAR(255), Not Null) - bcrypt hashed
- `full_name` (VARCHAR(255), Not Null)
- `role` (ENUM: `candidate`, `recruiter`, `admin`, Default: `candidate`, Not Null)
- `is_active` (BOOLEAN, Default: `True`, Not Null)
- `phone` (VARCHAR(50), Nullable)
- `organization` (VARCHAR(255), Nullable)
- `created_at` (TIMESTAMP, UTC Default)
- `updated_at` (TIMESTAMP, UTC Default)

### 2.2 `resumes` Table
Stores uploaded documents and AI-extracted skills and professional metadata.
- `id` (INTEGER, Primary Key, Auto-increment)
- `user_id` (INTEGER, Foreign Key -> `users.id` ON DELETE CASCADE, Not Null)
- `filename` (VARCHAR(255), Not Null)
- `file_path` (VARCHAR(500), Not Null)
- `file_size` (INTEGER, Default: 0)
- `summary` (TEXT, Nullable) - AI generated profile summary
- `skills` (JSON, Default: `[]`) - Extracted skill tokens
- `technologies` (JSON, Default: `[]`) - Detected tech stacks
- `experience_years` (FLOAT, Default: 0.0)
- `experience_details` (JSON, Default: `[]`)
- `education` (JSON, Default: `[]`)
- `raw_text` (TEXT, Nullable)
- `uploaded_at` (TIMESTAMP, UTC Default)
- `updated_at` (TIMESTAMP, UTC Default)

### 2.3 `interview_templates` Table
Templates configured by recruiters or admins for mock interview sessions.
- `id` (INTEGER, Primary Key, Auto-increment)
- `created_by` (INTEGER, Foreign Key -> `users.id` ON DELETE SET NULL, Nullable)
- `title` (VARCHAR(255), Not Null)
- `description` (TEXT, Nullable)
- `interview_type` (ENUM: `technical`, `hr`, `behavioral`, `aptitude`, `comprehensive`)
- `difficulty` (ENUM: `entry`, `mid`, `senior`, `lead`)
- `domain` (VARCHAR(100), Default: 'Software Engineering')
- `duration_minutes` (INTEGER, Default: 30)
- `questions` (JSON, Default: `[]`)
- `created_at` (TIMESTAMP, UTC Default)
- `updated_at` (TIMESTAMP, UTC Default)

### 2.4 `interview_sessions` Table
Candidate mock interview sessions and scoring evaluation records.
- `id` (INTEGER, Primary Key, Auto-increment)
- `candidate_id` (INTEGER, Foreign Key -> `users.id` ON DELETE CASCADE, Not Null)
- `template_id` (INTEGER, Foreign Key -> `interview_templates.id` ON DELETE SET NULL, Nullable)
- `title` (VARCHAR(255), Not Null)
- `status` (ENUM: `pending`, `in_progress`, `completed`, `cancelled`)
- `interview_type` (ENUM)
- `difficulty` (ENUM)
- `communication_score` (FLOAT, 30% weight)
- `confidence_score` (FLOAT, 25% weight)
- `technical_score` (FLOAT, 30% weight)
- `professionalism_score` (FLOAT, 15% weight)
- `overall_score` (FLOAT, Weighted Composite)
- `strengths` (JSON, Default: `[]`)
- `weaknesses` (JSON, Default: `[]`)
- `improvement_suggestions` (JSON, Default: `[]`)
- `detailed_metrics` (JSON, Default: `{}`)
- `scheduled_at` (TIMESTAMP, Nullable)
- `completed_at` (TIMESTAMP, Nullable)
- `created_at` (TIMESTAMP, UTC Default)

### 2.5 `audit_logs` Table
Security tracking and administrative event monitoring.
- `id` (INTEGER, Primary Key, Auto-increment)
- `user_id` (INTEGER, Foreign Key -> `users.id` ON DELETE SET NULL, Nullable)
- `action` (VARCHAR(100), Not Null)
- `details` (JSON, Default: `{}`)
- `ip_address` (VARCHAR(45), Nullable)
- `created_at` (TIMESTAMP, UTC Default)

### 2.6 `system_settings` Table
Global platform configuration and scoring rubric weights.
- `key` (VARCHAR(100), Primary Key)
- `value` (JSON, Not Null)
- `description` (TEXT, Nullable)
- `updated_at` (TIMESTAMP, UTC Default)
