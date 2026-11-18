# API Reference (Milestone 1)

Base URL: `http://localhost:8000`. Send `Authorization: Bearer <access token>` on protected calls.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /api/health/ | Public | Service check |
| POST | /api/auth/register/ | Public | Create a Candidate or Recruiter account |
| POST | /api/auth/login/ | Public | Log in with email and password. Optional `role` (`candidate`, `recruiter`, `admin`): the login is refused with 403 if the account has a different role |
| POST | /api/auth/google/ | Public | Log in with a Google ID token. Optional `role` works the same way. Recruiter and admin accounts are never created through Google |
| POST | /api/auth/refresh/ | Public | Exchange a refresh token for new tokens |
| POST | /api/auth/logout/ | Logged in | Blacklist the refresh token |
| GET | /api/auth/me/ | Logged in | Current user |
| PATCH | /api/auth/me/ | Logged in | Update first and last name |
| POST | /api/auth/change-password/ | Logged in | Change password |
| GET | /api/auth/users/ | Admin | List users |
| PATCH | /api/auth/users/{id}/ | Admin | Change a user's role or active status |
| GET | /api/resumes/ | Candidate | List own resumes |
| POST | /api/resumes/ | Candidate | Upload a PDF (multipart, field `file`) |
| GET | /api/resumes/{id}/download/ | Candidate (owner) | View the PDF |
| POST | /api/resumes/{id}/set-primary/ | Candidate (owner) | Mark as primary |
| POST | /api/resumes/{id}/reparse/ | Candidate (owner) | Read the PDF and run skill analysis again |
| POST | /api/interviews/generate-questions/ | Candidate | Preview a question set built from a resume (nothing is saved) |
| DELETE | /api/resumes/{id}/ | Candidate (owner) | Delete resume and file |

## Generate questions

`POST /api/interviews/generate-questions/`

| Field | Required | Notes |
|---|---|---|
| interview_type | Yes | `hr`, `technical`, `behavioral` or `aptitude` |
| difficulty | No | `easy`, `medium` (default) or `hard` |
| domain | No | Free text up to 100 characters, for example `healthcare` |
| question_count | No | 1 to 20, default 10 |
| resume_id | No | Defaults to the primary resume. Works with no resume too |

The response has `source` (`ai` for Gemini, `basic` for the built-in question bank), the settings used, and
`questions`, each with `text`, `category` and `time_limit_seconds`.
