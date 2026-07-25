# Login system — deploy steps

All 4 phases are implemented. `index.html` here is a drop-in replacement for the repo root file.

## 1. Supabase dashboard (you do these)
- Authentication → Providers → **Google**: enable. In Google Cloud Console, add
  `https://wylxvmkcrexwfpjpbhyy.supabase.co/auth/v1/callback` as an authorized redirect URI on your
  existing OAuth client (`1088099187141-…`), then paste its Client ID + Secret into Supabase.
- Authentication → Providers → **Email**: enable.
- Authentication → Settings: turn **"Allow new users to sign up" OFF** (invite-only).
- Authentication → URL Configuration: Site URL = deployed app URL; add it to the redirect allowlist.

## 2. Run `migrations/deployops_profiles.sql`
In the SQL editor. Uses your existing `authentication_mode_user_roles` table (email-keyed):
adds `deployops_role()`, RLS on it, and seeds the two admin emails. Invite anyone by inserting
their email — no auth.users row needed. Store emails lowercase.

## 3. Replace `index.html` in the repo
What changed: GIS/localStorage auth removed; full-screen login gate (drawing-sheet design);
`sb.auth` Google OAuth + email/password; profile lookup on sign-in (no row → signed out +
"not on the access list" alert); roles → `is-admin` / `is-operator` body classes; deploy-checklist
ticks operator+admin only (checkbox disabled for viewers); no data loads before auth.

## 4. Run `migrations/deployops_rls.sql`
Only AFTER the new index.html is live (old clients rely on open tables).

## Acceptance checks
- Fresh browser → gate only; no `deployops_*` rows in the network tab.
- Uninvited account → error alert, no session kept.
- Admin: all controls. Operator: can tick deploy checklists, nothing else. Viewer: read-only.
- REST call with bare anon key returns zero rows.
- Sign-out → gate; session survives reload.

## Adding users later
Insert a row (they still need a Supabase auth account for email/password; Google users just sign in):
`insert into authentication_mode_user_roles (email,name,role) values ('x@y.com','Name','operator');`