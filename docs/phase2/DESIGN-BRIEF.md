# DeployOps — Phase 2 design brief (core screens)

**For:** Claude Design · **From:** Claude Code · **Owner / final approver:** Aniket
**Status:** ready for design · **Roadmap:** `docs/ROADMAP.md` (Phase 2)

## 1. What we need from you

Mockups and a short critique for five screens, phone first, that Claude Code can
build in plain HTML/CSS inside the existing single-file app. The loop is:

1. You review this brief and the screenshots in `docs/phase2/screens/`.
2. You return a critique (what to keep, what to change) and mockups.
3. Claude Code builds them, re-screenshots at the same sizes, and sends them back.
4. You compare the build with your mockups; we iterate until you accept.

**Deliverables**

| # | Deliverable | Format |
|---|---|---|
| D1 | Critique of the current screens (top problems, ranked) | Markdown or annotated images |
| D2 | Mockups for screens A–E below at **390 px (phone)** and **820 px (iPad portrait)**; desktop optional | Static HTML (preferred, like `design/qc_worksheet/`) or images, saved under `design/phase2/` |
| D3 | All states listed for each screen (empty, loading, error, read-only, etc.) | Inside the mockups |
| D4 | Any new or changed tokens/components, with values | A short list we can paste into CSS |
| D5 | Copy for new labels, buttons and empty states (English; Japanese if you can) | List |

## 2. Product in one paragraph

DeployOps is the QC app for building and shipping Telexistence robots. An admin
defines a **model** (e.g. "CE DVT2") with a checklist split into three
**phases**: After-Installation QC (was it assembled correctly?), Pre-Test QC
(ready for power-on?) and Pre-Deploy (are all parts in the box?). Each physical
robot is a **unit** (serial "SN-0041") of a model; operators tick every item of
every phase for that unit, and the app records who ticked it and when. It also
prints paper QC worksheets and stores annotated engineering drawings.

## 3. Users and conditions

| Role | Who | Where / how | Can do |
|---|---|---|---|
| **Admin** | Aniket (owner), 1–2 people | Desk and iPad | Everything: models, checklists, units, drawings, prints |
| **Operator** | Assembly / QC technicians | **Shop floor, iPad or phone, often gloved, standing, interrupted** | Tick unit checklists, print |
| **Viewer** | Managers, reviewers | Desk | Read-only, print |

Design implications: big touch targets (≥ 44 px), glanceable progress, no
precision gestures for core tasks, works one-handed on a phone, survives
interruptions (it must be obvious where you left off). Lighting on a shop floor
varies, so contrast matters.

## 4. Data you can design with

- **Model**: name, ref (part #), revision, icon (emoji), description, EN + JA name.
- **Section** (per model): name (EN/JA), icon, order. Items are grouped by section.
- **Checklist item**: label (EN/JA), description, part number, qty, tool,
  **phases** (one or more of the three), **tier**: `plain` / `verify` /
  `review` / `witness`, order.
  - Verify = tick + a small confirmation. Review = supervisor must tick.
    Witness = safety-critical, a witness must watch and tick; operator must not
    proceed alone. (Phase 3 will enforce Review/Witness with a second
    signature; please design the visual states now so that slots in.)
- **Unit**: serial/name, notes (free text), model, created date.
  **New in Phase 2:** `status` (proposed values: building, testing, ready,
  shipped, deployed; confirm or change them).
- **Tick**: per unit × item × phase: checked, checked_by (email), checked_at.
- Real volume today: 5 models, ~317 items in the main model, 23 sections.
  Units will grow to dozens per model.

## 5. Constraints (please respect these)

- **Tech**: one `index.html`, vanilla JS, hand-written CSS. No framework, no
  build step, no new icon font. Anything in your mockups must be doable with
  CSS + inline SVG.
- **Theme**: dark UI. Keep the existing tokens unless you have a reason to
  change them (list changes in D4):

  | Token | Value | Token | Value |
  |---|---|---|---|
  | `--bg` | #07090f | `--text` | #e2e8f0 |
  | `--surface` | #0f1219 | `--text2` | #94a3b8 |
  | `--surface2` | #161c28 | `--accent` | #60a5fa |
  | `--surface3` | #1e2538 | `--accent2` | #818cf8 |
  | `--border` | #2a3350 | `--green` | #34d399 |
  | `--red` | #f87171 | `--orange` | #fbbf24 |
  | `--pink` | #f472b6 | `--cyan` | #22d3ee |

  Type: **DM Sans** (UI, 400–700), **JetBrains Mono** (counts, refs, timestamps).
  Radius 6–12 px. Icons are emoji today; fine to propose simple inline SVGs instead.
- **Bilingual**: every label has a Japanese version; JA strings are often
  shorter in characters but taller; allow wrapping without breaking layout.
- **Roles**: admin-only controls are hidden for other roles; viewers see
  disabled checkboxes. Show what each role sees.
- **Print output** (the paper worksheets) is a separate, light design and is
  **out of scope**; only the print *dialog* is in scope.

## 6. Screens in scope

Screenshot names refer to `docs/phase2/screens/{phone|ipad}-NN-*.png`.

### A. Deploy dashboard — units of a model (`05-deploy-units`)
**Today:** a native model dropdown, then one card per unit with three progress
bars (one per phase) and a delete button.
**Problems:** no status, no search/sort/filter; you can't tell at a glance which
units need attention; cards are tall (3 per phone screen); the model dropdown is
the main navigation but looks like a form field.
**Goals:** a dashboard an operator opens and immediately sees "what's next":
- Unit status (new field) with clear colour/shape coding, and who can change it.
- Search by serial, filter by status, sort (recent / least complete / name).
- Compact row option for 50+ units; progress per phase still visible.
- Switching model should feel like navigation (segmented control, sheet, or header picker).
- Admin "Add unit" and delete stay available but out of the thumb path.
**States:** no models, no units, loading, filter with no results, viewer.

### B. Unit checklist — the most-used screen (`06`, `07-unit-checklist*`)
**Today (after the first fixes):** header (back, serial, hide-done, print),
then each phase as a heading + progress bar + collapsible section cards; rows
are full-width tap targets with tier badges and a coloured edge for
Review/Witness.
**Problems:** three long phases stacked on one scroll; no "where was I" /
next-unchecked; phase headers scroll away; hold points are only a small badge;
no sign-off concept; tick save/fail state is just a toast.
**Goals:**
- Navigation between phases on a phone (tabs, sticky header, or jump list).
- A "next unchecked" action and a sense of position in a 300-item list.
- Strong, distinct treatment for **Verify / Review / Witness**, including a
  future "waiting for witness" state (Phase 3) and "signed by X" state.
- **Phase sign-off** state: a completed phase can be signed off and then
  looks locked (Phase 3 builds the logic; design the look now).
- Row states: unticked, ticked (who · when), saving, failed (retry),
  read-only (viewer), locked (signed off).
- Keep: whole-row tap, who/when on ticked rows, hide-done toggle.
**States:** empty model, all done, offline (Phase 3), viewer.

### C. Model editor (`01-models`, `02-model-sections`, `03-model-items`, `04-edit-item`)
**Today:** model cards → inside a model, phase tabs → a grid of section
*tiles* (icon + count) → tap one to see its items. Item rows have up/down,
edit, delete buttons; on a phone these wrap to their own line, doubling the
list length. A "brush" mode paints phase membership onto items by tapping;
there's inline add and a bulk-add dialog.
**Problems:** items hidden one level deep behind tiles; hard to scan or compare
sections; phone rows are bulky; reordering by ▲/▼ is slow; brush mode is not
discoverable.
**Goals:**
- A flat, scannable list: sections as collapsible groups showing their items.
- Compact item row on phone with actions in an overflow menu or swipe.
- Faster reorder (drag handle) with an accessible fallback.
- Clear display of an item's tier and *other* phases it belongs to.
- Make multi-phase assignment (brush mode) understandable.
- Models list cards: shorter; show what matters (items, units, revision).
**States:** model with no sections, empty section, read-only (operator/viewer).

### D. Print / export dialog (`08-print-dialog`)
**Today:** one long modal with 11 option groups (destination, output, content,
phases, style, row spacing, language); ~3 screens tall on a phone.
**Goals:** a short default path (what + where → Print) with style, spacing and
language under "Advanced"; remember last choices; show what will be produced
(e.g. "1 PDF, 3 phases, 23 sections"). Code will add a single combined PDF
option, so design for that rather than one file per section.

### E. Top bar and navigation on phone (all screenshots, top)
**Today:** brand + subtitle, language toggle, user badge with sign-out, then
tabs (Models / Deploy / Drawings). On Drawings a full-width drawing dropdown
and upload button are added, pushing tabs down. On a phone the bar takes
~120 px before any content.
**Goals:** reclaim vertical space on phone; one place for user, language and
sign-out; decide whether tabs should be a bottom bar on phone for one-handed use;
keep role visible.

## 7. Out of scope for Phase 2
Drawing editor and toolbar (Phase 5), paper worksheet layouts, login screen
(already fixed), second-signature and sign-off *logic* (Phase 3; design the
looks only), Japanese copy completeness (Phase 4).

## 8. Acceptance criteria for the mockups
- Phone 390 px and iPad 820 px for every screen; nothing scrolls horizontally.
- Touch targets ≥ 44 × 44 px on phone/iPad.
- Text contrast WCAG AA on the dark theme (4.5:1 body, 3:1 large/UI).
- Every state listed under each screen is shown.
- Uses existing tokens or lists new ones (D4); no framework-only components.
- Admin vs operator vs viewer differences are shown or annotated.

## 9. Open questions (answer or flag for Aniket)
1. Unit status values and who may change them (operator, admin, or automatic
   from progress)?
2. Phone navigation: keep top tabs or move to a bottom tab bar?
3. Should the unit checklist show one phase at a time (tabs) or all phases with
   a sticky jump bar?
4. Replace emoji icons with an SVG set now, or keep emoji for Phase 2?
5. Does the Deploy tab need a cross-model view ("all units in testing")?

## 10. Files
- Screenshots (current build, sample data, after Phase 0/1 fixes):
  `docs/phase2/screens/` — phone and iPad, admin and operator.
- Existing design references: `design/qc_worksheet/`, `design/qc_worksheet_word/`,
  `design/login-gate.html`, `design/Prototypes/`.
- App source: `index.html` (CSS at the top, tokens on `:root`).
