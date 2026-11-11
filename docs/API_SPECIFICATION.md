# SmartHire AI: REST API Specification

The SmartHire AI backend exposes RESTful endpoints with interactive OpenAPI Swagger documentation available at `/docs` (and ReDoc at `/redoc`).

**Base URL**: `http://localhost:8000/api/v1`

---

## 1. Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new Candidate or Recruiter | No | `{ "email", "password", "full_name", "role", "phone", "organization" }` |
| `POST` | `/auth/login` | Login with email & password, returns JWT | No | `{ "email", "password" }` |
| `POST` | `/auth/oauth2` | Social authentication (Google/GitHub) | No | `{ "provider", "token", "email", "full_name", "role" }` |
| `GET` | `/auth/me` | Fetch currently logged-in user profile | Yes (Bearer) | None |
| `POST` | `/auth/logout` | Session invalidation and audit logging | Yes (Bearer) | None |

---

## 2. User & Role Management (`/api/v1/users`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/` | List platform users with optional role filtering | Recruiter, Admin |
| `GET` | `/users/{id}` | Retrieve profile for specific user | Self, Recruiter, Admin |
| `PUT` | `/users/{id}` | Update profile information or active status | Self (profile) / Admin (status) |
| `DELETE` | `/users/{id}` | Permanently delete user | Admin |

---

## 3. Resume Management & AI Extraction (`/api/v1/resumes`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/resumes/upload` | Upload resume file (`.pdf`, `.txt`, `.md`) and trigger AI skill parsing | Any Authenticated |
| `GET` | `/resumes/` | List resumes (Candidate sees self; Recruiter/Admin sees all) | Any Authenticated |
| `GET` | `/resumes/{id}` | Get specific resume and extracted metadata | Owner, Recruiter, Admin |
| `GET` | `/resumes/{id}/skills` | Retrieve skills, technologies, experience breakdown | Owner, Recruiter, Admin |
| `DELETE` | `/resumes/{id}` | Delete resume record and stored file from disk | Owner, Admin |

---

## 4. Interview Templates & Sessions (`/api/v1/interviews`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/interviews/templates` | Create reusable interview template | Recruiter, Admin |
| `GET` | `/interviews/templates` | List interview templates | Any Authenticated |
| `POST` | `/interviews/sessions` | Schedule / instantiate mock interview session | Any Authenticated |
| `GET` | `/interviews/sessions` | List sessions (Candidate sees self; Recruiter/Admin sees all) | Any Authenticated |
| `GET` | `/interviews/sessions/{id}` | Get session details & score rubrics | Owner, Recruiter, Admin |

---

## 5. Administration & System Telemetry (`/api/v1/admin`)

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/metrics` | Platform overview statistics (users, resumes, sessions, audits) | Admin |
| `GET` | `/admin/audit-logs` | Retrieve system activity logs & security audit trail | Admin |
| `GET` | `/admin/settings` | Retrieve active scoring rubric weights and AI configurations | Admin |
