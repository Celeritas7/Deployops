# CC Prompt — Grouping shapes ("install as a package")

Implement the approved grouping-shape tool in `index.html`. The approved design prototype is
`design/shape-tool-prototype.html` in this repo (self-contained; open it in a browser to try the
interaction) — lift its toolbar markup, shape SVG, chip/handle rendering, and interaction patterns.
Design is final; do not restyle.

## 1. Storage — no schema change

One `deployops_balloons` row per shape, following the `loctorque`/`steptable` pattern
(structured JSON in `label`, `number:0`, `arrow_style:'none'`):

```js
{
  drawing_id, page,
  number: 0,
  x_pct, y_pct,              // shape's TOP-LEFT corner, % of sheet (existing columns)
  color: '#a78bfa',          // outline color (existing column)
  mode: 'shape',
  arrow_style: 'none',
  label: JSON.stringify({    // shape payload
    type: 'ellipse',         // 'ellipse' | 'rect'
    w_pct: 27.7,             // width  as % of sheet width
    h_pct: 31.6,             // height as % of sheet height
    text: 'Kit A'            // label chip; '' = no chip
  })
}
```

Parse with a `shParse(b)` / `shSerialize(m)` pair like `ltSerialize`/`stSerialize`.
Colors are the existing leader palette: `#a78bfa`, `#fbbf24`, `#22d3ee`, `#f87171`.

## 2. Render — branch in `renderBalloonsSVG()`

Add a `mode:'shape'` branch. Per shape (see prototype's `renderShapes()`):

- Outline only: `fill:none`, `stroke-width:3` (3.5 when selected), rect gets `rx:12`.
  Convert pct → the SVG viewBox units the function already uses.
- Invisible hit outline on top: same geometry, `stroke:rgba(0,0,0,0)`, `stroke-width:16`,
  `pointer-events:stroke`, `cursor:move`. Fill must stay non-interactive so balloons inside
  remain clickable.
- Label chip (if `text`): pill centered on the TOP edge — `rx` = half height (24 tall),
  fill = shape color, `1.4px` `#0b0e16` ring (2.2 when selected), JetBrains Mono 700 dark text.
  Chip is also a move handle.
- Render shapes BEFORE balloons in the output string so balloons stay on top.

## 3. Selected state (admin only)

Reuse the prototype exactly:

- 8 handles on the bounding box (corners + edge midpoints): 10×10 white squares,
  `#0b0e16` 1.6px stroke, per-handle resize cursors.
- Delete button: ✕ in an 11r circle at top-right corner offset (+16,−16),
  `#0f1219` fill / `#f87171` ring.
- Follow the app's existing drag pattern: mutate + `renderBalloonsSVG()` live on pointermove,
  single `update({ x_pct, y_pct, label })` on pointerup (`isDragging` guard).
- Min size ≈ 3% of sheet. Esc deselects; Delete key removes (guard against typing in inputs).

## 4. Toolbar + sidebar entry (admin only)

- Toolbar: the prototype's `.shape-tools` group ("GROUP · ⬭ Ellipse · ▭ Rect") next to the mode
  pills, plus the pulsing `DRAG TO DRAW ⬭/▭` mode-indicator while armed. Arming is exclusive
  with balloon add-mode — cancel one when the other starts.
- Draw: pointerdown-drag on the sheet → dashed rubber-band (`stroke-dasharray:7 5`) in the
  current color → on release insert the row, select it, disarm (single-shot).
- Sidebar: add a "Grouping shape" card to `renderDrawingSidebar()` (and its quick-jump tab):
  ellipse/rect seg, 4 color swatches (recolors selection too), label input
  (live-edits selected shape's `text`, else seeds the next draw).
- Add `shape` to the layers card / `VISIBLE_LAYERS` so shapes get an eye toggle and count.

## 5. Out of scope

Semantic kits (boundary computed from member balloon IDs), multi-select, rotation.

## Acceptance

1. Draw ellipse + rect around balloon clusters; both persist across reload and page nav.
2. Parts under the shape stay visible and clickable; shape is only grabbable by its outline/chip.
3. Move, resize (8 handles), recolor, relabel, delete — each syncs one row update.
4. Non-admin viewers see shapes + chips but no handles/toolbar entry.
5. Export PNG / print includes shapes.
