# SmartHire AI testing checklist

## Simplified authentication update

- Two transparent flat illustrations replace the 3D artwork on auth pages.
- Browser-verified desktop switch: form moves from right to left on registration, and back to the right on login; artwork changes to match each page.
- Verified 390 px mobile layout with no horizontal overflow.
- Production build and existing 11 frontend tests pass.
- Updated screenshots: `docs/screenshots/login-flat.png` and `docs/screenshots/register-flat.png`.

## Automated checks

- `npm run build`: strict TypeScript and Vite production build.
- `npm test`: 11 tests covering validation, protected routes, recovery routing, password visibility, safe profile update payloads, empty dashboard metrics, and Supabase errors.
- From `backend`, `.venv\Scripts\python.exe -m pytest -q`: health, protected endpoints, Supabase-validated identity, rejection of forged tokens, upstream outage, malformed identity response. Unit tests mock the upstream identity service only; the shipped application has no mock auth.

## Supabase integration (requires real project configuration)

Use two test accounts (A and B). Never run destructive security tests against production data.

## Verification from implementation (7 November 2026)

- Production TypeScript/Vite build: passed.
- Frontend suite: 11 passed.
- FastAPI suite: 4 passed. Starlette emits a deprecation warning for its httpx-based TestClient; no test failures.
- npm dependency audit after updates: zero reported vulnerabilities.
- Local server: HTTP 200.
- Browser checks: registration at 1440×900 and 1366×768; phone layout at 390×844; password visibility, login/recovery navigation, and unauthenticated `/dashboard` redirect verified. No horizontal overflow at the checked phone or desktop widths.
- Screenshot: `docs/screenshots/registration.png`.
- Not run: real Supabase email/OAuth, migration execution, database RLS/storage integration, authenticated dashboard/profile/settings visual review. No Supabase project credentials were supplied. The checklist below is for those remaining integration checks.

- [ ] Apply migration and configure URL allow list, email confirmations, and SMTP.
- [ ] Register A. Invalid email, short/weak password, mismatched confirmation, missing acknowledgment, and invalid phone are rejected.
- [ ] New account receives a confirmation email and a `candidate` profile with the correct name/phone. Signup does not imply success for an already registered address.
- [ ] Email confirmation in the originating browser completes; unconfirmed login shows a useful error.
- [ ] Incorrect credentials fail. Correct credentials lead to `/dashboard`.
- [ ] Refresh `/dashboard`; session and profile persist. Clear/expire the session; protected routes redirect to login.
- [ ] Logout removes access; direct `/profile` navigation returns to sign-in.
- [ ] With providers configured, Google and LinkedIn return through `/auth/callback`. Provider rejection is handled without leaking credentials.
- [ ] Password recovery email opens `/reset-password`; mismatched/weak passwords fail, valid change succeeds, old password stops working. Expired links show a useful state.
- [ ] Profile edits survive refresh: name, phone, education, degree, year, skills, role preference, bio.
- [ ] Upload JPG/PNG/WebP under 2 MB; preview appears. Other types/oversize files fail. Replacing a photo removes the old object when storage is reachable.
- [ ] Save each settings preference and refresh. All values persist; no emails or analytics are falsely reported as active.
- [ ] Dashboard starts at 0 interviews/hours/reports and an unscored average. No fabricated history or trends.
- [ ] Sidebar routes, mobile menu, Escape dismissal, notifications, and upcoming pages are usable.

## Security checks using A's authenticated API token

- [ ] Query B's profile: no rows returned. Update B's profile: no rows changed.
- [ ] Update A's `role`, `id`, `created_at`, or `updated_at`: permission denied.
- [ ] Attempt client insert or delete in `profiles`: permission denied.
- [ ] Register with `data.role = admin`: stored role remains `candidate`.
- [ ] Change auth user metadata role: no database role change.
- [ ] Upload/read/delete B's avatar path: rejected. An anonymous user cannot read A's avatar.
- [ ] Point A's `avatar_path` to B's folder: constraint failure.
- [ ] Send a forged/expired/missing bearer token to `/api/me`: 401. Auth service outage: 503.
- [ ] Inspect production assets: only the public Supabase URL/key, never secret/service-role credentials.

## Layout and accessibility

- [ ] Review registration and login at 1440 px, 1024 px, 768 px, and 390 px widths.
- [ ] No horizontal scroll; form buttons and errors remain visible.
- [ ] Tab through forms, visibility buttons, links, country selector, photo upload, and toggles.
- [ ] All fields have labels. Status messages are announced. Password controls do not submit forms.
- [ ] Check reduced-motion mode and 200% zoom. Mobile navigation can close with Escape.
- [ ] Test direct deployed URLs to ensure hosting supplies the SPA fallback.
