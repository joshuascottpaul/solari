# Phase 19: Editorial Face

| Field    | Value                              |
|----------|------------------------------------|
| Phase    | 19 of 20 (V1, fourth face)         |
| Status   | Partial -- code shipped; webfont and picker preview deferred to V2 |
| Shipped  | 2026-05-12                         |
| Date     | 2026-05-12                         |
| Author   | ariadne                            |
| Impl     | misaka                             |
| Depends  | Phase 16 (shipped 2026-05-07), Phase 17 (shipped 2026-05-11), Phase 18 (shipped 2026-05-12) |
| Unblocks | Phase 20 (Horizon)                 |

> **V1 rollback note (2026-05-12).** After Phase 19 merged, the user directed a deliberate rollback of two user-facing surfaces: the Cormorant Garamond 300 italic `<link>` tags were removed from `index.html` and `clockface.html`, and the Editorial picker card was left as a "COMING SOON" placeholder (`real: false` in `clockface.js`). The face object (`EditorialFace`) remains fully implemented and loads at runtime; it falls back to Georgia on both the main display and the picker preview. These two items are deferred to V2. User-facing surfaces describe Editorial as "coming soon"; internal docs describe it as "deferred to V2".

## 1. Goal

Phase 19 introduces the Editorial face, a magazine-cover composition built on the Phase 16 stage foundation. Display type is Cormorant Garamond 300 italic, paired with Manrope 200 for system chrome (kickers, labels, AM/PM). The face presents a 360 px italic time, a paired right-column block (kicker + weekday + month-day), a rotating literary almanac paragraph driven by an 8-template table, and a 4-column footer of facts. Light observances render a one-line italic dropline above the time numerals. The paragraph cross-fades to its next template every 32 s. The face is the first to introduce a per-face drift amplitude override and a per-face macro shift interval (6 h vs. the global 3 h).

## 2. Scope and Non-Scope

### In scope

- New `EditorialFace` object in `app.js`, implementing `init(stage) / render(state, tweaks) / teardown()` against the Phase 16 contract (mirrors `MechanicalFace` at `app.js:2149`).
- `EditorialFace` registration in `ClockfaceRegistry.faces`.
- DOM subtree built inside `#stage` by `EditorialFace.init()`: optional observance dropline, italic time numerals, right-column block, paragraph, footer strip.
- Cormorant Garamond 300 italic webfont link added to `index.html` and `clockface.html`. Manrope 200 (already loaded) covers all non-display type.
- Per-face tweak schema entry `tweaks.byFace.editorial.timeFormat` (`'24h'` default, `'12h'` optional) and `previewMode` (picker-only).
- 8 paragraph templates, selected by `(period, weather-state, moon-phase)` tuple hash, cross-fading every 32 s with 1200 ms cross-fade duration.
- `name_long` field on `ObservanceModule._builtIn` entries and `CONFIG.observances.customObservances`. Light observances render the dropline; major observances trigger the standard `--type-primary` / `--type-accent` repaint.
- Per-face macro shift composition: time and right-column block swap as a paired composition every 6 h. Paragraph and footer stay anchored.
- `CONFIG.macroShift.timeIntervalHoursByFace` per-face interval override (Editorial = 6 h, Horizon = 6 h; Calm and Mechanical retain global 3 h).
- `CONFIG.driftClasses.timeByFace` per-face drift amplitude override (Editorial: ampX 30 / ampY 22; period 117 s unchanged).
- Picker live-preview wiring: `EditorialFace.init(card)` + `render(PREVIEW_STATE, tweaks)` on 1 Hz interval via the existing `SOLARI_PICKER` boot guard (Phase 17 pattern). `previewMode` accelerates the 6 h macro shift to a 6 s cycle in the picker only.
- Burn-in audit per layer with specific attention to the 360 px italic numerals (the largest static type the project has shipped).

### Non-scope

- Horizon face implementation. Deferred to Phase 20.
- Editorial-specific accent variations. Editorial uses the global accent (`gold` / `sky` / `sage` / `paper`) at the colon glyph only; no Editorial-specific palette entries.
- Per-face observance opt-out. Editorial participates fully in observance repaints; the italic dropline is the per-face *addition*, not an override of the global repaint.
- Editorial-specific `accentSkyTrack` opt-out. Editorial participates fully in sky color modulation.
- Paragraph copy in production form. Phase 19 ships starter copy for 8 templates; chihiro and the user refine the prose post-merge without a schema change.
- Live data-driven paragraph rewrites within a single 32 s slot. The paragraph is bound to template + state at the start of each 32 s window; mid-window state changes (e.g. tide turn) are picked up at the next swap.
- Self-hosting the Cormorant Garamond WOFF2. Google Fonts CDN with `display=swap` is the Phase 19 default; self-hosting can be revisited later if bundle headroom tightens.
- Migrating Calm or Mechanical to live picker previews where they currently hold. Phase 17's pattern is the model; Editorial follows it directly without disturbing prior faces.

## 3. Inherits from Phase 16 / 17 / 18

The following primitives are reused without modification:

| Primitive | Source | What Phase 19 uses |
|---|---|---|
| Stage primitive | `app.js` Phase 16 / `style.css` Phase 16 | All Editorial DOM is built inside `#stage`, positioned in 1180x820 pixel coordinates. |
| Face rendering interface | Phase 16 Section 6 | `EditorialFace.init/render/teardown` mirrors `MechanicalFace`. |
| `ClockfaceRegistry.resolve(faceId)` | Phase 16 Section 6 | Editorial registers as `'editorial'`; resolve falls back to Calm on any unknown id. |
| `ClockfaceRegistry.normalizeTweaks(raw)` | Phase 16/17 | Extended in Phase 19 to validate `byFace.editorial.timeFormat` and `previewMode` (Section 15). |
| Storage contract | `solari.clockface`, `solari.clockface.tweaks`, `solari.clockface.applied_at` | Same three keys; Editorial only adds a nested entry under `tweaks.byFace.editorial`. |
| `storage` event reload | Phase 16 boot IIFE | Unchanged. Switching to or from Editorial triggers a full reload. |
| Drift class table | `CONFIG.driftClasses` | Reads `time`, `date`, `slot`, `tickRail`. Phase 19 introduces `timeByFace` overlay (Section 7). No new drift channel keys. |
| Drift intensity multipliers | `DRIFT_INTENSITY_MULT` | Applies to all Editorial channels including the per-face `time` override. |
| Accent palette | `ACCENT_PALETTE` | `--type-accent` writes pick up here; no Editorial-specific accent. |
| `MacroShifter` engine | Phase 17 extended `timeHomesByFace` | Phase 19 extends further with `timeIntervalHoursByFace` and adds a paired-block hook so the right-column block macro-shifts with the time numerals. |
| `DriftEngine` | Phase 17 added `tickRail` channel | Phase 19 reads `CONFIG.driftClasses.timeByFace[faceId]` to override the `time` channel amplitude for Editorial; periods and other channels unchanged. |
| `SkyColorModule` | Phase 6 / Phase 17 | Editorial inherits all four token values without override. |
| `ObservanceModule` | Phase 15 / Phase 17 | Phase 19 adds the `name_long` field; existing major/light treatment logic is preserved. |
| `LuminanceBreath` | Phase 14 | Editorial applies `filter: brightness(var(--lum-mod))` on time, right-column block, paragraph, and footer values. |
| `RefresherCycle` | Phase 13 | Overlay sits outside `#stage` and covers Editorial identically to Calm / Mechanical. |
| `RotatorModule` | Phase 9 | Editorial does not surface the rotator slot. The rotator continues to run; its output is not read. Paragraph rotation is internal to `EditorialFace`. |
| `DisplayModule.render()` | Phase 16 | The trailing `ACTIVE_FACE.render(AppState, TWEAKS)` call becomes Editorial's per-tick driver. |
| `SOLARI_PICKER` boot guard | Phase 17 | Picker loads `app.js` with the flag set; fetchers and the render loop are skipped; `window.EditorialFace` is exported. |

## 4. New Surface Area

| Area | Addition |
|---|---|
| `index.html`, `clockface.html` | `<link>` for Cormorant Garamond 300 italic via Google Fonts. |
| `style.css` | `.cormorant-italic` font shorthand class; `#ed-time`, `#ed-paragraph`, `#ed-right`, `#ed-footer`, `#ed-dropline` rule blocks; paragraph cross-fade transition rules. |
| `app.js` -- `CONFIG.driftClasses` | Adds `timeByFace: { editorial: { ampX: 30, ampY: 22 } }`. |
| `app.js` -- `CONFIG.macroShift` | Adds `timeIntervalHoursByFace: { editorial: 6, horizon: 6 }`. Adds `timeHomesByFace.editorial` (two homes; mirrored composition). Adds an opt-in `rightBlockHomesByFace.editorial` matched to the time homes so the right-column block swaps as a paired composition. |
| `app.js` -- `ObservanceModule._builtIn` | New `name_long` field on each entry (e.g. `'Solstice, June 21.'`); Phase 19 reads it for the italic dropline. |
| `app.js` -- `EditorialFace` | New face object: `init`, `render`, `teardown`, internal `_renderTime`, `_renderRight`, `_renderParagraph`, `_renderDropline`, `_renderFooter`, plus template selection + cross-fade scheduler. |
| `app.js` -- `ClockfaceRegistry.faces` | Adds `editorial: EditorialFace`. |
| `app.js` -- `ClockfaceRegistry.normalizeTweaks` | Validates `byFace.editorial.timeFormat` and `previewMode`. |
| `app.js` -- `MacroShifter` | Reads `timeIntervalHoursByFace[FACE_ID]`; reads `rightBlockHomesByFace[FACE_ID]`; targets `#ed-time` and `#ed-right` when `FACE_ID === 'editorial'`. |
| `app.js` -- `DriftEngine` | Reads `CONFIG.driftClasses.timeByFace[FACE_ID]` for the `time` channel amplitude; falls back to base `time` entry when absent. |
| `app.js` -- window-scope exports | `window.EditorialFace = EditorialFace;` |
| `clockface.js` | Mounts Editorial card; 1 Hz preview driver; accelerated 6 h -> 6 s macro shift in `previewMode`. |

## 5. Element List

All positions are stage pixels (origin top-left of the 1180x820 box). Every element is `position: absolute` with `transform: translate(<anchor>) translate(var(--<class>-dx), var(--<class>-dy))` so it picks up drift.

| Element ID | Stage position (px) | Anchor | Font / weight / size | Content / token notes |
|---|---|---|---|---|
| `#ed-dropline` (optional) | x=100, y=170 (top-left of textual block) | top-left | Cormorant Garamond 300 italic, **28 px**, `letter-spacing: 0.02em`, `line-height: 1`, `--type-secondary` | Renders only when `AppState.observance` is non-null AND `observance.treatment === 'light'`. Content: `AppState.observance.name_long` (e.g. `'Solstice, June 21.'`). Hidden via `display: none` when no light observance is active. |
| `#ed-time` (wrapper) | Home A: x=100, y=200 (top-left); Home B: x=560, y=200 (top-left of right side; mirrors composition) | top-left, baseline ignored (manual line-height 0.9) | Cormorant Garamond 300 italic, **360 px**, `line-height: 0.9`, `letter-spacing: -0.04em`, `--type-primary` | `HH:MM` (24h) or `H:MM` (12h). The colon is a `<span class="ed-colon">` at 360 px in `--type-accent`, opacity 0.88. In 12h mode, `<span class="ed-ampm">AM</span>` (or `PM`) at 56 px Manrope 200 normal, `letter-spacing: 0.18em`, `--type-secondary`, `vertical-align: top`, `margin-left: 24px`. AM/PM is deliberately **not** Cormorant: Manrope creates contrast between display type and the format suffix, matching chihiro's lock. |
| `#ed-right` (wrapper) | Home A: x=850, y=220 (top-left, width=320); Home B: x=290, y=220 (top-left, width=320; mirrors composition) | top-left | mixed | Three-line block. See sub-rows below. |
| `#ed-right .ed-kicker` | top of `#ed-right` | block top | Manrope 200, **14 px**, `letter-spacing: 0.32em`, `text-transform: uppercase`, `--type-tertiary` | Time-of-day kicker: `'THIS MORNING'`, `'THIS AFTERNOON'`, `'THIS EVENING'`, `'TONIGHT'`. Derived from sun altitude + clock hour (Section 8). `margin-bottom: 14px`. |
| `#ed-right .ed-weekday` | below kicker | block | Cormorant Garamond 300 italic, **64 px**, `line-height: 1.0`, `--type-primary` | `{Weekday},` with trailing comma. `margin-bottom: 14px`. |
| `#ed-right .ed-monthday` | below weekday | block | Cormorant Garamond 300 italic, **52 px**, `line-height: 1.0`, `--type-secondary` | `{Month} {Day}.` with trailing period. |
| `#ed-paragraph` | x=560, y=480 (top-left), width=540 | top-left | Cormorant Garamond 300 italic, **26 px**, `line-height: 1.35`, `letter-spacing: 0`, `--type-secondary` | Single paragraph. Token spans inside the paragraph (`<span class="ed-tok-primary">`) raise specific facts to `--type-primary`. See Section 10 for templates and placeholders. The paragraph occupies the right-mid region in both macro homes; it stays anchored (does not mirror). |
| `#ed-footer` (wrapper) | x=100, y=690 (top-left), width=980, height=80 | top-left | grid | 4-column grid with 1 px `--rule` vertical separators between columns and a 1 px `--rule` horizontal separator at y=690 spanning x=100 to x=1080. Stays anchored across macro shifts. |
| `#ed-footer .ed-foot-label` (4 instances) | top of cell, `margin-bottom: 6px` | grid cell | Manrope 200, **12 px**, `letter-spacing: 0.22em`, `text-transform: uppercase`, `--type-tertiary` | `TIDE`, `AIR`, `SUN`, `ALMANAC`. |
| `#ed-footer .ed-foot-value` (4 instances) | below label | grid cell | Cormorant Garamond 300 italic, **22 px**, `letter-spacing: 0`, `--type-primary` | See Section 8 for per-cell value composition. |

The wrapping element is `<div id="ed-stage">` mounted inside `#stage` by `EditorialFace.init()`. `ed-stage` does not get its own drift channel; all drift is on the children that carry it.

### CSS class names introduced

`ed-stage`, `ed-dropline`, `ed-time`, `ed-colon`, `ed-ampm`, `ed-right`, `ed-kicker`, `ed-weekday`, `ed-monthday`, `ed-paragraph`, `ed-paragraph-inner`, `ed-tok-primary`, `ed-tok-accent`, `ed-footer`, `ed-foot-cell`, `ed-foot-label`, `ed-foot-value`. The `ed-paragraph-inner` wrapper carries the cross-fade transition; `ed-paragraph` is the position container. Token classes (`ed-tok-primary`, `ed-tok-accent`) let the template engine raise facts to brighter color without rewriting the paragraph DOM each tick.

## 6. Drift Assignments

| Element | Drift class | Period (s) | ampX / ampY (px) | Notes |
|---|---|---|---|---|
| `#ed-time` | `time` (Editorial override) | 117 | **30 / 22** | Per-face override via `CONFIG.driftClasses.timeByFace.editorial`. Other faces continue to use base `time` ampX 24 / ampY 18. |
| `#ed-right` | `date` | 89 | 12 / 8 | Standard `date` channel. Right-column block drifts as one unit; sub-rows are non-drift. |
| `#ed-paragraph` | `slot` | 143 | 12 / 8 | Standard `slot` channel. Paragraph drifts as one unit; the inner cross-fade wrapper does not. |
| `#ed-footer` | `tickRail` | 79 | 4 / 3 | Reuses the `tickRail` channel (1 px hairline rule fits the channel's design intent, mirroring Departures footer pattern from Phase 18). Low amplitude is appropriate for the 1 px top rule and small Manrope labels. |
| `#ed-dropline` | none | n/a | 0 / 0 | Dropline is rare (one day per light observance) and small; no drift channel needed. The dropline inherits drift if collocated with `#ed-time` via parent; in Phase 19, the dropline is a sibling of `#ed-time`, not a child, so it does not drift. This is a deliberate burn-in trade-off: light observances last 24 h, the dropline is 28 px italic, and absence of drift on this rare element is acceptable. |

The base `time` channel's amplitude (24 / 18) is unchanged for Calm and Mechanical; only Editorial reads the override. `CONFIG.driftClasses.timeByFace` is the canonical hook for per-face amplitude overrides; future faces (e.g. Horizon if it needs different amplitude) follow the same pattern.

## 7. Per-Face Macro Shift -- Mirrored Composition (6 h)

### Time and right-column block swap together

Editorial macro-shifts the *composition*, not just the time numerals. Every 6 h, `#ed-time` and `#ed-right` swap their anchor positions as a paired composition:

- **Home A** (left-time / right-block):
  - `#ed-time` top-left at x=100, y=200
  - `#ed-right` top-left at x=850, y=220
- **Home B** (right-time / left-block, mirrored):
  - `#ed-time` top-left at x=560, y=200
  - `#ed-right` top-left at x=290, y=220

The paragraph (`#ed-paragraph`) and footer (`#ed-footer`) stay anchored across the shift. Only the two top-half blocks swap. This preserves the magazine-cover composition while moving the largest pixel mass (the 360 px italic) across the stage on a 6 h cadence.

### CONFIG additions

```js
// In CONFIG.macroShift:
timeIntervalHoursByFace: {
  editorial: 6,
  horizon: 6   // reserved; Phase 20 reads this entry
},
timeHomesByFace: {
  mechanical: [[50, 39], [50, 54]],   // existing Phase 17
  editorial: [[100, 200], [560, 200]] // top-left pixel coords (x, y) since Editorial anchors top-left, not center
},
// Phase 19 introduces a paired-block table so MacroShifter can swap two elements
// in lockstep on the same interval.
rightBlockHomesByFace: {
  editorial: [[850, 220], [290, 220]]  // top-left pixel coords for #ed-right
}
```

### Format note: pixel coords vs. percent

Calm and Mechanical use percent-based `timeHomes` (interpreted against the 1180x820 stage box). Editorial uses pixel coords because its anchor is `top-left`, not `center`. `MacroShifter` detects the format by entry length and value range: if all values are in [0, 100] it interprets percent; if any value exceeds 100 it interprets pixels. Mixed-format tables are not supported (all entries within one face must agree).

### MacroShifter changes

`MacroShifter.start()` reads:

1. `CONFIG.macroShift.timeIntervalHoursByFace[FACE_ID]` if present, else `CONFIG.macroShift.timeIntervalHours` (3 h default).
2. `CONFIG.macroShift.timeHomesByFace[FACE_ID]` if present, else `CONFIG.macroShift.timeHomes`.
3. `CONFIG.macroShift.rightBlockHomesByFace[FACE_ID]` if present (per-face only; no global default).

`_applyTime()` targets `#ed-time` when `FACE_ID === 'editorial'`. A new internal `_applyRightBlock()` targets `#ed-right` on the same interval, reading from `rightBlockHomesByFace[FACE_ID]`. The two element transitions are driven by the same 60 s ease-in-out transition (`timeTransitionSec: 60` from the existing config), so the paired swap reads as one composition move.

### Preview-mode acceleration

When `tweaks.byFace.editorial.previewMode === true`, `MacroShifter` (or the picker's preview driver) compresses the 6 h cadence to 6 s so picker reviewers see the composition swap within a normal preview session. The transition duration drops in proportion (60 s -> 1 s) so the visual move is observable. See Section 17 for picker integration.

## 8. Right-Column Block, Footer, and Kicker Derivation

### Kicker derivation

```js
function _editorialKicker(state) {
  const h = state.time.hours; // 0..23
  const altitude = (state.sun && state.sun.altitude) || 0;
  // Astronomical-twilight aware kicker. Sun altitude breaks ties at edges.
  if (h < 5 || (h >= 21 && altitude < 0)) return 'TONIGHT';
  if (h < 12) return 'THIS MORNING';
  if (h < 17) return 'THIS AFTERNOON';
  return 'THIS EVENING';
}
```

The kicker updates at minute change (gated by `state.time.minutes`). It is the only data-driven label in the right-column block; weekday and month-day are derived from `state.date`.

### Weekday and month-day

```js
const weekdayText = state.date.dayOfWeek + ',';      // 'Monday,'
const monthDayText = state.date.month + ' ' + state.date.day + '.';  // 'May 11.'
```

Manrope's day-of-week formatter (`AppState.date.dayOfWeek`) is already title-case (`Monday`, `Tuesday`, ...), which matches the editorial register. The trailing comma and period are part of the rendered string, not CSS pseudo-elements.

### Footer cells

| Cell | Label | Value template | AppState source |
|---|---|---|---|
| TIDE | `TIDE` | `{Type} {heightM}m, {time}` (e.g. `High 4.3m, 04:22`) | `state.tide.type` (title-case), `state.tide.heightM` (one decimal), `state.tide.time` (per `timeFormat`). Null state: `—`. |
| AIR | `AIR` | `AQI {value}, {label}` (e.g. `AQI 24, good`) | `state.aqi.value`, `state.aqi.band` (title-case). Null state: `—`. |
| SUN | `SUN` | `↑ {sunrise}  ↓ {sunset}` (e.g. `↑ 05:22  ↓ 20:47`) | `state.sun.sunrise`, `state.sun.sunset`, per `timeFormat`. Arrow glyphs in `--type-accent` at alpha 0.55. Null state: `—`. |
| ALMANAC | `ALMANAC` | `{name}` (e.g. `Eta Aquariids, Tomorrow`) or `—` | `state.almanac` object. Null state: `—`. |

Per-cell null collapse follows the Phase 17 convention: an em-dash in `--type-tertiary` at 22 px Cormorant Garamond italic. The label always renders.

## 9. Cormorant Garamond Font Load and Fallback Chain

Phase 19 adds exactly one weight + style: Cormorant Garamond 300 italic. Weights 400 / 500 / 700 and the upright variant are not loaded.

### `index.html` delta

```html
<!-- Phase 19: Cormorant Garamond 300 italic for Editorial face -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300&display=swap">
```

Inserted alongside the existing Manrope and JetBrains Mono links. The link loads unconditionally (no face-conditional gating); Phase 17 set the precedent.

### `clockface.html` delta

Same link tag added; the picker must render the Editorial live preview using the same font as the main display.

### Byte budget

| Asset | Estimated weight (WOFF2, subsetted via Google Fonts URL) |
|---|---|
| Cormorant Garamond 300 italic (Latin subset only, default Google subsetting) | ~24 to 32 KB |

The `display=swap` directive ensures system serif is used while the webfont resolves. A visible swap on first boot is acceptable for an ambient display.

### CSS application

```css
#ed-time,
#ed-right .ed-weekday,
#ed-right .ed-monthday,
#ed-paragraph,
#ed-foot-value,
#ed-dropline {
  font-family: 'Cormorant Garamond', 'Georgia', 'Times New Roman', serif;
  font-style: italic;
  font-weight: 300;
}

#ed-right .ed-kicker,
#ed-foot-label,
#ed-ampm {
  font-family: 'Manrope', system-ui, sans-serif;
  font-style: normal;
  font-weight: 200;
}
```

The Manrope path for kicker, footer label, and AM/PM is deliberate: 11-14 px chrome stays in the project's existing system convention; only display type uses the new serif.

## 10. Paragraph Template System

### Selection logic

The active template is selected once per 32 s rotation window. Selection is deterministic: a hash of `(period, weather-state, moon-phase)` indexes into the 8-template table. The template chosen at the start of a window holds for the full 32 s; the next window may select the same or a different template.

```js
const PARAGRAPH_TEMPLATES = [/* see Section 11 for the 8 templates */];

function _activeTemplate(state) {
  const period = _period(state);       // 'morning' | 'afternoon' | 'evening' | 'night' | 'twilight'
  const weather = _weatherState(state); // 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow'
  const moon = _moonState(state);      // 'waxing' | 'full' | 'waning' | 'new'

  // Condition-gated templates fire only when their gate matches.
  // The hash distributes across the remaining (generic) templates when no
  // gate matches.
  const candidates = PARAGRAPH_TEMPLATES.filter(t => _matches(t, period, weather, moon));
  if (candidates.length === 0) return PARAGRAPH_TEMPLATES[PARAGRAPH_TEMPLATES.length - 1]; // generic fallback

  const key = period + '|' + weather + '|' + moon;
  const idx = _hash(key) % candidates.length;
  return candidates[idx];
}
```

Each template object carries gate predicates:

```js
{
  id: 'fog-day',
  gate: { period: ['morning', 'afternoon', 'evening'], weather: ['fog'] },
  copy: 'Fog folds across the city. Visibility holds at <em>{visibility}</em>.'
}
```

`_matches(template, period, weather, moon)` returns true when every gate present in the template includes the current value. A missing gate field means "any".

### Cross-fade animation

Every 32 s, the active template is recomputed. If it differs from the previously rendered template, a 1200 ms cross-fade swaps the paragraph content:

```css
#ed-paragraph-inner {
  transition: opacity 1200ms ease-in-out;
}
#ed-paragraph-inner.is-fading-out {
  opacity: 0;
}
```

```js
// In EditorialFace._renderParagraph():
if (active.id !== this._lastTemplateId) {
  const inner = this._els.paragraphInner;
  inner.classList.add('is-fading-out');
  setTimeout(() => {
    inner.innerHTML = _renderTemplate(active.copy, state, timeFormat);
    inner.classList.remove('is-fading-out');
  }, 1200);
  this._lastTemplateId = active.id;
}
```

The 1200 ms duration is deliberately slower than Mechanical's 600 ms grid cross-fade: Editorial's paragraph is a contiguous block of italic text and an abrupt swap would feel jarring; 1200 ms reads as a literary page turn.

### 32 s cadence rationale

The 32 s slot rotation matches Calm's hold time. It is fast enough that a viewer who watches for 2 minutes will see 3-4 templates rotate; slow enough that the paragraph reads as still typography most of the time. The cadence is fixed in `EditorialFace` (not a tweak); it does not need to be configurable.

### Template state freezing

Once a template is selected for a 32 s window, the placeholder substitutions are computed once at swap-in and held for the window. Mid-window state changes (e.g. minute advancing within `{sunset}`, tide turn within `{tideTime}`) are not reflected until the next swap. This is a deliberate choice: a paragraph that re-renders mid-fade looks broken; a paragraph that holds for 32 s reads as authored.

The exception is the placeholder substitution function; it runs at swap-in and returns a static HTML string. The render loop's other elements (time, footer, right-column block) continue to update at 1 Hz.

### Placeholder syntax

Inline `{name}` placeholders. The substitution function reads from `state` and `timeFormat`:

```js
function _renderTemplate(template, state, timeFormat) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    switch (key) {
      case 'tempC': return state.weather.tempC != null ? String(state.weather.tempC) : '—';
      case 'condition': return state.weather.condition || 'overcast';
      case 'sunset': return _fmtTime(state.sun.sunset, timeFormat);
      case 'sunrise': return _fmtTime(state.sun.sunrise, timeFormat);
      case 'phase': return (state.moon.phaseName || 'waxing').toLowerCase();
      case 'illum': return Math.round((state.moon.illumination || 0) * 100);
      case 'tideTime': return _fmtTime(state.tide.time, timeFormat);
      case 'visibility': return state.weather.visibilityKm != null ? state.weather.visibilityKm + ' km' : '—';
      default: return '';
    }
  });
}
```

Templates that mark a span as primary use `<em>` (semantic emphasis); the CSS rule colours it as `--type-primary` rather than as italicised text (the whole paragraph is already italic):

```css
#ed-paragraph em {
  font-style: italic;     /* explicit; defeats user-agent override */
  color: var(--type-primary);
}
```

## 11. The 8 Paragraph Templates

Starter copy. chihiro and the user refine the prose post-merge; the placeholder syntax and gate structure are the contract Phase 19 freezes.

| # | id | Gate | Copy |
|---|---|---|---|
| 1 | `morning-clear` | period: morning; weather: clear | `Light comes early this morning. The harbour holds still.` |
| 2 | `evening-clear` | period: evening; weather: clear | `The sky cools toward the inlet. Sunset at <em>{sunset}</em>.` |
| 3 | `fog-day` | period: morning, afternoon, evening; weather: fog | `Fog folds across the city. Visibility holds at <em>{visibility}</em>.` |
| 4 | `rain-day` | period: morning, afternoon, evening; weather: rain | `Steady rain across the strait, <em>{tempC}°</em>.` |
| 5 | `night-clear-moon` | period: night; weather: clear; moon: waxing, full, waning | `The moon, <em>{phase}</em> at <em>{illum} percent</em>, rides high above the mountains.` |
| 6 | `night-clear-new` | period: night; weather: clear; moon: new | `A new moon sits over Vancouver. Tide turning at <em>{tideTime}</em>.` |
| 7 | `snow` | weather: snow | `Snow on the slopes. <em>{tempC}°</em> in the city.` |
| 8 | `generic` | (no gate; fallback) | `<em>{condition}</em>, <em>{tempC}°</em>. <em>{phase}</em> moon at <em>{illum}%</em>.` |

### Period derivation

```js
function _period(state) {
  const h = state.time.hours;
  const altitude = (state.sun && state.sun.altitude) || 0;
  if (altitude < -6) return 'night';      // astronomical-twilight or darker
  if (altitude < 0) return 'twilight';    // civil twilight band
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
```

### Weather-state derivation

```js
function _weatherState(state) {
  const c = state.weather.condition;  // 'CLEAR' | 'PARTLY_CLOUDY' | 'FOG' | 'RAIN' | 'SNOW' | 'STORM' | null
  if (c === 'CLEAR' || c === 'PARTLY_CLOUDY') return 'clear';
  if (c === 'FOG') return 'fog';
  if (c === 'RAIN' || c === 'STORM') return 'rain';
  if (c === 'SNOW') return 'snow';
  return 'cloudy';
}
```

### Moon-state derivation

```js
function _moonState(state) {
  const p = state.moon.phaseName || '';
  if (p.indexOf('New') >= 0) return 'new';
  if (p.indexOf('Full') >= 0) return 'full';
  if (p.indexOf('Waxing') >= 0) return 'waxing';
  if (p.indexOf('Waning') >= 0) return 'waning';
  return 'waxing';  // safe default
}
```

## 12. Vancouver-Flavored Copy Guidance

Authoring rules for Phase 19 and later refinements:

1. **Lead with the city, not the weather.** Templates that mention `the harbour`, `the inlet`, `the strait`, `the mountains` should fire only when the literal geography matches the state. Generic fallback (template 8) makes no geographic claim.
2. **Condition-gated templates fire only when condition matches.** A fog template never fires on a clear day; a snow template never fires above freezing. The gate predicate enforces this.
3. **Tide-specific copy fires only within a window.** A "tide turning at" line should only render when the next tide event is within +/- 90 minutes; outside that window, the generic moon-tide template falls back to a non-tide line. (Phase 19's starter template set does not exercise this gate; future copy that mentions tide times should add a `tideWindow` gate.)
4. **Generic-meteorological fallback covers the rest.** Template 8 is unconditional and always matches. It is the fallback when no condition-gated template fits.
5. **Authoring voice: literary almanac, not weather report.** Sentence fragments are acceptable. The italic register favours observation over enumeration. Compare:
   - **Good**: `Light comes early this morning. The harbour holds still.`
   - **Bad**: `It is 12 degrees. The condition is partly cloudy. Sunset will occur at 20:47.`
6. **Placeholders carry the facts.** Token spans (`<em>`) raise specific numbers to `--type-primary`; the surrounding prose stays in `--type-secondary`. A template with no token span reads as observation; a template with too many token spans reads as a data dump.
7. **Two to three sentences maximum per template.** The 360 px italic time numerals are the visual centre; the paragraph supports them, not the reverse.

## 13. Observance Dropline

### Trigger

The dropline renders when `AppState.observance` is non-null and `observance.treatment === 'light'`. Major observances (Christmas, New Year's) do not produce a dropline; they apply the standard `--type-primary` / `--type-accent` repaint, which Editorial inherits without further work.

### Data source: `name_long` field

Phase 19 introduces a new field on `ObservanceModule._builtIn` entries and on `CONFIG.observances.customObservances`:

```js
// ObservanceModule._builtIn (app.js)
{ name: 'SPRING EQUINOX', name_long: 'Equinox, March 20.', date: 'equinox-spring', ... },
{ name: 'SUMMER SOLSTICE', name_long: 'Solstice, June 21.', date: 'solstice-summer', ... },
{ name: 'FALL EQUINOX', name_long: 'Equinox, September 22.', date: 'equinox-fall', ... },
{ name: 'WINTER SOLSTICE', name_long: 'Solstice, December 21.', date: 'solstice-winter', ... },
{ name: 'HALLOWEEN', name_long: "Hallowe'en, October 31.", date: '10-31', ... },
// Major treatments may also carry name_long even though Editorial does not
// use the dropline for them; the field is harmless on majors.
{ name: 'CHRISTMAS DAY', name_long: 'Christmas Day, December 25.', date: '12-25', ... },
{ name: "NEW YEAR'S DAY", name_long: "New Year's Day, January 1.", date: '01-01', ... },
```

The `name_long` field is propagated into `AppState.observance.name_long` by `ObservanceModule.update()`:

```js
AppState.observance = {
  name: winner.name,
  name_long: winner.name_long || null,   // Phase 19 addition
  glyph: winner.glyph,
  treatment: winner.treatment,
  palette: winner.palette,
  slotEntry: winner.slotEntry || null,
  dateString: ...
};
```

Custom observances in `CONFIG.observances.customObservances` may add `name_long` to opt into the Editorial dropline:

```js
customObservances: [
  { name: 'JOSH BIRTHDAY', name_long: 'Birthday, July 15.', date: '07-15', glyph: '✷',
    treatment: 'light',
    palette: { mode: 'tint', hueShift: 10, satShift: 0 },
    slotEntry: 'JOSH BIRTHDAY' }
]
```

A custom observance with `treatment: 'major'` and no `name_long` produces no dropline (silent fallback). A custom observance with `name_long` and `treatment: 'major'` still produces no dropline (Editorial reserves the dropline for light treatments per chihiro's lock).

### Rendering

```js
// In EditorialFace._renderDropline(state):
const obs = state.observance;
if (obs && obs.treatment === 'light' && obs.name_long) {
  this._els.dropline.textContent = obs.name_long;
  this._els.dropline.style.display = '';
} else {
  this._els.dropline.style.display = 'none';
}
```

The element is `display: none` by default. It is created in `init()` and shown by `_renderDropline()` only when the conditions are met.

### Visual rule

`#ed-dropline` is a single-line italic phrase at 28 px Cormorant Garamond. It does not wrap. If `name_long` exceeds the available width, it overflows the right edge of the stage; this is acceptable because the field is authored, not computed, and authors are expected to keep it under ~40 characters. The 1180 px stage minus 100 px left margin gives ~1080 px; at 28 px italic, ~50 characters fit.

## 14. Accent Placement -- Colon Glyph Only

Editorial's accent discipline is "one accent per face". The accent token (`--type-accent`) appears in exactly one place:

- **The colon glyph in `#ed-time`.** `<span class="ed-colon">:</span>` at 360 px Cormorant Garamond italic, `color: var(--type-accent)`, opacity 0.88.

Specifically not accented:

- The AM/PM suffix (it is `--type-secondary` Manrope 200, not the accent token).
- The kicker (`--type-tertiary`).
- The weekday and month-day (both `--type-primary` / `--type-secondary`).
- Token spans in the paragraph (`<em>` is `--type-primary`, not accent).
- Footer label and value tokens.
- The observance dropline (`--type-secondary`).

The arrow glyphs in the SUN footer cell are an exception (per Phase 17's footer convention): they tint to `--type-accent` at alpha 0.55. This is a smaller, lower-opacity accent that does not compete with the colon for visual weight.

## 15. CONFIG Additions

```js
// CONFIG.driftClasses additions (alongside existing time/date/slot/moon/sun/horizon/departureRow/tickRail entries)
driftClasses: {
  // ... existing entries unchanged ...

  // Phase 19: per-face amplitude overrides for the time channel.
  // Period is shared (117 s); only ampX/ampY differ.
  timeByFace: {
    editorial: { ampX: 30, ampY: 22 }
  }
}

// CONFIG.macroShift additions
macroShift: {
  enabled: true,
  timeIntervalHours: 3,          // global default; Calm and Mechanical use this
  timeTransitionSec: 60,
  timeHomes: [ /* ... existing six homes ... */ ],

  // Phase 17 (existing)
  timeHomesByFace: {
    mechanical: [[50, 39], [50, 54]],
    // Phase 19 addition. Pixel coords (top-left anchor).
    editorial: [[100, 200], [560, 200]]
  },

  // Phase 19 (new)
  timeIntervalHoursByFace: {
    editorial: 6,
    horizon: 6   // reserved; Phase 20 reads this entry
  },

  // Phase 19 (new) -- per-face paired-block table
  rightBlockHomesByFace: {
    editorial: [[850, 220], [290, 220]]
  },

  moonIntervalHours: 6,
  moonTransitionSec: 60,
  moonHomes: [ [84, 12], [16, 12], [84, 62], [16, 62] ]
}
```

### Tweak schema (extends Phase 16/17)

```ts
type EditorialTweaks = {
  timeFormat?: '24h' | '12h';   // default '24h'
  previewMode?: boolean;        // default false; picker only
};

type Tweaks = {
  accent: 'gold' | 'sky' | 'sage' | 'paper';
  driftIntensity: 'off' | 'subtle' | 'normal' | 'restless';
  byFace: {
    mechanical?: MechanicalTweaks;
    editorial?: EditorialTweaks;    // Phase 19 addition
  };
};
```

### Normalisation

`ClockfaceRegistry.normalizeTweaks(raw)` gains a block parallel to the Phase 17 Mechanical block:

```js
const EDITORIAL_TIME_FORMATS = ['24h', '12h'];

normalizeTweaks(raw) {
  // ... existing accent / driftIntensity / byFace coercion ...
  // ... Phase 17 mechanical block ...

  // Phase 19: normalise editorial sub-object
  const ed = (byFace.editorial && typeof byFace.editorial === 'object')
    ? byFace.editorial
    : {};
  const edTf = EDITORIAL_TIME_FORMATS.indexOf(ed.timeFormat) >= 0 ? ed.timeFormat : '24h';
  const edPm = ed.previewMode === true;
  byFace.editorial = { timeFormat: edTf, previewMode: edPm };

  return { accent, driftIntensity, byFace };
}
```

Unknown `timeFormat` falls back to `'24h'`. Missing `byFace.editorial` is created with defaults. `previewMode` is always normalised to a boolean and is not persisted on Apply.

## 16. EditorialFace Render Contract

```js
const EditorialFace = {
  _els: null,
  _lastMinuteKey: null,         // 'timeFormat|HH:MM|ampm'; gates time + kicker repaint
  _lastIsoDate: null,           // gates weekday/month-day repaint
  _lastTemplateId: null,        // gates paragraph cross-fade
  _lastObservanceName: null,    // gates dropline repaint
  _paragraphTimerId: null,      // 32 s rotation interval handle
  _previewMode: false,          // mirrors tweaks.byFace.editorial.previewMode for off-thread reads

  init(stage) {
    if (!stage) return;

    // Remove Calm / Mechanical DOM if present so DisplayModule.init() does not
    // bind to dead nodes. The picker page does not have these nodes; the guard
    // makes init idempotent in both contexts.
    ['time', 'date', 'slot', 'moon-disc', 'mech-stage'].forEach(id => {
      const el = stage.querySelector('#' + id);
      if (el) el.remove();
    });
    const existing = stage.querySelector('#ed-stage');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'ed-stage';
    root.innerHTML =
      '<div id="ed-dropline" style="display:none"></div>' +
      '<div id="ed-time">' +
        '<span class="ed-hours">--</span>' +
        '<span class="ed-colon">:</span>' +
        '<span class="ed-minutes">--</span>' +
        '<span class="ed-ampm" hidden></span>' +
      '</div>' +
      '<div id="ed-right">' +
        '<div class="ed-kicker"></div>' +
        '<div class="ed-weekday"></div>' +
        '<div class="ed-monthday"></div>' +
      '</div>' +
      '<div id="ed-paragraph"><div id="ed-paragraph-inner"></div></div>' +
      '<div id="ed-footer">' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Tide</div><div class="ed-foot-value"></div></div>' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Air</div><div class="ed-foot-value"></div></div>' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Sun</div><div class="ed-foot-value"></div></div>' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Almanac</div><div class="ed-foot-value"></div></div>' +
      '</div>';
    stage.appendChild(root);

    this._els = {
      root,
      dropline: root.querySelector('#ed-dropline'),
      time: root.querySelector('#ed-time'),
      hours: root.querySelector('.ed-hours'),
      colon: root.querySelector('.ed-colon'),
      minutes: root.querySelector('.ed-minutes'),
      ampm: root.querySelector('.ed-ampm'),
      right: root.querySelector('#ed-right'),
      kicker: root.querySelector('.ed-kicker'),
      weekday: root.querySelector('.ed-weekday'),
      monthday: root.querySelector('.ed-monthday'),
      paragraph: root.querySelector('#ed-paragraph'),
      paragraphInner: root.querySelector('#ed-paragraph-inner'),
      footer: root.querySelector('#ed-footer'),
      footValues: Array.from(root.querySelectorAll('.ed-foot-value'))
    };
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
    this._lastTemplateId = null;
    this._lastObservanceName = null;
  },

  render(state, tweaks) {
    if (!this._els) return;
    const et = (tweaks && tweaks.byFace && tweaks.byFace.editorial) || {};
    const timeFormat = et.timeFormat === '12h' ? '12h' : '24h';
    this._previewMode = et.previewMode === true;

    this._renderDropline(state);
    this._renderTime(state, timeFormat);
    this._renderRight(state);
    this._renderFooter(state, timeFormat);
    this._maybeRotateParagraph(state, timeFormat);  // gated by 32 s window
  },

  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
    this._lastTemplateId = null;
    this._lastObservanceName = null;
  },

  // ---- Internal helpers (sketches; full code in implementation) ----

  _renderDropline(state) { /* shows/hides #ed-dropline based on light observance */ },
  _renderTime(state, timeFormat) { /* writes hours/colon/minutes/ampm; gated by _lastMinuteKey */ },
  _renderRight(state) { /* writes kicker (minute-gated), weekday, month-day; date-gated */ },
  _renderFooter(state, timeFormat) { /* 4 cells; gated by per-cell value hash */ },
  _maybeRotateParagraph(state, timeFormat) {
    // Compute the active 32 s window index from the wall clock (or perf.now()
    // / 32 in preview if state.time does not advance fast enough). If the
    // window index has changed since last render, select a new template.
    // If the new template's id differs from this._lastTemplateId, trigger
    // the 1200 ms cross-fade.
  }
};
```

### Repaint gating

| Sub-render | Gate | Cost |
|---|---|---|
| `_renderTime` | Only when `state.time.minutes` differs from `_lastMinuteKey` | 60x reduction vs naive |
| `_renderRight` | Kicker gated on `_lastMinuteKey`; weekday/month-day gated on `_lastIsoDate` | combined ~60x reduction |
| `_renderFooter` | Each cell hashes its inputs; DOM write only when hash changes | DOM writes ~once per fetch boundary per cell |
| `_renderDropline` | Gated on `state.observance && state.observance.name` change | DOM write ~once per day at most |
| `_maybeRotateParagraph` | Computes window index every tick; runs template selection only when index changes; runs DOM swap only when template id changes | DOM writes ~every 32 s, often less |

The 32 s paragraph window is computed from wall-clock seconds: `Math.floor(performance.now() / 32000)` (or accelerated in preview mode; Section 17). The render loop does not need an external timer.

### Constraints carried from Phase 16

- Must not mutate `AppState`.
- Must not register `setInterval` / `setTimeout` outside the 1 Hz tick driven by `DisplayModule.render()`.
- Must not add `position: fixed` elements or solid filled blocks.
- Must not read `localStorage` directly.
- Must not modify `--type-primary`, `--type-accent`, or `--lum-mod` directly.

`EditorialFace` satisfies all of these. The paragraph cross-fade is the only animation, driven by a CSS `transition: opacity 1200ms` plus a single `setTimeout(.., 1200)` for the content swap. That `setTimeout` is scheduled inside `render()` (a per-tick driver) but only when the window index changes; it fires at most every 32 s. This is consistent with Mechanical's `transitionend` pattern for the minute-arc fade.

### Picker entry point: long-press on `#ed-time` (mirrors Mechanical)

Editorial has no moon disc. Long-press on `#ed-time` (the largest stable element) opens `clockface.html`. Short tap remains `VersionOverlay`. The binding is in `app.js` boot code, not in `EditorialFace.init()`, mirroring Phase 17's pattern.

## 17. Picker Live Preview

### Boot guard

`clockface.html` already sets `window.SOLARI_PICKER = true` (Phase 17 pattern). Phase 19 adds the Editorial face class to the window-scope exports at the bottom of `app.js`:

```js
window.CalmFace = CalmFace;
window.MechanicalFace = MechanicalFace;
window.EditorialFace = EditorialFace;   // Phase 19 addition
window.ClockfaceRegistry = ClockfaceRegistry;
```

### Preview state

`clockface.js` extends `PREVIEW_STATE` with sun altitude (already present after Phase 17) and any new fields Editorial reads:

```js
const PREVIEW_STATE = {
  // ... existing fields from Phase 17 ...
  weather: { tempC: 12, condition: 'PARTLY_CLOUDY', code: 2, visibilityKm: 18 },
  // visibilityKm is the only new field Editorial reads via {visibility} placeholder
  observance: null   // toggle to test the dropline path; set to a 'light' observance with name_long
};
```

### Preview clock

The picker advances `PREVIEW_STATE.time.seconds` once per second (already done in Phase 17). Editorial's paragraph rotation reads from `performance.now()` directly, so it advances independently of `PREVIEW_STATE.time`.

### Accelerated macro shift (previewMode)

When `tweaks.byFace.editorial.previewMode === true`, the 6 h macro shift is accelerated to 6 s so picker reviewers see the composition swap within a normal preview session. Two implementation options:

1. **MacroShifter-driven** (preferred): The picker drives a small inline MacroShifter equivalent on the card, reading the accelerated interval. The main display's MacroShifter is suppressed by the `SOLARI_PICKER` boot guard.
2. **EditorialFace-driven**: Phase 17's `previewMode` flag flows into `render()`; `EditorialFace` reads it and writes its own CSS variable for the time and right-block positions, bypassing MacroShifter entirely.

Option 1 is preferred because it keeps Editorial's `render()` body small and matches the production code path. The picker's MacroShifter shim is ~30 lines of `clockface.js` and re-uses the same `timeHomesByFace.editorial` / `rightBlockHomesByFace.editorial` tables.

### Apply behaviour

`previewMode` is never persisted to `localStorage`. On Apply, `clockface.js` filters it out (same pattern as Phase 17):

```js
function apply() {
  const persistable = JSON.parse(JSON.stringify(draftTweaks));
  if (persistable.byFace) {
    if (persistable.byFace.mechanical) delete persistable.byFace.mechanical.previewMode;
    if (persistable.byFace.editorial)  delete persistable.byFace.editorial.previewMode;
  }
  localStorage.setItem('solari.clockface.tweaks', JSON.stringify(persistable));
}
```

### Mechanical and Calm cards

Mechanical's live preview (Phase 17) is unaffected. Calm's hand-built mock continues per Phase 17 Section 13. Phase 19 does not convert any prior face's preview.

## 18. CSS Additions

```css
/* Phase 19: Editorial face */

/* Cormorant Garamond family + fallback */
#ed-time,
#ed-right .ed-weekday,
#ed-right .ed-monthday,
#ed-paragraph,
.ed-foot-value,
#ed-dropline {
  font-family: 'Cormorant Garamond', 'Georgia', 'Times New Roman', serif;
  font-style: italic;
  font-weight: 300;
}

#ed-right .ed-kicker,
.ed-foot-label,
.ed-ampm {
  font-family: 'Manrope', system-ui, sans-serif;
  font-style: normal;
  font-weight: 200;
}

/* Time numerals */
#ed-time {
  position: absolute;
  font-size: 360px;
  line-height: 0.9;
  letter-spacing: -0.04em;
  color: var(--type-primary);
  filter: brightness(var(--lum-mod));
  transform: translate(0, 0)
             translate(var(--time-dx, 0px), var(--time-dy, 0px));
  transition: top 60s ease-in-out, left 60s ease-in-out;  /* 6 h macro shift */
}
.ed-colon { color: var(--type-accent); opacity: 0.88; }
.ed-ampm {
  font-size: 56px;
  letter-spacing: 0.18em;
  color: var(--type-secondary);
  vertical-align: top;
  margin-left: 24px;
}

/* Right-column block */
#ed-right {
  position: absolute;
  width: 320px;
  filter: brightness(var(--lum-mod));
  transform: translate(var(--date-dx, 0px), var(--date-dy, 0px));
  transition: top 60s ease-in-out, left 60s ease-in-out;
}
.ed-kicker {
  font-size: 14px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--type-tertiary);
  margin-bottom: 14px;
}
.ed-weekday {
  font-size: 64px;
  line-height: 1.0;
  color: var(--type-primary);
  margin-bottom: 14px;
}
.ed-monthday {
  font-size: 52px;
  line-height: 1.0;
  color: var(--type-secondary);
}

/* Paragraph */
#ed-paragraph {
  position: absolute;
  left: 560px;
  top: 480px;
  width: 540px;
  filter: brightness(var(--lum-mod));
  transform: translate(var(--slot-dx, 0px), var(--slot-dy, 0px));
}
#ed-paragraph-inner {
  font-size: 26px;
  line-height: 1.35;
  color: var(--type-secondary);
  transition: opacity 1200ms ease-in-out;
}
#ed-paragraph-inner.is-fading-out {
  opacity: 0;
}
#ed-paragraph em {
  font-style: italic;        /* defeats user-agent default */
  color: var(--type-primary);
}

/* Dropline */
#ed-dropline {
  position: absolute;
  left: 100px;
  top: 170px;
  font-size: 28px;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--type-secondary);
  white-space: nowrap;
}

/* Footer */
#ed-footer {
  position: absolute;
  left: 100px;
  top: 690px;
  width: 980px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--rule);
  padding-top: 22px;
  filter: brightness(var(--lum-mod));
  transform: translate(var(--tickRail-dx, 0px), var(--tickRail-dy, 0px));
}
.ed-foot-cell {
  padding: 0 18px;
  border-right: 1px solid var(--rule);
}
.ed-foot-cell:last-child { border-right: none; }
.ed-foot-label {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--type-tertiary);
  margin-bottom: 6px;
}
.ed-foot-value {
  font-size: 22px;
  color: var(--type-primary);
}
```

The `--time-dx` / `--time-dy` variables are written by `DriftEngine` for the `time` channel; reading `CONFIG.driftClasses.timeByFace.editorial` gives Editorial its 30/22 amplitude while other faces continue with 24/18.

## 19. Burn-In Audit (Editorial face)

Eight layers, mapped to Editorial elements:

| # | Layer | Status on Editorial | Notes |
|---|---|---|---|
| 1 | Per-element Perlin drift | Active | `time` 117 s (amp 30/22 via per-face override), `date` 89 s (right-column block), `slot` 143 s (paragraph), `tickRail` 79 s (footer). All pairwise coprime per Phase 16 period table. The Editorial `time` amplitude is 25% higher than base to compensate for the 360 px italic numerals (the largest static type in the project). |
| 2 | Pixel-shift safety net | Active | +/- 4 px every 6 min applies on top of stage-clamped drift. Unchanged from Phase 16. |
| 3 | Kinetic transitions (Calm) -> paragraph cross-fade (Editorial) | Active via paragraph + drift composite | Paragraph cross-fades every 32 s (1200 ms duration), replacing all paragraph pixels. The paragraph is 540 px wide and ~80 px tall (2-3 lines at 26 px / 1.35); roughly 43,000 pixels of churn per swap, at a 32 s cadence. This is comparable to Calm's slot rotation in pixel area and matches the SDD's 28-36 s Layer 3 cadence. The Layer 3 trade-off discussion in Phase 17 (where Mechanical relies on a composite) does not apply to Editorial; the paragraph swap is a direct SDD-compliant substitution. |
| 4 | Macro shifts | Active | Time + right-column block swap every 6 h as a paired composition (Section 7). Paragraph and footer stay anchored. Per-face interval override via `timeIntervalHoursByFace.editorial = 6`. |
| 5 | Sky-color modulation | Active | Editorial inherits `--type-primary`, `--type-secondary`, `--type-tertiary`, `--type-accent` continuously. All four tokens modulate on the 60 s linear transition (the `--type-tertiary` fix shipped in Phase 17 covers Editorial without further change). |
| 6 | Luminance breath | Active | `filter: brightness(var(--lum-mod))` applied to time, right-column block, paragraph, and footer wrappers. Dropline inherits the body brightness; given its small footprint and rare appearance (one day per light observance), no separate `filter` is required. |
| 7 | Daily refresher | Active | 03:00 fade to `#404040` for 30 s. `#refresher-overlay` sits outside `#stage` and covers Editorial identically to Calm / Mechanical. The paragraph cross-fade timer is gated on the wall clock, so an in-progress cross-fade at 03:00 completes cleanly under the overlay. |
| 8 | Rendering hygiene | Active | Background `#0a0a0a`. Display type weight 300 italic. No filled blocks. The 1 px footer top rule and column separators sit below the "no solid block" threshold. Italic typography spreads ink more evenly than upright, which is a marginal benefit for OLED burn-in. |

### Worst-case pixel-hold analysis

- `#ed-time` at 360 px Cormorant Garamond italic: the colon glyph is the only stable character within a minute. Drift on `time` (30/22 amp via Editorial override, 117 s) means each pixel inside the colon traverses its full amplitude band in ~58 s. Plus pixel-shift (+/- 4 px every 6 min). Plus macro shift every 6 h. Plus sky modulation continuously. The hour-tens digit is stable for up to 9 hours within a session; the 6 h macro shift (vs Mechanical's 3 h) means the hour-tens digit can sit at one home for up to 6 h before relocating across the stage. The increased drift amplitude (30/22 vs base 24/18) is the compensation: a 6 h hold at one home is acceptable because drift moves the glyph block by up to 60 px peak-to-peak, which is ~16% of the 360 px glyph height -- effectively rewriting every pixel under the glyph over each drift period.
- `#ed-paragraph` at 26 px italic: every 32 s the entire paragraph cross-fades to new content; max static pixel-hold is 32 s. Within that window, drift on `slot` (12/8 amp, 143 s) shifts the paragraph block. The combination is well within the SDD threshold.
- `#ed-right` weekday + month-day at 64 / 52 px italic: text changes at local midnight. Within a day, drift on `date` (12/8 amp, 89 s) keeps each pixel from being lit for more than ~89 s. The 6 h macro shift swaps the block to the opposite side of the stage, refreshing the underlying pixels entirely.
- `#ed-footer` at 22 px italic values: footer values change on each fetch (weather 15 m, AQI 30 m, sun 5 m, tide 6 h, almanac daily). Drift on `tickRail` (4/3 amp, 79 s) provides continuous motion. Pixel-hold below 80 s for any cell.
- `#ed-dropline` at 28 px italic: shows at most once per day (light observance); when shown, holds for 24 h with no drift. The dropline is rare and small (one line, ~50 chars max). The trade-off (no drift on a rare element) is intentional. If hermione flags this in review, an opt-in drift binding to the existing `date` channel can be added in a follow-up patch.

The 360 px italic numerals are the largest persistent typography in the project. The combination of increased `time` channel amplitude (30/22) and the 6 h paired macro shift handles them. No element exceeds 6 h static hold; no element occupies a fixed pixel rectangle for hours without drift on top.

## 20. Bundle Budget Audit

Phase 18 baseline (estimated post-Departures): ~155 to 170 KB runtime (Phase 17's ~122 to 126 KB + Departures ~30 to 40 KB including its webfont).

Phase 19 deltas (estimates):

| Change | Delta |
|---|---|
| `app.js`: `EditorialFace` object (init/render/teardown + paragraph templates + selection + cross-fade scheduler + helpers) | ~10 to 12 KB |
| `app.js`: `CONFIG.driftClasses.timeByFace` + `CONFIG.macroShift.timeIntervalHoursByFace` + `rightBlockHomesByFace` + `timeHomesByFace.editorial` | ~0.4 KB |
| `app.js`: `MacroShifter` reads per-face interval, paired-block target, target id fork for Editorial | ~0.6 KB |
| `app.js`: `DriftEngine` reads `timeByFace` overlay | ~0.2 KB |
| `app.js`: `ClockfaceRegistry.normalizeTweaks` editorial block | ~0.3 KB |
| `app.js`: `ObservanceModule._builtIn` `name_long` field on 7 entries | ~0.4 KB |
| `app.js`: `window.EditorialFace` assignment | ~0.05 KB |
| `style.css`: Editorial face styles | ~2.6 KB |
| `index.html`, `clockface.html`: Cormorant Garamond link tag | ~0.2 KB |
| `clockface.js`: Editorial card mount, preview-mode macro shim, accelerated rotation, dropline test toggle | ~1.5 KB |
| Cormorant Garamond 300 italic WOFF2 (network only, cached after first hit) | ~24 to 32 KB |
| **Total Phase 19 delta (excluding font)** | **~16 to 18 KB** |
| **Total Phase 19 delta (including font)** | **~40 to 50 KB** |

Phase 19 cumulative total: ~195 to 220 KB. Headroom against the 250 KB target: ~30 to 55 KB. Phase 20 (Horizon) is budgeted at 25 to 35 KB (no new font; reuses existing). Margin is adequate but tight; if Horizon exceeds 35 KB, a font-subsetting pass or self-hosted subset of Cormorant Garamond becomes the first place to recover bytes.

If Phase 18's actual size lands at the high end of its estimate, Phase 19 has roughly 25 KB headroom for the Cormorant font + Editorial code. The font alone could consume 32 KB; in that case `EditorialFace` and its templates must compress to ~10 KB, which is feasible (the templates total ~600 bytes of copy + ~3 KB of selection logic).

## 21. Test Plan

### Manual

| Test | Expected |
|---|---|
| Open `clockface.html`, scroll to Editorial card | Live preview renders via `window.EditorialFace.init(card)` + `render(PREVIEW_STATE, tweaks)`. `HH:MM` reads 24h with colon in `--type-accent`. Right-column block shows `THIS EVENING` / `Monday,` / `May 11.`. Paragraph reads one of the 8 templates. Footer reads 4 cells with `Tide / Air / Sun / Almanac`. |
| Wait 32 s on Editorial card | Paragraph cross-fades to next template over 1200 ms. New template id differs from previous (or stays same if hash collides; document case). |
| In picker, set Editorial `timeFormat` to `12h`, Apply | Main display reloads. Headline time renders as `H:MM AM` with `AM`/`PM` at 56 px Manrope 200, baseline-aligned. Colon stays at 360 px Cormorant italic. Footer SUN cell uses 12h time format. |
| Toggle `timeFormat` back to `24h` | Time renders `HH:MM`. No AM/PM span present. |
| Open `index.html` with `solari.clockface = 'editorial'` | Editorial renders. Console shows no warnings. Stage scale is 1.0 on 1180 x 820 iPad viewport. |
| Wait 6 h (or mock the time) | Composition swaps. `#ed-time` translates from Home A (x=100, y=200) to Home B (x=560, y=200) over 60 s ease-in-out. `#ed-right` translates from x=850 to x=290 in lockstep. Paragraph and footer stay anchored. |
| In picker, enable `previewMode`, wait 6 s | Composition swap completes in 1 s. Repeats every 6 s. |
| Set system date to June 21 (summer solstice) | `AppState.observance.treatment === 'light'`, `name_long === 'Solstice, June 21.'`. Dropline shows above the time numerals at x=100, y=170 in 28 px Cormorant italic, `--type-secondary`. SkyColorModule applies the solstice tint to the type tokens. |
| Set system date to Dec 25 (Christmas, major) | Dropline stays hidden (`treatment === 'major'`). `--type-primary` repaints via SkyColorModule. Editorial inherits the repaint on all elements. |
| Add a custom observance with `treatment: 'light'` and `name_long: 'Birthday, July 15.'`, set date to July 15 | Dropline shows `Birthday, July 15.` |
| Set weather condition to `FOG` with visibilityKm: 0.5 | Paragraph rotates to template `fog-day` within at most 32 s: `Fog folds across the city. Visibility holds at 0.5 km.` (token span `0.5 km` in `--type-primary`). |
| Set weather to `RAIN`, tempC = 8 | Paragraph rotates to `rain-day`: `Steady rain across the strait, 8°.` |
| Set time to night (h=22) and weather to CLEAR, moon `New Moon` | Paragraph rotates to `night-clear-new`. |
| Set every gate-matchable slice to states no condition-gated template matches (e.g. condition=CLEAR, period=afternoon, moon=waxing -- no template gates afternoon+clear) | Paragraph falls back to `generic` template (template 8). |
| Long-press `#ed-time` for >= 600 ms | `clockface.html` opens. Short tap (< 600 ms) on `#ed-time` toggles the `VersionOverlay` build-info toast. |
| Resize viewport to 1366 x 1024 | Stage scale recomputes to 1.157; Editorial scales uniformly. Drift amplitudes unchanged in stage pixels. |
| Run 24 h endurance | Memory growth within 5% of Phase 17 baseline. No DOM node leaks from paragraph cross-fade (the swap mutates `innerHTML` in place; no clones). Composition macro shift fires 4 times in 24 h. |
| Set `driftIntensity` to `off`, Apply | Time, right-column block, paragraph, footer all hold their stage anchors with zero drift offset. Macro shift continues. Paragraph rotation continues. Pixel-shift safety net continues to apply. |
| Set `driftIntensity` to `restless`, Apply | Drift amplitudes are 1.5x. Time element drifts up to 45 px X / 33 px Y (1.5 * 30/22). Stays within stage bounds. |
| 03:00 refresher | Stage fades to `#404040` for 30 s, returns to Editorial. Paragraph cross-fade state restores correctly (no orphan `is-fading-out` classes). |

### Automated where possible

- Lint pass on `app.js`, `style.css`, `clockface.js` (existing CI gates).
- `EditorialFace.init()` and `teardown()` exercised: re-init removes the previous subtree before building.
- `ClockfaceRegistry.normalizeTweaks` round-trip for Editorial-specific malformed inputs:
  - `{ byFace: { editorial: { timeFormat: 'foo' } } }` -> `'24h'`
  - `{ byFace: { editorial: { previewMode: 'yes' } } }` -> `false`
  - `{ byFace: { editorial: null } }` -> `{ timeFormat: '24h', previewMode: false }`
- Template selection determinism: for a fixed `(period, weather, moon)` tuple, `_activeTemplate(state)` returns the same template across 1000 calls.
- Per-template placeholder substitution: each placeholder in each template resolves to a non-empty string when the relevant `AppState` slice is populated, and to `—` when null.

### Sentry endurance hooks

Add three counters to the existing endurance dashboard:

| Metric | Source | Reason |
|---|---|---|
| `editorial.paragraph.swapCount` | `EditorialFace._maybeRotateParagraph` | Should grow by ~1 per 32 s while Editorial is active. Spikes indicate a stuck loop; flatlines indicate the rotator hung. |
| `editorial.macro.shiftCount` | `MacroShifter._applyTime` when `FACE_ID === 'editorial'` | Should grow by 4 per 24 h. |
| `editorial.dropline.activeSince` | `EditorialFace._renderDropline` (writes ISO timestamp when dropline becomes visible) | Confirms dropline activates on light observance days and clears the next day. |

### Long-running validation

Editorial must survive a 7-day endurance run with no memory growth and no DriftEngine slowdown, on par with Calm and Mechanical. Specific watch points:

1. Paragraph cross-fade `setTimeout` handles must not accumulate. The current design fires one per swap and the swap mutates `innerHTML` in place (no clones); no `transitionend` cleanup needed. A `clearTimeout` on next swap-in handles the rare case where two swaps queue (e.g. preview-mode acceleration glitches).
2. The composition macro shift fires 28 times in 7 days (4 per day x 7). The `transition: left 60s` plus `transition: top 60s` rules on `#ed-time` and `#ed-right` must not leak completed `transitionend` listeners (CSS transitions in style declarations do not register listeners, so this is structurally safe; flagged for hermione review).
3. Dropline state across multiple light-observance days: confirm `_lastObservanceName` resets correctly when the observance changes from one day to the next, or from a light observance to no observance.
4. Cross-fade interrupted by 03:00 refresher: the refresher overlay covers the stage; if a cross-fade is mid-flight at 03:00:00, the `setTimeout(.., 1200)` still fires under the overlay and the new content is in place when the overlay clears at 03:00:30.

## 22. Shipped Status

Resolved items from hermione review and implementation. All were closed before merge.

- **First-frame anchor seeding** -- SHIPPED. `DriftEngine.start()` seeds `_anchorPercents.time` from the per-face home A pixel coordinates when Editorial is active, so the time element does not jump on the first macro shift.
- **Dual-source CONFIG sync** -- SHIPPED. `clockface.js` reads `ACCENT_PALETTE` via an explicit dual-source comment, matching the pattern established in Phase 17 for `DRIFT_INTENSITY_MULT`.
- **Cross-fade race guard** -- SHIPPED. `EditorialFace._maybeRotateParagraph` clears `_fadeTimerId` before scheduling a new swap, preventing double-fire if two swaps queue (e.g. preview-mode acceleration glitch).
- **117/143s coprime periods** -- SHIPPED as a carry-forward from Phase 7. The Editorial `time` channel retains the pre-existing 117 s period; a design comment in `CONFIG.driftClasses` documents the coprime intent for the full channel set.

## 23. Open Questions

Items remaining after the chihiro decision pass. None block implementation; all have defaulted resolutions noted below.

1. **Cormorant Garamond FOUT on first boot.** The CSS fallback chain (`Georgia`, `Times New Roman`, `serif`) is plausible but un-tested on iPad Safari 18+. Georgia is bundled with iPadOS and reads close enough to Cormorant Garamond at 360 px italic that a sub-200 ms swap is acceptable. **Resolution: ship with `font-display: swap` (Google Fonts default). If FOUT is visually jarring at 360 px on first boot, revisit self-hosting or pre-warming via a `<link rel="preload">` tag in a follow-up.** No user blocker.

2. **Template hash collision rate.** With 8 templates and `(period x weather-state x moon-phase)` = 5 x 5 x 4 = 100 tuples, several tuples will map to the same template via the hash. The condition-gate filter narrows the candidate set first, so collisions only occur among the generic fallback case. **Resolution: accept the natural distribution; if a single template dominates the generic case unfairly during testing, tune `_hash()` or add a tuple-specific bias in a follow-up.** Not a user decision.

3. **Paragraph copy refinement.** The 8 starter templates are seed copy. chihiro and the user will refine the prose post-merge. **Resolution: ship the starter copy; iterate via PRs against `PARAGRAPH_TEMPLATES` array. Schema and gate structure are frozen; only string literals and gate values change.**

4. **Dropline drift binding.** The dropline (rare, 24-hour hold) is currently not bound to a drift channel. If a single light-observance day produces visible burn-in stress on the dropline, an opt-in binding to the `date` channel is a one-line change. **Resolution: defer to hermione's burn-in review; not a user blocker.**

5. **Vertical line break in long paragraphs.** Templates that produce long sentences may wrap to 3 lines at 540 px / 26 px / 1.35 line-height. The paragraph container is sized for 3 lines (~108 px tall) but does not currently enforce a max-height. **Resolution: rely on authoring discipline (Section 12 rule 7: 2-3 sentences max). If a template overflows in production, the container clips silently rather than pushing into the footer; this is the safest failure mode.**

## 24. References

- SDD Section 9 (Burn-in Protection, eight layers).
- SDD Section 11.1 (Kinetic transition timing; the paragraph cross-fade is the SDD-compliant Layer 3 substitution for Editorial).
- SDD Section 12 (Macro position shifts; per-face interval and paired-block additions).
- SDD Section 15 (Observance system; `name_long` field addition).
- SDD Section 17 (Layout grid, font sizes; magazine composition).
- SDD Section 22 (Acceptance criteria for endurance).
- `docs/phase-16-clockface-foundation.md` (foundation contract Phase 19 inherits).
- `docs/phase-17-mechanical-face.md` (canonical face-spec shape and `SOLARI_PICKER` boot guard pattern).
- `docs/phase-18-departures-face.md` (footer / `tickRail` channel reuse precedent).
- `design_handoff_clockface/README.md` section "Editorial" (visual reference; superseded by chihiro's locks where they differ -- notably Instrument Serif -> Cormorant Garamond, paragraph rotation, paired macro shift, observance dropline).
- `design_handoff_clockface/clockface.html` lines ~572-667 (Editorial prototype; reference only -- production face uses Cormorant Garamond and adds the dropline + paragraph rotation that the prototype lacks).
- `app.js` (Phase 17 state) -- `CONFIG.driftClasses` (Phase 16 reservations), `CONFIG.macroShift.timeHomesByFace` (Phase 17 per-face hook to extend), `ObservanceModule._builtIn` (Phase 15 entries to extend with `name_long`), `MechanicalFace` (face shape to mirror), `ClockfaceRegistry.normalizeTweaks` (validation hook to extend), boot IIFE `SOLARI_PICKER` guard.
- MDN: [`@font-face`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face), [`font-display`](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display), [`CSS Transitions`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions), [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).
