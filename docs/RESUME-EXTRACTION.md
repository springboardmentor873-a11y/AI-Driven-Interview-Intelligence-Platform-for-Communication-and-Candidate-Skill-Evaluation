# Resume skill extraction

The Resume page now calls `POST /api/resume/analyze`. FastAPI verifies the Supabase access token, derives the resume path from that identity, and downloads through the caller's token so the private bucket's candidate/owner RLS still applies. No client-supplied user ID, file URL, or service-role key is used.

This is local PDF text extraction and an explicit keyword/alias dictionary, **not AI analysis or proficiency scoring**. No document is sent to an AI provider. Candidates review suggested skills and explicitly save selections, which merge with existing profile skills up to the existing 30-skill limit. Extraction results are temporary; only confirmed skills are saved. Replacing or removing the resume clears the review.

## Run

Use the existing frontend terminal (`npm.cmd run dev`). Start a second VS Code terminal:

```powershell
cd "D:\Ai infosys proj\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend needs the same Supabase project URL and publishable key as the frontend in `backend/.env`. Configure `FRONTEND_ORIGINS` to include the exact frontend origin; if Vite uses port 5174, add it explicitly. The frontend `VITE_API_URL` defaults to `http://127.0.0.1:8000`.

Install backend requirements if using a new environment. No new SQL migration is needed beyond 003 for private resume storage.

## Limits

- Text-based PDF, at most 5 MB and 20 pages; encrypted, unreadable, and image-only PDFs return actionable errors. OCR is not implemented.
- At most 100,000 extracted characters and 5 MB decoded page content; parsing occurs in a separate process with a 20-second timeout and two concurrent extraction slots per API worker.
- These checks are not a hardened parser sandbox. Decompression can allocate memory before the content-size check; public deployment still needs OS/container memory limits and per-user rate limits.
- Keyword matches can miss skills or match mentions in unrelated contexts. Candidates must review results. Experience, education extraction, AI summaries, and interview generation are still future work.
- Profile skill saving uses a read/merge/write operation; simultaneous edits from another tab can race. Avoid editing profile skills in two tabs at once.

Reference: https://pypdf.readthedocs.io/en/stable/user/extract-text.html

Live integration still needs a signed-in candidate with an uploaded PDF. Unit tests use generated synthetic PDFs and mocked storage/authentication responses, plus a real parser subprocess.
