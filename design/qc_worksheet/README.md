# Handoff: QC Worksheet (Paper) — Pillar Disassembly

## Overview

A printed A4 quality-control worksheet for the **Pillar Disassembly** phase of robot assembly at Telexistence. Operators work from paper on the shop floor; supervisors enforce discipline by signing off at gate points. A digital app (DeployOps) exists in parallel for planning and audit — the paper worksheet is what operators physically use to do the work.

Two versions are included:

- **`QC Worksheet - Plain.html`** — neutral form. No app branding, no auto-generated form ID. Looks like a hand-prepared shop document. Use this when sharing with stakeholders who don't need to know the form is auto-generated.
- **`QC Worksheet - DeployOps.html`** — branded form. Includes DeployOps wordmark, a brand mark, pre-filled unit serial, and a bottom strip with the form ID, generation date, and revision. Use this as the default printed output from the app.

## About the Design Files

The two HTML files in this bundle are **design references** — prototypes showing the intended look and feel of the printed worksheet. They are static HTML/CSS pages that print correctly to A4 via the browser's print dialog (`@page` rules + `@media print` overrides).

The task for the developer is to **generate these worksheets dynamically** inside the existing DeployOps app (vanilla JS + Supabase, single-file `index.html`) so that pressing "Print" on a unit's checklist produces this layout, with the live unit data filled in. The HTML/CSS in these references can be lifted near-verbatim — the work is wiring the data substitution and integrating with the existing print-as-PDF path described in HANDOFF.md.

If the app uses a templating approach (string concatenation, etc.), translate the markup accordingly. The CSS is print-optimized and should be kept as-is.

## Fidelity

**High-fidelity.** Exact colors, typography, spacing, border weights, and signature line lengths are final. Recreate pixel-perfectly. The CSS values were tuned for A4 print at 100% scale — do not arbitrarily change pt/mm units.

---

## The Tier System (V / R / W)

Every checklist item carries one of four levels. **The tier letter, the row fill color, and the signature column structure are three independent visual signals that all reinforce the same gate.** Do not collapse them; the redundancy is intentional for shop-floor scannability and audit forgery resistance.

| Tier | Letter | Row fill | Emoji | Sub-action | Signature column | Stop work? |
|---|---|---|---|---|---|---|
| Plain | — (dashed outline box) | white | ✅ | — | empty | no |
| Verify | **V** (blue outline box) | `#e8f1ff` (light blue) | 🔍 | indented sub-checkbox with italic copy ("↳ Primer-mark applied" etc.) | empty | no — operator self-confirms with both ticks |
| Review | **R** (amber outline box) | `#fff4d6` (light amber) | ⚠ | — | **one** signature line: "Supervisor signature · date" | yes — supervisor must sign before proceeding |
| Witness | **W** (white-on-red filled box) | `#ffe1de` (light red) | ⛔ | — | **two** signature lines: "Operator signature" + "Witness signature · date" | yes — safety-critical; operator and witness both sign |

**W rows get an additional visual signal:** the top border becomes `1.75pt solid #c4302b` (red), bracketing the row. The selector `.row.w + .row { border-top: 1.75pt solid var(--w-bar); }` propagates the heavy border to the row below the W row, so a W row is always rule-bracketed top and bottom regardless of what tier follows it.

Each row also displays a "STOP" micro-label under the description for R and W tiers, generated via CSS `::before`:
- R: `⚠ STOP — supervisor review`
- W: `⛔ STOP — witness required · do not proceed alone`

---

## Layout (both versions)

A4 portrait, 10mm page margins on all sides except 8mm bottom.

### Page structure (top to bottom)

1. **Header strip** — page-width row with optional brand block (DeployOps version only), title, and three input fields (Unit / Operator / Date). Bottom border is a 2.5pt solid rule in `#18222e`.
2. **Tier legend** — 4-column grid (one column per tier: Plain, Verify, Review, Witness) explaining what each color/letter means. Border: 0.75pt solid `#18222e`.
3. **Checklist table** — column headers strip in `#f0f2f5` background, then one row per checklist item. Border: 0.75pt solid `#18222e` around the whole table.
4. **Footer** — three signature blocks: Operator / Supervisor / Date completed. Separated from the table above by a 2.5pt solid top border.
5. **Form-ID strip (DeployOps version only)** — dashed top border, a black "DeployOps" chip with amber text, the form ID and metadata in mono, and a "Return signed copy to QC bin" note on the right.

### Checklist row grid

Each row is a 6-column CSS grid:

```css
grid-template-columns: 28pt 28pt 1fr 36pt 36pt 170pt;
/*                    [#]  [tier] [item desc] [OP] [QC] [signatures] */
```

| Column | Width | Content |
|---|---|---|
| # | 28pt | Item number, mono, 11pt, 700 weight, e.g. `01`, `02`, …`08` |
| Tier | 28pt | 18×18pt outlined letter box (V/R/W) or dashed empty box for plain |
| Item | flex | Emoji + label (11pt 500 weight; 700 for W). V rows include an indented sub-row with a 12×12pt checkbox and italic sub-action text. R/W rows include the STOP micro-label. |
| OP | 36pt | 20×20pt empty checkbox, 1.25pt border. On W rows: 1.5pt red border. |
| QC | 36pt | Same as OP. |
| Signatures | 170pt | Plain/V rows: empty. R rows: one 18pt-tall signature line with "Supervisor signature · date" label. W rows: two signature lines stacked, "Operator signature" + "Witness signature · date". Line colors match the tier (red for W, amber for R). |

The column header strip uses the same grid template with labels `# | Tier | Item | OP | QC | Signatures` in 7.5pt mono, uppercase, tracked 0.16em.

---

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--rule` | `#18222e` | Primary ink: 2.5pt page rules, type, signature lines, checkbox borders |
| `--ink-2` | `#4a5562` | Secondary text: field labels, mono captions |
| `--hair` | `#b8c0cb` | Hairline rules between cells |
| `--hair-2` | `#d9dde3` | (reserved) |
| `--v-fill` | `#e8f1ff` | Verify row background |
| `--v-bar` | `#1d6ad6` | Verify accents: tier letter, sub-checkbox border, sub-action `↳` arrow |
| `--r-fill` | `#fff4d6` | Review row background |
| `--r-bar` | `#c97a00` | Review accents: tier letter, signature line, STOP label |
| `--w-fill` | `#ffe1de` | Witness row background |
| `--w-bar` | `#c4302b` | Witness accents: tier letter fill, row top/bottom rules (1.75pt), signature lines, STOP label, OP/QC checkbox borders |

All tier fills are light enough to print legibly on B&W printers. The structural cues (letter, signature count, row rule weight) carry the meaning if color is absent.

The DeployOps brand mark uses `color: #ffb020` (amber) on a `#18222e` (rule color) background.

## Typography

Two families, both loaded from Google Fonts:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap">
```

- **IBM Plex Sans** — title (22pt 700, `letter-spacing: -0.01em`), item labels (11pt 500, 700 on W), legend body (9pt), DeployOps wordmark (11pt 700)
- **IBM Plex Mono** — all UI labels and metadata. Tabular figures via `font-feature-settings: 'tnum' 1`:
  - Section column headers: 7.5pt 700, uppercase, tracked 0.16em
  - Field labels (Unit / Operator / Date): 7.5pt, uppercase, tracked 0.18em
  - Tier letters in the boxes: 11pt 700
  - Item numbers: 11pt 700
  - STOP micro-labels: 7.5pt 700, tracked 0.14em
  - Form-ID strip (DeployOps version): 7.5pt, uppercase, tracked 0.14em

## Spacing & geometry

- Page margin: `12mm 12mm 10mm 12mm` (top right bottom left) via `@page`. Sheet padding inside the on-screen frame: `10mm`.
- Sheet width on screen: `210mm` exactly (A4 width).
- Row min-height: 36pt. Real height grows with sub-actions and stop labels (V rows ≈ 50pt, R rows ≈ 55pt, W rows ≈ 70pt to accommodate two signature lines).
- Checkbox sizes: primary 20×20pt, sub-action 12×12pt, tier-letter box 18×18pt.
- Signature line: 18pt tall, 0.75pt bottom border.

## Branded version — additional elements

The `QC Worksheet - DeployOps.html` file adds two pieces beyond the Plain version:

### 1. Brand block (top-left of header)

```html
<div class="brand-block">
  <div class="brand-mark">◢</div>
  <div class="brand-text">
    <div class="brand-name">DeployOps</div>
    <div class="brand-sub">QC Worksheet</div>
  </div>
</div>
```

- `brand-mark`: 26×26pt square, `#18222e` background, `#ffb020` ◢ glyph at 18pt 700
- `brand-name`: 11pt 700 IBM Plex Sans, `#18222e`
- `brand-sub`: 7pt 600 IBM Plex Mono, uppercase, tracked 0.18em, `#4a5562`
- Separated from the title by a right border: `0.75pt solid var(--hair)` with `12pt` right padding

### 2. Form-ID strip (bottom of sheet)

```html
<div class="form-id">
  <span class="chip">DeployOps</span>
  <span>WS-LOGI-PILLAR-DISASSEMBLY · rev A · generated 2026-05-17 · sheet 1 / 1</span>
  <span class="note">Return signed copy to QC bin</span>
</div>
```

- Dashed top border: `0.5pt dashed var(--hair)`, `4pt` vertical padding, `10pt` horizontal gap between items
- `chip`: black background, amber text (`#ffb020`), 2pt × 6pt padding, 700 weight, tracked 0.18em
- Center text and "Return signed copy to QC bin" note are 7.5pt mono uppercase tracked 0.14em
- The note is right-aligned via `margin-left: auto`

### Field pre-fill

In the DeployOps version, the **Unit** field is pre-filled with the unit serial (e.g. `LOGI-002`) via the `.v.filled` class. The Plain version leaves all three fields blank for handwriting.

When generating from app data, populate any combination of Unit / Operator / Date that's already known. Empty fields render as a labeled underline ready for handwriting.

---

## Print behavior

Both versions include print-optimized CSS:

```css
@media print {
  html, body { background: #fff; }
  .sheet { margin: 0; box-shadow: none; padding: 0; width: auto; min-height: 0; }
  .sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

The `print-color-adjust: exact` declaration is critical — without it, browsers strip the tonal row fills when printing, which destroys the color-code meaning. Keep it.

Section rows use `break-inside: avoid` so a W row never splits across pages — the supervisor's two signature lines must always be on the same page as the W instruction they certify.

---

## Sample content (Pillar Disassembly)

The 8 items rendered in the references are the source-of-truth example for this phase. Item numbering is 01–08, zero-padded.

| # | Tier | Label | Sub-action / signature note |
|---|---|---|---|
| 01 | Plain | ✅ Visual inspection of pillar | — |
| 02 | V | 🔍 Apply primer to base plate | ↳ Primer-mark applied |
| 03 | V | 🔧 Tighten 16 base bolts to 80 Nm | ↳ Torque-mark applied to each bolt head |
| 04 | R | ⚠ Verify GraboC coupling orientation | Supervisor signature · date |
| 05 | W | ⛔ Secure pillar in forklift cradle | Operator + Witness signatures |
| 06 | W | ⛔ Forklift operator at position | Operator + Witness signatures |
| 07 | W | ⛔ Remove 16 pillar mounting bolts | Operator + Witness signatures |
| 08 | W | ⛔ Lower pillar into transit cradle | Operator + Witness signatures |

Item-emoji mapping note: the leading emoji on item 03 is 🔧 (wrench), not 🔍, even though the tier is V — the emoji is chosen to communicate the *action* (tighten with a tool), not to repeat the tier letter. Carry this principle when generating dynamically: pick an emoji that hints at what to do, falling back to the tier emoji (🔍 / ⚠ / ⛔) if no action-specific emoji applies.

---

## Files

- `QC Worksheet - Plain.html` — non-branded reference, manager-safe
- `QC Worksheet - DeployOps.html` — branded reference, default app output
- `README.md` — this document

## Integration notes for DeployOps

The existing app (`index.html` in the Deployops repo) already has a `printUnit()` function described as a Phase 4 task in `HANDOFF.md`. The print path should:

1. Build the worksheet markup from these references, substituting `{{unit_serial}}`, `{{operator_name}}` (if known), `{{date}}` (today's date), and the rendered checklist items.
2. Iterate the unit's items, mapping each to its tier (`plain | v | r | w`), label, optional sub-action, and any pre-existing check/signature state.
3. Open the worksheet in a new window or hidden iframe and call `window.print()`, so the browser's "Save as PDF" path works (per the bug noted in HANDOFF.md — current code forces a printer; the new path should let the browser pick its destination).
4. Honor the existing per-phase / both-phases print option from HANDOFF.md by rendering one section per phase.

Tier metadata (V / R / W) is not yet in the schema — `deployops_checklist_items` will need a `tier text` column with a CHECK constraint over `{'plain','verify','review','witness'}`. Add it as an additive migration (the HANDOFF.md rule: additive changes only, don't drop columns).
