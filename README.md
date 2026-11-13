# SmartHire AI

A responsive candidate workspace for an Infosys Springboard Virtual Internship project. React + Vite + TypeScript, Tailwind CSS, Lucide, React Router, Framer Motion, Supabase, Axios, and FastAPI.

## What is implemented

- Simple violet split-screen authentication with two flat illustrations. Login places the form on the right; registration slides it to the left and reveals different artwork. The default route opens login. Mobile uses a full-width form, and reduced-motion preferences disable the panel slide.
- Real Supabase email/password auth, email confirmation, PKCE OAuth callbacks, recovery, persistent sessions, logout, and protected routes.
- Google OAuth and optional LinkedIn OIDC (shown only after explicit configuration).
- Candidate dashboard with truthful zero/empty metrics, preparation advice, and profile completion.
- Profile editing and private profile photo uploads (JPG/PNG/WebP, 2 MB maximum).
- Persisted email, reminder, and privacy preferences. Notification delivery and optional analytics are not active yet.
- Supabase migration with automatic candidate profiles, column-level privilege protection, RLS, and private avatar storage.
- FastAPI endpoints that validate bearer tokens against Supabase Auth; no custom password system.

AI interviews, resume upload/analysis, speech analysis, report generation, and performance analytics are deliberately marked **coming soon**. They do not display synthetic user data. The dashboard is available only after real authentication; there is no demo login or authentication bypass.

## 1. Run the frontend

Requires Node.js 22.14+ and npm. Use a current supported Node LTS for deployment.

```powershell
cd "D:\Ai infosys proj"
npm.cmd install
Copy-Item .env.example .env.local
# Edit .env.local with your project's URL and publishable key.
npm.cmd run dev
```

For a reproducible install after the first checkout, use `npm.cmd ci` with the included `package-lock.json`.

Open the Vite URL printed in the terminal (normally http://127.0.0.1:5173). Without Supabase configuration, pages render with an explicit setup notice and authentication is disabled.

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_API_URL=http://127.0.0.1:8000
VITE_GOOGLE_AUTH_ENABLED=false
VITE_LINKEDIN_AUTH_ENABLED=false
```

Only a Supabase **publishable key** (or legacy anon key) belongs in Vite. Never use a secret or service-role key. Every `VITE_` value is public. Restart Vite after changing environment variables.

## 2. Configure Supabase

1. Create a Supabase project. Copy its project URL and publishable key into `.env.local`.
2. Apply `supabase/migrations/001_profiles.sql` once through the SQL editor, or use the Supabase CLI migration workflow. Run this before signing up. The migration also backfills profiles for existing users.
3. Keep email confirmation enabled under Authentication → Providers → Email. Set a minimum password length of 12 and the uppercase/lowercase/digit requirements to match the UI. Enable available password protection and rate limits appropriate to your project.
4. Under Authentication → URL Configuration, set the Site URL to your deployed origin, or `http://127.0.0.1:5173` for development. Add these explicit redirect URLs:
   - `http://127.0.0.1:5173/auth/callback`
   - `http://127.0.0.1:5173/reset-password`
   - The equivalent two URLs on your deployment origin.
   - If you use `localhost` instead of `127.0.0.1`, add those exact URLs too and stay on one origin during a flow.
5. Use the standard confirmation and reset email templates containing `{{ .ConfirmationURL }}`. Configure production SMTP before a real launch; the default mail service is limited.
6. Create an account, follow the confirmation email in the **same browser and origin** where you started (PKCE), then sign in. If you open the link elsewhere, request a fresh link in that browser. Already verified users can sign in directly.

Profiles are private to their owner. The signup trigger always sets `role = candidate`, ignoring any role in user-controlled metadata. Authenticated users have UPDATE privileges only for editable columns. Roles are reserved for trusted administrative SQL/server workflows, and role-specific recruiter/admin interfaces are out of scope. Never authorize an API operation from `user_metadata.role`.

### Google OAuth

1. Create a Google OAuth web client and configure its consent screen/test users.
2. Add the callback URL shown by Supabase (normally `https://PROJECT_REF.supabase.co/auth/v1/callback`) to the Google client's authorized redirect URIs.
3. Enable Google in Supabase Authentication → Providers and enter its client ID/secret there. The secret never goes in React or this repository.
4. Confirm your app's `/auth/callback` is allow-listed in Supabase.
5. Set `VITE_GOOGLE_AUTH_ENABLED=true` and restart/rebuild the frontend.

### LinkedIn OAuth (optional)

Enable LinkedIn's **Sign In with LinkedIn using OpenID Connect** product for your LinkedIn developer app. Configure the provider callback in LinkedIn and credentials in Supabase. Only then set `VITE_LINKEDIN_AUTH_ENABLED=true`. The implementation uses `linkedin_oidc` with `openid profile email`. Until configured, the button is omitted.

### Password recovery / account security

Forgot Password and Settings → Send reset link use `resetPasswordForEmail`, redirecting to `/reset-password`. The new password is applied only with an authenticated session created by the link (or a valid existing session, subject to Supabase's security settings). On completion, the application signs out. Turn on Supabase's secure password-change / reauthentication protections for production; errors are surfaced to the user. Existing password credentials are never stored by FastAPI.

The SPA persists Supabase sessions in browser storage to support refreshes. There is no misleading remember-me toggle. Sign out on shared devices, keep dependencies current, use HTTPS and an appropriate CSP, and avoid injecting unsanitized HTML. The browser uses text rendering for profile fields.

Official reference: [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [LinkedIn OIDC](https://supabase.com/docs/guides/auth/social-sign-in/auth-linkedin), [password reset](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 3. Run the FastAPI service

Python 3.11+ recommended. In a second terminal:

```powershell
cd "D:\Ai infosys proj\backend"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit backend/.env using the same Supabase project URL and publishable key.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Use `uv pip install --python .venv\Scripts\python.exe -r requirements.txt` if you manage Python with uv.

- `GET /health` — public health status.
- `GET /api/me` — protected verified identity.
- `GET /api/capabilities` — protected feature availability (AI features currently false).
- `/docs` — OpenAPI documentation.

FastAPI validates access tokens online through Supabase's `/auth/v1/user` endpoint, which supports current and legacy signing-key projects. It fails closed on invalid tokens and returns 503 if the identity service is unavailable. It does not merely decode JWTs. Tokens are not logged. This deliberately favors online verification over maintaining a separate signing-key cache. Future protected endpoints should reuse `current_user`; use database-backed role checks when privileged endpoints are added.

`src/lib/api.ts` is an Axios client that attaches the current Supabase access token for future API calls. Current profile operations go directly through Supabase's RLS-protected API, so the dashboard does not depend on the Python service being running.

## Checks

```powershell
npm.cmd run build
npm.cmd test
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

See `docs/TESTING.md` for integration checks that require a configured Supabase project.

## Deploying

`npm.cmd run build` produces `dist/`. Host it with an SPA fallback to `index.html` so `/dashboard`, `/auth/callback`, and `/reset-password` work on direct navigation. Supply Vite variables **at build time**. Deploy FastAPI separately on a Python-capable host and configure exact `FRONTEND_ORIGINS` (comma-separated, no wildcards) and the frontend's API URL. Add deployed auth redirect URLs in Supabase. HTTPS is required for public use.

The included terms and privacy pages honestly describe the internship implementation. Add the actual project operator's contact information and review those notices before a public launch.

## Structure

```text
src/components/       Shared controls, authentication and workspace layouts
src/context/          Supabase session and profile state
src/lib/              Supabase client, Axios client, validation
src/pages/            Auth, dashboard, profile, settings, legal notices
public/images/        Custom interview illustration
supabase/migrations/  Profiles, role separation, RLS, private storage
backend/app/          FastAPI and access-token validation
backend/tests/        API authentication regression tests
docs/                 Testing checklist and asset provenance
```
