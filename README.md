# SmartHire AI

SmartHire AI is an AI-powered mock interview and candidate assessment platform. It helps candidates prepare for technical, HR, behavioral and aptitude interviews, and gives recruiters and administrators a role-based workspace.

## Features

- Secure sign-up and login with JWT authentication
- Role-based access for candidates, recruiters and administrators
- Resume upload (PDF) with private, per-user storage
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
```

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

- **Candidates** register on the Register page, log in with their email and password, and upload resumes from their dashboard.
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
| GET, POST | `/api/resumes/` | List or upload resumes |

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