# SmartHire AI

AI-powered mock interview and candidate assessment platform. Candidates practise HR, technical,
behavioral and aptitude interviews with AI-driven questions, speech and behavior analysis, scoring
and feedback.

## Tech stack
- Backend: Python, Django, Django REST Framework, SimpleJWT, Google OAuth2, Google Gemini, pdfplumber
- Frontend: React (Vite), Tailwind CSS, Axios, React Router
- Database: PostgreSQL (SQLite fallback for development)
- DevOps: Docker and Docker Compose, Git and GitHub
- Testing: Pytest

## Run with Docker
1. Copy `.env.example` to `backend/.env` and create `frontend/.env` (see variables below).
2. Start everything: `docker compose up --build`
3. Open the app at http://localhost:5173 and the API at http://localhost:8000/api/health/
4. Create an admin account: `docker compose exec backend python manage.py createsuperuser`

## Environment variables
| File | Variable | Purpose |
|---|---|---|
| backend/.env | DJANGO_SECRET_KEY, DJANGO_DEBUG | Django basics |
| backend/.env | DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT | PostgreSQL connection |
| backend/.env | CORS_ORIGINS | Allowed frontend origin |
| backend/.env | GOOGLE_CLIENT_ID | Google sign-in |
| backend/.env | GEMINI_API_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODEL (optional) | Gemini, for skill extraction and question generation. Without a key the app uses its built-in fallbacks |
| frontend/.env | VITE_API_URL | Backend address |
| frontend/.env | VITE_GOOGLE_CLIENT_ID | Google sign-in |

## Run the tests
`docker compose exec backend pytest -q`

## Project structure
```
backend/
  config/          Django settings (base, dev, prod) and URLs
  apps/accounts/   Users, roles, JWT, Google login, admin user management
  apps/ai/         The single place that calls Gemini
  apps/resumes/    Resume upload, text extraction and skill analysis
  apps/interviews/ Templates, question generation, sessions and recordings
  apps/scoring/    Score and feedback schema (used from Milestone 3)
  tests/           Pytest tests
frontend/src/
  api/             Axios client with automatic token refresh
  context/         Auth state
  components/      Navbar, layouts, form controls, protected routes, interview room parts
  hooks/           Camera and microphone, recording
  pages/           Login, Register, Dashboard, Resumes, Templates, Interview setup and room, Admin users
docs/              Scope and workflows, database schema, API reference, wireframes
```

## Documentation
- [Scope and workflows](docs/scope-and-workflows.md)
- [Database schema](docs/database-schema.md)
- [API reference](docs/api.md)
- [UI wireframes](docs/wireframes.md)
- [Milestone 2 guide](docs/milestone-2.md)
- [Milestone 3 guide](docs/milestone-3.md)

## Milestone status
| Milestone | Status |
|---|---|
| 1. Requirements, database design and core setup | Complete |
| 2. Resume parsing and interview engine | Complete |
| 3. Speech analysis and AI monitoring | In progress (Days 1-2 done) |
| 4. Analytics, testing and deployment | Planned |