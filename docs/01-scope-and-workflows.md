# 1. Scope and workflows (Milestone 1)

## Goal
AI mock-interview and candidate-assessment platform. Candidates practice technical, HR, behavioral and aptitude interviews and get scored feedback. Recruiters review candidate reports. Admins manage the platform.

## Roles
| Role | Can do (Milestone 1) | Later milestones |
|---|---|---|
| Candidate | Register, log in, manage profile, upload / delete / set primary resume | Mock interviews, history, analytics, reports |
| Recruiter | Browse candidates, view and download their resumes | Templates, compare candidates, monitor sessions |
| Admin | Everything a recruiter can, enable / disable users | Platform settings, AI config, system analytics |

## Workflow 1: account
Register (candidate or recruiter) -> access token (30 min) + refresh token (7 days) -> token auto-refreshes on 401 -> logout clears tokens.
Optional: "Continue with Google" (OAuth2) creates a candidate account on first sign-in.
Admin accounts are never self-registered; the first admin is seeded from `.env`.

## Workflow 2: resume management
Candidate uploads PDF -> server checks size (<= 5 MB), PDF signature and readability -> file saved with a random name, text and page count extracted -> first resume becomes primary -> candidate can switch primary or delete (next newest becomes primary).
Recruiter / admin can list a candidate's resumes and download them.

## Workflow 3: interview (Milestones 2-3, designed now)
Pick type + difficulty + domain -> AI generates questions from the primary resume -> interview room (webcam + mic, timer) -> speech-to-text, filler words, eye contact, emotion -> weighted score -> feedback.

## Scoring (from the spec)
Overall = Communication 30% + Confidence 25% + Technical Relevance 30% + Professionalism 15%.
Rating: 90-100 Excellent, 75-89 Good, 60-74 Average, 40-59 Needs Improvement, below 40 Poor.

## Security decisions
- Passwords hashed with bcrypt; JWTs signed HS256; access and refresh tokens are typed so one can't replace the other.
- Disabled users are blocked at login and on every request.
- Uploads: PDF signature check, size limit, random file names, per-user limit of 5, ownership checks (other candidates get 404).
- CORS limited to the frontend origin; OAuth `state` is a signed 10-minute token.
