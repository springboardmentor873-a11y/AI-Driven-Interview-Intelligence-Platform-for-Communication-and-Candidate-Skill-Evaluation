-- Run after 001_profiles.sql. Existing accounts retain their current roles.
-- Evaluator is the public-facing name for the existing recruiter enum value.
begin;
create or replace function public.create_candidate_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 100),
    case when coalesce(new.raw_user_meta_data ->> 'phone', '') ~ '^\+[1-9][0-9]{7,14}$'
      then new.raw_user_meta_data ->> 'phone' else '' end,
    case when new.raw_user_meta_data ->> 'account_role' = 'recruiter'
      then 'recruiter'::public.account_role else 'candidate'::public.account_role end
  );
  return new;
end;
$$;
revoke all on function public.create_candidate_profile() from public, anon, authenticated;
-- Keep own-profile RLS and column grants unchanged. No public admin signup,
-- client-side role edits, or evaluator access to other users is granted here.
commit;
