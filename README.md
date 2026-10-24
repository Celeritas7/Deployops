# DeployOps

Robot deployment QC app for Telexistence: per-model checklists (After-Installation QC,
Pre-Test QC, Pre-Deploy), per-unit tick-off with who/when, printable QC worksheets,
and annotated engineering drawings.

Single-file web app: `index.html` + `docx-export.js`. No build step. Backend is Supabase
(Postgres + Auth + Storage); hosting is GitHub Pages (only the two app files are published).

## Run locally
Double-click `2_run_local.bat` (Windows) or run `python -m http.server 8000` in this folder and
open http://localhost:8000/index.html. The app must be served over HTTP, not opened as a file.

## Backend setup (one-time, in order)
1. `migrations/deployops_profiles.sql` — role lookup + admin seed.
2. Deploy the gated `index.html`.
3. `migrations/deployops_rls.sql` — row-level security on all app tables.
4. `migrations/deployops_storage.sql` — private drawings bucket.

Details and acceptance checks: `docs/LOGIN-IMPLEMENTATION.md`. Roadmap: `docs/ROADMAP.md`.

## Roles
`admin` edits models, checklists and drawings; `operator` ticks unit checklists; `viewer` is
read-only. Invite a user by inserting their email into `authentication_mode_user_roles`.

## Layout
- `index.html`, `docx-export.js` — the app
- `migrations/` — SQL to run in the Supabase SQL editor
- `docs/` — implementation briefs and roadmap
- `design/` — HTML mockups and prototypes (not served)
