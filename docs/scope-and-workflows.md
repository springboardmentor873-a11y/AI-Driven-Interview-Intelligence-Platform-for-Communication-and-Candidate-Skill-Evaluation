# SmartHire AI: Scope and Workflows

## Purpose
AI-powered mock interview and candidate assessment platform. Candidates practise technical, HR,
behavioral and aptitude interviews with webcam and microphone support and receive scored,
actionable feedback. Recruiters review analytics and reports. Admins manage the platform.

## Roles
| Role | Can do |
|---|---|
| Candidate | Upload resumes, attend mock interviews, view history and analytics, download reports |
| Recruiter | Review candidate analytics and reports, compare candidates, create interview templates, monitor sessions |
| Admin | Manage users and recruiters, configure the platform and AI settings, view platform-wide analytics |

## Milestone 1 scope (Weeks 1 and 2)
In scope: database schema, environment setup, authentication (JWT, Google OAuth2, sessions),
role-based access control, PostgreSQL, resume management (upload, list, view, set primary, delete).

Out of scope (later milestones): skill extraction, question generation, interview room, speech and
emotion analysis, scoring engine, analytics dashboards, notifications, cloud deployment.

## Workflow 1: Authentication
```mermaid
sequenceDiagram
    participant U as User (React)
    participant API as Django API
    participant G as Google
    U->>API: POST /api/auth/register or /login
    API-->>U: access token (30 min) + refresh token (7 days)
    U->>G: Sign in with Google
    G-->>U: ID token
    U->>API: POST /api/auth/google (ID token)
    API->>API: Verify token, find or create user
    API-->>U: access + refresh tokens
    U->>API: Request with Authorization: Bearer access
    API-->>U: 200, or 401 when expired
    U->>API: POST /api/auth/refresh (refresh token)
    API-->>U: new access + new refresh (old one blacklisted)
    U->>API: POST /api/auth/logout (refresh token)
    API-->>U: 204 (refresh token blacklisted)
```

## Workflow 2: Candidate journey
```mermaid
flowchart LR
    A[Register or sign in] --> B[Upload resume PDF]
    B --> C[Set primary resume]
    C --> D[Start mock interview]
    D --> E[Answer questions on webcam]
    E --> F[Speech and behavior analysis]
    F --> G[Scores and AI feedback]
    G --> H[Dashboard and progress tracking]
    classDef done fill:#7c3aed,color:#fff;
    class A,B,C done;
```
Purple steps are built in Milestone 1.

## Workflow 3: Recruiter
```mermaid
flowchart LR
    R1[Sign in as recruiter] --> R2[Create interview template]
    R2 --> R3[Candidates complete interviews]
    R3 --> R4[Review reports]
    R4 --> R5[Compare candidates]
```

## Workflow 4: Admin
```mermaid
flowchart LR
    A1[Sign in as admin] --> A2[View all users]
    A2 --> A3[Change roles or deactivate accounts]
    A1 --> A4[Platform settings and analytics, later]
```

## Security rules in place
- Passwords validated by Django's strength checks. New accounts can only be Candidate or Recruiter.
- Only admins can change roles. An admin cannot demote or deactivate themselves.
- Refresh tokens rotate on use and are blacklisted on logout.
- Resumes are served only to their owner through an authenticated endpoint.
- Uploads are limited to PDF, 5 MB each and 5 per user.