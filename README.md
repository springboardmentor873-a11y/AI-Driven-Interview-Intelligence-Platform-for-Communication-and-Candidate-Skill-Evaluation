# SmartHire AI

SmartHire AI is a mock-interview practice platform. Candidates upload a resume, get it read automatically (with optional AI enrichment), then practise timed HR, technical, behavioral or aptitude interviews one question at a time, answering by speech-to-text or by typing, while recruiters and admins get a simple role-based view of the platform.

## Features

- Secure sign-up and login with JWT authentication, role-based access (candidate, recruiter, admin)
- Resume upload (PDF only) with private, per-user storage and plain-text extraction
- Resume reading: skills, education, experience, projects, certifications and achievements, with optional Gemini AI enrichment and a one-click re-analyse
- Mock interviews from a curated question bank, or AI-written questions when a Gemini key is set
- One question at a time, each with its own server-checked 2-minute timer; an interview left untouched for 15 minutes closes itself automatically
- Live camera preview and automatic speech-to-text while answering (a mic button next to the answer box lets you pause or resume listening), with typing always available as a fallback
- A summary screen listing every answer and the time spent on it
- Role-specific dashboards, with an admin console for creating recruiter accounts

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, React Router, Axios |
| Backend | Python, Django, Django REST Framework, SimpleJWT |
| Database | PostgreSQL |
| Optional AI | Google Gemini, via its OpenAI-compatible endpoint |

## Requirements

- Python 3.12 or newer
- Node.js (LTS) and npm
- PostgreSQL and pgAdmin
- Google Chrome or Microsoft Edge, with a working camera and microphone (needed for the interview room)

## Setup

### 1. Clone the repository

```
git clone <repository-url>
cd smarthire-ai
```

### 2. Create the database

In pgAdmin, open the Query Tool and run these one at a time:

```sql
CREATE USER smarthire_user WITH PASSWORD 'your-password';
CREATE DATABASE smarthire OWNER smarthire_user;
```

### 3. Set up the backend

```
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

(On macOS or Linux: `source .venv/bin/activate`.)

Open `backend/.env` and fill in the values below, then apply the database migrations, create an admin account and start the server:

```
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`.

### 4. Set up the frontend

In a second terminal:

```
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

```
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

## backend/.env variables

| Variable | Required? | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Required outside local dev* | a long random string |
| `DJANGO_DEBUG` | Optional | `True` |
| `DJANGO_ALLOWED_HOSTS` | Optional | `127.0.0.1,localhost` |
| `DB_NAME` | Required | `smarthire` |
| `DB_USER` | Required | `smarthire_user` |
| `DB_PASSWORD` | Required | your database password |
| `DB_HOST` | Optional | `127.0.0.1` |
| `DB_PORT` | Optional | `5432` |
| `FRONTEND_ORIGIN` | Optional | `http://localhost:5173` |
| `GEMINI_API_KEY` | Optional | your key from Google AI Studio |
| `GEMINI_MODEL` | Optional | `gemini-3.5-flash-lite` |

\* `DJANGO_SECRET_KEY` has an insecure built-in default so the app still runs on your own machine without it, but always set a real value anywhere else.

`GEMINI_API_KEY` and `GEMINI_MODEL` are optional. Leave both empty and the app works fully without AI: resumes are read with plain rules and interview questions come from a built-in question bank. Set both to turn AI on: resume reading becomes richer (summary, experience, projects, certifications...) and interview questions are written by the model instead. If an AI call fails or times out (30 seconds) for any reason, the app quietly falls back to the non-AI behaviour.

## Usage

- **Candidates** register, log in with their email and password, upload a resume, then start a practice interview from their dashboard.
- **Recruiters** are created by an admin from the admin console (they currently see role-scoped numbers only).
- **Admins** are created with `python manage.py createsuperuser` and can create recruiter accounts and see every user.
- **The interview flow**: allow your camera and microphone when asked (the video is a preview only - it is never recorded or uploaded), then answer one question at a time. Each question gets 2 minutes; your speech is turned into text automatically as you talk - press the mic button next to the answer box to pause or resume listening - and you can always type or edit the text box instead. If you leave an interview untouched for 15 minutes it closes itself: completed if you had answered something, abandoned if not.

## Main API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register a new candidate |
| POST | `/api/auth/token/` | Log in and receive tokens |
| POST | `/api/auth/token/refresh/` | Refresh the access token |
| GET | `/api/auth/me/` | Get the current user |
| GET | `/api/dashboard/` | Role-scoped dashboard numbers |
| GET, POST | `/api/resumes/` | List your resumes, or upload one (PDF, read automatically) |
| GET, DELETE | `/api/resumes/<id>/` | Get or delete one of your resumes |
| POST | `/api/resumes/<id>/reanalyse/` | Re-run the AI reading on a saved resume |
| GET, POST | `/api/interviews/` | List your interviews, or create one |
| GET | `/api/interviews/<id>/` | Interview details, with every question's status |
| POST | `/api/interviews/<id>/start/` | Start the interview (activates question 1) |
| POST | `/api/interviews/<id>/questions/<qid>/start/` | Activate a question and start its 2-minute timer |
| POST | `/api/interviews/<id>/questions/<qid>/skip/` | Skip the active question |
| POST | `/api/interviews/<id>/answers/` | Save an answer (`question_id`, `text_answer` and/or `audio_file`) |
| POST | `/api/interviews/<id>/complete/` | Finish the interview |
| GET | `/api/admin/users/` | Admin only: every account |
| POST | `/api/admin/recruiters/` | Admin only: create a recruiter account |

Interview and resume endpoints only ever show a candidate their own data - anyone else's data returns 404, not a permission error. Errors look like `{"detail": "..."}`. The interview marking rubric is stored on the server and never sent to the browser.

## Running the tests

Django creates a temporary test database on every run, so the database user needs
permission to create databases, not just own the one from setup. In pgAdmin's Query
Tool, run once:

```sql
ALTER USER smarthire_user CREATEDB;
```

Then:

```
cd backend
python manage.py test
```

## Troubleshooting

| Problem | Solution |
|---|---|
| Database login fails | Check that `DB_USER`/`DB_PASSWORD` in `backend/.env` match the database user you created |
| CORS error in the browser | Set `FRONTEND_ORIGIN` in `backend/.env` to your frontend's URL and restart the backend |
| `No module named ...` | Activate the virtual environment, then run `pip install -r requirements.txt` again |
| Camera or microphone blocked | Click the camera/lock icon in the browser's address bar, allow access, then press Try again on the permission screen |
| Resumes or questions say "Basic analysis" / come from the bank, not AI | `GEMINI_API_KEY` or `GEMINI_MODEL` is empty, wrong, or the call failed/timed out - this is expected, not an error |
| Frontend cannot reach the API | Check `VITE_API_BASE_URL` in `frontend/.env.local` and that the backend is running |

## Security notes

Secrets (`.env`, `.env.local`, API keys, passwords) are never committed to Git. Resumes and interview answers belong to the candidate who created them and are never shown to anyone else; phone numbers, emails and addresses are never extracted from resume text.
