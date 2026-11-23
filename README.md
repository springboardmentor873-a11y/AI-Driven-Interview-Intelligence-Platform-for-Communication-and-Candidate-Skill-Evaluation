# 🚀 SmartHire AI – AI-Driven Interview Intelligence Platform

**SmartHire AI** is an AI-powered interview preparation and candidate evaluation platform designed to help candidates improve their technical knowledge, communication skills, and interview performance.

The platform uses Artificial Intelligence to analyze resumes, generate personalized interview questions, evaluate candidate responses, and provide actionable feedback to support continuous improvement.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Application Workflow](#-application-workflow)
- [API Documentation](#-api-documentation)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🎯 Overview

Preparing for interviews requires more than just theoretical knowledge. Candidates also need to communicate effectively, demonstrate technical understanding, and identify areas where they can improve.

SmartHire AI addresses these challenges through an integrated AI-driven platform.

It allows candidates to:

- Register and securely log in.
- Upload their resumes in PDF format.
- Extract and analyze skills from their resumes using AI.
- Generate personalized interview questions.
- Participate in AI-powered mock interview sessions.
- Submit answers and receive AI-generated performance evaluations.
- Review interview history, scores, strengths, and improvement areas.

The platform also provides role-based access for candidates, recruiters, and administrators.

---

## ✨ Key Features

### 🔐 1. User Authentication & Role-Based Access
- Secure user registration and login.
- JWT-based authentication.
- Role-based access control.
- Separate dashboards for different user roles.

### 📄 2. Resume Upload & AI Skill Extraction
- Upload resumes in PDF format.
- Extract text from uploaded resumes.
- Analyze resume content using Google Gemini AI.
- Identify skills and categorize them into:
  - Programming Languages
  - Frameworks and Libraries
  - Databases
  - Tools and Platforms
  - Core Concepts
  - Soft Skills
  - Other Skills

### 🤖 3. AI Interview Question Generation
- Generate interview questions using AI.
- Support different interview categories:
  - Technical
  - HR
  - Behavioral
  - Aptitude
- Customize interview difficulty.
- Generate questions based on candidate information and extracted skills.

### 🎤 4. Interview Session Management
- Start and manage mock interview sessions.
- Display questions one by one.
- Record candidate answers.
- Save interview progress and responses.
- Maintain interview session history.

### 📊 5. AI-Powered Answer Evaluation
- Evaluate submitted interview answers using Gemini AI.
- Generate an overall performance score.
- Provide category-wise evaluation:
  - Communication – 30%
  - Confidence – 25%
  - Technical Relevance – 30%
  - Professionalism – 15%
- Identify strengths and weaknesses.
- Provide personalized recommendations for improvement.

### 📈 6. Dashboard & Interview History
- Candidate dashboard.
- View previous interview sessions.
- Track interview completion status.
- View evaluation results and performance scores.
- Review AI-generated feedback.

### 👨‍💼 7. Recruiter Features
- Dedicated recruiter dashboard.
- Job management functionality.
- Manage job postings.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, TypeScript |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI Integration | Google Gemini API |
| Authentication | JWT |
| Resume Processing | PyPDF |
| API Testing | Swagger UI |
| Version Control | Git & GitHub |

---

## 🏗️ System Architecture

SmartHire AI follows a frontend-backend architecture.

```text
                 ┌──────────────────────┐
                 │       User           │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   React Frontend     │
                 │  TypeScript + Tailwind│
                 └──────────┬───────────┘
                            │ REST APIs
                            ▼
                 ┌──────────────────────┐
                 │   FastAPI Backend    │
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │ PostgreSQL │ │ Gemini AI  │ │ Resume PDF │
       │  Database  │ │ Integration│ │ Processing │
       └────────────┘ └────────────┘ └────────────┘
```

---

## 📁 Project Structure

```text
SmartHire-AI/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas.py
│   │   ├── database.py
│   │   └── ...
│   │
│   ├── uploads/
│   ├── requirements.txt
│   ├── .env
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   │
│   ├── public/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## ⚙️ Getting Started

Follow these steps to run SmartHire AI locally.

### 1. Clone the Repository

```bash
git clone https://github.com/rinku-15/SmartHire-AI.git
cd SmartHire-AI
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows:**

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your environment variables in the `.env` file.

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

Backend will run at:

`http://127.0.0.1:8000`

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm run dev
```

Frontend will run at:

`http://localhost:5173`

---

## 🔑 Environment Variables

Create a `.env` file inside the backend directory.

Example configuration:

```env
DATABASE_URL=your_postgresql_connection_string

SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

GEMINI_API_KEY=your_gemini_api_key
```

**Note:** These are example variable names. Match them with the configuration names used in your backend code. Never commit API keys, database credentials, or other secrets to GitHub.

---

## 🔄 Application Workflow

1. **User Registration:** Candidate registers and logs into the platform.
2. **Resume Upload:** Candidate uploads their resume in PDF format.
3. **Skill Extraction:** AI analyzes the resume and extracts relevant skills.
4. **Interview Generation:** Gemini AI generates interview questions.
5. **Interview Session:** Candidate attempts the generated questions.
6. **Answer Submission:** Responses are saved in the database.
7. **AI Evaluation:** Gemini AI evaluates the submitted answers.
8. **Performance Report:** Candidate views scores, strengths, weaknesses, and recommendations.
9. **Interview History:** Previous sessions and results remain available for review.

---

## 📚 API Documentation

SmartHire AI uses REST APIs developed with FastAPI.

After starting the backend server, access interactive API documentation through Swagger UI:

**Swagger Documentation:**  
http://127.0.0.1:8000/docs

You can explore available endpoints, test API requests, and review request and response schemas.

---

## 🚀 Future Enhancements

The following capabilities are planned as part of the project's further development:

- Speech-to-text conversion for interview responses.
- Communication analysis, including grammar, speaking pace, and filler words.
- Emotion detection and facial engagement analysis.
- Eye-contact and attention tracking.
- Advanced skill-wise performance analytics.
- Weak-area prediction and personalized learning recommendations.
- Downloadable interview performance reports.
- Email notifications and interview reminders.
- Cloud deployment and production optimization.

---

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome!

If you would like to contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Make your changes.
4. Commit your changes.
5. Submit a Pull Request.

---

## 👩‍💻 Author

**Rinku Balai**

- GitHub: [@rinku-15](https://github.com/rinku-15)
- Project: [SmartHire AI](https://github.com/rinku-15/SmartHire-AI)

---

⭐ If you find this project interesting, consider giving it a star!

**SmartHire AI – Prepare Better. Perform Better. Grow Smarter.**
