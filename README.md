# SmartHire AI

SmartHire AI is an interview-preparation platform in early development. The
current application provides candidate accounts, resume file management, and
basic interview records. AI-based assessment features are planned but are not
implemented yet.

## Current implementation

- **Frontend:** React and Vite single-page application.
- **Backend:** Django REST Framework API.
- **Database:** PostgreSQL, configured through environment variables.
- **Authentication:** Candidate registration and JWT login, with profile access.
- **Resumes:** Authenticated candidates can upload, list, download, and delete
  PDF resumes. Uploads are limited to 10 MB.
- **Interviews:** Authenticated candidates can create and view interview
  records, add questions, and submit answers.

The interview API stores manually supplied questions and answers. It does not
currently generate questions or evaluate answers with an AI model.

## Not implemented yet

The following are project goals, not current features:

- Resume parsing or AI-based skill extraction.
- AI-generated interview questions or answer feedback.
- Speech transcription, communication analysis, or video assessment.
- Interview analytics, candidate reports, or recruiter workflows.

## Project structure

```text
.
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Users, authentication, and resumes
│   │   └── interviews/     # Interviews, questions, and answers
│   ├── config/             # Django settings and URL routing
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
└── SmartHire_AI.md         # Platform proposal and planned scope
```

## Local development

### Prerequisites

- Python version supported by the Django version in `backend/requirements.txt`.
- Node.js and npm.
- PostgreSQL.

### Configure PostgreSQL and Django

Create a PostgreSQL database and user, then create `backend/.env` with the
database credentials and a development secret key:

```dotenv
SECRET_KEY=replace-with-a-long-random-secret
DEBUG=True
DB_NAME=smarthire
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
```

Do not commit `backend/.env` or real credentials. The repository's `.gitignore`
excludes environment files.

From the repository root, create and activate a virtual environment, install
the backend dependencies, apply database migrations, and start Django:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
cd backend
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The API is available at `http://127.0.0.1:8000/`. Keep this terminal running
while using the frontend.

### Start the frontend

In a second terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (currently
`http://127.0.0.1:5173/`). The frontend's default API base URL is
`http://localhost:8000/api`. To change it, set `VITE_API_BASE_URL` in
`frontend/.env.local`, for example:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

Django CORS is configured for both `http://localhost:5173` and
`http://127.0.0.1:5173`.

## API endpoints

All API paths are prefixed with `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register/` | Register a candidate account |
| `POST` | `/auth/login/` | Obtain JWT access and refresh tokens |
| `POST` | `/auth/token/refresh/` | Refresh an access token |
| `GET` | `/auth/profile/` | Get the authenticated user's profile |
| `GET`, `POST` | `/auth/resumes/` | List or upload the user's resumes |
| `GET`, `DELETE` | `/auth/resumes/<id>/` | Retrieve or delete a resume |
| `GET` | `/auth/resumes/<id>/download/` | Download a resume |
| `GET`, `POST` | `/interviews/` | List or create the user's interviews |
| `GET` | `/interviews/<id>/` | Retrieve an interview |
| `GET`, `POST` | `/interviews/<id>/questions/` | List or add interview questions |
| `POST` | `/interviews/questions/<id>/answer/` | Submit an answer |

Authenticated endpoints expect an `Authorization: Bearer <access-token>` header.
Resume uploads use `multipart/form-data` with a `file` field.

## Tests

From the `backend/` directory, run the Django test suite:

```powershell
python manage.py test
```

The tests cover account authentication, resume handling, and some interview
access rules.
