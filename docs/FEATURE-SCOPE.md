# SmartHire AI feature scope

Source: the supplied “AI-Driven Interview Intelligence Platform for Communication and Candidate Skill Evaluation” PDF, pages 3–10.

The candidate overview stays focused on preparation, practice, and feedback. It does not duplicate detailed analytics, reports, account settings, or all planned modules.

| Area | Planned features | Location |
| --- | --- | --- |
| Account | Authentication, session management, candidate profile | Login, registration, profile, settings |
| Resume | Private PDF upload, skills, experience, education, summary | My resume |
| Interview | Technical, HR, behavioral, aptitude; difficulty and domain selection | Start interview |
| Session | Camera and microphone setup, recording, timer, session storage | Interview room |
| Communication | Transcription, grammar, filler words, pace, pronunciation | Session feedback |
| Assessment | Communication, technical relevance, professionalism; proposed confidence/attention measures require separate validation and consent design | Session feedback |
| Progress | Interview history, skill breakdown, trends, areas to improve | My interviews and Progress |
| Reports | Personalized recommendations, summaries, downloadable reports | Reports |
| Notifications | Reminders, email updates, session alerts | Notifications and settings |

Recruiter comparisons, templates, candidate reports, and administration belong to separate role-specific workspaces. They are not added to the candidate overview.

## Delivery order

1. Authentication, account management, database setup, resume storage.
2. Resume parsing, question generation, interview setup and session workflow.
3. Transcription, communication analysis, scoring and feedback.
4. Progress visualizations, downloadable reports, notifications, end-to-end testing and deployment.

## Current UI boundary

Authentication and profile screens use the existing Supabase integration. Resume analysis, interview sessions, scoring, analytics, and reports remain planned features. Overview links lead to their existing explanatory pages; the redesign does not implement AI services or fabricate performance data.

## November UI refinement

- Replaced the large marketing banner, four empty metric cards, empty chart, profile-completeness panel, duplicated quick actions, and interview tip with a compact introduction, three preparation links, and recent sessions.
- Reused the simple flat interview illustration instead of robot artwork.
- Removed the sidebar promotional card; retained feature navigation and shortened Performance analytics to Progress.
- Added short page entrances, staggered section reveals, card hover feedback, and active navigation styling.
- Shortened the existing login/register panel slide to 650ms; preserved distinct artwork and reduced-motion support.

Validation: production build and all 11 frontend tests pass. Public auth screens inspected in browser; private dashboard visual verification requires a signed-in session.
