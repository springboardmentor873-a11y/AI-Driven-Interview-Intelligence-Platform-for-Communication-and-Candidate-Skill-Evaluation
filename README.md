🚀 SmartHire AI

AI-Powered Interview Intelligence & Candidate Skill Evaluation Platform

<p align="center">
  An intelligent interview preparation and candidate assessment platform designed to help candidates practise interviews, evaluate their skills, and improve their interview readiness through AI.
</p><p align="center">
  <img src="https://img.shields.io/badge/Project-SmartHire%20AI-6366F1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-Groq-FF6B35?style=for-the-badge" />
</p>---

📌 Overview

SmartHire AI is an AI-driven interview intelligence platform that helps candidates prepare for job interviews through personalized interview questions, resume analysis, and interview session management.

The platform connects resume information with AI-powered question generation to create a more relevant interview preparation experience.

It aims to bring interview practice, candidate skill evaluation, and intelligent feedback into one integrated platform.

✨ Key Features

📄 1. AI Resume Analysis

- Upload resumes in PDF and DOCX formats.
- Extract resume text automatically.
- Identify technical and professional skills.
- Extract education and experience information.
- Identify technologies mentioned in resumes.

🧠 2. AI-Powered Interview Generation

- Generate interview questions using AI.
- Support multiple interview categories:
  - Technical
  - HR
  - Behavioral
  - Aptitude
- Choose interview difficulty:
  - Beginner
  - Intermediate
  - Advanced
- Generate questions based on resume information.

🎯 3. Interactive Interview Sessions

- Dedicated interview room.
- Dynamically generated interview questions.
- Submit answers question by question.
- Retrieve previously generated interview sessions.
- Preserve submitted answers across page refreshes.

📊 4. Interview History

- View previous interview sessions.
- Track interview completion status.
- Review previously submitted answers.

🔐 5. Authentication & Security

- User registration and login.
- Email OTP verification.
- JWT-based authentication.
- Password recovery and reset.
- Protected API endpoints and role-based access.

🛠️ Technology Stack

Layer| Technologies
Frontend| React, TypeScript, Vite
Styling| Tailwind CSS
Backend| Python, FastAPI
Database| PostgreSQL
ORM| SQLAlchemy
AI Integration| Groq API
Authentication| JWT, Email OTP
Resume Processing| PDF and DOCX parsing
Version Control| Git and GitHub

🏗️ System Architecture

flowchart TD
    A[Candidate] --> B[React Frontend]
    B --> C[FastAPI Backend]
    C --> D[Authentication]
    C --> E[Resume Processing]
    E --> F[AI Skill and Experience Extraction]
    F --> G[AI Interview Generation]
    G --> H[Interview Sessions]
    H --> I[Answer Submission]
    I --> J[PostgreSQL Database]
    J --> K[Interview History]

📂 Project Structure

SmartHire-AI/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── .env.example
│
└── README.md

⚙️ Installation & Setup

Prerequisites

- Python 3.12
- Node.js and npm
- PostgreSQL
- Git
- Groq API key

1. Clone the Repository

git clone <YOUR_REPOSITORY_URL>
cd SmartHire-AI

2. Backend Setup

cd backend

python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install -r requirements.txt

Configure your backend environment variables in "backend/.env" according to your ".env.example" file.

3. Frontend Setup

Open another terminal:

cd frontend

npm install

Configure the frontend environment variables using "frontend/.env.example".

4. Run the Backend

cd backend

python -m uvicorn app.main:app --reload

5. Run the Frontend

cd frontend

npm run dev

Open the local frontend URL displayed by Vite.

6. API Documentation

FastAPI provides interactive API documentation at:

http://localhost:8000/docs

«Configure PostgreSQL and the required environment variables before starting the backend.»

🗺️ Development Roadmap

SmartHire AI is being developed in four milestones.

Milestone| Scope| Status
Milestone 1| Authentication, database and resume management| ✅ Completed
Milestone 2| Resume analysis and AI interview generation| ✅ Completed
Milestone 3| Speech, behavior analysis and evaluation| 🔄 Upcoming
Milestone 4| Analytics, reporting, testing and deployment| ⏳ Planned

Upcoming AI Capabilities

- Speech-to-text transcription.
- Filler-word detection.
- Emotion recognition.
- Eye-contact tracking.
- Interview scoring and evaluation workflows.

Upcoming capabilities are part of the development roadmap and are not represented as completed features.

🔒 Security & Configuration

- Never commit API keys, database passwords, JWT secrets, or private environment files.
- Use ".env" files for local configuration.
- Keep uploaded resumes and personal information protected.
- Configure production credentials separately from development credentials.

🎯 Project Objective

The long-term objective of SmartHire AI is to develop an intelligent interview assessment ecosystem that combines resume intelligence, AI-generated interviews, speech analysis, behavioral indicators, and performance evaluation.

👨‍💻 Development

SmartHire AI is an evolving project. Its features are being implemented and tested incrementally according to the defined development milestones.

Built with Python, React, PostgreSQL and AI.

---

<p align="center">
  <strong>SmartHire AI — Prepare Smarter. Perform Better.</strong>
</p>