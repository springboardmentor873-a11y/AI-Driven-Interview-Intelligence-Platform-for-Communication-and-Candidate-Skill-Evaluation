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
| POST | /api/interviews/sessions/{id}/score/ | Candidate (owner) | Score a completed interview: finishes the analysis (one Gemini review), then computes and saves the four scores and the overall score |
| POST | /api/interviews/sessions/{id}/feedback/ | Candidate (owner) | Write the feedback for a scored interview: strengths, weaknesses, suggestions, practice plan, learning resources |
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
   `duration_seconds`, `transcript_source` (`speech` by default, or `typed`), `speech_confidence`
   (0 to 1, optional), and three optional measurements taken in the browser: `attention` (eye contact,
   see Eye contact below), `expression` and `hesitation` (see Confidence signals below). No time spent and no transcript counts as a skipped question. The response
   includes the next question. Answering the last question completes the session. Each answer is
   saved with a quick rule-based `analysis` (see Speech analysis below). The response also has
   `feedback`: `status`, `word_count`, `wpm`, `pace_label` and `fillers` for the answer just saved,
   with no scores (plus `eye_contact_pct` when it was measured), so the room can show a one-line note
   before the next question.
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
| attention | Eye-contact numbers (see Eye contact below), or `null` when the camera was off or tracking was not available |
| expression, hesitation, confidence | See Confidence signals below |
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
| answers_tracked, look_away_events | Answers with eye-contact data, and long look-aways in total |
| average_eye_contact_pct, average_face_visible_pct, average_attention_score | Averages weighted by how long each answer was tracked (`null` if none) |
| answers_with_confidence, average_confidence, average_confidence_parts | Confidence over spoken answers, and the average of each of its five parts |
| expression_shares | `smile`, `tense`, `raised`, `neutral`: average share of face time, weighted by time |
| average_response_delay, long_pauses | Average seconds before the first word, and long pauses in total |

## Eye contact

The browser measures eye contact itself (MediaPipe Face Landmarker, video never leaves the computer)
and sends this with each answer as `attention`:

| Field | Meaning |
|---|---|
| tracked_seconds | How long the measurement ran (at least 5 to be kept, and not more than 5 seconds over `duration_seconds`) |
| face_visible_pct | Share of that time the face was in the picture, 0-100 |
| eye_contact_pct | Share of that time the person looked at the camera, 0-100 (cannot exceed face_visible_pct) |
| look_away_events | Times they looked away or left the frame for 2 seconds or more |
| longest_look_away_seconds | The longest such stretch |

Impossible combinations are rejected with 400. Stored as `analysis.attention` with the extra fields
`score` (0-100, where about 70% eye contact is a full score), `label` (`good` 80+, `fair` 50+, else
`low`) and `source` (`browser`). Because the browser does the measuring, treat it as practice feedback,
not as proof.

## Confidence signals

Two more measurements are sent with each answer from the browser. Impossible values are rejected with 400
(shares above 100%, a longest pause longer than all pauses, a measurement longer than the answer).

`expression`: how the face looked, as shares of the time the face was visible.

| Field | Meaning |
|---|---|
| face_seconds | Face-visible time measured (at least 5 to be kept) |
| smile_pct, tense_pct, raised_pct, neutral_pct | Shares of that time, 0-100, adding up to at most 100 |

`hesitation`: from the speech recognizer's timing (spoken answers only).

| Field | Meaning |
|---|---|
| response_delay_seconds | Seconds from the question appearing to the first word |
| long_pauses | Stops of 2.5 seconds or more in the middle of the answer |
| longest_pause_seconds, total_pause_seconds | Longest, and all long pauses together |

Stored in `analysis` with extra fields:

- `expression`: `dominant` (`smile`, `tense`, `raised` or `neutral`), `expressiveness` (0-100, 40% smile or
  raised brows time is full) and `composure` (0-100, loses 2.5 points per 1% tense time).
- `hesitation`: `score` and `label`. A delay up to 3 s and no long pauses is full marks. Pauses are counted per
  minute over at least a minute, so one pause in a short answer is not punished hard.
- `confidence` (spoken, analysed answers only, at least two parts available): `score`, `label` and `parts`,
  the five parts from the SRS with these weights: `eye_contact` 25, `hesitation` 25, `speaking_confidence` 20
  (fillers 40, pace 30, composure 30), `attention_level` 15 (face visible minus 8 per long look-away) and
  `facial_engagement` 15 (expressiveness). Missing parts are left out and the rest rescaled.

## Scoring

`POST /api/interviews/sessions/{id}/score/` works on a completed interview and is the call the interview room
makes when it ends. It runs the analysis from `analyze/` first (the Gemini review now also rates technical
relevance, organization and professional tone, still in one call), then computes the score and saves one `Score`
row per session. Calling it again recomputes that row. The response is the session detail with a `score`
object, plus `analysis_source`. `score` is also in `GET .../sessions/{id}/` for scored sessions, and is `null`
in the history list, for unscored sessions, and when no answer could be scored.

| Field | Meaning |
|---|---|
| communication, confidence, technical_relevance, professionalism | The four parts, 0-100. `null` when that part could not be measured |
| overall | Weighted score, 0-100. Weights: communication 30%, confidence 25%, technical relevance 30%, professionalism 15% (also returned as `weights`) |
| rating, rating_label | `excellent` 90+, `good` 75+, `average` 60+, `needs_improvement` 40+, `poor` |
| complete, missing | `complete` is `false` when a part is `null`: the overall score then uses the other parts, rescaled |
| counts | `questions_total`, `answered`, `skipped` (including unanswered), `excluded_no_transcript` |
| per_answer | One row per question: `order`, `status`, the four parts and `overall` |

How the parts are built (see `apps/scoring/engine.py`):

- **Communication**: the answers' communication scores averaged.
- **Confidence**: the answers' confidence scores averaged (spoken answers only).
- **Technical relevance**: per answer, 80% Gemini's rating of the content and 20% completeness. Needs the AI review.
- **Professionalism**: per answer, time management (25), organization (25), professional communication (30) and
  etiquette = staying in the picture (20). At least three of these four must be known.
- **Skipped or unanswered questions count as 0** in every part. Answers where no words were captured are left out,
  because the cause is often the microphone, not the candidate. If every answer is like that there is no score.
- **Time management**: 40% to 95% of the time limit used is full marks, a very short answer scores low, and
  running to the limit scores 70.

New answer `analysis` fields (Gemini only, absent until reviewed): `technical` (`score`, one-sentence `note`),
`organization` and `tone` (`score`).

## Feedback

`POST /api/interviews/sessions/{id}/feedback/` works on a completed interview that has been scored (otherwise
400 "Score the interview first."). It asks Gemini once to write the feedback from the scores, the speech and
delivery summary and the per-answer notes. The raw transcripts are not sent. If Gemini is unavailable or
returns something unusable, the same lists are written from the numbers by simple rules and `source` is `basic`.
Repeating the call returns the saved AI feedback without calling Gemini again, unless the overall score has
changed since it was written. Basic feedback is rewritten (and the AI tried again) on every call.

The response is the session detail. `feedback` is also in `GET .../sessions/{id}/` for finished sessions, and is
`null` in the history list or before it is written.

| Field | Meaning |
|---|---|
| summary | Two or three sentences about the whole interview |
| strengths, weaknesses | Up to 5 short points each, tied to the numbers |
| suggestions | Up to 6 concrete changes for next time |
| practice_recommendations | Up to 5 exercises with numbers |
| learning_resources | Up to 5 of `{title, type, why, search}`. `type` is `article`, `video`, `course` or `practice`. **No web addresses**: `search` is a query, because a language model can invent links that do not exist. The page turns it into a search link |
| source | `ai` or `basic` |

## Analytics

### Candidate analytics

`GET /api/analytics/candidate/` (candidates only) returns everything the performance page needs in one call.
Optional `?type=hr|technical|behavioral|aptitude` limits every section except `ranking` to one interview type
(anything else is a 400).

Only completed interviews that have a score count. A part that could not be measured is left out of that part's
history instead of being counted as 0. A new candidate gets the same shape with `has_data: false` and empty lists.

| Field | Meaning |
|---|---|
| has_data | `false` until one scored interview exists |
| summary | `sessions_total`, `completed`, `scored` (all), `in_chart` (the newest 50 used below), `cancelled` |
| overall | Stats of the overall score (see below) plus `rating` (`{value, label}` of the latest) and `rating_counts` |
| parts | The four assessment areas, each with `key`, `label`, `weight` (percent) and the stats below |
| trend | One row per scored interview, **oldest first**: `session_id`, `date`, `title`, `interview_type`, `difficulty`, `domain`, `overall`, `rating`, the four parts (null if not measured) and `complete` |
| by_type | Per interview type: `interviews`, `average_overall`, `best_overall`, `latest_overall`, `parts` (average of each part) |
| by_category | Per question topic (weakest first, up to 12): `name`, `answers`, `skipped`, `average` |
| weak_areas | Areas to work on, see below |
| ranking | `available`, and when true `percentile`, `candidates_compared`, `your_average`, `cohort_average` |
| activity | `last_interview_at`, `completed_last_7_days`, `completed_last_30_days` |

**Stats** (used for `overall` and for each part): `samples`, `average`, `latest`, `best`, `recent_average` (last 5),
`change` (latest minus first), `direction` and `predicted_next`.

- `direction` is `improving` or `declining` when the trend moves more than 1.5 points per interview, otherwise
  `steady`, and `not_enough_data` with fewer than 3 interviews.
- `predicted_next` is where a straight line through the latest 6 scores points for the next interview (0-100).
  It is a trend, not a promise, and it is `null` with fewer than 3 interviews.

**Weak areas** are the four skills plus question topics. A skill is a `high` risk when its recent average, or its
predicted next score, is under 60. It is `medium` when the recent average is under 75, or when it is falling and the
prediction is under 75. A topic needs at least 2 answers and uses its average only. Each item has `kind`
(`skill` or `topic`), `key`, `label`, `risk`, `recent_average`, `predicted_next`, `direction`, a plain `reason` and a
short `tip`. Order: high before medium, skills before topics, lowest first.

**Ranking** is the candidate's average overall score compared with every candidate's average, as a percentile
(a tie counts as half). It appears only when at least 5 candidates have scored interviews, and it never names anyone.
