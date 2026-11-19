begin;
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interview_type text not null check (interview_type in ('technical','hr','behavioral','aptitude')),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced')),
  target_role text not null check (char_length(target_role) between 2 and 100),
  questions text[] not null check (cardinality(questions) = 5 and octet_length(array_to_string(questions,'')) <= 30000),
  answers text[] not null default array['','','','',''] check (cardinality(answers) = 5 and octet_length(array_to_string(answers,'')) <= 100000),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_sessions_owner_date on public.interview_sessions(user_id, created_at desc);
alter table public.interview_sessions enable row level security;
revoke all on public.interview_sessions from anon, authenticated;
grant select on public.interview_sessions to authenticated;
grant insert(user_id, interview_type, difficulty, target_role, questions) on public.interview_sessions to authenticated;
grant update(answers, status) on public.interview_sessions to authenticated;
create policy "Candidates read own sessions" on public.interview_sessions for select to authenticated
using (user_id = (select auth.uid()) and exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
create policy "Candidates create own sessions" on public.interview_sessions for insert to authenticated
with check (user_id = (select auth.uid()) and exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
create policy "Candidates update own sessions" on public.interview_sessions for update to authenticated
using (user_id = (select auth.uid()) and status = 'in_progress' and exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'))
with check (user_id = (select auth.uid()) and exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
create trigger interview_sessions_updated_at before update on public.interview_sessions
for each row execute function public.set_profile_updated_at();
commit;
