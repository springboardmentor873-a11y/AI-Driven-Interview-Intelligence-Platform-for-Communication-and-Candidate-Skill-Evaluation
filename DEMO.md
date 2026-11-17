# Milestone 1 demo (about 5 minutes)

## Setup
Backend: `cd backend`, activate venv, `uvicorn app.main:app --reload`
Frontend: `cd frontend`, `npm run dev`  ->  http://localhost:5173

## Script
1. **Register** at /register as a *candidate* (e.g. Priya). Show the role-based dashboard.
2. **Resumes** -> upload a PDF -> it becomes *Primary*. Upload a second one -> *Make primary* switches it. Try a .txt file -> error message. Download and delete one.
3. **Profile** -> change name, change password.
4. Open a private window, register as a *recruiter* -> **Candidates** -> *View resumes* -> *Download*. Show the Resumes link is absent for recruiters.
5. Log in as admin (`admin@smarthire.ai` / password from `.env`) -> **Users** -> *Disable* the candidate -> the candidate can no longer log in.
6. Open http://localhost:8000/docs -> show the endpoints and the lock icon (JWT).
7. Show the database: tables were created from `models.py` (open `smarthire.db` in the SQLite extension, or `psql` if on Postgres). Point out the already-finalized interview / assessment tables.
8. Terminal: `cd backend && pytest -q` -> 17 passed.
9. Optional: `python scripts/demo_api.py` prints the whole flow, including the failure cases.

## Talking points
- Stack matches the spec: React + Tailwind + Axios, FastAPI, PostgreSQL (SQLite for dev), JWT + OAuth2, Docker.
- Security: bcrypt, typed JWTs, auto refresh, RBAC, upload validation, ownership checks.
- Schema for all 10 modules is already in place; later milestones only add APIs and UI.

## Not in Milestone 1 (by plan)
AI skill extraction (M2), interview generation (M2), speech / emotion / eye tracking (M3), analytics and reports (M4), cloud deployment (M4).
Google login needs your own Google credentials in `.env` (see `.env.example`); without them the button is hidden.
