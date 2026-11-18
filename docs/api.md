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
| POST | /api/interviews/sessions/ | Candidate | Create an interview session with generated questions |
| GET | /api/interviews/sessions/ | Candidate | History of your sessions, newest first |
| GET | /api/interviews/sessions/{id}/ | Candidate (owner) | Session details. Questions and answers appear once it is finished |
| POST | /api/interviews/sessions/{id}/start/ | Candidate (owner) | Start the interview |
| GET | /api/interviews/sessions/{id}/next-question/ | Candidate (owner) | The current question |
| POST | /api/interviews/sessions/{id}/answer/ | Candidate (owner) | Submit an answer to the current question |
| POST | /api/interviews/sessions/{id}/finish/ | Candidate (owner) | End the interview early |
| POST | /api/interviews/sessions/{id}/cancel/ | Candidate (owner) | Cancel an interview that is not finished |
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

## Interview sessions

A session moves through `scheduled` -> `in_progress` -> `completed`, or ends as `cancelled`.

1. `POST /api/interviews/sessions/` takes the same options as generate-questions (`interview_type`,
   `difficulty`, `domain`, `question_count`, `resume_id`) and saves the questions with the session.
   You can have up to 5 unfinished sessions at a time.
2. `POST .../start/` begins the interview. Calling it again on a running session is harmless.
3. `GET .../next-question/` returns the current question with `answered` and `total`.
4. `POST .../answer/` takes `question_id` (must be the current question), `transcript` and
   `duration_seconds`. An empty transcript counts as a skipped question. The response includes the
   next question. Answering the last question completes the session.
5. `POST .../finish/` ends early. Unanswered questions stay unanswered.

Question text is hidden until the session is over, so the interview room only ever sees the current
question. Each session records `question_source` (`ai` or `basic`). Sessions are private to the
candidate who created them: anyone else gets 404.
