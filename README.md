# SmartHire AI

AI-powered mock interview and candidate assessment platform.
Stack: React (Vite, Tailwind, Axios) · FastAPI · PostgreSQL / SQLite · JWT + OAuth2 · Docker

## Status
- [x] Milestone 1 (Week 1-2): setup, database schema, auth + roles, resume management
- [ ] Milestone 2 (Week 3-4): skill extraction, AI interview generation, interview room
- [ ] Milestone 3 (Week 5-6): speech analysis, emotion + eye tracking, scoring
- [ ] Milestone 4 (Week 7-8): analytics, reports, notifications, deployment

## Run
```bash
# Terminal 1
cd backend
python -m venv .venv
.venv\Scripts\activate            # mac/linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload     # http://localhost:8000/docs

# Terminal 2
cd frontend
npm install
npm run dev                       # http://localhost:5173
```
Postgres instead of SQLite: `docker compose up -d`, then use the Postgres `DATABASE_URL` in `backend/.env`.
Tests: `cd backend && pytest -q`

## Docs
docs/01-scope-and-workflows.md · 02-database-schema.md · 03-wireframes.md · 04-api-reference.md · DEMO.md
