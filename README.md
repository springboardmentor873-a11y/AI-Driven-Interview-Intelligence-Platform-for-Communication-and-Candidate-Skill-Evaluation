# SmartHire AI

**An interview-intelligence platform concept for candidate practice, recruiter workflows, and communication-focused skill evaluation.**

SmartHire AI is a full-stack project with a React frontend and a FastAPI backend. It currently provides role-based account registration and login, a candidate workspace UI, and initial interview-preparation screens. Interview sessions, resume upload and analysis, and assessment analytics are represented in the interface but are not yet connected to working backend workflows.

## Project at a glance

- **Frontend:** React 19, Vite, JavaScript, and CSS
- **Backend:** Python, FastAPI, SQLAlchemy, and Pydantic Settings
- **Database:** PostgreSQL via `psycopg`; connection settings are read from environment variables
- **Authentication:** Password hashing, bearer access tokens, and role-aware API routes

## Current functionality

- Register candidate and recruiter accounts; public admin registration is blocked.
- Log in by account role and retrieve the authenticated user's profile.
- Require administrator approval before recruiter accounts become active.
- Navigate a candidate workspace with dashboard, resume, interview, history, performance, and profile screens.
- Check backend availability at `/health`.

**In progress:** The resume upload, interview practice, interview history, and performance views are currently UI placeholders. The dashboard displays sample/empty states; it does not yet generate real interview feedback or assessment scores.

## Repository layout

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # API routes, including authentication
│   │   ├── core/         # Security and dependencies
│   │   ├── database/     # SQLAlchemy engine and session setup
│   │   ├── models/       # Database models
│   │   └── schemas/      # Request and response schemas
│   ├── create_tables.py
│   ├── main.py           # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── services/     # Frontend API calls
│   │   ├── App.jsx
│   │   └── Auth.jsx
│   ├── package.json
│   └── vite.config.js
└── AI-Driven Interview Intelligence Platform for Communication and Candidate Skill Evaluation.pdf
```

## Run locally

### Prerequisites

- Python and Node.js/npm
- A PostgreSQL database

### 1. Configure the backend

```bash
git clone https://github.com/springboardmentor873-a11y/AI-Driven-Interview-Intelligence-Platform-for-Communication-and-Candidate-Skill-Evaluation.git
cd AI-Driven-Interview-Intelligence-Platform-for-Communication-and-Candidate-Skill-Evaluation/backend

python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Create `backend/.env` with credentials for a PostgreSQL database:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smarthire
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

The database must exist and be reachable before starting the API. Create the tables from the `backend` directory:

```bash
python create_tables.py
```

Start the API:

```bash
uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend auth service currently targets `http://127.0.0.1:8000`, and the backend CORS configuration allows the Vite development origins `http://localhost:5173` and `http://127.0.0.1:5173`.

Useful frontend scripts:

```bash
npm run dev    # Start Vite development server
npm run build  # Build for production
npm run lint   # Run ESLint
npm run preview # Preview the production build locally
```

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Backend welcome/status response |
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register a candidate or recruiter |
| `POST` | `/auth/login` | Authenticate and return an access token |
| `GET` | `/auth/me` | Get the authenticated user's profile |
| `GET` | `/auth/admin-test` | Example admin-only route |
| `GET` | `/auth/recruiter-test` | Example recruiter-only route |

## Security and configuration notes

- Keep database credentials in `backend/.env`; never commit real secrets.
- Public registration cannot create admin accounts. Admin provisioning should be handled through a trusted administrative process.
- Recruiter accounts are created pending approval and cannot log in until activated.
- The frontend API base URL is currently hard-coded for local development. Configure it appropriately before deploying the frontend.
- Before production use, review token lifetime and secret management, CORS origins, database migrations, deployment settings, and account approval processes.

## Project document

The repository includes a PDF with the broader project concept and scope: [AI-Driven Interview Intelligence Platform for Communication and Candidate Skill Evaluation](./AI-Driven%20Interview%20Intelligence%20Platform%20for%20Communication%20and%20Candidate%20Skill%20Evaluation.pdf).

## License

No license file is currently included. Unless a license is added, reuse and redistribution are not granted by default.
