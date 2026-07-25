# CC Prompt — Login gate + real auth (Supabase Auth, roles, RLS)

Implement invitation-only login in `index.html`. The approved design is
`design/login-gate.html` in this repo (self-contained; open in a browser — the demo strip shows
all four outcomes: admin / operator / viewer / not-invited). Lift its panel markup, form styling,
alert states, and copy verbatim. Design is final; do not restyle.

Work in 4 phases, in order. Each phase must leave the app working.

## Phase 1 — Auth backend

- Supabase Dashboard (tell the user to do these; you can't): enable Google provider +
  Email provider under Authentication; disable public signups ("Allow new users to sign up" OFF —
  admins create users via dashboard invite).
- New table (write migration `migrations/deployops_profiles.sql`):

```sql
create table deployops_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null default 'viewer' check (role in ('admin','operator','viewer'))
);
alter table deployops_profiles enable row level security;
create policy "read own+all for authed" on deployops_profiles for select to authenticated using (true);
create policy "admin manages profiles" on deployops_profiles for all to authenticated
  using (exists (select 1 from deployops_profiles p where p.id = auth.uid() and p.role = 'admin'));
```

- Replace the hand-rolled GIS flow (`handleLogin`, `deployops_token` localStorage, `ADMIN_EMAILS`)
  with `sb.auth`: `signInWithOAuth({provider:'google'})` and `signInWithPassword({email,password})`.
  Session persistence is automatic; delete initAuth's localStorage parsing.
- On `onAuthStateChange`: fetch the user's `deployops_profiles` row. No row → sign out +
  show the "not on the access list" alert (copy in prototype). Row → store `currentRole`.

## Phase 2 — Login gate UI

- Full-screen `#loginGate` overlay from the prototype (brand panel + form panel), shown whenever
  there's no session/profile; `.app-root` content hidden until authed (wrap existing
  topbar/tabbar/panels in one container, `display:none` while gated).
- Wire the real error/success alerts; spinner state on the submit button while awaiting auth.
- Topbar keeps the user badge + sign-out; remove the old topbar Sign In button (gate replaces it).

## Phase 3 — Role wiring

- `isAdmin = role === 'admin'` (body class `is-admin`, unchanged CSS keeps working).
- New body class `is-operator` when role is operator OR admin. Checklist tick controls
  (checkbox/tap-to-toggle in the Models phase checklists) move from `admin-only` gating to a new
  `.op-only` class: `display:none` default, shown under `.is-operator`. Everything else
  (add/edit/delete/upload/annotate) stays `admin-only`.
- Viewer = authed with no extra classes.

## Phase 4 — RLS (the actual security)

Migration `migrations/deployops_rls.sql`. For every `deployops_*` table:

- `enable row level security`.
- SELECT: `to authenticated using (true)` — any invited user reads everything.
- INSERT/UPDATE/DELETE: admin-only via the profiles lookup (same `exists` pattern as above),
  EXCEPT checklist-tick updates: operators may UPDATE only the tick/status columns of checklist
  item rows — enforce with a dedicated update policy on that table restricted to
  `role in ('admin','operator')` (column-level: revoke update on other columns from a
  non-admin path, or split ticks into their own table if column-level proves messy — ask first).
- After enabling RLS, verify anon key without session can read NOTHING (the current app relies
  on open tables — this flips that off; the gate must be live first or viewers break).

## Acceptance

1. Fresh browser → only the login gate renders; no app data in network tab before sign-in.
2. Google and email/password both work; uninvited account → error alert, no session kept.
3. Admin sees all controls; operator can tick checklist items only; viewer read-only.
4. With RLS on: REST calls with bare anon key (no auth) return zero rows; operator PATCH on a
   non-tick column is rejected.
5. Sign-out returns to the gate; session survives reload (12h+ per Supabase default).
