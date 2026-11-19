-- Apply after 001_profiles.sql and 002_registration_roles.sql.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf']);

-- One object per candidate. All operations require current candidate membership
-- from the authoritative profiles table, not user-editable auth metadata.
create policy "Candidates read own resume" on storage.objects for select to authenticated
using (bucket_id = 'resumes' and name = (select auth.uid())::text || '/resume.pdf'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
create policy "Candidates upload own resume" on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and name = (select auth.uid())::text || '/resume.pdf'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
create policy "Candidates replace own resume" on storage.objects for update to authenticated
using (bucket_id = 'resumes' and name = (select auth.uid())::text || '/resume.pdf'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'))
with check (bucket_id = 'resumes' and name = (select auth.uid())::text || '/resume.pdf'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
create policy "Candidates remove own resume" on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and name = (select auth.uid())::text || '/resume.pdf'
  and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'candidate'));
commit;
