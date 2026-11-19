# Private resume uploads

Apply `supabase/migrations/003_resume_storage.sql` in the Supabase SQL Editor after migrations 001 and 002. This creates a private `resumes` bucket with a 5 MB size limit and PDF MIME restriction. Do not rerun the earlier migrations on an existing database.

Candidate accounts can upload, replace, view/download, and remove one current resume at `<auth-user-id>/resume.pdf`. The original filename is not retained; the UI uses `Resume.pdf`. Storage is the source of truth, so there is no separate metadata row to get out of sync. A replacement overwrites the same object only after successful upload. The page reads the stored size and update date on subsequent visits.

RLS checks both the exact owner path and the candidate role from `public.profiles`. Anonymous users and evaluators have no resume access. Admin cross-account access is not introduced. Files are downloaded with the authenticated SDK, then opened through a temporary browser-local object URL; no public bucket or persistent public URL is used.

The browser checks file extension, MIME, size, and PDF header. The bucket enforces size and MIME independently. Header checks are usability validation, not malware scanning or proof that the PDF is parseable. Future server-side parsing must validate the document and apply resource limits before processing its contents. Resume analysis is not implemented in this change.

## Hosted verification after applying the SQL

1. Sign in as Candidate A; upload a small PDF; refresh and download it.
2. Replace it; verify the new contents, then remove it and refresh.
3. Sign in as Candidate B; verify A's object cannot be listed, downloaded, overwritten, or deleted using B's authenticated client.
4. Repeat attempts with an evaluator account and without a session; access must be denied.
5. Check oversized and non-PDF uploads, interrupted uploads, and retry behavior.

Local tests exercise validation, correct object paths, replacement without prior deletion, and error propagation. Hosted RLS and upload behavior still require the migration and real authenticated verification. No live database changes were performed automatically.

Update: reviewed keyword skill extraction is now available. See RESUME-EXTRACTION.md for backend startup, supported PDFs, and limits.
