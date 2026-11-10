# SmartHire AI – Backend

**AI-Powered Mock Interview and Candidate Assessment Platform**

SmartHire AI is an AI-powered platform designed to help candidates practise mock interviews and evaluate their communication and technical skills. The platform aims to provide a structured interview preparation and candidate assessment experience.

This repository contains the backend implementation, including database management, user authentication, and security infrastructure.

---

## Project Overview

The backend is developed using FastAPI and PostgreSQL, following a modular architecture. It provides REST APIs for user management, authentication, session handling, and database operations.

### Planned User Roles

| Role | Description |
|---|---|
| Candidate | Participates in mock interviews and views assessment results. |
| Recruiter | Manages recruitment-related activities and evaluates candidates. |
| Admin | Manages users, roles, and administrative operations. |

---

## Technology Stack

| Category | Technology |
|---|---|
| Programming Language | Python |
| Backend Framework | FastAPI |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 (Async) |
| Database Migrations | Alembic |
| Data Validation | Pydantic v2 |
| Database Driver | asyncpg |
| Password Hashing | Argon2id |
| Authentication | JWT (HS256) |
| Token Hashing | SHA-256 |
| Containerization | Docker & Docker Compose |
| Testing | Pytest |
| Code Quality | Ruff |
| API Documentation | Swagger / OpenAPI |

---


## Database Architecture

PostgreSQL is used as the primary relational database.

The initial database design contains five main tables:

| Table | Purpose |
|---|---|
| `users` | Stores user account information, email, password hash, account status, and timestamps. |
| `roles` | Stores predefined platform roles. |
| `user_roles` | Establishes a many-to-many relationship between users and roles. |
| `refresh_sessions` | Stores hashed refresh tokens and session-related information. |
| `one_time_tokens` | Stores hashed one-time tokens for operations such as password reset. |

### Database Relationships

- A user can have multiple roles.
- A role can be assigned to multiple users.
- Each refresh session belongs to a user.
- Each one-time token belongs to a user.

The many-to-many user-role relationship provides flexibility for future role-based authorization.

### Database Migrations

Alembic is used to manage database schema changes.

The current migration history includes:

1. Creation of authentication-related database tables.
2. Addition of the one-time token table.

---

## Authentication and Security

The authentication module provides secure account and session management.

### 1. User Registration

- Accepts user registration details.
- Validates incoming data using Pydantic.
- Enforces unique email addresses.
- Hashes passwords before storing them.
- Never stores plain-text passwords.

### 2. User Login

- Verifies user credentials.
- Uses Argon2id to verify password hashes.
- Generates access and refresh tokens after successful authentication.

### 3. JWT Access Tokens

The application uses JSON Web Tokens for API authentication.

- Signed using HS256.
- Short-lived access tokens (approximately 15 minutes).
- Contains user identity and session-related claims.
- Sent through the `Authorization: Bearer` header.

### 4. Refresh Token Management

Refresh tokens are implemented using cryptographically secure random generation.

Security mechanisms include:

- SHA-256 hashing before database storage.
- Refresh-token rotation.
- Detection of previously rotated token reuse.
- Session revocation.

### 5. Password Management

Implemented functionality includes:

- Password change.
- Forgot-password flow.
- Password-reset flow.
- One-time token validation and expiry handling.

**Note:** The backend password-reset flow is implemented, but an external email delivery provider has not yet been integrated.

### 6. Additional Security Measures

- Centralized exception handling.
- Authentication rate limiting.
- CORS configuration.
- Input validation.
- Account status validation.
- Secure refresh-token cookies.

---

## API Endpoints

All APIs follow the `/api/v1` versioning convention.

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Authenticate a user |
| POST | `/api/v1/auth/refresh` | Refresh authentication credentials |
| POST | `/api/v1/auth/logout` | Logout from the current session |
| POST | `/api/v1/auth/logout-all` | Logout from all sessions |
| POST | `/api/v1/auth/password/change` | Change account password |
| POST | `/api/v1/auth/password/forgot` | Initiate password reset |
| POST | `/api/v1/auth/password/reset` | Reset account password |

### User APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Retrieve the authenticated user's profile |

### Health APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Check application health |
| GET | `/api/v1/health/ready` | Check application readiness |

---

## Installation and Setup

### Prerequisites

Ensure the following are installed:

- Python 3.12 or later
- Docker Desktop
- Git
- VS Code (recommended)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-folder>/backend
```

### 2. Configure Environment Variables

Create your local environment file using the example:

```bash
cp .env.example .env
```

Update the values in `.env` according to your local environment.

**Important:** Never commit `.env` or expose database credentials, JWT secrets, or other sensitive configuration values.

### 3. Start the Application Using Docker

Build and start the application:

```bash
docker compose up --build -d
```

Check running containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f api
```

The Docker Compose configuration starts the PostgreSQL database, applies migrations, and starts the FastAPI application.

### 4. Access the Application

Once the API is running:

| Resource | URL |
|---|---|
| API Base URL | http://localhost:8000 |
| Swagger Documentation | http://localhost:8000/docs |
| ReDoc Documentation | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/api/v1/health |
| Readiness Check | http://localhost:8000/api/v1/health/ready |

---

## Running Locally Without Docker

Create and activate a virtual environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

Configure the required environment variables and ensure PostgreSQL is running.

Apply database migrations:

```bash
alembic upgrade head
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

---

## Testing

Pytest is used for automated testing.

The test suite covers:

- Database model constraints.
- One-time token persistence and validation constraints.
- Password hashing and verification.
- JWT generation and validation.
- Refresh-token security primitives.
- Centralized exception handling.
- CORS behavior.
- Rate-limiting logic.
- Health endpoints.
- Configuration validation.

### Run Tests

From the backend directory:

```bash
pytest -v
```

### Code Quality Checks

Check formatting:

```bash
ruff format --check .
```

Run linting:

```bash
ruff check .
```

Check Python compilation:

```bash
python -m compileall -q app tests
```

Check dependency consistency:

```bash
pip check
```

