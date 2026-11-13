# SmartHire AI: Milestone 1 Video Demonstration Script & Walkthrough Guide

This guide gives you a word-for-word voiceover script, screen recording actions, and step-by-step timestamps for presenting **Milestone 1: Requirements, Database Design & Core Setup** of the SmartHire AI platform.

---

## ⏱️ Video Structure Overview (Target: 4–6 Minutes)

| Section | Duration | Screen Action | Talking Points |
| :--- | :--- | :--- | :--- |
| **1. Introduction & Overview** | ~45s | Project title, architecture diagram ([`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md)) | Problem statement, objective of SmartHire AI, and Milestone 1 goals |
| **2. System Architecture & Database Design** | ~60s | Database ERD ([`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md)), Swagger API (`/docs`) | FastAPI backend, relational models, dual PostgreSQL/SQLite setup, REST API |
| **3. Authentication & RBAC Demo** | ~45s | Login page (`http://localhost:5173/login`) | JWT security, bcrypt password hashing, 3 distinct roles (Candidate, Recruiter, Admin) |
| **4. Candidate Workflow & AI Resume Parsing** | ~90s | Candidate Dashboard & Resume Manager (`/candidate/resume`) | File upload (`.pdf`/`.txt`), real-time skill extraction, experience & education parsing, AI summary |
| **5. Recruiter & Admin Workflows** | ~60s | Recruiter Portal (`/recruiter/candidates`), Admin Panel (`/admin/dashboard`) | Candidate directory, interview template studio, audit telemetry, scoring rubric weights |
| **6. Summary & Milestone 2 Outlook** | ~30s | Project repo / summary slide | Milestone 1 evaluation criteria met, preview of Milestone 2 (Speech, webcam, live interview room) |

---

## 🎬 Word-for-Word Video Script & Screen Actions

### Scene 1: Introduction (0:00 – 0:45)
* **What to show on screen**: Open the Web App landing/login screen or [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md).
* **What to say**:
  > *"Hello everyone! Today, I am demonstrating **Milestone 1** of **SmartHire AI**, an AI-powered mock interview and candidate assessment platform designed to help candidates prepare for technical, HR, behavioral, and aptitude interviews.*
  > 
  > *In Milestone 1, our goal was to establish the entire foundational infrastructure: defining the system architecture, designing a comprehensive database schema, implementing secure JWT authentication with Role-Based Access Control (RBAC), initializing both frontend and backend environments, and building an automated resume upload and AI skill-extraction pipeline.*
  > 
  > *Let's start by looking at the architecture and database design."*

---

### Scene 2: System Architecture & Database Schema (0:45 – 1:45)
* **What to show on screen**:
  1. Open [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md) showing the Mermaid ER diagram.
  2. Switch to browser tab: `http://127.0.0.1:8000/docs` (FastAPI Swagger UI).
* **What to say**:
  > *"The backend is built with Python 3.12 and FastAPI for high-performance, asynchronous REST APIs. For persistence, we designed a relational schema implemented via SQLAlchemy supporting both **PostgreSQL** in production and **SQLite** for development.*
  > 
  > *Our schema includes six primary entities:*
  > - *`users`: storing hashed credentials, roles, and profile attributes.*
  > - *`resumes`: housing uploaded documents and parsed AI metadata.*
  > - *`interview_templates`: configurable track templates with questions and difficulty tiers.*
  > - *`interview_sessions`: candidate interview records tracking our 4-part evaluation rubric.*
  > - *`audit_logs` and `system_settings`: tracking security events and platform weights.*
  > 
  > *As you can see in the interactive Swagger documentation at `/docs`, all endpoints for authentication, user management, resumes, templates, and admin telemetry are fully documented and operational."*

---

### Scene 3: Authentication & Role-Based Access Control (1:45 – 2:30)
* **What to show on screen**:
  1. Open `http://localhost:5173/login`.
  2. Point out the "Quick Demo Access" buttons for Candidate, Recruiter, and Admin.
  3. Show the Registration screen (`/register`) with role dropdown.
* **What to say**:
  > *"On the frontend, built with **React, TypeScript, and Tailwind CSS**, we implemented a secure authentication system powered by JSON Web Tokens and bcrypt cryptographic password hashing.*
  > 
  > *We enforce strict **Role-Based Access Control (RBAC)** across three distinct personas: Candidates, Recruiters, and Platform Administrators. Each role has protected routes enforced by both backend dependency injection and frontend route guards.*
  > 
  > *Let's log in as a **Candidate** first."*

---

### Scene 4: Candidate Workflow & AI Resume Parsing (2:30 – 4:00)
* **What to show on screen**:
  1. Click **"Demo Candidate"** and click **Sign In**.
  2. Show the **Candidate Dashboard** (metric cards: Resumes, Mock Interviews, Extracted Skills).
  3. Click **"My Resume"** in the sidebar (`/candidate/resume`).
  4. Click **"Upload Resume"** and select a sample resume (`.pdf` or `.txt`).
  5. Show the real-time extraction results:
     - **AI-Generated Summary**
     - **Extracted Skills tags** (Python, React, FastAPI, Docker, etc.)
     - **Frameworks & Stacks breakdown**
     - **Experience Analysis** (estimated years and detected job titles)
     - **Education Analysis** (degrees, graduation years)
  6. Click **"Interviews"** (`/candidate/interviews`) and show how a candidate can schedule a mock session.
* **What to say**:
  > *"Here on the Candidate Dashboard, candidates get an immediate snapshot of their profile, uploaded resumes, and mock interviews.*
  > 
  > *The core feature of Milestone 1 is our **Resume & Skill Intelligence pipeline**. When a candidate uploads their resume in PDF or text format, the backend extracts the raw text and runs heuristic AI analysis to:*
  > 1. *Identify technical skills against an ontology of over 50 programming languages, frameworks, cloud tools, and databases.*
  > 2. *Detect specific technology stacks like React, FastAPI, PostgreSQL, and Docker.*
  > 3. *Parse years of professional experience and specific job roles.*
  > 4. *Analyze academic degrees and graduation timelines.*
  > 5. *Synthesize a professional executive summary tailored for interview readiness.*
  > 
  > *Candidates can also schedule mock interview sessions linked to recruiter templates."*

---

### Scene 5: Recruiter & Admin Portals (4:00 – 5:00)
* **What to show on screen**:
  1. Sign out and click **"Demo Recruiter"** &rarr; Sign In.
  2. Show **Recruiter Dashboard** &rarr; open **"Candidates"** (`/recruiter/candidates`) showing candidates with their verified extracted skills.
  3. Open **"Templates"** (`/recruiter/templates`) &rarr; click **"Create Template"** to show technical/HR/behavioral tracks.
  4. Sign out and click **"Demo Admin"** &rarr; Sign In.
  5. Show **Admin Dashboard** (`/admin/dashboard`): live user counts, resume telemetry, and the **System Activity Audit Trail**.
  6. Show **"Settings"** (`/admin/settings`): interactive sliders for the evaluation rubric formula ($30\%$ Communication, $25\%$ Confidence, $30\%$ Technical, $15\%$ Professionalism).
* **What to say**:
  > *"Now switching to the **Recruiter Portal**: recruiters can browse the candidate directory, instantly inspect candidate skills parsed from resumes, and access the **Interview Template Studio** to configure custom question sets and difficulty levels.*
  > 
  > *Finally, logging in as **Administrator**: admins have complete governance over platform telemetry, user account activation or deactivation, security audit logs, and configuration of the evaluation rubric weights—allocating 30% to communication, 25% to confidence, 30% to technical accuracy, and 15% to professionalism.*
  > 
  > *All administrative changes are logged to our persistent audit trail."*

---

### Scene 6: Conclusion & Next Steps (5:00 – 5:30)
* **What to show on screen**: Project README or terminal showing automated tests passing (`pytest`).
* **What to say**:
  > *"To summarize, all outcomes for Milestone 1 have been completed: project scope defined, database schema finalized, frontend and backend environments initialized, full JWT authentication with RBAC implemented, and automated resume management with AI skill extraction working end-to-end.*
  > 
  > *Our automated test suite passes with 100% success, and Docker Compose configurations are ready for deployment.*
  > 
  > *In Milestone 2, we will build upon this foundation by implementing the real-time AI interview room, webcam/microphone capture, and dynamic question generation. Thank you!"*

---

## 💡 Practical Recording Tips

1. **Screen Resolution**: Set your monitor/recording window to 1080p (1920x1080) for clear text readability.
2. **Browser Tabs Prepared in Advance**:
   - Tab 1: `http://localhost:5173/login` (Frontend App)
   - Tab 2: `http://127.0.0.1:8000/docs` (Swagger OpenAPI UI)
   - Tab 3: [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md) or [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md) (in VS Code or GitHub)
3. **Sample Resume File Ready**:
   - Keep a sample resume PDF or text file on your Desktop (e.g. `resume_john_doe.txt` or a PDF) so you can drag-and-drop or select it in one click during the demo.
4. **Recording Tools**:
   - Windows Game Bar (`Win + Alt + R` or `Win + G`)
   - OBS Studio (Free & Open Source)
   - Loom / Clipchamp

