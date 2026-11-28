# Milestone 4: Analytics, testing and deployment

Milestone 4 turns the saved interview scores into dashboards, reports and notifications, and puts the platform
online. This page is filled in day by day.

## Overview

### What the SRS asked for, and where it is

| SRS deliverable (Milestone 4) | Status | Where |
|---|---|---|
| Analytics dashboard (performance tracking, skill-wise analytics, weak-area prediction, trends, ranking) | Candidate side done | `apps/analytics` (Day 1), `/analytics` page (Day 2) |
| Performance visualizations | Candidate charts done | `components/analytics` (Day 2) |
| Recruiter analytics (candidate reports, comparison, monitoring) | Done | `/recruiter/analytics`, `/recruiter/candidates/:id` (Day 3) |
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

## Day 3: recruiter analytics

### What the recruiter gets

A new **Analytics** link in the recruiter navbar (and the "Candidate reports" and "Compare candidates" cards on the
dashboard) opens `/recruiter/analytics`, with four tabs:

1. **Overview**: candidates, interviews scored, average score and completion rate; how many interviews are in
   progress, scheduled, completed and cancelled right now; the skills of the whole group on a radar; the average
   score by week; the top 5 candidates; how interviews were rated; and the results of each template.
2. **Candidates**: everyone who took an interview on the recruiter's templates, with search, a filter by interview
   type, sorting, pages of 25, and a tick box on each row to pick candidates to compare.
3. **Compare**: 2 to 4 candidates side by side, with all four skills on one radar, a table with a "Highest" tag on the
   best score in each row, and the average of all the recruiter's candidates as a reference.
4. **Sessions**: every session with its status. Interviews in progress come first with a bar for how many questions
   have been answered, and one that has been "in progress" for more than 3 hours is marked "Possibly abandoned". The
   list refreshes by itself every 15 seconds.

A click on a candidate's name opens `/recruiter/candidates/:id`, the **candidate report**: scores, the trend chart,
skills, strengths, weak areas, results by template, interview type and question topic, the candidate's place among
the recruiter's candidates, and their recent interviews. It reuses the same charts as the candidate's own page.

### Who can see what

- **A recruiter only sees interviews taken on their own templates.** That is the only link between a recruiter and a
  candidate in the platform. Practice interviews, custom interviews and other recruiters' templates are never
  included, and asking for a candidate outside this scope gives "not found", the same as for a candidate who does
  not exist. This is covered by tests on every endpoint.
- **Candidates are told.** When a candidate picks a template, the setup page now says that the recruiter who made it
  can see their scores, skills and progress for interviews on that template.
- **Recruiters do not see answers.** A report has scores and summaries, not what the candidate said.
- Admins are not part of this scope. Platform-wide analytics for admins is Day 4.

### How it fits together

```
apps/analytics/recruiter.py   scope(recruiter) -> overview, candidate_rows, candidate_report, compare, monitor_sessions
apps/analytics/services.py    the Day 1 helpers, now shared (trend, parts, topics, weak areas)
apps/analytics/stats.py       the same plain maths
```

- Every recruiter query starts from `scope()`, which is "sessions whose template was created by this recruiter".
- Query counts stay the same however many candidates there are: overview 11, candidate list 3, sessions 2,
  report 7, compare 5 (tests keep these bounds).
- The weekly trend is bucketed in Python rather than with a database date function, so it behaves the same on SQLite
  and PostgreSQL.
- In the frontend, the pieces the candidate page already had (number cards, skills panel, weak areas, rating bar,
  trend chart with switches) moved to `components/analytics` and are shared. `hooks/useApi.js` loads data, can
  refresh on a timer, and keeps the old data on screen if a refresh fails.

### Decisions and limits

- **"Completion rate" counts only finished interviews** (completed or cancelled), so an interview still in
  progress does not count against a template.
- **A place among candidates needs 3 scored candidates**, and the cohort average counts each candidate once.
- **"Possibly abandoned" is a guess** from time alone (3 hours in progress). It is a constant in `recruiter.py`.
- Comparison is limited to 4 candidates so the table and radar stay readable.
- Selected candidates for comparison are kept while the recruiter moves between the tabs, but not after a reload.
- Downloadable candidate reports are Day 5, and email alerts for new interviews are Day 6.

### Checked

- 64 new backend tests (access for every role, scope and privacy, every sort, filter and error, ties, empty data,
  query counts).
- The real React app was run against the real Django server with a seeded database (6 candidates, two recruiters,
  live, stalled, scheduled and cancelled sessions). 49 checks passed with no console errors: every tab, search,
  sort, filter, ticking and limiting candidates, comparing, removing a candidate, status filter, opening a report,
  the out-of-scope and unknown candidate pages, a candidate being turned away from the recruiter pages, and the
  privacy note on the setup page.
- It has not been looked at in a real browser from here, so check the layout, especially the tables on a narrow window.
