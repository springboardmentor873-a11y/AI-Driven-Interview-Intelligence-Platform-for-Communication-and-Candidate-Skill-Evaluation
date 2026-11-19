# OpenAI interviews

1. Apply `supabase/migrations/004_interview_sessions.sql` in Supabase SQL Editor after migrations 001–003.
2. Add your OpenAI project key to the blank `OPENAI_API_KEY=` entry in `backend/.env`. Keep it backend-only; never use a `VITE_` variable or commit the file. `OPENAI_MODEL` is configurable and defaults to `gpt-6-astra` from the current OpenAI quickstart. Choose a model your API project can access that supports Responses structured outputs.
3. Restart FastAPI from the backend folder: `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
4. Start Vite with `npm.cmd run dev`. Ensure `FRONTEND_ORIGINS` matches the printed origin (including port).
5. Sign in as a candidate, open Start interview, select preferences and generate five questions. Save each answer before leaving the page. Resume saved sessions from My interviews.

OpenAI setup: https://developers.openai.com/api/docs/quickstart
Structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs

The backend sends only selected target role, skills, interview type, and difficulty. It does not send names, contact details, resumes, or answers. It uses the Responses API with `store: false`, structured output, bounded input/output, and explicit handling of refusals/incomplete responses. API usage may incur charges. No live paid generation was performed during implementation.

Supabase sessions are candidate-owned, protected by RLS, and have immutable questions/settings after creation. Only answers and completion status can be edited; completed sessions cannot be changed by the client. Answers use timestamp-based optimistic concurrency checks. These are unscored practice records, not trusted assessment results; clients can submit their own question text when creating records. Future scoring must use server-created question provenance and server-owned scores.

AI generation is limited to one request per minute per user and two concurrent requests per backend process. This is a development safeguard, not a distributed quota: production needs shared rate limits, per-project budgets, and durable request idempotency. A page keeps generated questions in memory if database saving fails, allowing save retries without more AI usage; a refresh loses that pending set. Saved answers persist in Supabase. Unsaved edits are not autosaved, and in-app navigation can discard them.

This release supports setup, AI questions, typed answers, resuming sessions, and completion review. Recording, timers, speech analysis, scoring, and evaluator assignments remain separate work. Apply the migration and verify cross-user RLS and a real OpenAI request before treating the integration as live-tested.
