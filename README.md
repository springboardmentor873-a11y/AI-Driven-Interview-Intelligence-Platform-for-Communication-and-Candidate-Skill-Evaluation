# SmartHire AI: AI-Powered Mock Interview and Candidate Assessment Platform

**Milestone 1: Requirements, Database Design & Core Setup** (Completed)

---

## 🚀 Overview of Milestone 1 Deliverables

In accordance with the project specification and evaluation criteria for **Milestone 1 (Week 1 & 2)**:
1. **Defined Project Scope & Workflows**: End-to-end user journeys for Candidate, Recruiter, and Admin documented with architectural diagrams in [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md).
2. **Designed & Finalized Database Schema**: Full relational schema implemented with SQLAlchemy models (`users`, `resumes`, `interview_templates`, `interview_sessions`, `audit_logs`, `system_settings`), supporting both **PostgreSQL** and **SQLite** fallback. Documented with ERD in [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md).
3. **Environment Setup & Initialization**:
   - Backend: Python 3.12 + FastAPI + SQLAlchemy + PyJWT + bcrypt.
   - Frontend: Vite + React + TypeScript + Tailwind CSS + Lucide Icons + Zustand.
4. **Authentication & Role-Based Access Control (RBAC)**:
   - Secure registration and login workflows.
   - Cryptographic password hashing using `bcrypt`.
   - JWT token issuance and validation.
   - Role boundaries enforced at API dependency level (`require_roles`) and route-guard level (`ProtectedRoute`) for:
     - **Candidate**: Upload resume, view skills, schedule mock interviews.
     - **Recruiter**: Candidate directory, interview template studio.
     - **Admin**: User governance, platform telemetry, scoring rubric weights, audit trail.
5. **Resume Management & AI Extraction Workflow**:
   - Multipart resume file upload (`.pdf`, `.txt`, `.md`).
   - Automated text parsing (`pypdf`).
   - AI skill extraction matched against full tech stack ontology.
   - Technology categorization, years of experience calculation, education analysis, and AI summary synthesis.
6. **Containerization & Deployment Configuration**: Complete `docker-compose.yml`, backend Dockerfile, and frontend multi-stage Nginx Dockerfile.

---

## 🔑 Pre-Seeded Demo Accounts

The platform automatically provisions demo accounts on initialization for testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Candidate** | `candidate@smarthire.ai` | `Candidate@12345` | Resume Upload, Extracted Skills, Mock Interviews |
| **Recruiter** | `recruiter@smarthire.ai` | `Recruiter@12345` | Candidate Analytics, Template Studio |
| **Admin** | `admin@smarthire.ai` | `Admin@12345` | User Management, System Settings, Audit Logs |

---

## 💻 How to Run Locally

### 1. Backend Setup & Startup
```powershell
# Navigate to backend directory
cd backend

# Virtual environment & dependencies (using uv)
uv venv
uv pip install -r requirements.txt

# Run backend development server
uv run python run.py
# Server runs at http://localhost:8000
# Interactive Swagger docs: http://localhost:8000/docs
```

### 2. Frontend Setup & Startup
```powershell
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Run Vite dev server
npm run dev
# App runs at http://localhost:5173
```

### 3. Run Automated Tests
```powershell
cd backend
uv run pytest tests/ -v
```

### 4. Run with Docker Compose (PostgreSQL + Backend + Frontend)
```bash
docker-compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
