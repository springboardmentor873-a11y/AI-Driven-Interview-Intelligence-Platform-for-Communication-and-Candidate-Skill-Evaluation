# Milestone 2: Resume parsing and interview engine

## What a user can do now

1. **Candidate** uploads a PDF resume. The text is read and Gemini extracts skills, technologies,
   experience, education and a short summary. The Resumes page shows them, with a Re-analyse button
   and a badge that says whether Gemini ("Analysed by AI") or the built-in fallback ("Basic scan")
   produced the result.
2. **Recruiter** creates interview templates (type, difficulty, domain, number of questions,
   duration) and publishes them.
3. **Candidate** starts an interview from a published template or a custom setup. Questions are
   generated from their resume.
4. In the **interview room** they check their camera and microphone, then answer one question at a
   time against a countdown. When the time runs out the answer is sent automatically.
5. The browser records video and audio and uploads them when the interview ends. The candidate can
   delete the recording at any time.

## How it fits together

```
PDF upload -> text (pdfplumber) -> Gemini -> skills, summary   (apps/resumes)
resume + type + difficulty + domain -> Gemini -> questions      (apps/interviews/question_gen.py)
session: scheduled -> in_progress -> completed | cancelled      (apps/interviews)
camera + mic -> MediaRecorder -> upload after the interview     (frontend/src/hooks/useRecorder.js)
```

All Gemini calls go through `backend/apps/ai/gemini.py`. If there is no API key, or a call fails,
resume analysis and question generation fall back to rule-based versions, so the app keeps working.

## Set up Gemini

Put these in `backend/.env` (the key comes from Google AI Studio) and restart the backend:

```
GEMINI_API_KEY=your-key
GEMINI_MODEL=model-name-you-want-to-use
GEMINI_FALLBACK_MODEL=optional-second-model
```

Google sometimes answers "503 high demand". The backend then tries up to three times, waiting 1 and
2 seconds between attempts, and uses `GEMINI_FALLBACK_MODEL` for the last attempt if you set one.
Permanent problems (a wrong key or model name) are not retried. Each attempt is cut off after 30
seconds (`GEMINI_TIMEOUT_SECONDS`).

If Gemini still fails, the app falls back to its basic mode and logs the reason, for example
`Gemini call failed (model ..., attempt 2 of 3): 503 UNAVAILABLE`. See it with
`docker compose logs backend --tail 100`. The "Basic scan" badge on a resume and `question_source`
on a session show which mode was used.

## Known limits (planned for later)

- **Speech to text, scoring and feedback** arrive in Milestone 3. Answers are saved with their
  timing but no transcript yet.
- **A recording covers one visit to the room.** If the page is reloaded in the middle of an
  interview, only the part after the reload is recorded. If the tab is closed before the upload
  finishes, the recording is lost.
- **Upload size.** Video is recorded at a low bitrate (about 800 kbps), so a 30 minute interview is
  roughly 180 MB, under the 300 MB limit. A server in front of the backend (for example nginx) must
  allow request bodies of at least that size.
- **Question timers run in the browser.** The server stores how long each answer took but does not
  enforce the limit.
- Camera access needs `localhost` or HTTPS.

## Tests

`docker compose exec backend pytest -q` runs everything, including `tests/test_milestone2_flow.py`,
which walks the whole journey from resume upload to a recorded interview.
