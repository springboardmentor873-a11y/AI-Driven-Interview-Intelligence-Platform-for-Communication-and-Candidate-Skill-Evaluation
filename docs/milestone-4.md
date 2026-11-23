# Milestone 4: Analytics, testing and deployment

Milestone 4 turns the saved interview scores into dashboards, reports and notifications, and puts the platform
online. This page is filled in day by day.

## Overview

### What the SRS asked for, and where it is

| SRS deliverable (Milestone 4) | Status | Where |
|---|---|---|
| Analytics dashboard (performance tracking, skill-wise analytics, weak-area prediction, trends, ranking) | Candidate API done, page next | `apps/analytics` (Day 1) |
| Performance visualizations | Planned | Day 2 |
| Recruiter analytics (candidate reports, comparison, monitoring) | Planned | Day 3 |
| Admin analytics (platform-wide stats, activity, AI settings) | Planned | Day 4 |
| Downloadable reports and performance summaries | Planned | Day 5 |
| Notifications (reminders, session alerts, email) | Planned | Day 6 |
| Testing and validation, production setup, CI | Planned | Day 7 |
| Cloud deployment on AWS, end-to-end demo | Planned | Day 8 |

### Tests

- Backend: `python -m pytest` in `backend`.
- Frontend: `npm test` in `frontend`.

## Day 1: candidate analytics API

### What it gives the candidate page

`GET /api/analytics/candidate/` (see [API reference](api.md#analytics)) returns, in one call:

1. **Performance tracking and trends**: the overall score and the four SRS scores of every scored interview,
   oldest first, ready for a line chart.
2. **Improvement progress**: change since the first interview, direction (improving, steady, declining) and
   recent activity (interviews finished in the last 7 and 30 days).
3. **Skill-wise analytics**: the four assessment areas, results by interview type, and results by question topic.
4. **Weak-area prediction**: skills and topics to work on, ranked by risk, each with the reason and a tip.
5. **Candidate ranking metric**: an anonymous percentile among all candidates.

### How it fits together

```
Score rows (one per scored interview)  ->  apps/analytics/services.py  ->  GET /api/analytics/candidate/
                                           apps/analytics/stats.py (plain maths, no database)
```

- `stats.py` holds the maths (average, trend line, direction, percentile) on plain lists, so the recruiter and
  admin analytics on Days 3 and 4 reuse it.
- `services.py` reads the data and builds the answer in **6 database queries, however long the history is**
  (a test keeps it that way).
- No new tables and no migration: everything is calculated from the scores and answers that already exist.

### Decisions and limits

- **The prediction is a straight line, not machine learning.** It needs 3 interviews, uses the latest 6, and is
  clamped to 0-100. The page should say "trend points to", not promise a result.
- **The risk lines (60 and 75) follow the SRS rating bands**: under 60 is below "Average", under 75 is below "Good".
  They are constants at the top of `services.py`.
- **Parts that could not be measured are left out, not zeroed.** Skipped questions were already counted as 0 by the
  scoring engine, so they do lower a topic's average.
- **Question topics come from the questions** (AI-generated topics are free text, so the same topic can appear
  with slightly different names). Topics are matched ignoring upper and lower case, and a topic needs 2 answers
  before it can be called weak.
- **Ranking needs 5 candidates** with scored interviews, so a small test database never singles anyone out. It shows
  only a percentile and the cohort size.
- **Only the newest 50 interviews are charted.** `summary.scored` still counts all of them.
- The SRS also lists resume skills, but the interview answers are not tied to them, so skill-wise analytics uses
  the four scoring areas and the question topics.
