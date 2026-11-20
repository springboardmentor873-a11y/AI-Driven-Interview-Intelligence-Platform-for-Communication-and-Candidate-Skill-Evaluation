# SmartHire AI — Milestone 2 Audit and Verification Report

**Verification date:** 2026-11-20  
**Active AI provider:** Google Gemini  
**Configured database:** PostgreSQL (`smarthire_db`)

## Status summary

| Area | Status | Verified result |
| --- | --- | --- |
| Candidate registration, login, JWT, and protected profile | PASS | Backend tests and the authenticated browser workflow passed. |
| Resume upload, PDF extraction, and skill profile | PASS | A synthetic text-bearing PDF was uploaded through React; the saved profile contained the expected name, contact details, and Python/Django/PostgreSQL skills. |
| Interview generation and answer workflow | PASS | PostgreSQL-backed browser run generated exactly three HARD Technical Backend Engineer questions, saved all three answers, and completed the session. |
| Technical, HR, behavioral, aptitude fallback | PASS | Backend automated tests cover category-specific deterministic prompts and difficulty context. |
| Answer evaluation and consent | PASS | Browser answers were submitted with consent unchecked and received local fallback feedback; backend tests assert the provider client is not called without consent. |
| PostgreSQL persistence and retrieval | PASS | The live browser workflow was confirmed in PostgreSQL, including resume skills, three questions, three answers, completed status, and recording metadata. Synthetic rows were removed after verification. |
| Migration state | PASS | Required additive migration is applied; no model changes or unapplied migrations remain. |
| Frontend production build | PASS | `npm run build` completed successfully. |
| Frontend automated tests | PASS | Vitest reports 4 tests passed, including login/navigation, resume upload/profile, interview generation/answers/navigation/completion, recording upload/retry/playback controls, and error states. |
| Authenticated browser workflow | PARTIAL | Registration/login through completed interview, MP4 recording upload, and download were exercised. The hidden automation page did not advance playback; see final limitations. |
| Gemini configuration | PASS | Backend-only `GEMINI_API_KEY`, `GEMINI_MODEL`, and timeout settings load; the configured model is listed as stable in Google's model docs. No key value was printed or sent. |
| Live Gemini request and dynamic Gemini questions | BLOCKED | No live call was made, so credentials' account access/quota and live generation remain unverified. Provider behavior is covered by mocked tests only. |
| Live camera/device recording | PASS | The browser returned active audio/video tracks; the app recorded and stored a 2.25 MB MP4. Physical device identity is not independently confirmed. |
| Recording upload/download and response headers | PASS | Downloaded bytes matched the captured blob; Django returned `video/mp4` and attachment headers are checked by backend tests. |
| Actual codec and compatible-player playback | PARTIAL | The app-selected MP4 parsed in the browser (640x480, 10.67 seconds, no media error), but a visible playback session and inspection of the stored file's exact codec were unavailable. |
| Speech transcription, communication/video assessment, recruiter analytics | NOT IMPLEMENTED | These remain outside the current Milestone 2 implementation. |

## Files changed

- `backend/apps/accounts/models.py`
- `backend/apps/accounts/serializers.py`
- `backend/apps/accounts/services.py`
- `backend/apps/accounts/migrations/0006_resume_contact_and_summary.py`
- `backend/apps/accounts/tests.py`
- `backend/apps/ai_services.py`
- `backend/apps/interviews/models.py`
- `backend/apps/interviews/views.py`
- `backend/apps/interviews/tests.py`
- `backend/apps/interviews/fixtures/valid_recording.webm`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`
- `frontend/src/App.test.jsx`
- `frontend/src/test/setup.js`
- `frontend/vite.config.js`
- `frontend/package.json`
- `frontend/package-lock.json`
- `backend/.env.example`
- `README.md`
- `MILESTONE_2_COMPLETION_REPORT.md`

## Changes completed

- Added locally extracted candidate name, email, and phone plus a summary derived
  from validated profile facts. Added and applied the necessary additive
  migration `0006_resume_contact_and_summary`; no tables were deleted or
  recreated.
- Strengthened resume upload validation to parse the PDF structure, and closed
  resume file handles after parsing to avoid file locks on Windows.
- Added resume upload percentage/success feedback and displayed the stored
  extracted profile fields in the React resume list.
- Added category-specific deterministic question templates, guidance, and
  evaluation criteria for HR, behavioral, and aptitude interviews.
- Added recording content-signature checks for supported audio/video types.
  Recording replacement now stores the new file before deleting the previous
  one and preserves the old recording if storage fails.
- Replaced fake PDF/recording test payloads with structurally valid synthetic
  PDF content and a browser-generated WebM fixture.
- Added Vitest/Testing Library and four frontend tests for authenticated flows,
  resume/profile UI, interview completion, media chunk upload/retry, playback
  and download controls, and user-facing errors.
- Fixed recording completion handling so the uploaded recording response
  updates the session/history, failed uploads remain retryable and visible,
  and saved recordings have playback/download controls.
- Selects recording MIME types only when `MediaRecorder.isTypeSupported`
  accepts them, preferring types the browser also reports it can play. The
  tested browser selects MP4; WebM remains the fallback for other browsers.
- Uses the recorder's MIME type for the Blob, validates non-empty chunks,
  keeps the recording tied to the interview that started it, and selects the
  saved extension from the actual MP4/WebM container.
- Normalizes recording extensions from the validated media type and returns
  explicit download MIME and attachment filename headers. Existing signature
  validation and safe replacement behavior remain in place.
- Updated the README with current resume behavior and explicit test/build
  commands.

## Verification details

Commands run:

- `python manage.py test --settings=config.test_settings` — **40 tests passed**
  (39 existing tests plus an MP4 upload/download header regression test).
  These tests use the explicit SQLite test settings, not the production
  database.
- `npm test -- --run` — **4 frontend tests passed**, including a test that
  selects a supported/playable MP4 MIME type and uploads it with an `.mp4`
  filename.
- `npm run build` — **passed**.
- `python manage.py check` — **passed**.
- `python manage.py makemigrations --check --dry-run` — **no model changes
  missing migrations**.
- `python manage.py migrate --check` — **passed** against the configured
  PostgreSQL database after applying migration 0006.
- `git diff --check` — **passed**.
- Browser workflow — registered/signed in a synthetic candidate, uploaded a
  valid synthetic PDF, extracted the expected profile locally, generated a
  three-question Advanced/HARD Technical Backend Engineer interview, started
  it with camera/microphone streams, submitted all answers, and reached
  COMPLETED status.
- Final browser recording check — the app selected `video/mp4`, collected three
  non-empty chunks including the final chunk, uploaded a 2,250,771-byte
  recording as `interview-57.mp4`, and the authenticated download returned
  HTTP 200 with the same byte count and `video/mp4` content type. The browser
  parsed the downloaded recording as 640x480 with a 10.67-second duration and
  no media decode error.

In the earlier browser run, PostgreSQL independently showed vendor
`postgresql`, extracted `Python`, `Django`, and `PostgreSQL` skills, and a
completed 3/3 HARD Technical interview with three local-fallback answers. Its
6,173,083-byte WebM and synthetic account were deleted after verification.
In the final codec run, the authenticated interview listing showed the
completed session and MP4 recording URL; its download returned exactly the
2,250,771 bytes collected from MediaRecorder. That synthetic account and its
files were also deleted.

The browser camera/microphone session exposed live audio and video tracks
(640x480 at 30 fps for video; 48 kHz audio). It did not report playback support
for WebM VP8/VP9+Opus, while it reported MP4 as playable. A separate native
MediaRecorder capture using generic MP4 reported `video/mp4;codecs=avc1,opus`
and loaded in the browser. The app's downloaded MP4 also loaded its metadata.
The automation page was hidden (`document.visibilityState === "hidden"`), so
playback time did not advance; this is not counted as successful playback.

## FINAL REMAINING LIMITATIONS — GEMINI AND RECORDING

| Requirement | Status | Evidence / limitation |
| --- | --- | --- |
| Gemini configuration | PASS | `GEMINI_API_KEY` is loaded from `backend/.env` (presence checked without printing it); `GEMINI_MODEL=gemini-3.5-flash-lite`; timeout is 30 seconds; the Google GenAI SDK sends structured JSON-schema requests. |
| Live Gemini request | BLOCKED | No request was sent using the configured credential. Account entitlement, billing/quota, and actual response remain unverified. |
| Dynamic questions from Gemini | BLOCKED | No live provider generation was performed; mocked tests cover role, skill, category, difficulty, question-count and schema validation. |
| Local fallback | PASS | Actual browser runs and backend tests produced role/category/difficulty-specific local questions and clearly labeled fallback results. |
| Consent protection | PASS | Consent defaults to false; API views pass `local_only=True` and omit resume experience/project context when unchecked. Tests assert Gemini is not called without consent. |
| Browser recording | PASS | Actual browser audio/video tracks were supplied to MediaRecorder; the app chose MP4 because that browser reported MP4 playable and WebM codecs unplayable. |
| Recording upload | PASS | The real app recording uploaded successfully; the final `dataavailable` chunk was included and the saved MP4 size matched all collected chunks. |
| Recording download | PASS | Authenticated endpoint returned HTTP 200, `video/mp4`, and the same 2,250,771 bytes. Backend tests verify attachment filename and content type. |
| Actual codec verification | PARTIAL | The app reported MP4; a native MP4 capture in the same browser reported `video/mp4;codecs=avc1,opus`. No ffprobe/MediaInfo/VLC executable was installed to inspect the downloaded file itself. |
| Successful playback in a compatible media player | BLOCKED | The downloaded file parsed to 640x480/10.67-second metadata with no decode error, but the automation page was hidden and its playhead did not advance. No visible VLC/Media Player session was available. |

### Gemini inspection and privacy

- Settings load `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_TIMEOUT_MS` from
  `backend/.env`; the API key is backend-only and is not included in frontend
  serializers or responses. Its value was never printed or logged.
- Calls use `google-genai`'s `models.generate_content`, the configured model,
  a 30-second timeout, `application/json`, and the Pydantic-derived response
  schema. Pydantic validates returned JSON; generation also validates role,
  skills, difficulty, count, evidence references, criteria, and uniqueness.
- Provider errors are sanitized for authentication, unavailable model,
  429/quota, timeout, and server failures. When deterministic fallback is
  enabled, provider failures produce explicitly labeled local output.
- Google's [current model list](https://ai.google.dev/gemini-api/docs/models)
  lists `gemini-3.5-flash-lite` as stable. This does not establish that this
  account has access or quota. The [structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output)
  confirms the SDK/Pydantic JSON-schema approach.
- The credential was not sent to Google in this verification. Therefore no
  live status, generated question, billing result, or account-level
  availability is claimed. A live test remains manual and requires an
  authorized request from an environment allowed to use that credential.

### Bugs discovered and fixes

- The old recorder preferred WebM VP8/Opus solely from
  `MediaRecorder.isTypeSupported()`, even though the test browser reported no
  playback support for those codecs. It now also checks browser playback
  support and selects MP4 in this browser, retaining WebM choices where
  supported.
- Upload naming previously inferred only MP4-versus-WebM and could preserve a
  mismatched client extension. The frontend now derives extension from the
  actual Blob MIME; the backend normalizes the stored extension from the
  validated content type and sends explicit download MIME and filename
  headers.
- Empty data, MIME/extension mismatch, and current-interview association are
  now handled explicitly. Existing signature checks, final-chunk ordering,
  retry behavior, ownership checks, and safe replacement semantics remain.
- Playback metadata was successfully parsed, but actual visible playback was
  not proven; this remains a limitation rather than a claimed fix.

### Files changed for the final fixes

- `frontend/src/App.jsx`
- `frontend/src/App.test.jsx`
- `backend/apps/interviews/views.py`
- `backend/apps/interviews/tests.py`
- `MILESTONE_2_COMPLETION_REPORT.md`

### Manual steps still needed

1. Perform one live Gemini smoke test in an environment authorized to send the
   configured credential; verify a small structured response and one
   consented generation. Do not paste the key into chat.
2. Open a newly downloaded MP4 in a visible browser or VLC/Windows Media
   Player, press Play, and confirm audio and video. The automation tab was
   hidden and no external media player was installed here.

## Run instructions

Backend tests, from `backend/`:

```powershell
python manage.py test --settings=config.test_settings
```

Production PostgreSQL checks, from `backend/`:

```powershell
python manage.py check
python manage.py migrate --check
```

Frontend production build, from `frontend/`:

```powershell
npm run build
```

Before attempting a live Gemini request, verify the selected model's current
availability, pricing, and billing status in Google AI Studio. No source-code
or configuration edits remain required for the verified local and
PostgreSQL-backed workflows.
