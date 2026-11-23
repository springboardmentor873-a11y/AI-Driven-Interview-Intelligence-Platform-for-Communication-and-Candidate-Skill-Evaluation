# SmartHire AI
### AI-Driven Interview Intelligence Platform

SmartHire AI is an AI-powered interview preparation and candidate evaluation platform designed to help candidates prepare for interviews, assess their technical knowledge, and improve their overall interview performance.

The platform integrates Artificial Intelligence to analyze resumes, generate personalized interview questions, evaluate candidate responses, and provide performance-based feedback.

**Project Status:** Under Development

---

## 1. Project Objectives

The main objectives of SmartHire AI are:

- Simplify interview preparation using AI.
- Extract relevant skills from candidate resumes.
- Generate personalized interview questions.
- Conduct structured mock interview sessions.
- Evaluate candidate responses using AI.
- Provide meaningful feedback and improvement recommendations.
- Help candidates track their interview preparation progress.

---

## 2. Implemented Features

The following features have been implemented as part of the current development phase.

### User Authentication
- User registration and login.
- JWT-based authentication.
- Role-based access for candidates, recruiters, and administrators.
- Separate dashboards based on user roles.

### Resume Management
- Resume upload in PDF format.
- Resume text extraction.
- AI-based resume skill extraction functionality.
- Categorization of extracted skills.

### AI Interview Generation
- AI-powered interview question generation.
- Support for different interview types, including technical, HR, behavioral, and aptitude.
- Difficulty-based question generation.

### Interview Session Management
- Creation and management of interview sessions.
- Question-by-question interview interface.
- Candidate answer submission and storage.
- Interview completion status management.
- Interview history.

### AI-Based Answer Evaluation
- AI-powered evaluation of submitted interview answers.
- Overall performance scoring.
- Category-wise score generation.
- Identification of candidate strengths and improvement areas.
- AI-generated feedback and recommendations.
- Saving evaluation results for future reference.

### Recruiter Module
- Recruiter dashboard.
- Job management functionality.

**Note:** Some implemented AI features are still undergoing integration and testing. Successful end-to-end validation is pending for certain functionalities.

---

## 3. Features Under Development / Planned

The following features are part of the project scope but are not yet fully implemented or validated.

### Speech and Communication Analysis
- Speech-to-text conversion.
- Real-time interview transcription.
- Grammar and vocabulary analysis.
- Filler-word detection.
- Speaking pace and communication quality analysis.

### Emotion Detection and Eye Tracking
- Facial emotion recognition.
- Eye-contact tracking.
- Attention and engagement analysis.
- Confidence-related indicators.

### Advanced AI Evaluation
- More comprehensive communication assessment.
- Confidence analysis based on speech and visual indicators.
- Technical knowledge assessment improvements.
- Professionalism evaluation.
- Integrated weighted performance scoring.

### Dashboard and Analytics
- Skill-wise performance analytics.
- Interview performance trends.
- Weak-area identification and prediction.
- Advanced performance visualizations.

### Notifications and Reports
- Interview reminders and notifications.
- Email notifications.
- Downloadable interview reports.
- Detailed performance summaries.

### Final Integration and Deployment
- Complete end-to-end integration.
- Functional and performance testing.
- Security and validation improvements.
- Cloud deployment.

---

## 4. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, TypeScript |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI Integration | Google Gemini API |
| Authentication | JWT |
| Resume Processing | PyPDF |
| API Documentation | Swagger UI |
| Version Control | Git, GitHub |

---

## 5. Project Architecture

SmartHire AI follows a frontend-backend architecture where the frontend communicates with the backend through REST APIs.

```text
SmartHire AI
│
├── Frontend
│   ├── React.js
│   ├── TypeScript
│   └── Tailwind CSS
│
├── Backend
│   ├── FastAPI
│   ├── REST APIs
│   ├── Authentication
│   ├── Resume Processing
│   └── AI Integration
│
├── Database
│   └── PostgreSQL
│
└── AI Services
    └── Google Gemini API
```

---

## 6. Project Structure

```text
SmartHire-AI/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── database.py
│   │
│   ├── uploads/
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   │
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## 7. Installation and Setup

### Prerequisites

Make sure the following tools are installed:

- Python
- Node.js and npm
- PostgreSQL
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/rinku-15/SmartHire-AI.git
cd SmartHire-AI
```

### Step 2: Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Configure the backend environment variables in the `.env` file.

Start the backend server:

```bash
uvicorn app.main:app --reload
```

Backend URL:

`http://127.0.0.1:8000`

### Step 3: Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

`http://localhost:5173`

---

## 8. Environment Configuration

Create a `.env` file inside the backend directory and configure the required variables according to the backend configuration.

Example:

```env
DATABASE_URL=your_postgresql_database_url
SECRET_KEY=your_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

Do not upload `.env` files, API keys, database passwords, or other sensitive credentials to GitHub.

---

## 9. API Documentation

SmartHire AI uses FastAPI to develop RESTful APIs.

After starting the backend server, access the interactive API documentation at:

**Swagger UI:** http://127.0.0.1:8000/docs

---

## 10. Development Roadmap

The project is being developed in multiple milestones.

| Milestone | Development Focus | Status |
|---|---|---|
| Milestone 1 | Requirements, database design, authentication and core setup | Implemented; testing and validation ongoing |
| Milestone 2 | Resume processing and AI interview generation | Major features implemented; integration testing ongoing |
| Milestone 3 | Speech analysis, emotion detection, eye tracking and advanced evaluation | Pending |
| Milestone 4 | Analytics, reports, notifications, testing and deployment | Pending |

---

## 11. Future Scope

SmartHire AI aims to become a comprehensive interview intelligence platform by integrating speech processing, computer vision, advanced candidate evaluation, and personalized learning recommendations.

The future development will focus on improving the accuracy of AI assessments, enhancing the candidate experience, and providing deeper insights into interview performance.

---

## 12. Author

**Rinku Balai**

GitHub: [@rinku-15](https://github.com/rinku-15)

Project Repository: [SmartHire AI](https://github.com/rinku-15/SmartHire-AI)

---

*SmartHire AI – Making Interview Preparation Smarter with Artificial Intelligence.*
