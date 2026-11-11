# SmartHire AI: System Architecture & Workflow Specification

## 1. Executive Summary & Project Scope
**SmartHire AI** is an AI-powered mock interview and candidate assessment platform designed to help candidates prepare for technical, HR, behavioral, and aptitude interviews through automated interview simulations, speech analysis, confidence evaluation, and AI-generated feedback.

### Key Stakeholders & Roles
1. **Candidate**:
   - Upload and manage resumes in PDF/text format.
   - Automated AI extraction of skills, technologies, experience, and education.
   - Schedule and participate in structured mock interviews.
   - Track improvement metrics and scoring dimensions over time.
2. **Recruiter**:
   - Access candidate directory and review AI-extracted technical qualifications.
   - Create and customize reusable interview templates (domains, questions, difficulty levels, duration).
   - Evaluate candidate readiness across objective rubric dimensions.
3. **Administrator**:
   - Manage platform users and role-based permissions (activate/disable accounts).
   - Configure global platform settings, evaluation rubric weights, and AI provider selections.
   - Monitor system activities and security audit logs.

---

## 2. High-Level Architecture Diagram

```
+----------------------------------------------------------------------------------------+
|                                     FRONTEND (React.js)                                |
|  - Candidate Portal (Resume Management, Skills Explorer, Mock Interview Rooms)          |
|  - Recruiter Portal (Candidate Comparison, Interview Template Studio)                  |
|  - Admin Control Center (User Governance, Platform Telemetry, Audit Logs)              |
+-------------------------------------------+--------------------------------------------+
                                            | HTTPS / REST & WebSocket
                                            v
+----------------------------------------------------------------------------------------+
|                                  BACKEND API GATEWAY                                    |
|                              FastAPI / Python 3.12 (Asynchronous)                      |
|  - JWT Authentication & RBAC Middleware                                                |
|  - CORS & Security Policy Enforcement                                                  |
|  - Audit Activity Logger                                                               |
+--------+------------------+------------------+-------------------+---------------------+
         |                  |                  |                   |
         v                  v                  v                   v
+----------------+  +----------------+  +---------------+  +-------------------------------+
|  Auth Service  |  | Resume Service |  | Interview Svc |  | Administration Service        |
|  - Password    |  | - PDF Text Ext |  | - Template    |  | - Platform Metrics            |
|    Hashing     |  | - AI Skill     |  |   Management  |  | - User State & RBAC           |
|  - PyJWT Token |  |   Extraction   |  | - Session     |  | - Scoring Rubric Weights      |
|    Issuance    |  | - Experience & |  |   Scheduling  |  | - Audit Trail Logging         |
|  - OAuth2 Flow |  |   Education    |  | - Rubrics     |  |                               |
+----------------+  +----------------+  +---------------+  +-------------------------------+
         |                  |                  |                   |
         +------------------+--------+---------+-------------------+
                                     |
                                     v
+----------------------------------------------------------------------------------------+
|                                    DATA PERSISTENCE                                    |
|  - PostgreSQL (Production / Docker): Relational tables, JSON documents, indexes       |
|  - SQLite (Local Dev Fallback): Zero-configuration developer database                  |
|  - Local File System / Object Storage: Uploaded PDF/Text resumes                       |
+----------------------------------------------------------------------------------------+
```

---

## 3. End-to-End Interview & Candidate Workflows

### Workflow 1: Registration & Role-Based Onboarding
1. User submits registration details choosing **Candidate** or **Recruiter**.
2. Passwords are securely hashed using **bcrypt**.
3. A signed **JWT access token** is returned containing user ID, role, and expiration timestamp.
4. Protected API endpoints enforce role access using FastAPI dependencies (`require_roles`).

### Workflow 2: Resume Upload & AI Skill Extraction
1. Candidate uploads resume (`.pdf`, `.txt`, `.md`).
2. Server validates file extension, file size, and generates an isolated disk storage path.
3. The parser extracts text (via `pypdf` for PDFs).
4. Heuristic & NLP extraction identifies:
   - **Skills**: Matched against a rich ontology of languages, frameworks, cloud tools, databases, and AI libraries.
   - **Technologies**: Categorized into Languages, Frameworks, Cloud & DevOps, Databases, and AI.
   - **Experience**: Parsed into estimated years of experience and extracted job titles.
   - **Education**: Identified degrees (B.Tech, M.S., Ph.D.), fields of study, and graduation years.
   - **Summary**: Synthesizes a structured profile summary.
5. All metadata is stored in the database relational record and presented interactively on the frontend.

### Workflow 3: Recruiter Template Configuration
1. Recruiter creates structured interview track:
   - Category: Technical, HR, Behavioral, Aptitude.
   - Difficulty: Entry, Mid, Senior, Lead.
   - Target duration and domain.
   - Configured prompt questions with expected keyword rubrics.
2. Template becomes instantly selectable by candidates for mock rounds.

### Workflow 4: Scoring Rubric Formula (Milestone 3 & 4 Preview)
Candidate evaluation follows the weighted scoring rubric:
$$\text{Overall Score} = (\text{Communication} \times 30\%) + (\text{Confidence} \times 25\%) + (\text{Technical} \times 30\%) + (\text{Professionalism} \times 15\%)$$
