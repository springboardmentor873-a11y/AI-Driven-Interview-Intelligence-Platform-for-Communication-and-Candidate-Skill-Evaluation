# SmartHire AI

AI-powered mock interview and candidate assessment platform.

## Run with Docker
1. Copy `.env.example` to `backend/.env`
2. `docker compose up --build`
3. Frontend: http://localhost:5173 | Backend: http://localhost:8000/api/health/

## Run locally
- Backend: `cd backend`, create a venv, `pip install -r requirements.txt`, `python manage.py migrate`, `python manage.py runserver`
- Frontend: `cd frontend`, `npm install`, `npm run dev`