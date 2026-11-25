# SmartHire AI

SmartHire AI is an AI-powered mock interview and candidate assessment platform. It helps candidates prepare for technical, HR, behavioral and aptitude interviews, and gives recruiters and administrators a role-based workspace.

## Features

- Secure sign-up and login with JWT authentication
- Role-based access for candidates, recruiters and administrators
- Resume upload (PDF) with private, per-user storage
- Resume reading: text extraction, skill detection, education and experience hints
- Timed mock interviews (HR, technical, behavioral, aptitude) with a question bank, or AI-written questions when a Gemini key is set
- Interview room with a server-checked countdown, typed answers and optional voice recording
- Role-specific dashboards
- REST API with a React web interface

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Axios |
| Backend | Python, Django, Django REST Framework, SimpleJWT |
| Database | PostgreSQL |

## Project Structure

```
smarthire-ai/
  backend/     Django REST API
  frontend/    React web application
  README.md
```

## Prerequisites

- Python 3.11 or newer
- Node.js (LTS) and npm
- PostgreSQL and pgAdmin
- Git

## Installation

### 1. Clone the repository

```
git clone <repository-url>
cd smarthire-ai
```

### 2. Create the database

In pgAdmin, open the Query Tool and run these statements one at a time:

```sql
CREATE USER smarthire_user WITH PASSWORD 'your-password';
```
```sql
CREATE DATABASE smarthire OWNER smarthire_user;
```

### 3. Set up the backend

```
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On macOS or Linux, activate with `source .venv/bin/activate` instead.

Copy `.env.example` to `.env` and fill in your values:

```
DJANGO_SECRET_KEY=your-long-random-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DB_NAME=smarthire
DB_USER=smarthire_user
DB_PASSWORD=your-password
DB_HOST=127.0.0.1
DB_PORT=5432
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
GEMINI_MODEL=
```

`GEMINI_API_KEY` and `GEMINI_MODEL` are optional. See [Optional: AI with Google Gemini](#optional-ai-with-google-gemini).

Apply the migrations, create an admin account and start the server:

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

Start the app:

```
npm run dev
```

Open `http://localhost:5173` in your browser.

## Usage

- **Candidates** register on the Register page, log in with their email and password, upload resumes, and practise timed mock interviews from their dashboard.
- **Recruiters** are created by an administrator in the Django admin site (`/admin/`) by setting the user's role to recruiter.
- **Administrators** are created with `python manage.py createsuperuser`.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/` | Register a new candidate |
| POST | `/api/auth/token/` | Log in and receive tokens |
| POST | `/api/auth/token/refresh/` | Refresh the access token |
| GET | `/api/auth/me/` | Get the current user |
| GET | `/api/dashboard/` | Get dashboard data for the current role |
| GET, POST | `/api/resumes/` | List or upload resumes (the PDF is read and skills are detected on upload) |
| GET, DELETE | `/api/resumes/<id>/` | Get or delete one of your resumes |
| GET, POST | `/api/interviews/` | List your interviews or create one (type, domain, difficulty, 3 to 10 questions, 5 to 60 minutes, optional resume) |
| GET | `/api/interviews/<id>/` | Interview details with questions and your saved answers |
| POST | `/api/interviews/<id>/start/` | Start the timer (only once) |
| POST | `/api/interviews/<id>/answers/` | Save one answer: `question_id`, `text_answer` and/or `audio_file` (audio up to 10 MB). One answer per question. |
| POST | `/api/interviews/<id>/complete/` | Finish the interview |

Interview endpoints are for candidates only, and a candidate can only reach their own interviews (others get 404). Errors look like `{"detail": "..."}`. The marking rubric is stored on the server and is never sent to the browser.

## Optional: AI with Google Gemini

The app works without any AI key. It then uses a built-in question bank and plain rules to read resumes.

To turn AI on, put these two values in `backend/.env` and restart the backend:

```
GEMINI_API_KEY=your-key-from-google-ai-studio
GEMINI_MODEL=gemini-3.5-flash-lite
```

- Get a key at [Google AI Studio](https://aistudio.google.com/).
- Use a fast chat model. "Live" or very slow "thinking" models will often be too slow (calls are stopped after 30 seconds).
- If a call fails for any reason, the app quietly uses the question bank instead.
- Only a list of skills is sent for question writing. Resume text is sent only to improve the resume summary.

## Running Tests

```
cd backend
python manage.py test
```

## Security Notes

- Never commit `.env` files, passwords or secret keys.
- Run with `DJANGO_DEBUG=False` outside local development.
- Uploaded files are stored in `backend/media/` and are excluded from Git.

## Troubleshooting

| Problem | Solution |
|---|---|
| `No module named ...` | Activate the virtual environment and run `pip install -r requirements.txt` |
| Database login fails | Check that `DB_PASSWORD` in `backend/.env` matches your database user |
| CORS error in the browser | Set `FRONTEND_ORIGIN=http://localhost:5173` and restart the backend |
| Frontend cannot reach the API | Check `frontend/.env.local` and restart `npm run dev` |