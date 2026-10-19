# DeployOps — phased development plan

Split rule: pure code, security and data-integrity work goes straight to
**Claude Code**. Anything that changes how a screen looks or how an operator
moves through it gets a **Claude Design** pass first (critique / mockup), then
Claude Code builds it, then Claude Design checks the result against the mockup.

Handoff loop for design phases:
1. Claude Code posts current screenshots (phone 390px, iPad 820px, desktop) + a
   short change list.
2. Claude Design runs a critique / accessibility review and returns a mockup or
   annotated list.
3. Claude Code implements, re-screenshots, commits on the working branch.
4. Claude Design compares result to mockup; loop until accepted.

Constraints that apply to every phase (from HANDOFF.md): single `index.html`,
no build step, additive DB changes only, mobile must work, admin gating via
`body.is-admin` / `.admin-only`, RLS is the real auth boundary.

---

## Phase 0 — Lock the data  (Claude Code only; do first)

Live risk: the old allow-all policies still exist on 8 of 9 `deployops_*`
tables, so the public anon key can read/write/delete everything.

- Drop the legacy policies (`*_all`, `*_auth`, `*_anon_all`, `*_auth_all`) on
  all `deployops_*` tables; add the drops to `migrations/deployops_rls.sql`.
- Change read policies from `to authenticated using (true)` to
  `using (deployops_role() is not null)` (invite required, as storage already does).
- GitHub Pages: publish only app files (`index.html`, `docx-export.js`,
  `login-gate.html`, `.nojekyll`), not `archive/`, `docs/*.pdf`, `design/`.
- Remove files from another project (`reader.js`, `START_HERE.bat`) and stale
  copies (`splice-3b - Copy.ps1`, `archive/scraps`, `archive/revisions`).
- Sanitize `b.color` through `safeColor()` in the SVG renderer.

Gate: owner runs the SQL; an anonymous REST call returns zero rows; drawings
still load for an invited user.

## Phase 1 — Quick fixes  (Claude Code; screenshots to Design for info only)

- Dialogs: Escape closes, Enter submits, focus returns to the opener.
- Replace remaining native `confirm()` / `prompt()` with `showConfirm` / a
  prompt modal (9 call sites).
- Model editor: show only the *other* phases an item belongs to, not the
  current tab's phase.
- Filled-status print: phase heading once per phase, running item number.
- `moveModelItem`: renumber the section's `sort_order` on every move.
- `deleteModel`: refuse (or archive via `visible=false`) when units exist.
- Check `error` on every Supabase call (currently 29 of 79 do).
- Favicon + `<meta name="theme-color">`.

Gate: owner clicks through; no console errors; screenshots attached to commit.

## Phase 2 — Core screens  (Claude Design → Claude Code → Claude Design)

Design inputs: current screenshots, HANDOFF.md, this file.
Design outputs: critique + mockups (phone first) for:

1. **Deploy dashboard** — unit status (building / testing / ready / shipped /
   deployed), search, filter by status/model, sort; delete out of the thumb path.
2. **Unit checklist** — hold-point visual language (Verify / Review / Witness),
   sign-off state, "next unchecked" affordance, compact who/when, collapsed-done.
3. **Model editor** — flat section list with item previews instead of tiles;
   bulk actions; phase tabs on phone.
4. **Print dialog** — basic vs advanced; remember last choices; single combined PDF.
5. **Top bar / phone nav** — language + user badge collapse into one menu.

Code outputs: implementation per mockup; `status` column on `deployops_units`
(additive). Gate: Design re-review against mockups; owner test on iPad.

## Phase 3 — QC integrity  (Claude Design for the flow → Claude Code)

Design: specify the second-signature and sign-off flows and their copy
(`design:ux-copy`), including error/edge states (offline, wrong role, already
signed).

Code (additive migrations, owner approves before running):
- Review/Witness items require a second account (admin or new `supervisor`
  role) to tick; store `witnessed_by`.
- Per unit-phase sign-off (`deployops_unit_signoffs`: unit, phase, signed_by,
  signed_at); ticks read-only after sign-off; admin can reopen with reason.
- Append-only tick history (`deployops_unit_check_log`) via trigger, so an
  untick never erases the previous record.
- Supabase Realtime on `deployops_unit_checks` → live progress on all devices.
- Online/offline banner; optional queued ticks replayed on reconnect.

Gate: two devices ticking the same unit stay in sync; a signed-off phase
cannot be changed by an operator; history shows every change.

## Phase 4 — Platform and language  (Claude Code; Design supplies copy/icon)

- `manifest.json`, app icons, `apple-touch-icon`, `display: standalone`.
- Idle sign-out (e.g. 8 h) and a "Switch user" button for shared iPads.
- Timezone shown or fixed (Asia/Tokyo) on all timestamps and prints.
- Finish Japanese interface text through the existing `tr()` table; hide the
  EN/JA toggle until complete. Design provides the JA strings.

Gate: app installs to iPad home screen and opens full-screen; JA mode has no
English chrome.

## Phase 5 — Drawings as add-on  (Claude Design → Claude Code)

- Mobile drawing toolbar (currently overflows); pinch/zoom review.
- Optional link balloon → checklist item (nullable FK), shown in the unit
  checklist as "see drawing".
- Rename / delete drawing; replace drawing-tab dialogs.
- Tip-handle drag updates leader live; single render on `init()`.

Gate: Design mock of the toolbar accepted; tested on iPad with a real drawing.

---

## Order and dependencies

- 0 first (live risk), 1 immediately after (no design needed).
- 2 is the largest and most design-heavy; start the design critique while 1 is
  being coded.
- 3, 4, 5 can be reordered: 3 if more operators are joining, 4 if iPad use is
  the pain point, 5 when drawings become part of daily work.
