# Registration roles

Run `supabase/migrations/002_registration_roles.sql` in the existing project's Supabase SQL Editor before using evaluator registration. Do not rerun migration 001 on an existing database.

Candidate remains the default. Evaluator uses the existing `recruiter` database enum to preserve compatibility. Admin is not a signup option; unknown metadata roles fall back to candidate. Existing accounts are unchanged. Editing auth metadata later does not change the authoritative profile role.

Evaluator registration currently uses email/password. Social registration defaults to candidate; the evaluator option hides social signup to avoid silently losing the selected role.

The evaluator dashboard is an honest empty state. Candidate assignments, templates, and evaluation access are future work. Existing RLS still restricts users to their own profile and avatar. Any future candidate-data policies must require an explicit assignment or approval rather than trusting a self-selected evaluator role alone.

After applying the migration, register one account for each role and confirm the matching value in `public.profiles.role`. Verify the evaluator welcome screen after confirming the email. The local migration file has not been applied to the hosted database automatically.
