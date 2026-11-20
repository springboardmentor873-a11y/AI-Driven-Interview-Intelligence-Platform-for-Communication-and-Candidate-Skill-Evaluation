# SmartHire AI

SmartHire AI is an interview-preparation platform. The current application
provides candidate accounts, resume profile extraction, tailored interview
practice, and consent-based answer feedback.

## Current implementation

- **Frontend:** React and Vite single-page application.
- **Backend:** Django REST Framework API.
- **Database:** PostgreSQL, configured through environment variables.
- **Authentication:** Candidate registration and JWT login, with profile access.
- **Resumes:** Authenticated candidates can upload, list, download, and delete
  structurally validated PDF resumes. Uploads are limited to 10 MB and show
  transfer progress. Candidate name, email, and phone are extracted locally;
  profile extraction is local if Gemini consent is declined. Candidates can
  opt in to send resume text for Gemini extraction of skills, qualifications,
  work experience, and projects. The extracted profile summary is saved with
  the resume.
- **Interviews:** Candidates can generate role-specific questions from their
  resume skills, choose interview type and difficulty, start sessions, submit
  answers, pause or resume sessions, abandon unfinished sessions, track elapsed
  time, and review session progress. The browser interview room supports
  optional camera and microphone preview plus session recording; recordings are
  stored privately by the candidate and can be downloaded or deleted later.
  Deleting a session permanently removes its questions, answers, and recording.
  Declining Gemini consent uses local question templates and heuristic answer
  feedback instead. Local question templates are tailored to technical, HR,
  behavioral, and aptitude practice.
- **AI provider:** The backend uses Google's `google-genai` SDK and Gemini
  Developer API. Its API key is backend-only and never exposed to the frontend.
  API responses identify whether Gemini or the deterministic local fallback
  produced them.

## Not implemented yet

The following are project goals, not current features:

- Speech transcription, communication analysis, or video assessment.
- Interview analytics, candidate reports, recruiter workflows, or hiring
  decisions.

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
DB_NAME=smarthire_db
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=30000
AI_DETERMINISTIC_FALLBACK=True
```

The application loads `backend/.env`; `backend/.env.example` contains
placeholders only. If `.env` already exists, preserve its database and Django
values and add `GEMINI_API_KEY`, `GEMINI_MODEL`, and the optional settings
below—do not replace the file. Do not commit `.env` or real credentials. The
existing `.gitignore` excludes environment files.

### Model availability, quotas, and cost

`GEMINI_MODEL` is the exact model ID sent to Gemini. The default
`gemini-3.5-flash-lite` is configurable and its availability, capacity, and
free-tier eligibility can vary by account, region, and project. A model-list
entry confirms metadata visibility only; it does not guarantee that
`generateContent` is currently available. Before relying on a model:

1. Check that the [current pricing page](https://ai.google.dev/gemini-api/docs/pricing)
   lists **Free** standard text input and output for that model. Do not infer
   free availability from another model, tier, or feature.
2. In [Google AI Studio](https://aistudio.google.com/), select the project for
   your API key, confirm its billing status, and find the exact model in the
   model picker. Only try a small text prompt if the pricing and billing checks
   confirm it will not incur charges.
3. Check that project's active [AI Studio rate limits](https://aistudio.google.com/rate-limit?timeRange=last-28-days).
   Gemini limits include requests per minute (RPM), input tokens per minute
   (TPM), and requests per day (RPD). They are project- and model-dependent,
   can change, and are not guaranteed; RPD resets at midnight Pacific time.
4. Put the exact model ID in `GEMINI_MODEL` in `backend/.env`.

The integration uses only standard text generation and the configured model;
it does not enable grounding, caching, batch, or priority inference, and never
automatically switches to another (possibly paid) model. If the selected model
is unavailable, the API reports the error or uses the clearly attributed local
fallback when enabled. HTTP 503 responses are retried up to three total
attempts with exponential delays of one and two seconds before the existing
fallback behavior applies. Free access is limited and subject to change; it is
not unlimited or guaranteed to remain free. To avoid paid API use, use an AI Studio
project without an active billing account and recheck its billing and pricing
status. Linking billing can change the applicable tier and charges.

### Privacy, consent, and local processing

Before each Gemini action, the UI asks for explicit consent and explains the
data use. Interview generation may send the selected role, extracted skills,
relevant project descriptions, experience highlights, and prior generated
questions; resume text is sent only when extraction is needed. If consent is
declined, the backend does not call Google: resume extraction and question
generation use local deterministic logic, and answer feedback uses a local
heuristic. These results are marked as fallback. The local answer heuristic
is only a practice aid, not a meaningful or objective evaluation.

Google's current [Gemini API Additional Terms](https://ai.google.dev/gemini-api/docs/terms)
say that content and responses from unpaid services may be used to provide,
improve, and develop Google products and machine-learning technologies, and
human reviewers may process them. Do not submit sensitive, confidential, or
personal information to unpaid services. The backend attempts to remove common
identifiers, but redaction is not guaranteed. Review and consent to each
request, and avoid sending such material even when redaction is enabled.
Keeping the API key on the backend protects the credential from frontend
exposure; it does not make this application or candidate data fully
privacy-safe.

The Additional Terms also restrict where the service may be used; they require
Paid Services for API clients made available to users in the EEA, Switzerland,
or the UK. Check Google's current terms and region rules before deployment;
this unpaid configuration is not appropriate for those users.

If consent is given but Gemini is unavailable, `AI_DETERMINISTIC_FALLBACK=True`
allows deterministic local extraction, question generation, or answer
feedback. Set it to `False` to require the configured Gemini model after
consent. Responses identify their source. A declined-consent choice always
uses local processing regardless of this setting.

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
| `POST` | `/auth/resumes/<id>/extract-skills/` | Extract and store skills from a resume |
| `GET`, `POST` | `/interviews/` | List or create the user's interviews |
| `POST` | `/interviews/generate/` | Generate a resume- and role-tailored interview |
| `GET` | `/interviews/<id>/` | Retrieve an interview |
| `POST` | `/interviews/<id>/start/` | Start an interview session |
| `GET`, `POST` | `/interviews/<id>/questions/` | List or add interview questions |
| `POST` | `/interviews/questions/<id>/answer/` | Submit an answer |

Authenticated endpoints expect an `Authorization: Bearer <access-token>` header.
Resume uploads use `multipart/form-data` with a `file` field.
Resume extraction accepts `{"ai_consent": true}` to send resume text to Gemini;
when consent is false or omitted, extraction uses the local deterministic
fallback. Interview generation accepts JSON fields `resume` (the candidate's
resume ID), `target_role`, `interview_type`, `difficulty`, `total_questions`
(1-10), and `ai_consent`; only `true` permits sending the selected role,
resume skills, relevant project/experience summaries, and prior generated
questions to Gemini, while false or omitted uses local question templates.
Question relevance explanations are stored internally and omitted from the
question API response. Answer
submissions may include `ai_consent: true`; false or omitted runs local
heuristic feedback without sending the answer to Gemini.
Difficulty API values remain `EASY`, `MEDIUM`, and `HARD` for compatibility;
the frontend labels them Beginner, Intermediate, and Advanced.

Answer evaluations provide practice feedback on correctness, relevance,
clarity, and completeness. Scores are subjective coaching signals and are not
objective or definitive measures of candidate ability.

## Tests

From the `backend/` directory, run the Django test suite with its explicit
SQLite-only test settings (the configured PostgreSQL database is not reset):

```powershell
python manage.py test --settings=config.test_settings
```

The tests cover account authentication, resume handling/profile extraction,
Gemini structured output, local fallback behavior, interview generation,
answer evaluation, consent, session progress, and candidate access rules.
Provider calls are mocked in tests; using the live provider requires your own
`GEMINI_API_KEY`. Do not paste the key into chat or commit it.

The frontend has no automated test runner configured. From `frontend/`, run
`npm run build` to validate the production bundle.
