# Milestone 3: Speech analysis and AI monitoring

Milestone 3 turns a recorded interview into scores and feedback. This page starts with the overview and a demo
checklist. The day-by-day notes below it explain each part in more detail.

## Overview

### What the SRS asked for, and where it is

| SRS deliverable (Milestone 3) | Status | Where |
|---|---|---|
| Speech transcription operational | Done, in the browser | Live transcript with the browser's speech recognition, typing as a fallback (Days 1-2) |
| Filler-word detection, pace, grammar | Done | `apps/interviews/speech_analysis.py` (Day 2) |
| Emotion detection functional | Done, as facial expression | MediaPipe face blendshapes (Day 5) |
| Eye-contact tracking implemented | Done | MediaPipe face landmarks (Day 4) |
| AI scoring engine operational | Done | `apps/scoring/engine.py` (Day 6) |
| Feedback generation working correctly | Done | `apps/scoring/feedback.py` (Day 7) |
| Real-time interview analysis | Done | Live pace, filler, eye-contact and expression hints while answering (Days 3-5) |

### The flow

```
Candidate answers (speech or typing, camera on or off)
   -> POST .../answer/   saves the answer with quick numbers and the browser's measurements
Interview ends
   -> POST .../score/    one Gemini review of all answers, then the four scores and the overall score
   -> POST .../feedback/ strengths, weaknesses, suggestions, practice plan, learning topics
Results page (/interview/:id) shows the score, feedback and the analysis of every answer
```

### Setup

- Backend: `python manage.py migrate` (Docker does this on start). Milestone 3 added two migrations in `apps/scoring`.
- Frontend: `npm install` in `frontend` (adds `@mediapipe/tasks-vision`).
- `GEMINI_API_KEY` in `.env` turns on the AI parts. Without it everything still works: scores are partial
  (technical relevance not measured) and feedback is written by rules.
- `AI_REVIEW_RATE` (default `30/hour`) limits how many AI reviews one user can trigger.
- Use Chrome or Edge on a computer for live speech recognition and eye-contact tracking.

### Tests

- Backend: `python -m pytest` in `backend` (includes `tests/test_milestone3_flow.py`, the whole flow through the API).
- Frontend: `npm test` in `frontend` (geometry, tracker and pause logic).

### Demo checklist

1. Start an interview with the camera and microphone on. The badge shows "Eye contact: good" and the current expression.
2. Answer a question out loud. The live transcript, pace hint and um/uh count update as you speak.
3. Submit. A one-line note shows the pace, filler words and eye contact of that answer.
4. Answer one question by pressing "Type instead", and skip one.
5. Finish. The page shows the overall score and rating, the four parts, your feedback and the analysis of each answer.
6. Turn the AI off (empty `GEMINI_API_KEY`) and repeat: the score says it is partial and the feedback says it was written by rules.
7. Reopen the interview from the dashboard: the saved score and feedback appear without another AI call.

### Known limits (also explained below)

- Transcription uses the browser's speech recognition only. Chrome and Edge may send audio to their speech service,
  and Firefox is not supported (typing works there). Transcribing the uploaded recording on the server is not built.
- The eye-contact and expression thresholds were never tuned on real faces. They are constants in `frontend/src/utils/attention.js`.
- Expression is not emotion, and technical relevance is an AI judgement. The score is practice feedback, not a hiring verdict.
- Measurements come from the candidate's own browser, so they can be altered.
- `npm run lint` reports 3 errors in `AuthContext.jsx` and `Resumes.jsx` from earlier milestones (newer React rules). They are not bugs and were left alone.
- Rate limits are counted per server process unless a shared cache such as Redis is configured.

## Days 1 and 2: transcripts and speech analysis

### What a user can do now

1. In the interview room each answer is captured as text. With a microphone and Chrome or Edge the
   words appear live as the candidate speaks. In other browsers, without a microphone, or after
   pressing "Type instead", the candidate types the answer. Words already heard are kept when
   switching.
2. Every answer is analysed the moment it is submitted: word count, speaking pace, filler words,
   clarity, grammar and completeness, combined into a communication score.
3. When the interview ends the room calls `analyze/`, which adds one Gemini review of grammar and
   completeness for all answers. The results appear under each answer on the result screen.

### How it fits together

```
browser speech recognition -> transcript + confidence -> POST .../answer/
answer saved -> build_analysis (rules)            apps/interviews/speech_analysis.py
interview ends -> POST .../analyze/ -> Gemini (one call) -> grammar + completeness
```

Results live in `Answer.analysis` (JSON), so there is no database migration.

### Decisions and limits

- **Speech-to-text is done in the browser** (Web Speech API), not on the server. It is free and
  live, but Chrome and Edge may send audio to their own speech service, and Firefox has no support.
  The room tells the candidate this and offers typing instead.
- **Server-side transcription of the uploaded recording is not part of this patch.** It would need
  the start and end time of each answer inside the recording, which is not stored yet.
- **Pace** is words divided by the time spent on the question, so thinking time before speaking makes
  it slightly lower than the true speaking speed.
- **Fillers** only count words that are almost always filler (um, uh, er, ah, hmm, basically,
  literally, actually, honestly) plus "like" set off by commas, "you know" and "I mean" in filler
  positions. It misses some on purpose rather than flag "I like Python".
- **Clarity** is an estimate from the recognizer's confidence. Noise and accents lower it as well,
  so it has the smallest weight. Pronunciation is not measured separately.
- **No words captured** is stored as `no_transcript` and is never scored as a bad answer.
- Answers are sent to Gemini as data with an instruction not to follow anything inside them, and
  the reply is checked and clamped before it is saved.
- Weights of the communication score are our choice (the SRS lists the parts, not the weights) and
  sit in `WEIGHTS` in `speech_analysis.py`.

## Day 3: live feedback and the speech summary

### What a user can do now

1. **While answering** a small bar under the live transcript shows word count, speaking pace with a
   hint ("Good pace", "A little fast"...) and the number of um/uh. Pace is counted from the first
   words, so thinking time does not lower it, and it only appears after about 10 words and 8 seconds.
2. **After each answer** a one-line note above the next question shows the pace and filler count of
   the answer just saved. If no words were captured it says so right away, so the candidate can fix
   the microphone or switch to typing before the next question.
3. **On the result screen** a speech summary shows the average communication score, average pace,
   filler words (with the most used), words spoken, and which part to work on first.

### Notes

- The live numbers are estimates made in the browser (`frontend/src/utils/liveSpeech.js`). They only
  count um, uh, er, ah and hmm. The saved analysis uses the fuller rules on the server and can differ.
- The after-answer note never shows a score. Scores are shown after the interview.
- `speech_analysis.summarize()` builds the summary from the stored answers. The scoring engine
  (Day 6) will reuse it.

## Day 4: eye-contact and attention tracking

### What a user can do now

1. With the camera on, the room shows a live badge next to the camera picture, on the camera check
   screen and during the interview: "Eye contact: good", "Looking away: look at the camera" or
   "Face not visible: move into the frame".
2. Each answer is saved with its eye-contact numbers: share of time the face was visible, share of
   time looking at the camera, and how many times they looked away for 2 seconds or more.
3. The result screen shows eye contact per answer and in the delivery summary, and the note after
   each answer includes it. Skipped questions and interviews without a camera have no eye-contact data.

### How it works

```
camera stream -> hidden video -> MediaPipe Face Landmarker (about 5 frames a second, in the browser)
  -> analyzeFace (head turn, head tilt, iris position)   frontend/src/utils/attention.js
  -> AttentionTracker (steady states, blink handling, time-weighted totals)
  -> one summary per answer -> POST .../answer/ -> analysis.attention   apps/interviews/attention.py
```

### Decisions and limits

- **Privacy:** frames are processed in the browser and discarded. Only five summary numbers per answer
  are sent.
- **What counts as eye contact:** face found, head turned less than about 25 degrees, head not tilted
  far up or down, and both irises near the middle of the eyes. Blinks are ignored. A state has to hold
  for 3 frames (about 0.6 s) before it changes, so one odd frame does not flip it.
- **Scoring:** about 70% eye contact is a full score, because people naturally look away to think. The
  attention score is not part of the communication score. It feeds the confidence score (Day 5-6).
- **The limits are not tuned on real faces yet.** They are in `LIMITS` in `utils/attention.js`. Test
  with a few people and cameras and adjust if the badge is too strict or too forgiving. Glancing down
  at notes with the eyes only (head still) is detected only weakly.
- **Files loaded at runtime:** the MediaPipe WebAssembly files from `cdn.jsdelivr.net` and the face model
  (about 4 MB) from `storage.googleapis.com`, once per browser session. To host them yourself, set
  `VITE_MEDIAPIPE_WASM_URL` and `VITE_FACE_MODEL_URL`. If they cannot load, the badge says tracking is
  not available and the interview carries on.
- **Trust:** numbers come from the candidate's browser, so they suit practice feedback, not proof.
- **Tests:** `npm test` in `frontend` runs the geometry and tracker tests with made-up landmarks.

## Day 5: expression, engagement, hesitation and confidence

### What a user can do now

1. The live badge also shows the current expression ("smiling", "neutral", "tense or very serious",
   "eyebrows raised").
2. Each spoken answer is saved with how its face looked (shares of smile, tense, raised, neutral), how
   long it took to start speaking and how many long pauses there were.
3. These are combined with eye contact and the speech numbers into a **confidence score** per answer,
   built from the five signals in the SRS: eye-contact consistency, facial engagement, response
   hesitation, speaking confidence and attention level.
4. The result screen shows confidence, hesitation and expression per answer, and confidence in the
   delivery summary. "Work on first" now also points at hesitation, expressiveness or eye contact.

### How it works

```
face blendshapes (MediaPipe, same camera loop as Day 4) -> smoothed expression -> shares over face time
speech recognizer timing -> PauseTracker (first word, long pauses)             frontend/src/utils/pauses.js
both sent with the answer -> apps/interviews/behavior.py -> analysis.expression / hesitation / confidence
```

### Decisions and limits

- **Expression is not emotion.** The browser can only see facial movement. "Tense" also appears when
  someone concentrates, and people show feelings differently. The screen says these are rough practice
  hints, and no single signal decides the confidence score.
- **Not tuned on real faces yet.** The thresholds (`EXPRESSION` in `utils/attention.js`) are first
  values: test with a few people and adjust.
- **Hesitation depends on the recognizer.** A "pause" is a gap of 2.5 seconds or more with no words
  reported. A slow network connection to the browser's speech service can look like a pause.
- **Only spoken answers get a confidence score.** Typed answers have no voice or pauses, and answers
  where no words were captured are never scored (looking at the camera in silence is not confidence).
- **Confidence is separate from the communication score.** Day 6 combines them with technical relevance
  and professionalism.
- **Naming:** the logic is in `behavior.py`. `signals.py` is the existing file that deletes recordings
  when a session or user is deleted.

## Day 6: the scoring engine

### What a user can do now

1. When an interview ends, the room calls `score/`. The result screen shows the overall score, the rating and
   the four SRS parts (communication 30%, confidence 25%, technical relevance 30%, professionalism 15%) as bars.
2. Each answer shows three more details from the Gemini review: relevance to the question, organization and
   professional tone, with a one-sentence note about the content.
3. If the AI review was unavailable, the score is shown as partial: technical relevance says "Not measured",
   the overall score uses the other parts, and a "try again" link retries only what is missing.

### How it fits together

```
interview ends -> POST .../score/
   -> analyze_session: ONE Gemini call per interview (grammar, completeness, technical, organization, tone)
   -> apps/scoring/engine.py: per-answer parts -> per-interview parts -> Score.combine (SRS weights) -> Score row
```

### Decisions and limits

- **A missing part is `null`, never 0.** The `Score` fields are now nullable (migration `0002_nullable_scores`;
  Docker runs it for you, otherwise run `python manage.py migrate`).
- **Skipping cannot help a candidate.** Skipped and unanswered questions count as 0 in every part. Answers with
  no captured words are excluded instead, since a failing microphone should not cost anyone points.
- **Technical relevance depends on Gemini.** It is a language model's judgement of the answer against the
  question, with the interview type, difficulty and domain as context. It can be wrong, especially on narrow
  technical topics, and there is no basic fallback because keyword counting would mislead. No Gemini means a
  partial score, not an invented one.
- **Professionalism** mixes Gemini's ratings with time use and staying in the picture. It is never computed from
  those two alone.
- **The weights and time-management curve are our choices** (the SRS gives the four weights only for the overall
  formula). They are constants at the top of `apps/scoring/engine.py` and `behavior.py`.
- **Practice tool, not a hiring verdict.** Several inputs come from the candidate's own browser and from
  AI judgement, so the score is for practice feedback.
- Written feedback (strengths, weaknesses, suggestions) is Day 7.

## Day 7: feedback and the results page

### What a user can do now

1. After scoring, the result screen writes the candidate's feedback automatically: a short summary, strengths,
   things to improve, what to do next time, a practice plan and things to learn more about.
2. If the AI is unavailable the feedback is still written, from the numbers, and says so, with a link to try
   the AI version again.
3. The result screen is also the results page: the dashboard links every finished interview to it. Interviews
   finished before scoring existed show a "Score this interview" button, and scored ones without feedback show
   "Write my feedback".

### How it fits together

```
score/ finished -> POST .../feedback/ -> apps/scoring/feedback.py
   build_input: scores + speech/delivery summary + per-answer notes (no transcripts)
   -> one Gemini call -> _clean (types, lengths, counts)  |  on failure: basic_feedback (rules)
   -> Feedback row (summary, source, based_on_overall)
```

### Decisions and limits

- **No transcripts are sent to Gemini** for feedback. It gets numbers and the short content notes written by the
  review step. Candidate text still reaches the AI in the analysis call (Day 6), as before.
- **Learning resources are search topics, not links.** Invented web addresses are a known failure of language
  models, so the AI is told not to write any and the page builds a search link from each topic.
- **The AI is told not to claim feelings.** Expression readings are rough, so feedback describes what could be
  observed (pauses, looking away, filler words) and never says the candidate was nervous or anxious.
- **Honest by design:** the AI is told not to call weak results good and to return fewer strengths rather than
  invent one. The rules-based version orders weaknesses by cost: skipped questions first, then technical
  relevance, then delivery.
- **Saved feedback is reused** while the overall score is unchanged, so reopening the page or retrying never
  costs another AI call. A new score triggers a rewrite.
- **Migration** `0003_feedback_summary_source` adds `summary`, `source` and `based_on_overall` to `Feedback`.
  Docker runs it for you, otherwise run `python manage.py migrate`.
