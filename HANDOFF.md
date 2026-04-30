# DeployOps — Phase 2-5 Implementation Brief

## Context
Single-file web app (`index.html`) for robot deployment ops at Telexistence.
Stack: vanilla JS, Supabase, Google OAuth, GitHub Pages.

Repo: https://github.com/Celeritas7/Deployops
Live: (GitHub Pages URL)
Supabase project ref: `wylxvmkcrexwfpjpbhyy`
Anon key + GIS client ID + admin emails are in `index.html` (search `SUPABASE_KEY`).

## Phase 1 — DONE (do not redo)
Schema migration already applied. Current state:
- New table `deployops_models` (top-level entity): id, name, ref, description, icon, visible, created_at, created_by
- `deployops_units` has `model_id uuid` (nullable, FK to models)
- `deployops_checklist_items` has `model_id uuid` and `phase text` with CHECK (`assembly_qc` | `pre_deploy`)
- One model auto-created: "Safety net" (ref 123). All existing units/items backfilled to it. All existing items defaulted to phase=`assembly_qc`.
- Drawings table is unchanged — drawings are standalone, no model link.

## Architectural rule
**The deploy/QC workflow is the spine. Drawings are an add-on.**
- Top-level entity = Model (e.g. "CE DVT2")
- Each model has a standard checklist split into TWO PHASES:
  - `assembly_qc` — post-build QC (was the unit assembled correctly?)
  - `pre_deploy` — pre-shipping check (are all screws/parts in the box?)
- Each item belongs to exactly one phase.
- Units are instances of a model with their own check state per item per phase.
- Drawings are optional reference attachments, accessed from a separate tab.

## Phase 2 — UI prototype
Static mockup first (no Supabase calls, hardcoded sample data). User reviews before real code.
New tab structure:
1. **Models** (NEW, default tab) — list of models, add/rename/delete; click into one
2. **Deploy** (REDESIGNED) — pick model → list units → click unit → two-phase checklist
3. **Drawings** (DEMOTED) — current drawing/balloon tool, but standalone

Inside a model (admin view): two-phase checklist editor with "Assembly QC" and "Pre-Deploy" tabs, each with sections.
Inside a unit (deploy view): show both phases as collapsible sections OR sub-tabs (try both, pick what feels better on mobile).

## Phase 3 — Real code: Models tab + checklist builder rebuild
Replace the current Checklist tab. New checklist builder works against `model_id` and `phase`.
Old Checklist tab UI retired. Old `drawing_id` column on items stays (don't drop) but new items only set `model_id`.

## Phase 4 — Real code: Deploy tab redesign
Units grouped by model. Unit detail shows both phases. Print supports per-phase or both.
Fix while you're here:
- Unit progress bars showing 0/N until clicked → call `loadAllUnitChecks` on Deploy tab entry
- Checkbox toggle re-rendering whole tab → patch single row only
- Print as PDF (currently forces printer; need browser save-as-PDF path)
- Page deletion bug — after deleting page 1 print still shows 2 pages
- Add 20+ balloon colors (current 8)

## Phase 5 — Drawings as add-on
Move drawing tab to last position. Optionally allow linking a balloon to a checklist item (FK on balloons → items, nullable). Skip if scope creeps.

## Constraints
- Single file `index.html`. No build step, no bundler, no node_modules.
- ES modules OK via `<script type="module">` if it stays inline.
- Mobile must work — Aniket uses this on shop floor on iPad/phone.
- All existing data must keep working. The single existing model "Safety net" with 1 unit + 3 items must render correctly in the new UI.
- Admin gating: `body.is-admin` class controls `.admin-only` visibility. Don't break this.
- RLS is permissive (anon + authenticated both have full access). Don't add auth checks in JS — server-side policy handles it.

## Known issues to also fix in this pass (from review)
- Tip-handle drag doesn't update leader live
- `init()` triggers drawing render 2-3 times
- OAuth token never expires — add expiry check on stored credential
- Drawing toolbar overflows on mobile
- Replace native `confirm()`/`prompt()` with custom modal
- Add rename/delete for whole drawing
- Dead code: `exportChecklistCSV()`, unused `dragging` var
- Wrap Supabase loads in try/catch with toast on error
- Show `checked_by` and `checked_at` in print output

## Workflow
- One phase at a time. After each phase, show a working demo before moving on.
- Don't drop columns or tables. Additive changes only.
- Test on the existing "Safety net" model before adding more sample data.