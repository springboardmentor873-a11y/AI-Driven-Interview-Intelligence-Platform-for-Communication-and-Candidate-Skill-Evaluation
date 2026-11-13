# SmartHire AI

AI-powered mock interview and candidate assessment platform designed to evaluate communication skills, interview readiness, and candidate performance using modern web and AI-driven backend services.

## Overview

This repository contains a full-stack application for interview intelligence and candidate skill evaluation. The solution is organized into two main parts:

- Frontend: React + Vite single-page application
- Backend: FastAPI service for authentication and API orchestration

The platform is built around the concept of helping recruiters, hiring teams, and candidates evaluate communication quality and interview performance in a structured, repeatable way.

## Key Features

- Candidate-focused interview experience
- Authentication and user access flow
- AI-driven candidate assessment workflows
- Interview intelligence platform architecture
- Frontend dashboard and assessment interface
- FastAPI backend with health and auth endpoints

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- CORS-enabled API layer
- SQLite-ready data model support

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   └── schemas/
│   ├── create_tables.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
├── AI-Driven Interview Intelligence Platform for Communication and Candidate Skill Evaluation.pdf
├── .gitignore
└── README.md
```

## Backend

The backend is a FastAPI project with:

- app startup configuration
- CORS settings for local frontend development
- authentication router integration
- health check endpoints
- database-related project structure ready for model and schema layers

### Backend entry points

- `backend/main.py` - FastAPI application entry point
- `backend/app/api/auth.py` - authentication API routes
- `backend/create_tables.py` - database table creation utility

## Frontend

The frontend is a Vite + React app with a polished UI and app shell designed for the interview intelligence experience.

### Frontend entry points

- `frontend/src/App.jsx` - main application UI
- `frontend/src/Auth.jsx` - authentication screen or flow
- `frontend/src/main.jsx` - React bootstrap
- `frontend/src/services/` - API service layer

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/springboardmentor873-a11y/AI-Driven-Interview-Intelligence-Platform-for-Communication-and-Candidate-Skill-Evaluation.git
cd AI-Driven-Interview-Intelligence-Platform-for-Communication-and-Candidate-Skill-Evaluation
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend will run locally and expose the API at:

- http://localhost:8000

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

- http://localhost:5173

## Default API Health Check

The backend includes a health endpoint:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "FastAPI Backend"
}
```

## Notes

- The project is configured for local development with CORS enabled for the Vite frontend.
- The repository also includes a project PDF that documents the platform concept and design scope.
- The backend and frontend are separated cleanly to support independent development and deployment.

## License

This project does not appear to include a repository license file. If you intend to distribute or publish it publicly, consider adding an appropriate open-source license.

## Contributing

Feel free to fork the repository and contribute improvements, bug fixes, or feature additions.

## Contact

For questions or collaboration, use the repository owner and issue tracker on GitHub.
