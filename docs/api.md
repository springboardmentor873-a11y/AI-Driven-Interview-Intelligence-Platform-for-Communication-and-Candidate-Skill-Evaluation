# API Reference (Milestone 1)

Base URL: `http://localhost:8000`. Send `Authorization: Bearer <access token>` on protected calls.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /api/health/ | Public | Service check |
| POST | /api/auth/register/ | Public | Create a Candidate or Recruiter account |
| POST | /api/auth/login/ | Public | Log in with email and password. Optional `role` (`candidate`, `recruiter`, `admin`): the login is refused with 403 if the account has a different role |
| POST | /api/auth/google/ | Public | Log in with a Google ID token. Optional `role` works the same way. Recruiter and admin accounts are never created through Google |
| POST | /api/auth/refresh/ | Public | Exchange a refresh token for new tokens |
| POST | /api/auth/logout/ | Logged in | Blacklist the refresh token |
| GET | /api/auth/me/ | Logged in | Current user |
| PATCH | /api/auth/me/ | Logged in | Update first and last name |
| POST | /api/auth/change-password/ | Logged in | Change password |
| GET | /api/auth/users/ | Admin | List users |
| PATCH | /api/auth/users/{id}/ | Admin | Change a user's role or active status |
| GET | /api/resumes/ | Candidate | List own resumes |
| POST | /api/resumes/ | Candidate | Upload a PDF (multipart, field `file`) |
| GET | /api/resumes/{id}/download/ | Candidate (owner) | View the PDF |
| POST | /api/resumes/{id}/set-primary/ | Candidate (owner) | Mark as primary |
| POST | /api/resumes/{id}/reparse/ | Candidate (owner) | Read the PDF and run skill analysis again. 404 if the resume was deleted meanwhile |
| POST | /api/interviews/generate-questions/ | Candidate | Preview a question set built from a resume (nothing is saved) |
| GET | /api/interviews/templates/ | Any signed-in user | Recruiter: own templates. Candidate: published templates. Admin: all |
| POST | /api/interviews/templates/ | Recruiter | Create a template |
| GET, PUT, PATCH, DELETE | /api/interviews/templates/{id}/ | Recruiter (owner) | Read, edit or delete a template (candidates and admins can read) |
| POST | /api/interviews/sessions/ | Candidate | Create an interview session with generated questions, optionally from a template |
| GET | /api/interviews/sessions/ | Candidate | History of your sessions, newest first |
| GET | /api/interviews/sessions/{id}/ | Candidate (owner) | Session details. Questions and answers appear once it is finished |
| POST | /api/interviews/sessions/{id}/start/ | Candidate (owner) | Start the interview |
| GET | /api/interviews/sessions/{id}/next-question/ | Candidate (owner) | The current question |
| POST | /api/interviews/sessions/{id}/answer/ | Candidate (owner) | Submit an answer to the current question |
| POST | /api/interviews/sessions/{id}/analyze/ | Candidate (owner) | Finish the speech analysis of a completed interview (one Gemini review of all answers) |
| POST | /api/interviews/sessions/{id}/finish/ | Candidate (owner) | End the interview early |
| POST | /api/interviews/sessions/{id}/cancel/ | Candidate (owner) | Cancel an interview that is not finished |
| POST | /api/interviews/sessions/{id}/recording/ | Candidate (owner) | Upload the interview's video and/or audio (finished interviews only) |
| GET | /api/interviews/sessions/{id}/recording/?type=video | Candidate (owner) | Download the video (`type=audio` for the audio) |
| DELETE | /api/interviews/sessions/{id}/recording/ | Candidate (owner) | Delete the recordings |
| DELETE | /api/resumes/{id}/ | Candidate (owner) | Delete resume and file |

## Generate questions

`POST /api/interviews/generate-questions/`

| Field | Required | Notes |
|---|---|---|
| interview_type | Yes | `hr`, `technical`, `behavioral` or `aptitude` |
| difficulty | No | `easy`, `medium` (default) or `hard` |
| domain | No | Free text up to 100 characters, for example `healthcare` |
| question_count | No | 1 to 20, default 10 |
| resume_id | No | Defaults to the primary resume. Works with no resume too |

The response has `source` (`ai` for Gemini, `basic` for the built-in question bank), the settings used, and
`questions`, each with `text`, `category` and `time_limit_seconds`.

## Interview sessions

A session moves through `scheduled` -> `in_progress` -> `completed`, or ends as `cancelled`.

1. `POST /api/interviews/sessions/` takes the same options as generate-questions (`interview_type`,
   `difficulty`, `domain`, `question_count`, `resume_id`) and saves the questions with the session.
   You can have up to 5 unfinished sessions at a time.
2. `POST .../start/` begins the interview. Calling it again on a running session is harmless.
3. `GET .../next-question/` returns the current question with `answered` and `total`.
4. `POST .../answer/` takes `question_id` (must be the current question), `transcript`,
   `duration_seconds`, `transcript_source` (`speech` by default, or `typed`) and `speech_confidence`
   (0 to 1, optional). No time spent and no transcript counts as a skipped question. The response
   includes the next question. Answering the last question completes the session. Each answer is
   saved with a quick rule-based `analysis` (see Speech analysis below). The response also has
   `feedback`: `status`, `word_count`, `wpm`, `pace_label` and `fillers` for the answer just saved,
   with no scores, so the room can show a one-line note before the next question.
5. `POST .../finish/` ends early. Unanswered questions stay unanswered.

Question text is hidden until the session is over, so the interview room only ever sees the current
question. Each session records `question_source` (`ai` or `basic`). Sessions are private to the
candidate who created them: anyone else gets 404.

## Interview templates

A recruiter sets up an interview once and candidates start sessions from it.

| Field | Notes |
|---|---|
| title | Required, up to 200 characters |
| description | Optional, up to 2000 characters |
| interview_type | `hr`, `technical`, `behavioral` or `aptitude` |
| difficulty | `easy`, `medium` (default) or `hard` |
| domain | Optional, up to 100 characters |
| question_count | 1 to 20, default 10 |
| duration_minutes | 5 to 180, default 30. Must allow at least 30 seconds per question |
| is_published | Default `true`. Candidates only see published templates |

Recruiters see only their own templates, with a `session_count`. Candidates see a reduced view
(no statistics) with the recruiter's name. A recruiter can have up to 50 templates. Deleting a
template keeps the interviews that were already started from it.

Start a session from a template with `POST /api/interviews/sessions/` and `{"template_id": 3}`
(plus an optional `resume_id`). The template's type, difficulty, domain and question count replace
anything else in the request, and `duration_minutes` is split evenly across the questions
(between 30 seconds and 10 minutes each).

## Interview recordings

The browser records the camera as one video file and the microphone as one small audio file, then
uploads both when the interview ends: `POST .../recording/` as `multipart/form-data` with the fields
`video` and/or `audio`.

- Only completed interviews accept a recording. Uploading again replaces the earlier files.
- Video: WebM or MP4, up to 300 MB. Audio: WebM, MP4, Ogg, WAV or MP3, up to 60 MB.
- The type is read from the file's first bytes, so a renamed file is rejected. If any file is
  invalid nothing is saved. File names are generated by the server.
- Recordings are never served from a public folder. Only the candidate who made the interview can
  download or delete them, and anyone else gets 404.
- Session details include `has_video` and `has_audio`. Deleting a session or a user also deletes
  their recording files.

## Speech analysis

`POST /api/interviews/sessions/{id}/analyze/` works on a completed interview. It sends all answers to
Gemini in one call for a grammar and completeness review and saves the results. The response is the
session detail plus `analysis_source`: `ai` (every answer reviewed), `basic` (the AI review failed or is
not configured, rule-based numbers kept) or `none` (nothing to review). Calling it again only retries
answers that still lack the AI review.

Each answer's `analysis` (returned with the questions of a finished session):

| Field | Meaning |
|---|---|
| status | `analyzed`, `skipped` (no time spent) or `no_transcript` (time spent but no words captured) |
| input | `source` (`speech`, `typed`, `none`) and the browser's `speech_confidence` |
| word_count, duration_seconds | Size of the answer and time spent |
| pace | Words per minute, a `label` and a 0-100 `score`. Ideal range is 120 to 170 wpm. Speech only |
| fillers | `total`, `per_100_words`, `counts` and a `score`. Speech only |
| clarity | Estimate from the browser's recognition confidence. Speech only |
| grammar | `score`, up to 5 `issues` (`text`, `suggestion`) and `source` (`ai` or `basic`) |
| completeness | `score` and `source`. Basic = answer length against the time allowed |
| communication_score | Weighted 0-100 average of the parts that apply (clarity 15, grammar 25, fillers 20, pace 20, completeness 20) |

A part is `null` when it does not apply, for example pace for a typed answer.

### Speech summary

A finished session (`GET /api/interviews/sessions/{id}/`) also has `speech_summary`, and so does the
response of `analyze/`. It is `null` while the interview is running and in the history list.

| Field | Meaning |
|---|---|
| answers_analyzed, answers_skipped, answers_without_transcript | How many answers fall in each state |
| total_words, average_wpm | Over analysed answers (pace only counts answers where pace applies) |
| total_fillers, top_fillers | Up to 3 most used, as `{word, count}` |
| average_communication | Average of the per-answer communication scores |
| average_scores | Average 0-100 per part: clarity, grammar, fillers, pace, completeness (`null` if none apply) |
| ai_reviewed | `true` when every analysed answer has its Gemini review |
