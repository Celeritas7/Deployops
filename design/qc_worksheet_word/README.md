# Patch: Add Word-Style as third worksheet style (default)

## What this does

Your app already supports two worksheet styles via a boolean `branded` flag:
- `branded: true`  → DeployOps-branded (logo, form ID, IBM Plex)
- `branded: false` → Plain (no brand, IBM Plex)

This patch adds a **third style** — `word` — which renders the same data but visually disguised as a hand-prepared Word document. Use it as the default; the others remain available.

## Why the Word style matters

The Plain and DeployOps versions are obviously app-generated when a manager looks at them — IBM Plex Mono, perfect alignment, designed legend cards. The Word version uses Calibri body, Times serif title, hand-look hatching for N/A cells, simple grid table, and pixel-jitter on checkboxes so it reads as something someone built in Word/Excel. Designed to pass the "did a system make this?" eye-test at ~85% confidence.

The included reference file `QC Worksheet - Word Style.html` is the visual source of truth — every measurement, color, and font choice here is lifted verbatim from it.

## Files in this patch

- `README.md` — this document (the prompt for Claude Code)
- `QC Worksheet - Word Style.html` — visual reference, pixel-perfect target
- `WS_CSS_WORD.css` — the CSS block to add to your existing app, namespaced so it doesn't collide
- `worksheet-word-snippets.js` — the JS template snippets that build Word-style HTML

## Integration tasks

### 1. Add `style` parameter (replace `branded` boolean)

Today your code passes `{ branded: true/false }` through. Replace this with a `style` string that takes `'word' | 'plain' | 'deployops'`. Default to `'word'`.

**Find:** every call site of `buildWorksheetDoc`, `renderWorksheetSheet`, `renderWorksheetCombined`, and the radio buttons in the print modal.

**Replace** the `branded` parameter with `style`. Keep a temporary compat shim:

```js
function normalizeStyle(opts) {
  if (typeof opts.style === 'string') return opts.style;
  if (opts.branded === true) return 'deployops';
  if (opts.branded === false) return 'plain';
  return 'word'; // new default
}
```

### 2. Add the Word-Style CSS

Append the contents of `WS_CSS_WORD.css` to your existing `WS_CSS` string (or to a new `WS_CSS_WORD` constant referenced when `style === 'word'`). All selectors in that file are scoped under `.ws-word`. Putting the wrapper class on the worksheet root activates Word styling.

In `buildWorksheetDoc`, wrap the body when style is word:

```js
function buildWorksheetDoc(sheetsHtml, opts = {}) {
  const style = normalizeStyle(opts);
  const forPdf = opts.forPdf || false;
  const title = style === 'deployops'
    ? 'QC Worksheet · DeployOps'
    : 'QC Worksheet';

  const wrapperOpen  = style === 'word' ? '<div class="ws-word">' : '';
  const wrapperClose = style === 'word' ? '</div>' : '';

  const fontLink = style === 'word'
    ? '' // Word style uses system Calibri / Times, no external font load
    : '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap">';

  const pdfOverride = forPdf
    ? '.sheet{margin:0;box-shadow:none;padding:0;width:auto;min-height:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${esc(title)}</title>
${fontLink}
<style>${WS_CSS}${WS_CSS_WORD}${pdfOverride}</style>
</head><body>
${wrapperOpen}${sheetsHtml}${wrapperClose}
</body></html>`;
}
```

### 3. Word-style markup tweaks

The Word style uses the **same HTML structure** as Plain/DeployOps with three small differences:

a. **Header**: Instead of the `.stamp` or `.brand-block` element on the left, use a left-aligned Times-Roman h1 only. The `.ws-word` CSS hides `.stamp` and `.brand-block` and re-styles the h1.

b. **Legend**: The 4-card legend with V/R/W badges is kept identically. The `.ws-word` CSS just restyles the cards (lighter borders, no IBM Plex). No markup change needed.

c. **Locked OP cell**: When the row is R/W, the OP cell content should be plain text `N/A` (not the hatched `<span class="lock">`). Update `renderWorksheetRow` so when `tier === 'review' || tier === 'witness'` AND style is word, the OP cell content is just `N/A`. The `.ws-word .c-locked` CSS removes the hatch and renders the cell as a plain gray block with italic N/A.

The simplest path: pass `style` into `renderWorksheetRow`, conditionally swap the locked OP cell template:

```js
function renderWorksheetRow(item, idx, lang, style) {
  // … existing logic …
  const lockedOp = style === 'word'
    ? '<div class="cell c-check c-locked">N/A</div>'
    : `<div class="cell c-check c-locked c-locked-${tier === 'witness' ? 'w' : 'r'}"><span class="lock">…</span></div>`;
  // …
}
```

d. **Form-id strip**: Only render when `style === 'deployops'`. Word and Plain skip it.

### 4. Print modal UI

Replace the binary "Branded / Plain" radio with three options. Default selection: `word`.

```html
<label class="radio-row">
  <input type="radio" name="wsStyle" value="word" checked>
  Word-style (recommended for shop floor — looks hand-made)
</label>
<label class="radio-row">
  <input type="radio" name="wsStyle" value="plain">
  Plain (clean app-look, no DeployOps brand)
</label>
<label class="radio-row">
  <input type="radio" name="wsStyle" value="deployops">
  DeployOps-branded (logo, form ID — for internal audit only)
</label>
```

In the print handler, read `document.querySelector('input[name="wsStyle"]:checked').value` and pass it as `style` to `buildWorksheetDoc`.

### 5. Persist the user's last choice

Save `style` to `localStorage.setItem('ws_style', style)` whenever a worksheet is printed. On modal open, pre-select the saved choice (falling back to `'word'`). Operators on a Japanese-manager floor will land on `word` once and never have to think about it again.

## Tier system

The tier field on `deployops_checklist_items` already exists (`plain | verify | review | witness`). No schema change needed.

## Constraints

- Single file `index.html` — no new files in your repo.
- No new dependencies. Word style uses system Calibri / Times, available everywhere.
- Both screen-print and html2pdf paths must work. The CSS in `WS_CSS_WORD.css` includes `@media print` overrides and `print-color-adjust: exact` so the row tints survive both paths.
- Don't break existing Plain / DeployOps callers. The `normalizeStyle` shim ensures they keep working.

## Test cases

After applying:
1. Open print modal → default radio is "Word-style".
2. Print a QC checklist → the printed PDF/page has Times serif title, Calibri body, no IBM Plex.
3. Switch to "DeployOps-branded" → output has the ◢ DeployOps mark and form-id strip.
4. Switch to "Plain" → no DeployOps mark, no form-id strip, but IBM Plex returns.
5. R/W rows: Word version has `N/A` text in OP column. Plain/DeployOps versions have the hatched lock cell.
6. Row tints (blue/amber/red) appear in all three styles when printed.

## Reference file usage

When recreating `WS_CSS_WORD.css` rules, **copy values verbatim** from `QC Worksheet - Word Style.html`. Do not approximate. Specifically the row-tint hex codes (`#eaf2ff`, `#fff2d0`, `#ffe0db`), the font-size on the Item label (11.5pt 600), the STOP-note size (8.5pt 700), and the checkbox jitter sizes (18 / 18.5 / 17.5 / 19 / 18pt across rows 1-5+) are tuned and should not drift.
