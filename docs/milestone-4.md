# Milestone 4: Analytics, testing and deployment

Milestone 4 turns the saved interview scores into dashboards, reports and notifications, and puts the platform
online. This page is filled in day by day.

## Overview

### What the SRS asked for, and where it is

| SRS deliverable (Milestone 4) | Status | Where |
|---|---|---|
| Analytics dashboard (performance tracking, skill-wise analytics, weak-area prediction, trends, ranking) | Candidate side done | `apps/analytics` (Day 1), `/analytics` page (Day 2) |
| Performance visualizations | Candidate charts done | `components/analytics` (Day 2) |
| Recruiter analytics (candidate reports, comparison, monitoring) | Planned | Day 3 |
| Admin analytics (platform-wide stats, activity, AI settings) | Planned | Day 4 |
| Downloadable reports and performance summaries | Planned | Day 5 |
| Notifications (reminders, session alerts, email) | Planned | Day 6 |
| Testing and validation, production setup, CI | Planned | Day 7 |
| Cloud deployment on AWS, end-to-end demo | Planned | Day 8 |

### Tests

- Backend: `python -m pytest` in `backend`.
- Frontend: `npm test` in `frontend` (chart maths and wording live in `src/utils/analytics.js`).

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

## Day 2: candidate analytics page

### What the candidate sees

The page is at `/analytics` (new **Analytics** link in the navbar, and the "Performance analytics" card on the
dashboard now opens it). It shows the data of the Day 1 API:

1. **Four number cards**: average score, latest score with its rating, best score, and progress since the first
   interview.
2. **Score trend**: a line chart, oldest interview on the left. The candidate can switch the overall line and each of
   the four scores on or off. Hovering or tapping picks an interview, and the left and right arrow keys work too. The
   box under the chart shows that interview's scores. Dashed lines mark 60 and 75.
3. **Skills**: a radar of the four areas, with each area's recent average, best, latest, direction and where the
   trend points next.
4. **Where to focus**: weak skills and topics with the reason and a tip.
5. **How you compare**: the anonymous percentile and recent activity.
6. **By interview type** and **by question topic**: bars, weakest topics first.
7. **How your interviews were rated**: one bar from Excellent to Poor.

A row of buttons at the top filters everything by interview type (the page asks the API with `?type=`).

### How it fits together

- `src/utils/analytics.js` holds all the chart maths and wording (scales, line paths, radar corners, colours,
  "+12.5", "75th"). It has no React in it and is covered by unit tests.
- `src/components/analytics/` has the three drawing components: `TrendChart`, `SkillRadar` and `BarRows`.
- `src/pages/Analytics.jsx` loads the data and lays out the sections. Loading, error (with "Try again") and
  "no scored interviews yet" are each handled.
- **No chart library was added**, so there is nothing new to install and the page stays small. The charts are drawn
  as SVG.

### Decisions

- Colours use the same lines as the weak-area outlook: under 60 red, under 75 amber, 75 and above green.
- A score that could not be measured leaves a gap in its line. It is never drawn as 0.
- Accessibility: the chart can be reached and moved with the keyboard, the radar and bars have text labels, and the
  trend chart has a "View the numbers as a table" list with the same data.
- The prediction is described on the page as an estimate, not a promise.

### Checked

- Unit tests for every chart helper.
- The real page was rendered with the output of the Day 1 API for a full history, a single interview and a new
  candidate, and each of these was exercised: toggling lines, arrow keys, the type filter, the empty state, a failed
  request and "Try again". No errors were logged.
- It has not been looked at in a real browser from here, so check the layout on a phone-sized window as well.
