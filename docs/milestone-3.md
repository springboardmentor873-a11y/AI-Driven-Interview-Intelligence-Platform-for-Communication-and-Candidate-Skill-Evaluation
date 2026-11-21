# Milestone 3: Speech analysis and AI monitoring

Work is delivered in daily patches. This file grows with each one.

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
