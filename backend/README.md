# SmartHire AI – Backend (Milestone 1)

Welcome to the backend of **SmartHire AI – AI-Powered Mock Interview & Candidate Assessment Platform**, built for the **Infosys Springboard Internship**.

This backend is built using **Python FastAPI**, **PostgreSQL**, **SQLAlchemy ORM**, **Pydantic v2**, and **JWT Authentication**.

---

## 📁 Scalable Directory Architecture

```text
backend/
├── app/
│   ├── core/                        # Application configuration, security & dependencies
│   │   ├── config.py                # Environment configuration settings (Pydantic BaseSettings)
│   │   ├── security.py              # Bcrypt password hashing & JWT generation/decoding
│   │   └── dependencies.py          # Fast dependency injection & Role-Based Access Control (RBAC)
│   ├── database/                    # Database connection & ORM Session
│   │   └── database.py              # SQLAlchemy engine, declarative Base, and get_db session generator
│   ├── models/                      # SQLAlchemy ORM Database Table Definitions
│   │   ├── user.py                  # User credentials, roles, and status
│   │   ├── profile.py               # CandidateProfile & RecruiterProfile (1-to-1 relationships)
│   │   └── resume.py                # Candidate resume metadata records
│   ├── schemas/                     # Pydantic Schemas for Input Validation & Output Serialization
│   │   ├── user.py                  # User registration, login, and profile schemas
│   │   ├── profile.py               # Candidate & Recruiter profile schemas
│   │   ├── resume.py                # Resume metadata response schema
│   │   └── token.py                 # JWT access token payload schemas
│   ├── routes/                      # API Endpoints (Sub-routers)
│   │   ├── __init__.py              # Combines all routers into central api_router (/api/v1)
│   │   ├── auth.py                  # POST /auth/register, POST /auth/login, GET /auth/me
│   │   ├── users.py                 # PUT /users/me, profile updates, recruiter search, admin controls
│   │   └── resumes.py               # POST /resumes/upload, GET /my-resumes, download, delete
│   ├── services/                    # Business Logic Services
│   │   └── file_service.py          # Secure multipart resume file validation and disk storage
│   ├── middleware/                  # HTTP Middleware Components
│   │   └── logging_middleware.py    # Request execution time logging & X-Process-Time header injection
│   ├── utils/                       # Generic Utility Functions
│   │   └── helpers.py               # File size formatter, filename sanitizer, UUID validator
│   └── main.py                      # FastAPI application entry point, CORS configuration, startup events
│
├── uploads/
│   └── resumes/                     # Local storage directory for candidate uploaded resume files
├── .env                             # Active environment configuration (never committed)
├── .env.example                     # Environment template for deployment
├── .gitignore                       # Prevents committing secrets, venv, cache, and uploaded files
├── requirements.txt                 # Exact Python dependencies
├── SmartHire_AI_Milestone1_Postman_Collection.json # Ready-to-import Postman collection
├── FRONTEND_INTEGRATION_GUIDE.md    # Guide for connecting React frontend to this backend
└── README.md                        # Documentation & setup manual
```

---

## 🛠️ Terminal Commands to Run the Backend

### Step 1: Open Terminal in the `backend/` Folder
```powershell
cd backend
```

### Step 2: Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
*(If using Command Prompt `cmd`: `.\venv\Scripts\activate.bat`)*

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Configure the Database in `.env`
Open `backend/.env`.

* **Option A: PostgreSQL (Production & Internship standard)**
  ```env
  DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/smarthire_db
  ```
* **Option B: SQLite (Instant zero-setup development mode)**
  ```env
  DATABASE_URL=sqlite:///./smarthire.db
  ```

### Step 5: Start the FastAPI Server
```powershell
uvicorn app.main:app --reload --port 8000
```

When you see:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```
Your backend is live!

---

## 📖 Interactive Documentation

Open your browser:
* **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Automated Verification Suite

To verify all 10 Milestone 1 workflows (registration, login, JWT validation, RBAC security, profile updates, and resume upload/download/deletion):

```powershell
python test_milestone1.py
```
