# 4. API reference (Milestone 1)
Interactive docs: http://localhost:8000/docs

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /api/auth/register | public | Create candidate / recruiter account, returns tokens |
| POST | /api/auth/login | public | Log in, returns tokens |
| POST | /api/auth/refresh | public | Exchange refresh token for new tokens |
| GET | /api/auth/me | any user | Current user |
| PATCH | /api/auth/me | any user | Update name |
| POST | /api/auth/change-password | any user | Change password |
| GET | /api/auth/providers | public | Which OAuth providers are enabled |
| GET | /api/auth/google/login, /callback | public | Google OAuth2 flow |
| GET | /api/users | admin | List all users |
| PATCH | /api/users/{id}/active?is_active= | admin | Enable / disable user |
| GET | /api/users/candidates | recruiter, admin | List candidates |
| POST | /api/resumes | candidate | Upload PDF (multipart `file`) |
| GET | /api/resumes | candidate | Own resumes |
| PATCH | /api/resumes/{id}/active | candidate | Make primary |
| DELETE | /api/resumes/{id} | candidate | Delete |
| GET | /api/resumes/{id}/download | owner, recruiter, admin | Download PDF |
| GET | /api/resumes/candidate/{user_id} | recruiter, admin | A candidate's resumes |
| GET | /api/health | public | Health check |
