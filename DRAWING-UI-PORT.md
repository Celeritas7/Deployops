# Drawing Annotation UI — port spec for `index.html`

Goal: bring the production drawing editor in `index.html` (vanilla JS + Supabase) to
parity with the React prototype. Use the prototype as the **behaviour + visual reference**;
reimplement in the app's own vanilla style. **Additive only — no breaking changes.**

Reference files (read these for exact logic, look & CSS):
- `../deployops/drawings.jsx` — the React prototype; all logic + helper functions below live
  here verbatim. Lift the math directly; reimplement the UI in the app's vanilla style.
- `../deployops/DeployOps - Reorganized.html` — the matching CSS. Search the class names
  listed under each section.

## Schema (already in place — NO migration)
`deployops_balloons` columns used: `id, drawing_id, page, number, x_pct, y_pct,
tip_x_pct, tip_y_pct, label, color, mode, arrow_style`.
The `mode` column is free text → new annotation types need **no migration**.

### Everything new rides inside existing columns — do NOT add columns
- **`curve`** (bool) and **`waypoints`** (array of `{x,y}` in % coords) → store in the existing
  `label` JSON for any leader-bearing balloon. (If you'd truly rather not overload `label`,
  one nullable `meta jsonb` is acceptable — but overloading `label` is fine and preferred.)
- **Loctite label** (`mode:'loctorque'`), **torque table** (`mode:'table'`), and **steps
  table** (`mode:'steptable'`) each store their whole payload as JSON in `label`.
- All **client settings** — layer visibility, palettes, grade list/colours, marker size,
  note templates, default leader shape — live in `localStorage`, never in the DB. Keys listed
  per section below.

## Already done (verify, don't redo)
- `MODES` has BOM(=`dismantling`), Step, Ref, Note (+ hidden cable/balloon).
- `markerColor(mode,num)` colour-by-number for BOM + Step.
- `renderBalloonsSVG()` draws shape per `MODES[mode].shape` (circle/square/triangle/note).
- Leader line + `ARROW_STYLES` (solid/dashed/thick/dot/none) — already covers the prototype's
  "arrow / line / none" leader toggle; keep the richer app version.
- Drag balloon body + drag leader tip already work.

> Sections **1–5** were the first port pass — re-verify they're in `index.html`; do any missing.
> Sections **6–9** are the live gaps (curved arrows / Loctite labels / steps tables /
> editable palettes are all missing from the app today). Sections 6–9 are the real work.

---

## 1. Two new annotation types
Add to `MODES`:
- `x` → label "No-install", shape `'x'`, color `#f87171`, kind `'balloon'`.
  Render: filled red circle, white ✕, no number. Means "DO NOT INSTALL this part."
- `caution` → label "Caution", shape `'caution'`, color `#fb923c`, kind `'tag'`.
  Render: note-style callout box but amber border + a ⚠️ glyph before the text;
  editable `label` holds the precaution text. Reuse the existing note/tag callout path.
Update `markerColor` so `x`→`#f87171`, `caution`→`#fb923c` (fixed, not by number).
Add both to the toolbar pills and to `renderBalloonsSVG()` + the PNG/print renderer
(`exportAnnotatedPNG` / canvas pass) so they export too.

## 2. Multi-layer visibility (the key change)
Today the canvas shows only `currentMode`'s layer. Replace that filter with an
independent **visible-set**:
- Client-only state `layerVis = {dismantling,step,ref,note,x,caution: bool}` (default all true).
  Persist per drawing in `localStorage` (`deployops_layervis_<drawingId>`), not the DB.
- `renderBalloonsSVG()` filters balloons by `layerVis[b.mode] !== false`. Tables
  (`table`/`steptable`) and `loctorque` always show regardless of the filter.
- In the layers panel, give every layer row an **eye toggle (👁/🚫)** that flips
  `layerVis[mode]` and re-renders. Several can be on at once → they show & **print together**
  (e.g. Steps + Notes). A "Show all layers" action sets all true.
- Keep the quick "focus" behaviour: clicking a layer **name** (or its toolbar pill) isolates
  to that layer (sets visible-set to just it) for clean placing. Clicking the **active** tool
  again returns to Select and shows all.
- **Companion rule:** focusing Step also shows `x`, and focusing `x` also shows Step
  (Do-not-install travels with Steps). `COMPANION = { step:['x'], x:['step'] }`.
CSS refs: `.layer-row`, `.eye`, `.lyr-chip`, `.mk-legend`.

## 3. Note templates (reusable torque specs / callouts)
- Client-only list in `localStorage` (`deployops_note_templates`), seeded with:
  `M5 × 40 · 6 N·m`, `M6 × 20 · 10 N·m`, `Torque to spec`, `Apply threadlocker`,
  `Do not over-torque`, `⚠ Stressed joint`.
- Sidebar card: list as chips; click a chip → arm it, next drawing click drops a `note` with
  that text prefilled. Add input + Save; delete chip; "save selected note as template".
- Note/caution leaders cycle arrow → line → none via the `→` button on the callout; the last
  choice persists as the default in `localStorage['deployops_note_leader']` (`cycleLeader`).
CSS refs: `.tpl-chip`, `.tpl-arm`, `.tpl-add`, `.tpl-save-sel`.

## 4. Torque reference table
- A ready-made reference table (data below). Render it as a sidebar card styled like the
  reference image (two-level header: Hex bit | CBE (1.8 T) → Screw | Torque N·m).
- Tap a row → arm a note template `"<screw> · <torque> N·m"`.
- "Place whole table on drawing": store as one balloon row with `mode:'table'`,
  `label = JSON.stringify({title, rows, scale})`, `x_pct/y_pct` = top-left.
  `renderBalloonsSVG()` special-cases `mode:'table'` → draws a light table card (header bar
  with drag + scale ± + delete). Always visible regardless of layer filter.
  Data: `[["2 mm","M2.5","0.65"],["2.5 mm","M3","1.14"],["3 mm","M4","2.7"],
  ["4 mm","M5","5.4"],["5 mm","M6","9.2"],["6 mm","M8","22"],["8 mm","M10","44"]]`, title `CBE (1.8 T)`.
CSS refs: `.torque-tbl`, `.dwg-table`, `.dt-bar`, `.dt-table`.

## 5. Marker size slider
- Client-only `markerSize` (px), persist in `localStorage` (`deployops_balloon_size`,
  default 30). Range slider in the toolbar (min 18 / max 56 / step 2).
- Multiply balloon radius / shape size by it in `renderBalloonsSVG()` and the PNG pass.
CSS refs: `.ball-size`, `.bs-ico`, `.bs-val`.

---

## 6. Curved leaders + multi-bend routing — shared plumbing for 7 & 8
> Applies to EVERY leader: step, x, note, caution, loctorque.

The single biggest visible gap. Today leaders are straight `<line>`s. Replace each leader
with an SVG **`<path>`** that can be straight OR curved and can route through draggable bends.

**Rendering.** Draw all leaders in one overlay
`<svg class="lead-svg" viewBox="0 0 100 100" preserveAspectRatio="none">`, each as
`<path fill="none" stroke=COLOR stroke-width=2.4 stroke-linecap="round"
stroke-linejoin="round" vector-effect="non-scaling-stroke">`.
`vector-effect="non-scaling-stroke"` is **REQUIRED** — it keeps stroke width uniform even
though the viewBox is stretched non-uniformly. The path `d` comes from
`leaderPath(m, sx,sy, ex,ey)`:
- **straight** (`!curve`): `M sx sy [L wp.x wp.y …] L ex ey` — a polyline through any bends.
- **curved + no bends**: single quadratic bow via `curvePath()` (perpendicular offset ≈ 30%
  of length, capped at 20).
- **curved + bends**: smooth Catmull-Rom spline through `[start, …waypoints, end]` via
  `splinePath()`.

**Per-leader controls (when its balloon is selected).** Small buttons hanging off the balloon:
- **`→ / ↝` toggle** flips `m.curve`. Default for *new* leaders = client setting
  `localStorage['deployops_arrow_curve']` ("1"/"0"), exposed as a Straight/Curved segmented
  control (`.arrow-style` / `.seg`) in the Assembly-steps card.
- **`＋` "add bend" badge** (`.lead-add`) sits on the **midpoint of the leader's longest
  segment** (`longestSeg(leaderNodes(...))`). Clicking calls `addBend()`, which inserts a
  waypoint into that longest segment **offset perpendicular** (≈28% of seg length, clamped
  1–99) so it visibly bows — never collinear. This was a real bug: do NOT just push the
  midpoint; it must be offset or the new segment looks straight.
- **Each waypoint** renders as a draggable handle (`.lead-wp`) + a **red `×` delete badge**
  (`.lead-wp-del`) pinned to its top-right. Drag updates `m.waypoints[i]` in %; `×` (or
  double-click) removes it. Handles/bends stay visible whether the arrow is straight or curved.

**Persistence.** `m.curve` (bool) and `m.waypoints` (`[{x,y}]`, %) save into the balloon's
`label` JSON. On load, parse them back. A leader with no `waypoints` and `curve:false` is
identical to today's straight line — fully backwards compatible.
CSS refs: `.lead-svg`, `.lead-wp`, `.lead-wp-del`, `.lead-add`, `.mk-curve`, `.mk-bend`,
`.lt-curve-toggle`.
Helpers (in `drawings.jsx`): `leaderPath`, `curvePath`, `splinePath`, `leaderNodes`,
`longestSeg`, `clamp01`, `addBend`, `delWaypoint`, `startWaypointDrag`.

## 7. Loctite + Torque label (`mode:'loctorque'`) — attachable to a screw
A two-row callout that pins to a fastener with a leader, showing a Loctite grade (with grade
colour) and a torque value. **Supports a "No Loctite" state shown in red.**

**Placement.** Sidebar "Loctite + Torque label" card: a grade `<select>`, a torque text input,
and a "🔩 Place label on a screw" button that arms placement; next canvas click drops the label.
Stored as one balloon, `mode:'loctorque'`, payload JSON in `label`:
`{ loctite:"243", torque:"8", color?:override, leader:"arrow"|"none", curve, waypoints, bx, by }`
where `x_pct/y_pct` is the **tip** (on the screw) and `bx/by` is the **box** position.

**Render** (`renderBalloonsSVG()` special-case, like `table`):
- A small dark callout box at `bx/by` with a coloured left dot + the grade badge
  (`badgeFor(g)` → `"NO LOCTITE"` for `none`, else `"LOCTITE <g>"`) on row 1, and `⛓ <torque>
  N·m` on row 2. Border + dot use the grade colour.
- A leader `<path>` (section 6 rules) from box → tip, ending in a small coloured dot (`.lt-tip`).
- When selected (admin): **duplicate (`⧉`)**, **curve toggle**, **add-bend**, **arrow on/off**,
  **delete**. Editable grade `<select>`, editable torque (contentEditable), and a colour swatch
  that sets a per-label `color` override.
- **Duplicate** is a required feature: clone the label offset by a few %, same grade/torque,
  new id (`dupLT()`).

**Grades + colours panel (global, persisted, reflects in ALL drawings).**
- Grade list: `localStorage['deployops_loctite_grades']`, default
  `["none","222","243","263","290","577"]`.
- Grade→colour map: `localStorage['deployops_loctite_colors']`, default
  `{none:'#dc2626', 222:'#7c3aed', 243:'#2563eb', 263:'#be123c', 290:'#16a34a', 577:'#d97706'}`.
  **`none` MUST default to red `#dc2626`.**
- Panel UI ("Grades & colors"): a swatch grid — each grade shows a colour input + name + a `×`
  delete (every grade except `none` is deletable). An "＋ Add grade" input creates a custom
  grade (sanitise to alphanumerics; auto-assign next colour from `NEW_GRADE_COLORS`).
  "Reset to defaults" restores both list and colours.
- `ltColor(g)` resolves a grade to its colour; a label's own `color` overrides it.
CSS refs: `.lt-callout`, `.lt-grade`, `.lt-torque`, `.lt-tip`, `.lt-dot`, `.lt-dup`,
`.lt-arrow-toggle`, `.lt-curve-toggle`, `.lt-palette`, `.lt-pal-grid`, `.lt-pal-sw`,
`.lt-pal-chip`, `.lt-pal-del`, `.lt-pal-add`, `.lt-pal-reset`.
Helpers: `badgeFor`, `ltColor`, `setLtGradeColor`, `addGrade`, `delGrade`, `dupLT`.

## 8. Assembly steps table (`mode:'steptable'`) — steps + instructions on the drawing
A draggable table placed on the drawing: **Step # | Assembly instruction**, with the step
number colour-matched to the Step balloon palette, plus **✕ do-not-install rows**, and a
per-row button that **spawns the matching balloon + leader arrow** pointing at the screw.

**Placement.** Sidebar "Assembly steps" card → "▤ Place steps table" arms it; next click drops
it. Stored as one balloon, `mode:'steptable'`, payload JSON in `label`:
`{ title:"Assembly steps", scale, rows:[ {n:1,text:"…"} | {skip:true,text:"…"} ] }`.
Seed `rows` = `DEFAULT_STEP_ROWS` (4 numbered + 1 skip) from the prototype.

**Render** (special-case like `table`):
- Header bar (drag to move, scale ±, delete). Body is a `<table>`: col 1 = the step chip
  (a coloured rounded square with the number, using the Step palette `stepColor(n)`; a red
  circle ✕ for `skip` rows), col 2 = the instruction (contentEditable, edits `row.text`),
  col 3 (admin only) = a **`➤` arrow-generator button** tinted to the row's colour.
- **`➤` button → `spawnFromStep(table, row)`**: drops (or re-selects, if already spawned) a
  separate Step/x balloon on the canvas — coloured to match the row, with a leader arrow
  already attached (`curve` follows the `deployops_arrow_curve` default) — that the user then
  drags onto the correct screw. Dedupe via `fromTable`/`fromRowN`/`fromSkip` keys stored on the
  spawned balloon so a row maps to one balloon.
- Footer (admin): "＋ Step" appends a numbered row; "＋ ✕ Do-not-install" appends a skip row.
CSS refs: `.dwg-table.step-table`, `.st-num`, `.mk-cell.step`, `.mk-cell.x`, `.st-ins`,
`.st-arrow-btn`, `.st-arrow`, `.st-addrow`.
Helpers: `spawnFromStep`, `startTableDrag`, `scaleTable`.

## 9. Editable Step + BOM colour sequences (NEW)
BOM items and Steps take their colour **by number** (item 1 → swatch 1, item 2 → swatch 2, …,
wrapping). Both palettes are now **user-editable and persisted**, and the chosen colours must
drive the canvas markers, the legend, the steps-table chips, and the PNG/print pass.
- Client-only arrays in `localStorage`:
  - `deployops_step_palette`, default
    `["#2dd4bf","#f472b6","#fbbf24","#60a5fa","#a78bfa","#34d399","#fb923c","#22d3ee"]`
  - `deployops_bom_palette`, default
    `["#60a5fa","#34d399","#fbbf24","#f472b6","#a78bfa","#22d3ee","#fb923c","#f87171"]`
- `stepColor(n) = stepPalette[(n-1) % len]`, `bomColor(n) = bomPalette[(n-1) % len]`. Use these
  everywhere a step/BOM colour is computed (`colorFor`, marker render, legend swatches, the
  toolbar pill dots, steptable chips, PNG pass). Notes keep the fixed `NOTE_PALETTE`.
- UI: in the **Annotation layers** card, two swatch rows — "BOM colour sequence" and
  "Step colour sequence" — each a row of numbered colour swatches; clicking a swatch opens a
  native `<input type="color">` that rewrites that index (`setBomColor`/`setStepColor`) and
  re-renders live. Admin-only (`.sp-sw` carry `admin-only`).
- Changing a palette recolours existing markers immediately, since colour is derived from
  number at render time — only store an explicit per-marker `color` for notes/loctite overrides.
CSS refs: `.step-pal`, `.sp-lbl`, `.sp-swatches`, `.sp-sw`, `.sp-hint`.

---

## Constraints (from HANDOFF.md)
Single file, no build step. **Additive only.** Admin gating via `body.is-admin` + `.admin-only`.
RLS handles auth — no JS auth checks. Wrap Supabase calls in try/catch + `toast()` on error.
Mobile (iPad/phone) must work — Aniket uses this on the shop floor. Test on the existing
"Safety net" drawing before adding sample data.

## Suggested order
**6 → 7 → 8 → 9.** Section 6 (curved/multi-bend leaders) is shared plumbing 7 & 8 reuse, so
land and verify it first. Section 9 (editable palettes) is self-contained — do it last or
alongside 8 (the steps table consumes `stepColor`). Do one section at a time and show a working
demo before moving on.
