# API Reference (Milestone 1)

Base URL: `http://localhost:8000`. Send `Authorization: Bearer <access token>` on protected calls.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /api/health/ | Public | Service check |
| POST | /api/auth/register/ | Public | Create a Candidate or Recruiter account |
| POST | /api/auth/login/ | Public | Log in with email and password |
| POST | /api/auth/google/ | Public | Log in with a Google ID token |
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
| DELETE | /api/resumes/{id}/ | Candidate (owner) | Delete resume and file |