# Phase 16: Clockface Foundation

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 16 of 20 (V1, opening phase) |
| Status    | Shipped                      |
| Shipped   | 2026-05-07                   |
| Date      | 2026-05-07                   |
| Author    | ariadne                      |
| Impl      | misaka                       |
| Depends   | V0 complete (Phases 1 to 15) |
| Unblocks  | Phase 17 to 20 (one face each) |

## 1. Goal

Phase 16 introduces the foundation for user-selectable clockfaces without shipping any new face. It adds a separate picker page (`clockface.html` plus `clockface.js`), the `localStorage` plumbing the main display reads on boot, the face rendering interface every face must satisfy, and a fixed 1180x820 stage primitive scaled by CSS transform. The shipped Calm face is preserved as the only face in the registry and matches the shipped V0 visual baseline verbatim: positions, sizes, weights, slot count, and rotation cadence are all unchanged from V0. Phases 17 to 20 add Mechanical, Departures, Editorial, and Horizon, one per phase, against this foundation.

## 2. Scope and Non-Scope

### In scope
- New picker page (`clockface.html`, `clockface.js`).
- Storage contract (`solari.clockface`, `solari.clockface.tweaks`, `solari.clockface.applied_at`).
- Face registry and rendering interface contract in `app.js`.
- Stage primitive (1180x820 fixed canvas with CSS `transform: scale(...)` and viewport letterbox in `--bg`).
- Calm face migration onto the stage primitive, matching the shipped V0 visual baseline verbatim. Positions, sizes, weights, slot count, and 32 s rotation cadence are unchanged. The migration is a layout-engine swap (vw/vh -> fixed-stage with proportional pixel coordinates), not a visual redesign.
- Two global tweaks: `accent` (gold | sky | sage | paper) and `driftIntensity` (off | subtle | normal | restless).
- Drift amplitude per element class (defined globally, not per face), and a sixth coprime drift period reserved for departure rows (Phase 18).
- All eight burn-in protection layers verified as still active for Calm running on the stage.

### Non-scope
- Mechanical face implementation. Deferred to Phase 17.
- Departures face implementation. Deferred to Phase 18.
- Editorial face implementation. Deferred to Phase 19.
- Horizon face implementation. Deferred to Phase 20.
- Per-face tweaks beyond the two globals. Per-face tweaks live under `tweaks.byFace[faceId]` and are populated by 17 to 20.
- `accentSkyTrack` opt-out hook for sky color modulation. Deferred to 17 to 20.
- Per-face observance treatments such as Departures imminent tint and Editorial italic dropline. Reserved tokens only; the data contract does not change.
- Cormorant Garamond and JetBrains Mono webfont loads. Deferred to the phases that need them.
- A `showSeconds` tweak. Removed from the schema; each face dictates whether seconds are displayed.

## 3. Storage Contract

The picker writes three keys; the main display reads them on boot and on `storage` events.

```js
// Reads (app.js boot)
const FACE_ID = localStorage.getItem('solari.clockface') || 'calm';
const TWEAKS_RAW = localStorage.getItem('solari.clockface.tweaks');
const TWEAKS = ClockfaceRegistry.normalizeTweaks(TWEAKS_RAW);

// Writes (clockface.js apply())
localStorage.setItem('solari.clockface', faceId);            // see allowed values below
localStorage.setItem('solari.clockface.tweaks', JSON.stringify(tweaks));
localStorage.setItem('solari.clockface.applied_at', new Date().toISOString());
```

### Schema

```ts
// Allowed faceId values, V1 final list
type FaceId = 'calm' | 'mechanical' | 'departures' | 'editorial' | 'horizon';

type Accent = 'gold' | 'sky' | 'sage' | 'paper';
type DriftIntensity = 'off' | 'subtle' | 'normal' | 'restless';

type Tweaks = {
  accent: Accent;                  // global, default 'gold'
  driftIntensity: DriftIntensity;  // global, default 'normal'
  byFace: {
    [faceId: string]: object       // populated by Phases 17 to 20; empty in Phase 16
  };
};
```

### Defaults

```js
const TWEAK_DEFAULTS = {
  accent: 'gold',
  driftIntensity: 'normal',
  byFace: {}
};
```

### Validation rules
- Unknown `faceId`: fall back to `'calm'`.
- Missing `accent` or `driftIntensity`: fill from `TWEAK_DEFAULTS`.
- Unknown enum value in `accent` or `driftIntensity`: replace with default.
- Malformed JSON in `solari.clockface.tweaks`: ignore and use defaults. Do not throw.
- Missing `byFace`: replace with `{}`.

`ClockfaceRegistry.normalizeTweaks(raw)` is the single normalization point. It returns a fully populated, schema-conformant object. The main display calls it once at boot. The picker calls it whenever it loads existing tweaks.

### Apply behaviour

`Apply` writes all three keys atomically. The picker then triggers a full reload of the main display via the `storage` event: when `solari.clockface` (or any of the three keys) changes in another tab/window, the main display's `storage` listener calls `location.reload()`. Face changes are rare configuration events, not live state; a full reload guarantees a clean module restart and avoids partial-rebind bugs. Phase 16 does not implement hot-swap; the `teardown()` shape on the face interface is reserved for a future phase.

The picker itself does not reload; it shows a 2.4 s confirmation toast (e.g. `CALM APPLIED`) and remains on the same face for further tweaks.

#### Same-tab navigation

The `storage` event only fires across browsing contexts, not within the same tab. If the user navigates from `clockface.html` to `index.html` in the same tab via the back link, the main display loads fresh and reads the new keys on its first boot pass; no event handling is needed for that case. The `storage` listener handles only the cross-tab case (picker open in tab A, display open in tab B), which is how the always-on iPad use case operates.

## 4. Picker Page Design

### Files

| File | Size budget | Purpose |
|---|---|---|
| `clockface.html` | < 2 KB | Markup shell, font link, `<script>` tag for `clockface.js`. Loads only Manrope 200/300 in Phase 16. |
| `clockface.js` | < 12 KB | Picker chrome, face registry rendering, tweak panel, apply, dot navigation, keyboard handling. Plain ES2020+, no JSX, no React, no transpiler. |

The third JS file is justified because the picker is a single-purpose configuration page that the always-on display never loads. Keeping it out of `app.js` preserves runtime focus.

### Layout

- `position: fixed; inset: 0;` page chrome in `vw`/`vh` units.
- A vertical scroll-snap container (`scroll-snap-type: y mandatory; scroll-snap-stop: always`) holds one `<section>` per face. Each section contains a stage primitive that renders that face live.
- Top-left chrome: `SOLARI . CLOCKFACE` label, `<- display` link back to `index.html`.
- Right-edge dot navigation: one dot per face, the active dot highlighted.
- Bottom toolbar: face name and one-line blurb, index `01 / 05`, `Tweaks` toggle, gold `Apply` button.
- Tweaks panel: floating, docked bottom-right, ~320 px wide, ~200 px tall in Phase 16 (two rows: drift, accent). Closes on Escape or by re-clicking the toggle. Tweaks edits update the live preview but only persist on `Apply`.

### Phase 16 face count

The picker registry contains five entries. In Phase 16, only Calm renders a real face. The other four entries render a placeholder card:

- Stage centred `Manrope 200, 96px` text reading the face name in `--type-tertiary`.
- Below, mono `12px` letter-spacing `0.32em` line: `COMING SOON . PHASE NN`.
- The `Apply` button is disabled when a placeholder face is active. The dot and toolbar entries remain active so users can scroll, preview, and learn the names.

This keeps the picker shape stable for users and reviewers while we iterate on the foundation. When Phase 17 lands, Mechanical's placeholder is replaced with a real component without further chrome work.

### Keyboard

| Key | Action |
|---|---|
| ArrowDown, PageDown, j | Next face |
| ArrowUp, PageUp, k | Previous face |
| Escape | Close tweaks panel |
| Enter (when Apply button focused) | Apply |

### UX flow

1. User opens `clockface.html`.
2. `clockface.js` reads `solari.clockface` and scrolls to that face.
3. User scrolls or taps a dot to change preview.
4. User opens Tweaks panel and adjusts `accent` or `driftIntensity`. Preview updates immediately (live CSS variable writes). Persistence does not happen yet.
5. User clicks `Apply`. The three storage keys are written. Toast appears for 2.4 s. The main display reloads.

### Live data and live drift on the picker

The picker displays mock data for non-Calm placeholders (irrelevant in Phase 16). For Calm preview, the picker uses the same `AppState` shape as the main display, but the picker does not run fetchers. It seeds a static mock object so the preview is deterministic. Real data will only appear on the main display after `Apply` and reload.

Drift is live: each face card mounts the same `DriftEngine` used by the main app, scaled down by the card's CSS `transform: scale(...)`. The DriftEngine writes its CSS variables on the card's stage element, and the card's transform scales those pixel offsets uniformly with the card itself. A `driftIntensity` change in the Tweaks panel rewrites the multiplier immediately, and all visible cards reflect the new amplitude on the next rAF frame. The picker is a separate page (not always-on), so the additional rAF cost across N face cards is acceptable.

When a face card scrolls off-screen, its DriftEngine instance pauses (via `IntersectionObserver`) to avoid unnecessary work. The active card always runs.

```js
const PREVIEW_STATE = {
  time: { hours: 8, minutes: 14, seconds: 0, ampm: 'PM' },
  date: { dayOfWeek: 'Wednesday', day: 7, month: 'May', year: 2026, isoDate: '2026-05-07' },
  weather: { tempC: 12, condition: 'PARTLY_CLOUDY' },
  aqi: { value: 28, band: 'good' },
  tide: { type: 'high', heightM: 4.3, time: '04:22' },
  sun: { sunrise: '5:22 AM', sunset: '8:47 PM', dayLengthMin: 925 },
  moon: { phase: 0.18, illumination: 0.18, phaseName: 'Waxing Crescent' },
  almanac: null,
  observance: null,
  alertPreempt: null
};
```

## 5. Stage Primitive

### Why

V0 uses `vw`/`vh` units, which scale fluidly but force every typographic decision to be re-tuned per viewport. V1 faces have larger, more brittle compositions where pixel-level relationships matter. A fixed stage with CSS transform scaling is the ergonomic compromise: faces are authored in one absolute pixel coordinate system, and the stage handles fit-to-viewport.

### Definition

The stage is a 1180 x 820 absolutely-positioned `<div>` whose contents use absolute pixel coordinates. CSS computes a uniform scale factor and applies it via `transform: scale(...)`. The scale is uncapped: it can be any value greater than zero, including values above 1.0. There is no letterboxing logic; the stage fills as much viewport as the uniform scale allows, and remaining margin (if any, due to aspect ratio) is `--bg` (`#0a0a0a`), which is identical to the body background.

```css
:root {
  --stage-w: 1180;
  --stage-h: 820;
  --stage-scale: 1;
}

#stage {
  position: absolute;
  width: calc(var(--stage-w) * 1px);
  height: calc(var(--stage-h) * 1px);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(var(--stage-scale));
  transform-origin: center center;
}
```

JS computes the scale on boot and on `resize`:

```js
function recomputeStageScale() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const s = Math.min(W / 1180, H / 820);
  document.documentElement.style.setProperty('--stage-scale', s.toFixed(4));
}
```

For the iPad Air M4 in landscape (1180 x 820 logical viewport), the scale is `1.0` exactly. For the 1366 x 1024 13-inch logical viewport, the scale is `1.157`. On a larger external monitor (e.g. a 1920 x 1080 reference display), the scale would be `~1.317`. All Calm content is vector (Manrope text and the moon SVG), and Phases 17 to 20 also produce vector content (SVG diagrams, vector typography), so scaling above 1.0 is sharp on retina hardware. No upscaling cap is needed.

Recompute fires on `window.resize` only; the iPad's landscape orientation is fixed in production, so the listener is essentially idle.

### Co-existence with `vw`/`vh`

The picker chrome (top bar, dots, toolbar, tweaks panel) continues to use `vw`/`vh` units. It is the only thing the user reads at the operating-system level, and fluid scaling is preferable. Only the stage itself is fixed-pixel.

### Calm migration onto the stage

The shipped V0 layout uses CSS variables `--time-x`, `--time-y`, `--moon-x`, etc., expressed as percentages, with absolute positioning at the page root. Phase 16 keeps those variables but moves the elements into `#stage`. The semantic positions (centre of stage at 50%/44% etc.) become positions inside the 1180x820 box. Drift offsets in pixels continue to apply as today.

The DriftEngine viewport-clamping logic (currently using `window.innerWidth` and `window.innerHeight`) is rewritten to clamp against the stage box dimensions (1180 x 820), not the viewport. This is the only DriftEngine change. The rAF cadence, period table, and per-element amplitudes are otherwise unchanged.

```js
// app.js DriftEngine._loop changes
// Before: const vw = window.innerWidth; const vh = window.innerHeight;
// After:  const vw = CONFIG.stage.width; const vh = CONFIG.stage.height;
```

Macro shifts (`MacroShifter`) re-target the same element IDs but interpret percentages against the stage, not the viewport. No Phase 12 logic changes besides the same vw/vh -> stage swap.

## 6. Face Rendering Interface

Faces are not standalone modules; they are render objects that live inside `app.js` alongside the existing modules. The two-file rule (`app.js` plus the picker's `clockface.js`) is preserved. A small `Stage` helper handles DOM scaffolding shared across faces (the `#stage` element itself, common containers, the `position: relative` parent for absolute children).

A face is a plain object with three methods. It reads `AppState` slices and writes DOM nodes. It does not mutate `AppState`. It does not register fetchers, timers, or external effects.

### Contract

```js
const CalmFace = {
  // Called once on boot, after Stage scaffolding is in place and before
  // any module starts. Receives the stage element. Builds the face's DOM
  // subtree (with the same element IDs DisplayModule expects) and caches
  // any handles. Must be idempotent.
  init(stage) { /* ... */ },

  // Called every clock tick (1 Hz) by the existing DisplayModule loop.
  // Receives the latest AppState snapshot (read-only) and the active
  // tweaks (read-only). Updates DOM text and attributes. Never allocates
  // DOM nodes here.
  render(state, tweaks) { /* ... */ },

  // Reserved for the future hot-swap path. Phase 16 does not call this;
  // face changes go through full reload via the storage event. The shape
  // is defined now so Phase 17 to 20 faces can stub it consistently.
  teardown() { /* ... */ }
};
```

The future faces (`MechanicalFace`, `DeparturesFace`, `EditorialFace`, `HorizonFace`) implement the same three-method shape and live in the same `app.js`.

### Stage helper

```js
const Stage = {
  // Creates #stage if absent, sets its CSS sizing tokens, attaches the
  // resize listener that recomputes --stage-scale, and returns the
  // element so the face can populate it.
  init() { /* returns the #stage element */ }
};
```

### Registry

```js
const ClockfaceRegistry = {
  DRIFT_CLASSES: ['time', 'date', 'slot', 'moon', 'sun', 'horizon', 'departureRow', 'tickRail'],

  faces: {
    'calm': CalmFace,
    // 'mechanical': MechanicalFace,   // Phase 17
    // 'departures': DeparturesFace,   // Phase 18
    // 'editorial':  EditorialFace,    // Phase 19
    // 'horizon':    HorizonFace       // Phase 20
  },

  resolve(faceId) {
    return this.faces[faceId] || this.faces['calm'];
  },

  normalizeTweaks(raw) { /* ... validation per Section 3 ... */ }
};
```

### How DisplayModule and the rotator integrate

`DisplayModule.render()` continues to be the per-tick driver. After Phase 16 it ends with a single call to `ACTIVE_FACE.render(AppState, TWEAKS)`. The rotator integration is unchanged: `RotatorModule` continues to read `AppState.alertPreempt` and write `AppState.rotator.text`, and the active face's `render()` reads the rotator state when it paints `#slot`. There is no `rotatorBinding()` method on the face object; faces that want to surface rotator output simply read `AppState.rotator.text` in `render()`.

### Drift class names

`time`, `date`, `slot`, `moon`, `sun`, `horizon`, `departureRow`, `tickRail`. Calm uses the first four. The remaining four are declared in Phase 16's CONFIG but are unused until 17 to 20.

### Observance integration

ObservanceModule continues to mutate `--type-primary` and `--type-accent` directly via `SkyColorModule`. Calm honours this by inheriting those tokens. There is no per-face observance-target declaration in Phase 16; faces that need to scope observance repaints can introduce a per-face hook in 17 to 20.

### What faces must not do
- Mutate `AppState`.
- Register `setInterval` or `setTimeout` outside the rendering loop.
- Add `position: fixed` elements or solid filled blocks.
- Read `localStorage` directly. Tweaks are passed into `render(state, tweaks)`.
- Modify `--type-primary`, `--type-accent`, or `--lum-mod`. These are owned by `SkyColorModule`, `ObservanceModule`, and `LuminanceBreath`.

## 7. Calm Face Specification

Calm in Phase 16 matches shipped V0 verbatim. There are no visual diffs: positions, sizes, weights, slot count, and rotation cadence all carry over unchanged. Stage positions below are the shipped percentage-based positions (`--time-y: 44%`, `--date-y: 66%`, `--slot-y: 84%`, `--moon-x: 84%`, `--moon-y: 12%`) computed against the 1180x820 fixed stage.

The two values that are sometimes mistakenly listed as "diffs" (date y-position, slot rotation cadence) are not changes from V0; they are corrections to the design handoff prototype (which doubled the date strip and proposed 8 s slot rotation). Shipped V0 already has one date strip at 66% and 32 s rotation. Phase 16 preserves both.

### Element list

| Element ID | Stage position (px) | Anchor | Content |
|---|---|---|---|
| `#time` | x=590, y=361 (50% / 44% of 1180/820) | translate(-50%, -50%) | `H:MM AM` (12 h), Manrope 200, **165 px** (shipped `14vw` proportional to the 1180 px stage), letter-spacing -0.02em, line-height 1, `--type-primary`. Colon in `--type-accent` at the existing opacity. |
| `#date` | x=590, y=541 (50% / 66% of 1180/820) | translate(-50%, -50%) | Day-of-week and month/day from the existing `DisplayModule` formatter, Manrope 300 (shipped weight; the existing `Manrope:wght@200;300` font link already covers this), **47 px** (shipped `4vw` proportional to the 1180 px stage), letter-spacing 0.04em, uppercase, `--type-secondary`. Position, size, weight, and content all match shipped V0. |
| `#slot` | x=590, y=689 (50% / 84% of 1180/820) | translate(-50%, -50%) | Single rotating slot (the shipped rotator), Manrope 300, 42 px (shipped `3.6vw` proportional to the 1180 px stage), letter-spacing 0.08em, uppercase, `--type-secondary`. Cycles every 32 s with 1500 ms split-flap cascade and 70 ms per-character stagger -- all shipped V0 values. The slot is driven by the shipped `RotatorModule` and its `CONFIG.slotSources` (see "Slot sources" below). |
| `#moon-disc` | x=991, y=98 (84% / 12% of 1180/820) | translate(-50%, -50%) | SVG moon disc, 142 x 142 px (12% of stage width, matching shipped). Existing `MoonModule.renderDisc` output. |

Element IDs (`#time`, `#slot`, `#date`, `#moon-disc`) are the shipped IDs; `DisplayModule` already targets them, so the migration moves these nodes inside `#stage` without renaming. No new font weights are loaded for Phase 16; Manrope 200 and 300 are already on the page.

### Drift assignments

| Element | Drift class | ampX (px) | ampY (px) | period (s) |
|---|---|---|---|---|
| `#time` | time | 24 | 18 | 117 |
| `#date` | date | 12 | 8 | 89 |
| `#slot` | slot | 12 | 8 | 143 |
| `#moon-disc` | moon | 18 | 12 | 73 |

Amplitudes are smaller than V0 because the stage is now fixed-pixel (V0 used larger pixel values to account for vw/vh scaling on larger viewports). With the stage clamped to 1180 x 820 and viewport clamping against the stage box, these amplitudes give the same visual feel as V0 on the iPad target.

### Slot sources

Calm preserves the shipped V0 multi-source rotator verbatim. The slot is a single visible position that cycles through multiple sources defined by the existing `CONFIG.slotSources` and consumed by `RotatorModule._sources` in `app.js`. Phase 16 does not change the source list, the rotation logic, or the `KineticType` cascade.

The shipped sources, in cycle order, are:

1. Next sun event (`SUNRISE HH:MM AM` or `SUNSET H:MM PM`, whichever comes next; null after sunset)
2. Weather (`{CONDITION} {tempC}°`; null if either field is null)
3. AQI (`AQI {value} {BAND}`; null if value is null)
4. Daylight (`DAYLIGHT {h}H {mm}M`; null until SunModule reports)
5. Tide (`HIGH TIDE {h.h}M {time}` or `LOW TIDE ...`; null if no current event -- e.g. when `data/tides.json` has no future events, the slot quietly skips)
6. Time-until-next-sun-event (`SUNRISE IN {h}H {mm}M` or `SUNSET IN ...`)
7. Almanac entry (`{name} TODAY` / `TOMORROW` / `{day-abbr}`; null if no near-term entry)
8. Observance entry (from `ObservanceModule.slotEntry()`; null when no observance is active)

Null sources are skipped silently and the next non-null source advances. Alert preemption (`AppState.alertPreempt`) overrides the rotation as today.

Hold time per source: 32 s. Cascade duration: 1500 ms. Per-character stagger: 70 ms. These are the existing shipped values from `CONFIG.rotation`; nothing changes about `KineticType` or `RotatorModule`.

### Null-state behaviour

The shipped `RotatorModule` already handles null slices: each source function returns null when its underlying `AppState` slice is incomplete, and `_rotate()` advances to the next non-null source. Phase 16 does not change this logic. The face migration onto the stage does not introduce new null states.

Per-slice expectations (unchanged from V0, included here for completeness):

| Slice null | Behaviour |
|---|---|
| `weather` | Weather source returns null; sky color falls back to clear sky. |
| `aqi` | AQI source returns null. |
| `tide` | Tide source returns null. As of 2026-05, `data/tides.json` was past-only and the tide slot was permanently invisible; the weekly GitHub Actions workflow now refreshes it. The rest of Calm renders normally regardless. |
| `almanac` | Almanac source returns null. |
| `observance` | No observance slot entry; date string uses the standard `dayOfWeek . Month Day` format. |
| `sun` (transient at boot) | Sun-event and daylight sources return null until the first SunModule tick. |

If every source returns null, `RotatorModule` keeps the previous slot text and `KineticType` char spans remain populated; there is no flicker.

### Burn-in audit (Calm on stage)

Worst case: `#time`, the largest element at 165 px Manrope 200, holds the same minute glyphs (e.g. `8:14 PM`) for at most 60 s of pixel content before the minute changes. Within those 60 s, drift moves the glyph block by up to 24 px X / 18 px Y on a 117 s sine. The pixel-shift safety net adds +/- 4 px every 6 min. MacroShifter relocates the time element every 3 h.

For the colon (the only stable character within `H:MM`), the colon glyph at 165 px Manrope 200 is roughly 4 px wide. With 24 px X amplitude on a 117 s period, the glyph traverses its entire amplitude band in 58.5 s, so no pixel inside the colon stays lit for more than ~58 s without movement. This is well within the 6 min static threshold.

For `#date`, the day-of-week line changes at local midnight. Within a day, characters are stable. Drift on `date` (12/8/89 s) plus pixel-shift (4 px every 6 min) plus 3 h macro shifts plus daily 30 s refresher cover all eight layers.

For `#moon-disc`, the SVG geometry changes by sub-pixel amounts every 6 h via `MoonModule`. Drift on `moon` (18/12/73 s) plus 6 h macro shifts to four corners covers it.

No element exceeds 6 min static. No element occupies a fixed pixel rectangle for hours.

### Observance integration

ObservanceModule integration is unchanged from V0. Per Phase 15 contract, `ObservanceModule.update()` mutates `--type-primary` and `--type-accent` via `SkyColorModule`. Calm's `#time`, `#date`, and the colon all inherit those tokens, so observance accent repaint happens automatically. `RotatorModule._sources` already includes the observance source, so observance entries are pushed into the slot rotation as today. No per-face declaration is required in Phase 16.

### Sky color modulation

Calm participates as it does today. `SkyColorModule.update()` writes `--type-primary`, `--type-secondary`, `--type-accent` on a 60 s linear transition (per the existing `@property` block). All Calm elements inherit these tokens and tint accordingly. Phase 16 does not introduce an `accentSkyTrack` opt-out; that is reserved for Phase 18 (Departures gold and Phase 20 Horizon may need to opt out).

## 8. CONFIG Additions and CSS Token Changes

### CONFIG additions in `app.js`

Add after `CONFIG.macroShift`:

```js
clockface: {
  defaultFaceId: 'calm',
  reloadOnApply: true
},
stage: {
  width: 1180,
  height: 820
},
driftClasses: {
  time:         { ampX: 24, ampY: 18, periodSec: 117 },
  date:         { ampX: 12, ampY: 8,  periodSec: 89  },
  slot:         { ampX: 12, ampY: 8,  periodSec: 143 },
  moon:         { ampX: 18, ampY: 12, periodSec: 73  },
  sun:          { ampX: 18, ampY: 12, periodSec: 101 },  // reserved, used Phase 20
  horizon:      { ampX: 18, ampY: 12, periodSec: 101 },  // reserved, used Phase 20
  departureRow: { ampX: 6,  ampY: 4,  periodSec: 61  },  // reserved, used Phase 18
  tickRail:     { ampX: 4,  ampY: 3,  periodSec: 79  }   // reserved, used Phase 17
}
```

The legacy `CONFIG.drift` block (lines 31 to 38 of `app.js` today) is removed; DriftEngine reads from `CONFIG.driftClasses` instead. Pixel-shift configuration moves into `CONFIG.driftClasses.pixelShiftIntervalMin` and `pixelShiftAmplitude` siblings, or is kept on a top-level `CONFIG.pixelShift` block (implementer's choice; either is straightforward).

#### Coprime period table

| Element class | Period (s) | Status in Phase 16 |
|---|---|---|
| time | 117 | Active (Calm) |
| date | 89 | Active (Calm) |
| slot | 143 | Active (Calm) |
| moon | 73 | Active (Calm) |
| sun | 101 | Reserved (Phase 20) |
| departureRow | 61 | Reserved (Phase 18) |
| tickRail | 79 | Reserved (Phase 17) |

All seven periods are pairwise coprime: gcd of any pair is 1. An earlier draft of this spec assigned 89 s to `tickRail`, which collides with `date`; this is corrected to 79 s. 61 and 79 are introduced now so Phases 17 and 18 have non-aligning beats without retroactive period changes. `sun` and `horizon` share the 101 s period because Horizon (Phase 20) drives both with the same single sine; if a future face needs them independent, that face will introduce a seventh period.

### Drift intensity multipliers

```js
const DRIFT_INTENSITY_MULT = {
  off:      0.0,
  subtle:   0.5,
  normal:   1.0,
  restless: 1.5
};
```

`DriftEngine._loop` multiplies each entry's `ampX` and `ampY` by the active multiplier. The multiplier is read once on boot from `Tweaks.driftIntensity` and re-applied on `storage` change (which triggers a reload anyway).

### Accent palette

```js
const ACCENT_PALETTE = {
  gold:  { hex: '#F4C56C', secondary: 'rgba(240, 235, 220, 0.62)' },
  sky:   { hex: '#7FA8C9', secondary: 'rgba(220, 232, 245, 0.62)' },
  sage:  { hex: '#A9C29A', secondary: 'rgba(225, 235, 218, 0.62)' },
  paper: { hex: '#E8E0D0', secondary: 'rgba(240, 235, 220, 0.62)' }  // Corrected 2026-05-12 from #F0EBDC (would conflict with --type-primary and render the accent invisible).
};
```

`accent` writes `--type-accent` and `--type-secondary` on boot. `SkyColorModule` continues to mutate them on a 60 s schedule; the accent tweak only sets the initial floor color. ObservanceModule overrides remain authoritative.

### CSS token additions in `style.css`

```css
:root {
  /* Stage */
  --stage-w: 1180;
  --stage-h: 820;
  --stage-scale: 1;

  /* Reserved drift channels for Phases 17 to 20 */
  --sun-dx: 0px;          --sun-dy: 0px;
  --horizon-dx: 0px;      --horizon-dy: 0px;
  --departureRow-dx: 0px; --departureRow-dy: 0px;
  --tickRail-dx: 0px;     --tickRail-dy: 0px;
}

#stage {
  position: absolute;
  width: calc(var(--stage-w) * 1px);
  height: calc(var(--stage-h) * 1px);
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(var(--stage-scale));
  transform-origin: center center;
}
```

The existing `--time-x`, `--time-y`, `--moon-x`, `--moon-y`, `--date-x`, `--date-y`, `--slot-x`, `--slot-y`, and per-element drift offsets remain unchanged. The four reserved offsets are wired up but unused until Phase 17.

## 9. Boot Sequence

`index.html` adds a `<div id="stage"></div>` wrapper around the existing time, date, slot, and moon elements:

```html
<main id="display">
  <div id="stage"></div>
  <div id="refresher-overlay"></div>
</main>
```

The stage's children are populated by the active face's `init()` method, not by static HTML. This is the one structural change to `index.html`.

`app.js` boot sequence becomes:

```js
(function boot() {
  // Read storage and resolve face
  const FACE_ID = localStorage.getItem('solari.clockface') || CONFIG.clockface.defaultFaceId;
  const TWEAKS = ClockfaceRegistry.normalizeTweaks(
    localStorage.getItem('solari.clockface.tweaks')
  );
  const ACTIVE_FACE = ClockfaceRegistry.resolve(FACE_ID);

  // Apply accent and drift intensity from tweaks
  ClockfaceRegistry.applyAccent(TWEAKS.accent);
  ClockfaceRegistry.applyDriftIntensity(TWEAKS.driftIntensity);

  // Stage scaffolding (creates #stage, attaches resize listener)
  const stage = Stage.init();

  // Initialise the active face (builds the face DOM subtree inside #stage)
  ACTIVE_FACE.init(stage);

  // Existing init/start cascade, unchanged in order
  DisplayModule.init();           // DOM lookups now find face-built nodes
  RefresherCycle.init();
  RotatorModule.init();
  VersionOverlay.init();
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  SkyColorModule.update();
  MoonModule.start();
  WeatherModule.start();
  AirQualityModule.start();
  TideModule.start();
  AlertModule.start();
  AlmanacModule.start();
  DriftEngine.start();
  MacroShifter.start();
  RefresherCycle.start();
  LuminanceBreath.start();
  ObservanceModule.start();
  RotatorModule.start();

  // Cross-tab Apply: picker write triggers a full reload here
  window.addEventListener('storage', (e) => {
    if (
      e.key === 'solari.clockface' ||
      e.key === 'solari.clockface.tweaks' ||
      e.key === 'solari.clockface.applied_at'
    ) {
      location.reload();
    }
  });

  // The existing DisplayModule render loop ends with:
  //   ACTIVE_FACE.render(AppState, TWEAKS);
  // This is the only call site for face rendering.
})();
```

`DisplayModule.render()` is unchanged in shape; it gains one trailing call to `ACTIVE_FACE.render(AppState, TWEAKS)`. Existing `DisplayModule` DOM lookups (`document.querySelector('#time .hours')` etc.) succeed because `ACTIVE_FACE.init()` runs first and creates the same IDs. For Phase 16 this is essentially a refactor: the same HTML, just constructed in JS by `CalmFace.init()` instead of declared in `index.html`.

## 10. Burn-In Compliance Audit (Calm on Stage)

| # | Layer | Status under Calm-on-stage | Notes |
|---|---|---|---|
| 1 | Per-element Perlin drift | Active | Same coprime periods (117, 89, 143, 73). Sun, horizon, tickRail, departureRow channels declared but unused. Amplitudes adjusted per Section 8. |
| 2 | Pixel-shift safety net | Active | +/- 4 px every 6 min. Unchanged. Applies on top of stage-clamped drift. |
| 3 | Kinetic transitions | Active | 32 s slot rotation, 1500 ms cascade, 70 ms stagger. Slot pixels churn every cycle. |
| 4 | Macro shifts | Active | Time every 3 h to 6 home positions. Moon every 6 h to 4 corners. Percentages now interpreted against the 1180x820 stage box, not the viewport. Both home tables in CONFIG.macroShift remain at their existing values. |
| 5 | Sky-color modulation | Active | SkyColorModule mutates `--type-primary` and `--type-accent` continuously. Accent tweak sets the floor; SkyColorModule, ObservanceModule override authoritatively. |
| 6 | Luminance breath | Active | `--lum-mod` oscillates +/-15% on a 30 min sine. Calm elements with `filter: brightness(var(--lum-mod))` remain in scope. |
| 7 | Daily refresher | Active | 03:00 fade to `#404040` for 30 s. Refresher overlay sits outside `#stage` and covers the full viewport. |
| 8 | Rendering hygiene | Active | Background `#0a0a0a`. Manrope 200 for time. No filled blocks. No icons or panels. The four reserved drift channels do not contribute pixel mass in Phase 16. |

The stage migration does not introduce any new persistent pixel rectangles. The letterbox area surrounding the stage on a 1366 x 1024 viewport is `--bg` (`#0a0a0a`) at 100% opacity, which is identical to the body background; it is not a "block" in the SDD sense.

## 11. Bundle Budget Audit

Current uncompressed bytes (Phase 15 baseline):

| File | Bytes |
|---|---|
| `index.html` | 1,467 |
| `style.css` | 3,590 |
| `app.js` | 61,443 |
| `lib/perlin.js` | 2,194 |
| `lib/suncalc.js` | 9,116 |
| `sw.js` | 899 |
| **Subtotal** | **78,709** |

Phase 16 deltas (estimates):

| Change | Delta |
|---|---|
| `app.js`: ClockfaceRegistry (resolve, normalizeTweaks, applyAccent, applyDriftIntensity), Stage helper, `CalmFace.init/render/teardown`, `storage` event listener, removal of legacy `CONFIG.drift`, additions to `CONFIG.driftClasses` / `CONFIG.stage` / `CONFIG.clockface`. Estimate to be firmed up by misaka. | +5.5 KB |
| `style.css`: `#stage` rules, four reserved drift channel vars, accent token sites updated | +0.4 KB |
| `index.html`: add `<div id="stage">` wrapper | +0.05 KB |
| `clockface.html` (new) | +1.8 KB |
| `clockface.js` (new) | +11.5 KB (estimate; includes a shared DriftEngine instance for live preview drift -- misaka to firm up) |
| **Total Phase 16 delta** | **~19.3 KB** |

Phase 16 total: ~98 KB. Headroom against the 250 KB budget: ~152 KB. The four future face implementations are budgeted at 25 to 35 KB each (Departures is the heaviest) plus the second-and-third webfonts at ~25 KB compressed. Headroom is adequate; no reductions required in Phase 16.

The picker page and main display load disjoint JS sets. `clockface.js` is never loaded by the always-on display, so the picker's bytes do not count against the runtime working-set budget. They do count against the cold-cache deploy budget.

### Font loads in Phase 16

Only Manrope 200 and 300 ship in Phase 16. The `<link>` tag in `index.html` is unchanged. `clockface.html` carries the same `<link>` tag. Cormorant Garamond 300 italic and JetBrains Mono 300 are not preloaded; they will be added by Phases 17 to 20 alongside their faces.

## 12. Test Plan

### Manual

| Test | Expected |
|---|---|
| Open `index.html` with no `solari.clockface` key | Calm renders. Console shows no warnings. Stage scale is 1.0 on a 1180 x 820 viewport. |
| Open `clockface.html`, scroll to face 2 to 5 | Placeholder card reads "MECHANICAL", "DEPARTURES", etc. with `COMING SOON . PHASE 17` (etc.) below. Apply button is disabled. |
| Open `clockface.html`, change accent to `sky`, click Apply | Toast shows `CALM APPLIED`. Open `index.html` (or wait for the storage-event reload): `--type-accent` is `#7FA8C9`. The colon in time is sky-blue. |
| Set `driftIntensity` to `off`, Apply | Time, date, slot, moon all hold their stage anchors with zero drift offset. Pixel-shift safety net continues to apply. |
| Set `driftIntensity` to `restless`, Apply | Drift amplitudes are 1.5x normal. Time element drifts up to 36 px X / 27 px Y. Still within stage bounds (clamping holds). |
| Tap moon disc on Calm | Version overlay opens (Phase 13 behaviour preserved). |
| Set tide AppState slice to null and refresh | Calm renders normally; the slot rotation skips `TIDE` and advances. |
| Wait through one slot cycle | After 32 s, slot transitions with 1500 ms cascade. Each character flips on a 70 ms stagger. |
| Trigger 03:00 refresher (mock the time via a CONFIG override) | Stage fades to `#404040` for 30 s, returns to Calm. |
| Resize viewport from 1180 x 820 to 1366 x 1024 | Stage scale recomputes to 1.157. Drift amplitudes are unchanged (in stage-pixels), so visual size grows in lockstep. No element clips off the stage. |
| Resize viewport to 1920 x 1080 (external monitor case) | Stage scale recomputes to ~1.317 (no cap). All elements remain crisp because Manrope text and the moon SVG are vector. No letterboxing chrome. |
| Set system date to Dec 25 | Calm date strip reads `[snowflake] CHRISTMAS DAY . DECEMBER 25 [snowflake]`. Slot rotation includes `CHRISTMAS DAY`. Sky color is `#F4C56C` (Phase 15 behaviour preserved). |
| Open `clockface.html` in tab A, `index.html` in tab B, click Apply in A | Tab B reloads within ~250 ms (storage event latency). |

### Sentry endurance hooks

Add the following counters to the existing endurance dashboard:

| Metric | Source | Reason |
|---|---|---|
| `clockface.boot.faceId` | `app.js` boot | Confirms the active face on each cold start. |
| `clockface.tweaks.accent` | `app.js` boot | Detects accidental token regressions. |
| `clockface.tweaks.driftIntensity` | `app.js` boot | Confirms drift level is honoured after reload. |
| `stage.scale` | `recomputeStageScale` | Confirms stage scale is constant for a given viewport. |
| `stage.resizeCount` | `resize` listener | Should remain near zero on a stationary iPad. Spikes indicate orientation drift or viewport bugs. |

The picker page itself does not need Sentry; it is opened intentionally and infrequently. If a picker JS error throws, the user sees a broken page and reloads or returns to the display via the existing back link.

### Long-running validation

Calm-on-stage must survive a 7-day endurance run with no memory growth and no DriftEngine slowdown. Compare against the Phase 14 endurance baseline. Acceptance criterion: heap size at +7 d is within 5% of Phase 14 baseline; rAF cadence at +7 d is >= 58 fps p99.

## 13. Future-Phase Placeholders

### Phase 17: Mechanical face

Adds JetBrains Mono 300 webfont. Implements `FaceMechanical.mount/render` against the rendering interface from this phase. Introduces a 60-tick second rail across the top of the stage; the active second's tick is gold and 24 px tall. Centred `HH:MM:SS` time at 300 px monospace, with seconds typeset 40% smaller and 0.62 opacity, baseline-aligned. A 5-column instrument grid below shows Weather, Tide, Moon, Air, Almanac. No slot rotation. The tickRail drift channel becomes active. Burn-in audit: the second hand churns the rail every 1 s; the time face's seconds portion churns every 1 s; the instrument grid drift covers the static labels. Mechanical introduces the first per-face tweak: a `tabularStyle` toggle (lined or grouped), persisted under `tweaks.byFace.mechanical`.

### Phase 18: Departures face

Adds the signature split-flap board. Per-row drift via the `departureRow` channel introduced in this phase. Headline split-flap time at the top of the stage, a 5-row table below cycling on a 45 s cadence, and a footer strip. Imminent rows tint to `--type-accent`; this is the first face that needs an `accentSkyTrack: false` opt-out from `SkyColorModule`, so Phase 18 adds that hook to the registry interface. ObservanceModule integration: imminent observance rows pick up the observance accent. Per-face tweaks: `boardDensity` (5 or 8 rows), `flapBezelOpacity` (0.0 to 0.4).

### Phase 19: Editorial face

Adds Cormorant Garamond 300 italic webfont (the spec previously named Instrument Serif; Cormorant Garamond is the locked V1 substitute, lighter and more readable at distance). Asymmetric two-column composition: huge italic time on the left, almanac voice paragraph on the right. ObservanceModule integration: light observances render an italic dropline below the date. Per-face tweaks: `paragraphCopy` (preset copy templates), `timeFormat` (12 h or 24 h, since the italic display benefits from `H:MM AM`).

### Phase 20: Horizon face

The day, drawn. SVG-driven sun and moon arcs traced across a horizon line, with hour ticks, sunrise and sunset notches, a phase-correct moon glyph, and a now hairline. The sun and horizon drift channels become active. Big time bottom-left, status block bottom-right. Adds an `accentSkyTrack: false` opt-out for the moon glyph (which uses a fixed cool blue regardless of sky color). Per-face tweaks: `arcAmplitude` (0.8 to 1.2x), `showHourLabels` (boolean).

After Phase 20 lands, V1 is feature-complete. V2 work (additional faces, custom face authoring) is unscoped.

## 14. Open Questions

The five open questions from the prior draft are now resolved. They are summarised here as a record of the decisions and the rationale; nothing in this section is unresolved.

1. **DisplayModule split: per-face render functions in `app.js`.** Each face is a plain object exposing `init(stage)`, `render(state, tweaks)`, and `teardown()` (Section 6). `DisplayModule` keeps its existing render loop and ends each tick with `ACTIVE_FACE.render(AppState, TWEAKS)`. The face owns DOM writes. Shared scaffolding (the `#stage` element, the resize listener, the scale token) lives in a small `Stage` helper. The two-file rule is preserved -- faces are objects in `app.js`, not new files.

2. **Picker preview drift: live.** Each face card mounts a real `DriftEngine` instance scaled by the card's `transform: scale(...)`. Driftintensity tweak edits update preview amplitude live. Off-screen cards pause via `IntersectionObserver`. Justification: the picker is a separate page (not always-on), so the rAF cost is acceptable, and a CSS-keyframe approximation would not match runtime motion accurately.

3. **Stage scale: no cap, fill viewport.** Scale is uncapped; values above 1.0 are allowed. All Calm content is vector (Manrope text, moon SVG), and Phases 17 to 20 also produce vector content, so upscaling is sharp on retina hardware. iPad Air M4 (1180x820) scales 1.0; 13-inch iPad logical (1366x1024) scales 1.157; an external 1920x1080 monitor scales ~1.317. No letterboxing logic; ambient `--bg` (`#0a0a0a`) margin if any.

4. **Tweak persistence: per-face, only on Apply.** The schema is `{ accent, driftIntensity, byFace: { [faceId]: object } }` -- global tweaks at the top level, per-face tweaks namespaced under `byFace[faceId]`. Switching faces preserves each face's last-known tweaks. Phase 16 ships only the global tweaks; `byFace` entries are reserved (empty objects) for 17 to 20. Persistence is atomic: tweak edits are visible only in the picker preview until the user clicks Apply, at which point all three storage keys are written together.

5. **Cross-tab Apply: full reload on `storage` event.** The picker's Apply button writes the three keys. The main display registers a `storage` listener at boot and calls `location.reload()` when any of `solari.clockface`, `solari.clockface.tweaks`, or `solari.clockface.applied_at` changes. Phase 16 does not implement hot-swap. Same-tab navigation (back link from picker to display) re-reads storage on the fresh boot pass and needs no separate handling.

## 15. References

- SDD Section 9 (Burn-in Protection, eight layers).
- SDD Section 11.1 (Kinetic transition timing for split-flap cascade).
- SDD Section 12 (Macro position shifts).
- SDD Section 17 (Layout, position percentages, font sizes).
- SDD Section 22 (Acceptance criteria for endurance).
- `app.js` lines 3 to 79 (CONFIG block, current state).
- `app.js` lines 1215 to 1370 (DriftEngine, current viewport-clamp logic that becomes stage-clamp logic).
- `app.js` lines 1372 to 1434 (MacroShifter, percentages now interpreted against stage).
- `app.js` lines 1884 to 1927 (DisplayModule, becomes a thin dispatcher in Phase 16).
- `style.css` lines 21 to 57 (root tokens, time/date/moon/slot positioning).
- `design_handoff_clockface/README.md` (visual reference for all 5 faces).
- `design_handoff_clockface/clockface.html` (visual reference, not implementation reference).
- MDN: [`transform`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform), [`scroll-snap-type`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type), [`StorageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent).
