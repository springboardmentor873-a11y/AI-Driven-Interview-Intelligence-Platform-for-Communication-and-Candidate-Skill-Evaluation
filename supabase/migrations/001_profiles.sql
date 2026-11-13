-- Run once in a new Supabase project's SQL editor, or with supabase db push.
begin;

create type public.account_role as enum ('candidate', 'recruiter', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text not null default '' check (phone = '' or phone ~ '^\+[1-9][0-9]{7,14}$'),
  college text not null default '' check (char_length(college) <= 160),
  degree text not null default '' check (char_length(degree) <= 120),
  graduation_year smallint check (graduation_year between 1950 and 2100),
  skills text[] not null default '{}' check (cardinality(skills) <= 30 and char_length(array_to_string(skills, ',')) <= 1500),
  preferred_role text not null default '' check (char_length(preferred_role) <= 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  avatar_path text check (avatar_path is null or (split_part(avatar_path, '/', 1) = id::text and char_length(avatar_path) <= 255)),
  role public.account_role not null default 'candidate',
  email_updates boolean not null default false,
  practice_reminders boolean not null default false,
  analytics_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Column privileges protect role, id and timestamps even if a caller bypasses the UI.
grant update (full_name, phone, college, degree, graduation_year, skills,
  preferred_role, bio, avatar_path, email_updates, practice_reminders, analytics_consent)
  on public.profiles to authenticated;

create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Edit own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.create_candidate_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 100),
    case when coalesce(new.raw_user_meta_data ->> 'phone', '') ~ '^\+[1-9][0-9]{7,14}$'
      then new.raw_user_meta_data ->> 'phone' else '' end,
    'candidate'::public.account_role
  );
  return new;
end;
$$;
revoke all on function public.create_candidate_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_candidate_profile();

-- Backfill users created before the migration; metadata never determines privileges.
insert into public.profiles (id, full_name)
select id, left(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''), 100)
from auth.users on conflict (id) do nothing;

create function public.set_profile_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_profile_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Read own avatar" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
