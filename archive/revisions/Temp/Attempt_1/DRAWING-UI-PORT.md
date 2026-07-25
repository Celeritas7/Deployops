# Drawing Annotation UI — port spec for `index.html`

Goal: bring the production drawing editor in `index.html` (vanilla JS + Supabase) to
parity with the React prototype `deployops/DeployOps - Reorganized.html`
(component source: `deployops/drawings.jsx`). Use the prototype as the **behaviour + visual
reference**; reimplement in the app's own vanilla style. Additive only — no breaking changes.

## Schema (already in place)
`deployops_balloons` columns used: `id, drawing_id, page, number, x_pct, y_pct,
tip_x_pct, tip_y_pct, label, color, mode, arrow_style`.
The `mode` column is free text → new annotation types need **no migration**.

## Already done (verify, don't redo)
- `MODES` has BOM(=`dismantling`), Step, Ref, Note (+ hidden cable/balloon).
- `markerColor(mode,num)` colour-by-number for BOM + Step.
- `renderBalloonsSVG()` draws shape per `MODES[mode].shape` (circle/square/triangle/note).
- Leader line + `ARROW_STYLES` (solid/dashed/thick/dot/none) — this already covers the
  prototype's "arrow / line / none" leader toggle; keep the richer app version.
- Drag balloon body + drag leader tip already work.

## To add (remaining parity)

### 1. Two new annotation types
Add to `MODES`:
- `x` → label "No-install", shape `'x'`, color `#f87171`, kind `'balloon'`.
  Render: filled red circle, white ✕, no number. Means "DO NOT INSTALL this part."
- `caution` → label "Caution", shape `'caution'`, color `#fb923c`, kind `'tag'`.
  Render: note-style callout box but amber border + a ⚠️ glyph before the text;
  editable `label` holds the precaution text. Reuse the existing note/tag callout path.
Update `markerColor` so `x`→`#f87171`, `caution`→`#fb923c` (fixed, not by number).
Add both to the toolbar pills and to `renderBalloonsSVG()` + the PNG/print renderer
(`exportAnnotatedPNG` / canvas pass) so they export too.

### 2. Multi-layer visibility (the key change)
Today the canvas shows only `currentMode`'s layer. Replace that filter with an
independent **visible-set**:
- Client-only state `layerVis = {dismantling,step,ref,note,x,caution: bool}` (default all true).
  Persist per drawing in `localStorage` (`deployops_layervis_<drawingId>`), not the DB.
- `renderBalloonsSVG()` filters balloons by `layerVis[b.mode] !== false` (tables always show).
- In the layers panel, give every layer row an **eye toggle (👁/🚫)** that flips
  `layerVis[mode]` and re-renders. Several can be on at once → they show & **print together**
  (e.g. Steps + Notes). A "Show all layers" action sets all true.
- Keep the quick "focus" behaviour: clicking a layer **name** (or its toolbar pill)
  isolates to that layer (sets visible-set to just it) for clean placing.
- **Companion rule:** focusing Step also shows `x`, and focusing `x` also shows Step
  (Do-not-install travels with Steps). `COMPANION = { step:['x'], x:['step'] }`.

### 3. Note templates (reusable torque specs / callouts)
- Client-only list in `localStorage` (`deployops_note_templates`), seeded with:
  `M5 × 40 · 6 N·m`, `M6 × 20 · 10 N·m`, `Torque to spec`, `Apply threadlocker`,
  `Do not over-torque`, `⚠ Stressed joint`.
- Sidebar card: list as chips; click a chip → arm it, next drawing click drops a `note`
  with that text prefilled. Add input + Save; delete chip; "save selected note as template".

### 4. Torque reference table
- A ready-made reference table (data below). Render it as a sidebar card styled like the
  reference image (two-level header: Hex bit | CBE (1.8 T) → Screw | Torque N·m).
- Tap a row → arm a note template `"<screw> · <torque> N·m"`.
- "Place whole table on drawing": store as one balloon row with `mode:'table'`,
  `label = JSON.stringify({title, rows, scale})`, `x_pct/y_pct` = top-left.
  `renderBalloonsSVG()` special-cases `mode:'table'` → draws a light table card (header
  bar with drag + scale ± + delete). Always visible regardless of layer filter.
  Data: `[["2 mm","M2.5","0.65"],["2.5 mm","M3","1.14"],["3 mm","M4","2.7"],
  ["4 mm","M5","5.4"],["5 mm","M6","9.2"],["6 mm","M8","22"],["8 mm","M10","44"]]`, title `CBE (1.8 T)`.

### 5. Marker size slider
- Client-only `markerSize` (px), persist in `localStorage` (`deployops_balloon_size`).
- Multiply balloon radius / shape size by it in `renderBalloonsSVG()` and the PNG pass.

## Constraints (from HANDOFF.md)
Single file, no build step. Additive only. Admin gating via `body.is-admin` + `.admin-only`.
RLS handles auth — no JS auth checks. Wrap Supabase calls in try/catch + `toast()` on error.
Mobile (iPad/phone) must work. Test on the existing "Safety net" drawing.

## Reference files (in this project, for exact look/behaviour + CSS)
- `deployops/drawings.jsx` — logic for all of the above.
- `deployops/DeployOps - Reorganized.html` — the matching CSS (search: `.mark-x`,
  `.note-callout.caution`, `.dwg-table`, `.layer-row`, `.eye`, `.torque-tbl`, `.tpl-chip`).
