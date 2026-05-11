# Phase 17: Mechanical Face

| Field    | Value                              |
|----------|------------------------------------|
| Phase    | 17 of 20 (V1, second face)         |
| Status   | Shipped                            |
| Shipped  | 2026-05-11                         |
| Date     | 2026-05-11                         |
| Author   | ariadne                            |
| Impl     | misaka                             |
| Depends  | Phase 16 (shipped 2026-05-07, commit c9bd79f, patch 6832629) |
| Unblocks | Phase 18 (Departures), Phase 19 (Editorial), Phase 20 (Horizon) |

## 1. Goal

Phase 17 introduces the Mechanical face, a monospace, tabular composition built on the Phase 16 stage foundation. It is the first new face since Calm and the first to exercise the face rendering interface with real (non-no-op) `render(state, tweaks)` logic. The face presents 24h `HH:MM` time, an ISO date strip, five complication columns under a hairline rule, and a minute-arc tickrail that grows linearly across each minute. JetBrains Mono 300 is added as the first new webfont since Phase 16.

## 2. Scope and Non-Scope

### In scope

- New `MechanicalFace` object in `app.js`, implementing `init(stage) / render(state, tweaks) / teardown()` against the Phase 16 contract (`app.js:2070-2092` is the CalmFace shape to mirror).
- `MechanicalFace` registration in `ClockfaceRegistry.faces` (`app.js:2096-2103`).
- DOM subtree built inside `#stage` by `MechanicalFace.init()`: time block, date strip, minute-arc rail, five-column complication grid.
- JetBrains Mono 300 webfont link added to `index.html` and `clockface.html`.
- `tickRail` drift channel becomes active (already declared in `CONFIG.driftClasses` at `app.js:51`, period 79 s, reserved by Phase 16 for this face).
- Per-face tweak schema entry `tweaks.byFace.mechanical.timeFormat` (`'24h'` default, `'12h'` optional).
- Macro shift table for Mechanical's time element: two homes alternating every 3 h (Q2).
- Macro shift table for Mechanical's complication grid: deterministic column rotation every 6 h indexed by `Math.floor(hoursSinceMidnight / 6) % 4` (Q6).
- Picker live-render mode: the picker calls `MechanicalFace.init(card)` and `MechanicalFace.render(PREVIEW_STATE, tweaks)` on a 1 Hz interval. `PREVIEW_STATE` is the object Phase 16 reserved at `clockface.js:43-44`; Phase 17 actually populates it.
- `previewMode: true` flag in `tweaks.byFace.mechanical` that accelerates the 6h grid rotation to a 6s cycle in the picker only.
- Burn-in audit per layer for the new face. Layer 3 is treated as a composite (drift + minute-arc growth + data churn + macro rotation) rather than a single 28-36 s slot replacement; see Section 11 Layer 3 trade-off discussion.

### Non-scope

- Departures face implementation. Deferred to Phase 18.
- Editorial face implementation. Deferred to Phase 19.
- Horizon face implementation. Deferred to Phase 20.
- Migrating Calm's picker preview from hand-built mock to a live `CalmFace.render()` call. Calm's mock stays as-is in Phase 17 per the strategic brief; Calm conversion is a separate follow-up.
- A 60-tick second rail across the top of the stage. The Phase 16 spec's Section 13 placeholder named a second rail; chihiro has replaced it with the minute-arc (Q5).
- Seconds in the time numerals. Q1 locks `HH:MM` (no seconds).
- A per-face `accentSkyTrack` opt-out. Mechanical participates fully in sky color modulation (Q10).
- Per-face observance opt-out. Mechanical participates fully in observance repaints (Q9).
- `tabularStyle` tweak (lined vs. grouped). Reserved language in Phase 16 Section 13 placeholder; chihiro has not locked the visual, so it does not ship in Phase 17.

## 3. Inherits from Phase 16

The following Phase 16 primitives are reused without modification:

| Primitive | Source | What Phase 17 uses |
|---|---|---|
| Stage primitive | `app.js:2033-2062`, `style.css:75-84` | All Mechanical DOM is built inside `#stage`, positioned in 1180x820 pixel coordinates. |
| Face rendering interface | `app.js:2070-2092` (CalmFace shape) | `MechanicalFace.init/render/teardown` mirrors CalmFace's three-method shape. |
| `ClockfaceRegistry.resolve(faceId)` | `app.js:2105-2109` | Mechanical registers as `'mechanical'`; resolve falls back to Calm on any unknown id. |
| `ClockfaceRegistry.normalizeTweaks(raw)` | `app.js:2113-2130` | Extended in Phase 17 to validate `byFace.mechanical.timeFormat` (Section 8). |
| Storage contract | `solari.clockface`, `solari.clockface.tweaks`, `solari.clockface.applied_at` | Same three keys; Mechanical only adds a nested entry under `tweaks.byFace.mechanical`. |
| `storage` event reload | `app.js:2194` | Unchanged. Switching to or from Mechanical triggers a full reload. |
| Cross-page apply flow | `clockface.js:299-313` | Unchanged. |
| Drift class table | `CONFIG.driftClasses` (`app.js:43-52`) | Reads `tickRail` (period 79 s, ampX 4, ampY 3). No new entries. |
| Drift intensity multipliers | `DRIFT_INTENSITY_MULT` (`app.js:105-110`) | Applies to `tickRail` like every other channel. |
| Accent palette | `ACCENT_PALETTE` (`app.js:114-119`) | `--type-accent` writes pick up here; no Mechanical-specific accent. |
| `MacroShifter` engine | `app.js:1425-1487` | Phase 17 adds a per-face hook; see Section 7. |
| `DriftEngine` | `app.js:1255-1423` | Phase 17 activates the `tickRail` channel by adding it to `activeKeys` (`app.js:1295`); see Section 6 and Section 11. |
| `SkyColorModule` | `app.js:1109+` | Mechanical inherits `--type-primary`, `--type-secondary`, `--type-accent` without override. |
| `ObservanceModule` | `app.js:853+` | Mechanical inherits the observance accent repaint via `--type-primary` / `--type-accent`. |
| `LuminanceBreath` | `app.js:1544+` | Mechanical applies `filter: brightness(var(--lum-mod))` on the same elements that Calm covers (time block, date, grid values). |
| `RefresherCycle` | `app.js:1489-1542` | Overlay sits outside `#stage` and covers Mechanical's content identically. |
| `RotatorModule` | `app.js:1650+` | Mechanical does not surface a rotating slot. The rotator continues to run; its output is not read. |
| `DisplayModule.render()` | `app.js:1993-2027` | The trailing `ACTIVE_FACE.render(AppState, TWEAKS)` call at `app.js:2026` becomes Mechanical's per-tick driver. |

## 4. Element List

All positions are stage pixels (origin top-left of the 1180x820 box). Every element is `position: absolute` with `transform: translate(-50%, -50%) translate(var(--<class>-dx), var(--<class>-dy))` so it picks up drift.

| Element ID | Stage position (px) | Anchor | Font / weight / size | Content / token notes |
|---|---|---|---|---|
| `#mech-time` (wrapper) | x=590, y=320 (Home A) or y=440 (Home B) | translate(-50%, -50%) | JetBrains Mono 300, **236 px**, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.015em`, `line-height: 1`, `--type-primary` | `HH:MM` 24h. Colon is a `<span class="mech-colon">` at 236 px in `--type-accent`, opacity 0.88, `margin: 0 0.04em`. In 12h mode (Q11), renders `H:MM` at 236 px with a separate `<span class="mech-ampm">` at 56 px in `--type-secondary`, baseline-aligned to the top of the digits. |
| `#mech-date` | x=590, y=210 | translate(-50%, -50%) | JetBrains Mono 300, **18 px**, `letter-spacing: 0.34em`, `text-transform: uppercase`, `white-space: nowrap`, `--type-tertiary` | `MON · 2026.05.11` (3-letter day uppercase + ISO-dot date, separated by space-middot-space). |
| `#mech-arc` (SVG) | x=80 to x=1100, y=265 | absolute, no anchor transform | n/a | 1 px hairline. Two `<line>` children: track (full width, `--type-accent` at alpha 0.08, never animates) and grown portion (`--type-accent` at alpha 0.35, x1=80, x2 grows linearly 80 -> 1100 over 60 s). Drift wraps the entire SVG via `tickRail-dx`/`tickRail-dy`. |
| `#mech-grid` (wrapper) | x=80 (left), x=1100 (right), y=620 (anchor of label/value baseline) | top-left of the box at left=80, top=580; width=1020, height=120 | grid | Five columns, equal width, with 1 px `--rule` vertical separators between columns. Inset padding `0 18px` per cell. A 1 px `--rule` horizontal separator sits at y=580, spanning x=80 to x=1100, above the grid. |
| `#mech-grid .mech-label` (5 instances) | top of each cell, `margin-bottom: 10px` | grid cell | JetBrains Mono 300, **11 px**, `letter-spacing: 0.28em`, `text-transform: uppercase`, `--type-tertiary` | `TEMP`, `AIR`, `TIDE`, `MOON`, `SUN`. Column content rotates every 6 h (Section 7); the labels travel with their values, not the column index. |
| `#mech-grid .mech-value` (5 instances) | below the label | grid cell | JetBrains Mono 300, **22 px**, `--type-primary` for primary tokens | See Section 5 for per-column value composition. |

The wrapping element is `<div id="mech-stage">` mounted inside `#stage` by `MechanicalFace.init()`. `mech-stage` does not get its own drift channel; all drift is on the children that carry it.

### CSS class names introduced

`mech-stage`, `mech-time`, `mech-colon`, `mech-ampm`, `mech-date`, `mech-arc`, `mech-arc-track`, `mech-arc-grown`, `mech-grid`, `mech-cell`, `mech-label`, `mech-value`. Token classes for value styling: `mech-tok-primary`, `mech-tok-secondary`, `mech-tok-tertiary`, `mech-tok-accent`, `mech-tok-ampm` (the last is added by D2 for 12h-mode AM/PM suffixes in TIDE and SUN columns; see Section 5). The token spans let `render()` apply token colors without rewriting the cell's HTML each tick.

### Drift bindings

| Element | Drift class | Period (s) | ampX / ampY (px) |
|---|---|---|---|
| `#mech-time` | `time` | 117 | 24 / 18 |
| `#mech-date` | `date` | 89 | 12 / 8 |
| `#mech-arc` (SVG container) | `tickRail` | 79 | 4 / 3 |
| `#mech-grid` (one drift band, applied to wrapper) | `slot` | 143 | 12 / 8 |

The grid as a whole uses the existing `slot` channel; individual cells do not get per-cell drift. The grid is a single visual band and 12/8 px on a 143 s period is sufficient to break burn-in for the column type. The `tickRail` channel finally goes live as Phase 16 reserved (`CONFIG.driftClasses.tickRail` at `app.js:51`).

## 5. Five-Column Complications Grid

Boot column order is `[TEMP, AIR, TIDE, MOON, SUN]`. The rotation in Section 7 cycles the order every 6 h.

| Column | Label | Value template (default state) | Token colors | AppState source |
|---|---|---|---|---|
| TEMP | `TEMP` | `+12° PARTLY CLOUDY` | digits + `°` in `--type-primary`; condition uppercase string after thin space (U+2009) in `--type-secondary` | `AppState.weather.tempC` (signed int, leading `+` for >=0; `-` for negative) and `AppState.weather.condition`. `°` is glued directly to the digit, no space. |
| AIR | `AIR` | `024 GOOD` | 3-digit zero-padded AQI in `--type-primary`; band uppercased in `--type-secondary` after a single space | `AppState.aqi.value` and `AppState.aqi.band` (band is one of `good`/`moderate`/`unhealthy`/`very_unhealthy`/`hazardous`; render as `GOOD`, `MODERATE`, `UNHEALTHY`, `VERY UNHEALTHY`, `HAZARDOUS`). |
| TIDE | `TIDE` | `H 4.3M 04:22` (24h) / `H 4.3M 4:22 AM` (12h) | `H` or `L` prefix in `--type-tertiary`; height-and-`M` (e.g. `4.3M`) in `--type-primary`; time in `--type-tertiary`; AM/PM suffix in `--type-tertiary` (see AM/PM rendering below) | `AppState.tide.type` (`high` -> `H`, `low` -> `L`), `AppState.tide.heightM` (one decimal), `AppState.tide.time` (rendered as `HH:MM` 24h or `H:MM` + AM/PM span per `tweaks.byFace.mechanical.timeFormat`). |
| MOON | `MOON` | `WAX CRES 18%` | phase name in `--type-primary`; percent integer + `%` in `--type-primary` | `AppState.moon.phaseName` abbreviated to 8 chars max via the mapping in the implementation note below; `AppState.moon.illumination * 100` rounded to integer. |
| SUN | `SUN` | `↑ 05:22 ↓ 20:47` (24h) / `↑ 5:22 AM ↓ 8:47 PM` (12h) | arrow glyphs (`↑`, `↓`) in `--type-accent` at alpha 0.55; times in `--type-primary`; AM/PM suffixes in `--type-tertiary` (see AM/PM rendering below) | `AppState.sun.sunrise` and `AppState.sun.sunset`, rendered per `tweaks.byFace.mechanical.timeFormat` (D2: all complication times follow the headline `timeFormat` tweak; see AM/PM rendering and Grid Auto-Sizing sub-sections below). |

### Moon phase abbreviation table

`AppState.moon.phaseName` (e.g. `Waxing Gibbous`) maps to an 8-char max abbreviation:

| Full name | Abbreviation |
|---|---|
| `New Moon` | `NEW` |
| `Waxing Crescent` | `WAX CRES` |
| `First Quarter` | `FIRST Q` |
| `Waxing Gibbous` | `WAX GIB` |
| `Full Moon` | `FULL` |
| `Waning Gibbous` | `WAN GIB` |
| `Last Quarter` | `LAST Q` |
| `Waning Crescent` | `WAN CRES` |

The 8-char cap keeps the moon column the same approximate visual width as its neighbours. Unmapped values render as the first 8 characters of the input, uppercased.

### AM/PM rendering in complication columns (D2)

Under `tweaks.byFace.mechanical.timeFormat === '12h'`, the TIDE and SUN columns render their times as `H:MM` (or `HH:MM` for 10-12) followed by a separate `<span>` carrying the `AM` or `PM` suffix. The headline time numerals (`#mech-time`) use a different AM/PM treatment (56 px in `--type-secondary`, see Section 4); complication AM/PM is a smaller, quieter variant tuned for inline display.

| Property | Value |
|---|---|
| Element | `<span class="mech-tok-ampm">AM</span>` (or `PM`) |
| Font | JetBrains Mono 300 |
| Size | **16 px** (vs 22 px for the time value digits) |
| Color | `--type-tertiary` |
| Letter spacing | `0.04em` |
| Text transform | uppercase |
| Spacing | preceded by a single space (U+0020) after the time digits |

CSS:

```css
.mech-tok-ampm {
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--type-tertiary);
}
```

Render templates:

```html
<!-- TIDE under 24h -->
<span class="mech-tok-tertiary">H</span> <span class="mech-tok-primary">4.3M</span> <span class="mech-tok-tertiary">04:22</span>

<!-- TIDE under 12h -->
<span class="mech-tok-tertiary">H</span> <span class="mech-tok-primary">4.3M</span> <span class="mech-tok-tertiary">4:22</span> <span class="mech-tok-ampm">AM</span>

<!-- SUN under 24h -->
<span class="mech-tok-accent">↑</span> <span class="mech-tok-primary">05:22</span> <span class="mech-tok-accent">↓</span> <span class="mech-tok-primary">20:47</span>

<!-- SUN under 12h -->
<span class="mech-tok-accent">↑</span> <span class="mech-tok-primary">5:22</span> <span class="mech-tok-ampm">AM</span> <span class="mech-tok-accent">↓</span> <span class="mech-tok-primary">8:47</span> <span class="mech-tok-ampm">PM</span>
```

Rationale: the user chose consistency-across-the-face over column-compactness. When the headline numerals carry an AM/PM suffix (12h mode), the complication times do too, so the face reads as a coherent format choice rather than a mixed 12h/24h composition.

### Grid auto-sizing (D2)

The 12h propagation expands the TIDE and SUN columns. Estimated widths:

| Column | 24h width (px) | 12h width (px) |
|---|---|---|
| TEMP | ~200 | ~200 |
| AIR | ~140 | ~140 |
| TIDE | ~150 | ~180 |
| MOON | ~150 | ~150 |
| SUN | ~190 | ~240 |

The grid bounds are fixed: `left: 80px`, `right: 1100px`, total inner width 1020 px. The grid does **not** widen the stage in 12h mode. Instead, columns auto-size via CSS Grid `1fr` with a `minmax` floor, and the AIR and MOON columns absorb the proportional loss when TIDE and SUN need more room:

```css
#mech-grid {
  position: absolute;
  left: 80px;
  top: 580px;
  width: 1020px;
  height: 120px;
  display: grid;
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  column-gap: 0;
}
```

`minmax(180px, 1fr)` lets each cell shrink no smaller than 180 px while distributing the available 1020 px proportionally. The 1 px `--rule` vertical separators between columns sit on the grid gap line (`border-right` on cells 0-3). Cell content uses `inset padding 0 18px` per Section 4; long strings overflow into the inset rather than pushing the column wider.

If 12h content exceeds 1020 px collectively (5 * 180 = 900 px minimum, well under the budget), the grid layout holds. The actual 12h total of 200+140+180+150+240 = ~910 px fits comfortably with ~110 px of breathing room distributed across the five columns.

This rule applies regardless of column rotation phase (Section 7): rotation cycles which content is in which DOM cell, but cells stay equal-width via `1fr`. Visual rhythm is preserved.

### Per-column null behaviour (Q7)

Per-column, label-only collapse. The label always renders. If the slice the column consumes is null, the value renders as an em-dash (`—`) in `--type-tertiary` at 22 px JetBrains Mono 300, horizontally centred in the cell. No column is hidden.

Tide-specific exception: when `data/tides.json` is exhausted or the slice has not loaded, the tide value renders as `— —M —:—` (em-dashes substituted for each token). This keeps the column's visual length steady.

| Column | Null trigger | Rendered value |
|---|---|---|
| TEMP | `AppState.weather.tempC === null` or `AppState.weather.condition === null` | `—` |
| AIR | `AppState.aqi.value === null` | `—` |
| TIDE | `AppState.tide.type === null` | `— —M —:—` |
| MOON | `AppState.moon.phaseName === ''` | `—` |
| SUN | `AppState.sun.sunrise === ''` or `AppState.sun.sunset === ''` | `—` |

## 6. Minute-Arc

A 1 px hairline tickrail at stage y=265, x=80 to x=1100 (1020 px wide). It marks the current minute's progress.

### SVG structure

```html
<svg id="mech-arc" viewBox="0 0 1180 8" preserveAspectRatio="none" aria-hidden="true">
  <line class="mech-arc-track"  x1="80" y1="4" x2="1100" y2="4"/>
  <line class="mech-arc-grown"  x1="80" y1="4" x2="80"   y2="4"/>
</svg>
```

`mech-arc` is positioned at top=261 with width=1180px height=8px so the 4 px centre line aligns to y=265 of the stage.

### CSS

```css
.mech-arc-track  { stroke: var(--type-accent); stroke-opacity: 0.08; stroke-width: 1; }
.mech-arc-grown  { stroke: var(--type-accent); stroke-opacity: 0.35; stroke-width: 1; }
```

### Animation

Linear timing over 60 s per minute. The grown line's `x2` is recomputed inside `MechanicalFace.render()` (called every 1 Hz tick by `DisplayModule.render()`):

```js
const sec = state.time.seconds;
const x2 = 80 + (sec / 60) * 1020;
grown.setAttribute('x2', x2.toFixed(1));
```

The line is redrawn at 1 Hz, which gives 60 discrete steps per minute. Subjectively this reads as smooth at 1 px increments (1020 px / 60 = 17 px per second). No `requestAnimationFrame` loop; the existing 1 Hz `ClockModule` tick drives the update.

### Reset at minute boundary

At second 0 of each minute, the previous grown line fades out over 600 ms (alpha 0.35 -> 0) while a new grown line begins growing from x=80 at alpha 0.35. The fade is implemented by cloning the grown `<line>` at second 59 -> 0 transition, applying a 600 ms CSS opacity transition on the clone, and removing it on `transitionend`:

```js
// In render(), at second === 0:
if (state.time.seconds === 0 && this._lastSecond === 59) {
  const fader = grown.cloneNode(true);
  fader.classList.add('mech-arc-fading');
  arc.appendChild(fader);
  // Reset live grown line for the new minute
  grown.setAttribute('x2', '80');
  // Force layout, then fade clone
  fader.getBoundingClientRect();
  fader.style.strokeOpacity = '0';
  fader.addEventListener('transitionend', () => fader.remove(), { once: true });
}
this._lastSecond = state.time.seconds;
```

```css
.mech-arc-fading {
  transition: stroke-opacity 600ms linear;
}
```

The track (`mech-arc-track`) at alpha 0.08 is continuous and never animates.

### Drift binding

The entire `#mech-arc` SVG is wrapped by drift via `--tickRail-dx` and `--tickRail-dy` (ampX 4, ampY 3, period 79 s, see `CONFIG.driftClasses.tickRail` at `app.js:51`). Phase 17 activates the channel by adding `'tickRail'` to `DriftEngine.activeKeys` (`app.js:1295`) and registering element size in `DriftEngine._elementSizes` (`app.js:1323-1328`):

```js
// app.js:1295 delta
const activeKeys = ['time', 'date', 'slot', 'moon', 'tickRail'];

// app.js:1323 delta (insert)
tickRail: { hw: 510, hh: 4 }
```

`DriftEngine._anchorPercents` gets a new entry for the rail's stage-relative anchor:

```js
// app.js:1382 delta (insert)
tickRail: { x: 50, y: 32 }   // x=590/1180=50%, y=265/820=32%
```

The phase offset for `tickRail` slots into `_phaseOffsets`:

```js
// app.js:1268 delta (insert)
tickRail: { x: 1000, y: 1100 }
```

This is the first time Phase 17 activates the channel since Phase 16 reserved it.

## 7. Macro Shifts

### Time vertical oscillation (every 3 h)

Two homes, anchored `translate(-50%, -50%)`, alternating every 3 h:

- Home A: x=590, y=320 (50% / ~39% of 1180 / 820)
- Home B: x=590, y=440 (50% / ~54%)

`CONFIG.macroShift.timeHomes` is six entries; Mechanical needs only two. Rather than mutate `CONFIG.macroShift`, Phase 17 introduces a per-face override read by `MacroShifter`:

```js
// CONFIG.macroShift becomes (additions only)
macroShift: {
  enabled: true,
  timeIntervalHours: 3,
  timeTransitionSec: 60,
  timeHomes: [
    [50, 44], [35, 38], [65, 38],
    [50, 52], [40, 46], [60, 46]
  ],
  // Phase 17: per-face time homes. If present for the active face, the array
  // is used in place of the global `timeHomes` table. Calm continues to use
  // the global six-position table.
  timeHomesByFace: {
    mechanical: [[50, 39], [50, 54]]
  },
  // Existing moon settings unchanged
  moonIntervalHours: 6,
  moonTransitionSec: 60,
  moonHomes: [
    [84, 12], [16, 12], [84, 62], [16, 62]
  ]
}
```

`MacroShifter.start()` (`app.js:1431-1453`) reads `CONFIG.macroShift.timeHomesByFace[FACE_ID]` if present and falls back to `timeHomes`. The index modulus uses the chosen array length, so Mechanical alternates between two homes; Calm continues to cycle through six. `_applyTime()` (`app.js:1478-1481`) targets `#mech-time` when `FACE_ID === 'mechanical'`, otherwise `#time` for Calm. The `_applyHome()` helper at `app.js:1465-1476` is unchanged.

### Mechanical grid column rotation (every 6 h)

Deterministic permutation indexed by `Math.floor(hoursSinceMidnight / 6) % 4`:

| Phase index | Local hours | Column order |
|---|---|---|
| 0 | 00:00 to 05:59 | `[TEMP, AIR, TIDE, MOON, SUN]` |
| 1 | 06:00 to 11:59 | `[SUN, TEMP, AIR, TIDE, MOON]` |
| 2 | 12:00 to 17:59 | `[MOON, SUN, TEMP, AIR, TIDE]` |
| 3 | 18:00 to 23:59 | `[TIDE, MOON, SUN, TEMP, AIR]` |

The rotation is implemented inside `MechanicalFace`, not `MacroShifter`, because the rotation is content-driven (which column maps to which DOM cell), not geometric.

```js
// MechanicalFace
const COLUMN_PHASES = [
  ['temp', 'air', 'tide', 'moon', 'sun'],
  ['sun', 'temp', 'air', 'tide', 'moon'],
  ['moon', 'sun', 'temp', 'air', 'tide'],
  ['tide', 'moon', 'sun', 'temp', 'air']
];

function activePhaseIndex(date, previewMode) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (previewMode) {
    // 6h cycle compressed to 6s for the picker
    const sec = Math.floor(performance.now() / 1000);
    return Math.floor(sec / 6) % 4;
  }
  return Math.floor(h / 6) % 4;
}
```

`MechanicalFace.render()` computes the active phase each tick, compares against `this._lastPhaseIndex`, and triggers a column cross-fade transition when the index changes.

#### Cross-fade transition

When the index changes, each column's label-plus-value pair cross-fades to its new content. The grid container's `grid-template-columns` does not animate; only the cell content does.

The 6 h *interval* is the trigger. The 840 ms *span* is the animation length. These are distinct: the rotation fires on the 6 h boundary; the visual transition completes in under 1 s.

- **Trigger**: 6 h boundary (or 6 s in preview mode). Fires once when `activePhaseIndex()` changes.
- **Per-column animation**: 300 ms fade-out (opacity 1 -> 0) + DOM content swap at opacity 0 + 300 ms fade-in (opacity 0 -> 1) = 600 ms.
- **Stagger**: 60 ms between adjacent columns. Column 0 starts at t=0, column 1 at t=60 ms, column 2 at t=120 ms, column 3 at t=180 ms, column 4 at t=240 ms.
- **Total visual span**: 240 ms (final column start) + 600 ms (its own animation) = **840 ms** wall-clock from first fade-out to last fade-in completion.

The label and value swap together as one unit: each cell is wrapped in `<div class="mech-cell-inner">` and the cross-fade is applied to that inner wrapper.

```css
.mech-cell-inner {
  transition: opacity 300ms ease-in-out;
}
.mech-cell-inner.is-fading {
  opacity: 0;
}
```

Chihiro's brief described this as a "60 s smooth" transition. That phrasing is framing language: the cross-fade happens at the 6 h boundary rather than abruptly. It is not the duration of the animation. The actual animation length is 840 ms.

#### Picker preview acceleration

When `tweaks.byFace.mechanical.previewMode === true`, the rotation cycles every 6 s instead of every 6 h. This lets a picker reviewer see all four permutations within a normal preview session. The `previewMode` flag is set by `clockface.js` only; the main display never sets it.

## 8. Tweak Schema Additions

Phase 16's schema (Phase 16 Section 3) reserves `byFace.{faceId}: object`. Phase 17 populates the `mechanical` entry:

```ts
type MechanicalTweaks = {
  timeFormat?: '24h' | '12h';   // default '24h'
  previewMode?: boolean;        // default false; picker only
};

type Tweaks = {
  accent: 'gold' | 'sky' | 'sage' | 'paper';
  driftIntensity: 'off' | 'subtle' | 'normal' | 'restless';
  byFace: {
    mechanical?: MechanicalTweaks;
  };
};
```

### Storage delta

```json
{
  "accent": "gold",
  "driftIntensity": "normal",
  "byFace": {
    "mechanical": {
      "timeFormat": "24h"
    }
  }
}
```

### Normalisation

`ClockfaceRegistry.normalizeTweaks(raw)` (`app.js:2113-2130`) gains a single block to validate the `mechanical` entry:

```js
const MECHANICAL_TIME_FORMATS = ['24h', '12h'];

normalizeTweaks(raw) {
  // ... existing accent / driftIntensity / byFace coercion ...
  const byFace = (parsed.byFace && typeof parsed.byFace === 'object') ? parsed.byFace : {};

  // Phase 17: normalise mechanical sub-object
  const mech = (byFace.mechanical && typeof byFace.mechanical === 'object')
    ? byFace.mechanical
    : {};
  const tf = MECHANICAL_TIME_FORMATS.indexOf(mech.timeFormat) >= 0 ? mech.timeFormat : '24h';
  const pm = mech.previewMode === true;   // false unless explicitly true
  byFace.mechanical = { timeFormat: tf, previewMode: pm };

  return { accent: accent, driftIntensity: driftIntensity, byFace: byFace };
}
```

Unknown `timeFormat` falls back to `'24h'`. Missing `byFace.mechanical` is created with defaults. `previewMode` is always normalised to a boolean and is not persisted by the picker on Apply (picker-only edge state).

## 9. MechanicalFace Rendering Interface

```js
const MechanicalFace = {
  // Cached DOM handles. Populated by init(); never re-queried in render().
  _els: null,
  _lastPhaseIndex: null,
  _lastSecond: null,
  _lastMinuteKey: null,   // 'HH:MM' string; gates time/date repaints

  // -- Lifecycle --

  init(stage) {
    // Build the face DOM subtree inside #stage. Idempotent: re-init removes
    // any existing #mech-stage first. This guards against double-init in
    // a future hot-swap path (Phase 16's reserved teardown contract).
    const existing = stage.querySelector('#mech-stage');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'mech-stage';
    root.innerHTML = `
      <div id="mech-time">
        <span class="mech-hours">--</span><span class="mech-colon">:</span><span class="mech-minutes">--</span><span class="mech-ampm" hidden></span>
      </div>
      <div id="mech-date"></div>
      <svg id="mech-arc" viewBox="0 0 1180 8" preserveAspectRatio="none" aria-hidden="true">
        <line class="mech-arc-track" x1="80" y1="4" x2="1100" y2="4"/>
        <line class="mech-arc-grown" x1="80" y1="4" x2="80"   y2="4"/>
      </svg>
      <div id="mech-grid">
        ${[0,1,2,3,4].map(i => `
          <div class="mech-cell" data-cell="${i}">
            <div class="mech-cell-inner">
              <div class="mech-label"></div>
              <div class="mech-value"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    stage.appendChild(root);

    this._els = {
      root: root,
      time: root.querySelector('#mech-time'),
      hours: root.querySelector('.mech-hours'),
      colon: root.querySelector('.mech-colon'),
      minutes: root.querySelector('.mech-minutes'),
      ampm: root.querySelector('.mech-ampm'),
      date: root.querySelector('#mech-date'),
      arc: root.querySelector('#mech-arc'),
      arcGrown: root.querySelector('.mech-arc-grown'),
      cells: Array.from(root.querySelectorAll('.mech-cell'))
    };
    this._lastPhaseIndex = null;
    this._lastSecond = null;
    this._lastMinuteKey = null;
  },

  // Called every 1 Hz tick by DisplayModule.render(). Reads AppState (frozen),
  // reads tweaks (frozen), writes DOM. Never allocates DOM nodes.
  render(state, tweaks) {
    const mt = (tweaks.byFace && tweaks.byFace.mechanical) || {};
    this._renderTime(state, mt);
    this._renderDate(state);
    this._renderArc(state);
    this._renderGrid(state, mt);
  },

  // Reserved. Phase 17 changes go through full reload via the storage event,
  // so teardown is never called in practice. The shape exists so a future
  // hot-swap path can remove the face cleanly.
  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._lastPhaseIndex = null;
    this._lastSecond = null;
    this._lastMinuteKey = null;
  },

  // -- Internal helpers (omitted for brevity; full code in implementation) --
  _renderTime(state, mt) { /* writes hours/colon/minutes; applies AM/PM in 12h mode */ },
  _renderDate(state)     { /* writes "MON · 2026.05.11" gated by minute key */ },
  _renderArc(state)      { /* updates x2 + clones-and-fades at second 0 */ },
  _renderGrid(state, mt) { /* recomputes phase index, swaps columns with fade if changed */ }
};
```

### Registration

```js
// app.js:2096-2103 delta
const ClockfaceRegistry = {
  faces: {
    calm: CalmFace,
    mechanical: MechanicalFace,    // Phase 17
    // departures: DeparturesFace,  // Phase 18
    // editorial:  EditorialFace,   // Phase 19
    // horizon:    HorizonFace      // Phase 20
  },
  // ...
};
```

### Constraints carried from Phase 16

Per `phase-16-clockface-foundation.md` Section 6:

- Must not mutate `AppState`.
- Must not register `setInterval` / `setTimeout` outside the 1 Hz tick driven by `DisplayModule.render()`.
- Must not add `position: fixed` elements or solid filled blocks.
- Must not read `localStorage` directly; tweaks arrive via the `render(state, tweaks)` argument.
- Must not modify `--type-primary`, `--type-accent`, or `--lum-mod` directly (those are owned by `SkyColorModule`, `ObservanceModule`, `LuminanceBreath`).

`MechanicalFace` satisfies all of these. The minute-arc fade is the only animation, and it is driven entirely by the existing 1 Hz tick plus a single 600 ms CSS transition; no rAF loop, no setInterval.

### Picker entry point: long-press on `#mech-time` (D3)

Mechanical has no moon disc, so the Calm-baseline picker entry point (`#moon-disc` long-press) does not apply. Mechanical attaches the picker long-press to `#mech-time` (the time numerals), which is the largest stable element on the face and mirrors Calm's pattern of using the primary numeral as the gesture surface.

Behaviour is identical to Calm:

- **Long-press (>= 600 ms)** on `#mech-time` opens `clockface.html` (the picker).
- **Short tap (< 600 ms)** is reserved for `VersionOverlay` (build hash + deploy date toast).

Wiring: `MechanicalFace.init()` does **not** attach these listeners. The existing `VersionOverlay` and picker-entry handlers in `app.js` are face-aware: at boot, after `ACTIVE_FACE.init(stage)` runs, `VersionOverlay.bind()` selects either `#moon-disc` (Calm) or `#mech-time` (Mechanical) based on `FACE_ID`. The same selector resolves the long-press surface. Phases 18-20 will extend this dispatch with their own per-face elements.

This satisfies the Phase 16 constraint that faces must not register listeners outside `render()`: the binding is in `app.js` boot code, not in `MechanicalFace.init()`.

### Repaint gating

`render()` runs 1 Hz, but most elements change far less often:

| Sub-render | Gate | Cost |
|---|---|---|
| `_renderTime` | Only when `state.time.minutes` differs from `this._lastMinuteKey` | 60x reduction vs naive |
| `_renderDate` | Only when `state.date.isoDate` differs from cached | 86400x reduction vs naive |
| `_renderArc` | Every tick (it has to: the rail grows 1 px/s effective) | 1 Hz writes |
| `_renderGrid` | Computes `activePhaseIndex` every tick; performs DOM writes only when index changes (every 6 h) or when an underlying AppState slice changed since the last tick. Slice change detection uses a per-cell hash (`tempC + condition`, etc.) cached on the cell element. | DOM writes ~once per 6 h plus on data-fetch boundaries |

This keeps the per-tick CPU cost negligible while the rendering interface remains a pull (DisplayModule pulls every tick) rather than push.

## 10. AppState Integration

| Column | Reads from AppState | Null bubble (Q7) |
|---|---|---|
| TEMP | `weather.tempC` (number), `weather.condition` (enum string) | If either is null, render `—`. |
| AIR | `aqi.value` (int), `aqi.band` (enum string) | If `value` is null, render `—`. Band-only null is impossible (set together by AirQualityModule at `app.js:455-457`). |
| TIDE | `tide.type` (`'high'`/`'low'`), `tide.heightM` (float), `tide.time` (ISO string) | If `type` is null, render `— —M —:—`. |
| MOON | `moon.phaseName` (string), `moon.illumination` (0..1) | If `phaseName` is empty, render `—`. (Phase name is set at boot by MoonModule.) |
| SUN | `sun.sunrise` (formatted string), `sun.sunset` (formatted string) | If either is empty, render `—`. |

Time numerals consume `state.time.hours` and `state.time.minutes`; minute change drives the time-block repaint gate.
Date strip consumes `state.date.dayOfWeek`, `state.date.isoDate`; date change drives the date repaint gate.

`MechanicalFace` never writes to `AppState`. Tide null on a permanently exhausted `tides.json` is the most common live failure mode; the static fallback at `data/tides.json` keeps that slice populated as long as the weekly GitHub Action keeps it fresh. If the Action stops, the column collapses to `— —M —:—` (Q7 exception) and the rest of the face renders normally.

## 11. Burn-In Audit (Mechanical face)

Eight layers, mapped to Mechanical elements:

| # | Layer | Status on Mechanical | Notes |
|---|---|---|---|
| 1 | Per-element Perlin drift | Active | `time` 117 s, `date` 89 s, `slot` 143 s (applied to grid wrapper), `tickRail` 79 s. All pairwise coprime per the Phase 16 period table. Phase 17 is the first phase where `tickRail` carries pixels. |
| 2 | Pixel-shift safety net | Active via `tickRail` for the arc; via `time`, `date`, `slot` for the rest. `+/- 4 px` every 6 min applies on top of stage-clamped drift. Unchanged from Phase 16. |
| 3 | Kinetic transitions (Calm) -> distributed churn (Mechanical) | Active via composite coverage. See "Layer 3 trade-off" below. | Mechanical has no `RotatorModule`-driven 28-36 s slot rotation. The function is supplied by a composite of (a) per-element drift (Layer 1), (b) 1 Hz minute-arc growth, (c) data-fetch churn on every column, and (d) the 6 h grid rotation. Composite coverage argument is documented immediately below. |
| 4 | Macro shifts | Active | Time alternates between two homes every 3 h. Moon is not on the Mechanical face. The grid wrapper does not have its own macro shift; its content rotation (Layer 3) supplies the equivalent burn-in coverage. |
| 5 | Sky-color modulation | Active | Mechanical participates fully (Q10). All four token values (`--type-primary`, `--type-secondary`, `--type-tertiary`, `--type-accent`) modulate on the 60 s linear transition. `--type-tertiary` modulation is a Phase 17 fix: the token existed in V0 but the 60 s linear transition on `#display` omitted it; the omission was invisible on Calm (where tertiary type is sparse) but became visible on Mechanical's 11 px labels and date strip. The transition now covers all four tokens and the fix is applied to `#display` in `style.css`. |
| 6 | Luminance breath | Active | `filter: brightness(var(--lum-mod))` is applied to `#mech-time`, `#mech-date`, and `.mech-value`. Other elements (labels, arc) inherit `--type-tertiary`/`--type-accent` colour modulation but not the brightness oscillation; the arc and labels are small enough that this is not a burn-in risk. |
| 7 | Daily refresher | Active | 03:00 fade to `#404040` for 30 s. `#refresher-overlay` sits outside `#stage` (see `index.html:31`) and covers Mechanical identically to Calm. |
| 8 | Rendering hygiene | Active | Background `#0a0a0a`. Type weight 300 (one step heavier than Calm's 200 but still well below "block" territory). No filled blocks. The 1 px hairlines for the arc and grid separators are well under the "no solid block" threshold. |

### Layer 3 trade-off (Mechanical does not implement 28-36 s slot churn)

SDD Section 9 specifies Layer 3 as "kinetic transitions churn slot pixels every 28-36 s," tied to `RotatorModule`'s split-flap cycle. Mechanical does not run a rotator slot, and the 6 h grid rotation alone is far slower than the SDD cadence. Phase 17 treats Layer 3 as supplied by a composite of four mechanisms rather than a direct substitution:

| Mechanism | Cadence | Coverage |
|---|---|---|
| Per-element Perlin drift (Layer 1) | continuous, periods 79/89/117/143 s | Every Mechanical element carries its own drift. No pixel on any element is held for longer than its drift period. The slowest-drifting element (`#mech-grid` wrapper on `slot`, period 143 s) still re-positions every pixel within ~143 s. |
| Minute-arc growth | 1 Hz, ~17 px/s lateral motion | The grown line sweeps the full 1020 px rail every 60 s. The track at alpha 0.08 holds, but at that opacity it is well below the burn-in threshold for OLED-class panels. |
| Data-driven value churn | weather 15 m, AQI 30 m, tide 6 h, moon 6 h, sun 5 m | Each fetcher refresh re-renders the affected cell's text string. The composite refresh interval across all five columns is sub-30 min (the 5 m sun refresh alone churns the SUN column twelve times per hour). |
| Macro shifts (Layer 4) | time every 3 h, grid rotation every 6 h | Time element relocates between Home A and Home B every 3 h. Grid columns rotate every 6 h. The two macro layers run on different cadences, so Mechanical accumulates 4 macro events per 24 h. |

The argument: SDD Section 9's 28-36 s figure is calibrated to a single high-churn element (the rotator slot) in an otherwise low-motion face (Calm). Mechanical's design moves churn across many elements rather than concentrating it in one slot. The drift-plus-data-churn-plus-macro composite is judged equivalent for burn-in purposes, with the caveat that no single mechanism on Mechanical churns as fast as the rotator did.

This is a deliberate trade-off, not a violation. If hermione's burn-in review disagrees, Phase 17 can add a 32 s slot pixel scramble (e.g. swap the order of two cells, fade-only no content change) as a follow-up patch. Not a user blocker.

### Worst-case pixel-hold analysis

- `#mech-time` at 236 px Mono 300: the colon glyph is the only stable character in any minute. Drift on `time` is 24/18 px on 117 s, so each pixel in the colon glyph traverses its full amplitude band in ~58 s. Plus pixel-shift (+/- 4 px every 6 min). Plus macro shift every 3 h. Plus sky modulation continuously. Time digit pairs change every minute (`mm`) and every hour (`hh`); the only character stable for an hour is the colon and the hour tens digit (which changes at most every 9 hours of any given session). The 3 h macro shift handles the hour-tens case.
- `#mech-arc` track at alpha 0.08: the track is the only element static across minutes. With drift on `tickRail` (4/3 px on 79 s), no pixel along the track stays lit for more than ~39 s. The grown line is by definition transient (60 s sweeps).
- `#mech-grid` labels at 11 px tertiary: smallest type on the face. Drift on `slot` (12/8 px on 143 s) carries the whole grid; the column rotation at 6 h fully replaces each cell's text. Static text per cell holds for at most 6 h, and the 6 min pixel-shift safety net plus 143 s drift keeps any single pixel from being lit continuously across that window.

### Risk band (Q8)

The 11 px tertiary labels at `letter-spacing: 0.28em` were verified by chihiro against the Calm baseline at 2 m. The implementer must check on real iPad hardware: hold the device at typical viewing distance (~2 m), confirm the labels are legible, and if they read as too thin or too compressed, fall back to 12 px at 0.24 em tracking. This is the only typographic decision that depends on hardware verification.

## 12. Font Addition

JetBrains Mono 300 is added as the first new webfont since Phase 16. Phase 17 ships exactly one weight; weights 200 and 400 are not loaded.

### `index.html` delta

```html
<!-- Phase 17: JetBrains Mono 300 for Mechanical face -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300&display=swap">
```

The existing Manrope link at `index.html:11` is unchanged. JetBrains Mono is loaded unconditionally even on faces that do not use it (e.g. Calm), because conditional font loading would add boot complexity for ~16-20 KB of weight. If Phase 19's Cormorant Garamond and Phase 20's needs push total font weight over 80 KB, a face-conditional loader can be revisited at that point.

### `clockface.html` delta

Same link tag added; the picker must render the Mechanical live preview using the same font as the main display.

### Byte budget

| File | Estimated weight (WOFF2, subsetted via Google Fonts URL) |
|---|---|
| JetBrains Mono 300 (regular only, default Latin subset) | ~16 to 20 KB |

Google Fonts' default `display=swap` and Latin-only subsetting are used; no `unicode-range` override. The tabular figures variant ships in the standard JetBrains Mono build, so no extra request is needed.

### CSS application

```css
#mech-time, #mech-date, .mech-label, .mech-value {
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}
```

The fallback chain (`SF Mono`, `Menlo`, `monospace`) keeps Mechanical legible during the brief swap window before the webfont resolves.

## 13. Picker Preview Mode

Phase 16's `clockface.js` defers live preview for non-Calm faces; the placeholder card at `clockface.js:113-120` reads "COMING SOON". Phase 17 replaces that for Mechanical with a live face instance.

### Integration: `window.SOLARI_PICKER` boot guard (D4)

The picker invokes the same `MechanicalFace` object that the main display registers. To avoid duplicating face code in `clockface.js`, the picker loads `app.js` itself but suppresses the runtime side-effects via a boot-time flag. This is the canonical pattern; Phases 18-20 picker previews will follow the same convention.

#### Boot sequence in `clockface.html`

```html
<script>window.SOLARI_PICKER = true;</script>
<script defer src="app.js"></script>
<script defer src="clockface.js"></script>
```

The inline `<script>` setting `window.SOLARI_PICKER = true` **must** appear before the `<script src="app.js">` tag so the flag is visible when the `app.js` boot IIFE runs.

#### Boot guard in `app.js`

The existing boot IIFE at `app.js:2151` becomes:

```js
(function boot() {
  if (window.SOLARI_PICKER) {
    // Picker context: skip all fetchers, timers, render loop, and storage-event reload.
    // The face class objects (CalmFace, MechanicalFace, etc.) and constants
    // (CONFIG, ACCENT_PALETTE, ClockfaceRegistry) have already been defined
    // as module-scope constants by the time this IIFE runs, so they are
    // available to clockface.js via window-scope export below.
    return;
  }
  // ... existing boot: ClockModule.start(), WeatherModule.start(), TideModule.start(),
  //     AirQualityModule.start(), AlertModule.start(), SunModule.start(),
  //     MoonModule.start(), ObservanceModule.start(), DriftEngine.start(),
  //     MacroShifter.start(), RefresherCycle.start(), LuminanceBreath.start(),
  //     RotatorModule.start(), ResilienceManager.start(), DisplayModule.start(),
  //     VersionOverlay.bind(), and the storage-event reload listener.
})();
```

Specifically suppressed in the picker:

| Subsystem | Reason |
|---|---|
| `ClockModule.start()` / `WeatherModule.start()` / `TideModule.start()` / `AirQualityModule.start()` / `AlertModule.start()` / `SunModule.start()` / `MoonModule.start()` | No fetchers should run in the picker; `PREVIEW_STATE` supplies all values. Avoids unnecessary network traffic, API quota use, and timer/rAF cost. |
| `ObservanceModule.start()` / `RefresherCycle.start()` / `LuminanceBreath.start()` | These would mutate CSS variables on the picker page; the picker controls its own visual state. |
| `DriftEngine.start()` / `MacroShifter.start()` / `RotatorModule.start()` / `DisplayModule.start()` | These drive the live face. The picker drives `MechanicalFace.render()` directly on a 1 Hz interval. |
| `VersionOverlay.bind()` | The picker is not the long-press surface. |
| `storage` event listener (`app.js:2194`) | Without this guard the picker would self-reload when it writes `solari.clockface.tweaks` on Apply (its own write triggers its own listener). D4 makes this explicit. |

Module objects (`CalmFace`, `MechanicalFace`, `ClockfaceRegistry`, `CONFIG`, `ACCENT_PALETTE`, etc.) are defined as top-level `const`/object literals before the boot IIFE runs, so they are available to `clockface.js` via the existing `window.MechanicalFace` / `window.CalmFace` exports at the bottom of `app.js`. `clockface.js` references these directly:

```js
// clockface.js
window.MechanicalFace.init(mechanicalCardStage);
window.MechanicalFace.render(PREVIEW_STATE, previewTweaks);
```

No new module system, no dynamic `import()`. The exports are simple window-scope assignments at the foot of `app.js`:

```js
// At the bottom of app.js, after all face/module definitions:
window.CalmFace = CalmFace;
window.MechanicalFace = MechanicalFace;
window.ClockfaceRegistry = ClockfaceRegistry;
```

#### Precedent for Phase 18-20

Phases 18 (Departures), 19 (Editorial), and 20 (Horizon) all need picker live previews. Each phase adds its face class to the same window-scope export block and inherits the `SOLARI_PICKER` boot guard with no further changes. The pattern is fixed by Phase 17.

#### Trade-off note

This approach loads `app.js` (~80 KB by Phase 17 estimate) on the picker page even though most of it does not execute. The alternative — duplicating each face class into `clockface.js` — would trade ~10-15 KB of duplication for stricter isolation. The user has chosen the shared-load approach: less duplication, single source of truth for face code, and the `SOLARI_PICKER` boot guard cleanly draws the runtime line.

### Preview state

Phase 16 reserved `PREVIEW_STATE` at `clockface.js:43-44`. Phase 17 populates it:

```js
// In clockface.js
const PREVIEW_STATE = {
  time: { hours: 14, minutes: 32, seconds: 0, ampm: null },
  date: { dayOfWeek: 'Monday', day: 11, month: 'May', year: 2026, isoDate: '2026-05-11' },
  sun: { sunrise: '05:22', sunset: '20:47', dayLengthMin: 925, altitude: 12, azimuth: 220 },
  moon: { phase: 0.18, illumination: 0.18, phaseName: 'Waxing Crescent', terminatorAngle: 0 },
  weather: { tempC: 12, condition: 'PARTLY CLOUDY', code: 2 },
  aqi: { value: 24, pm25: 6, band: 'good' },
  tide: { type: 'high', heightM: 4.3, time: '04:22' },
  alert: null,
  alertPreempt: null,
  almanac: null,
  rotator: { text: '', index: 0 },
  observance: null,
  meta: { bootedAt: Date.now(), lastUpdate: {} }
};
```

The picker advances `PREVIEW_STATE.time` and `PREVIEW_STATE.time.seconds` once per second (independent of the real clock) so the minute-arc grows visibly during preview. The day-of-week and date strings stay frozen at the seeded values.

### Render loop

```js
// In clockface.js, after stage setup for the Mechanical card:
const previewTweaks = { ...persistedTweaks, byFace: {
  ...persistedTweaks.byFace,
  mechanical: { ...((persistedTweaks.byFace || {}).mechanical || { timeFormat: '24h' }), previewMode: true }
}};

window.MechanicalFace.init(mechanicalCardStage);

let previewClockId = setInterval(() => {
  // Advance seconds
  PREVIEW_STATE.time.seconds = (PREVIEW_STATE.time.seconds + 1) % 60;
  if (PREVIEW_STATE.time.seconds === 0) {
    PREVIEW_STATE.time.minutes = (PREVIEW_STATE.time.minutes + 1) % 60;
  }
  window.MechanicalFace.render(PREVIEW_STATE, previewTweaks);
}, 1000);

// When the card leaves the viewport (IntersectionObserver), pause the loop.
// When it re-enters, resume.
```

### Accelerated rotation (Q12)

`previewMode === true` switches `activePhaseIndex()` from a 6 h denominator to a 6 s denominator. In preview, a viewer sees all four column permutations within 24 s; the cross-fade behaviour is unchanged.

### Apply behaviour

`previewMode` is never persisted to `localStorage`. On Apply, `clockface.js` filters it out:

```js
function apply() {
  const persistable = JSON.parse(JSON.stringify(draftTweaks));
  if (persistable.byFace && persistable.byFace.mechanical) {
    delete persistable.byFace.mechanical.previewMode;
  }
  localStorage.setItem('solari.clockface.tweaks', JSON.stringify(persistable));
  // ...
}
```

The main display reads tweaks via `ClockfaceRegistry.normalizeTweaks`, which always normalises `previewMode` to `false` regardless of input.

### Calm card

Calm's hand-built mock (`clockface.js:101-112`) stays in Phase 17. Converting Calm to a live preview is listed in `todo.md` line 16 as a Phase 17 follow-up; chihiro and the user have de-scoped it from this phase to keep the change footprint focused on Mechanical.

## 14. Bundle Budget Audit

Phase 16 baseline (per phase-16-clockface-foundation.md Section 11): ~98 KB runtime, ~21 KB picker delta.

Phase 17 deltas (estimates):

| Change | Delta |
|---|---|
| `app.js`: `MechanicalFace` object (init/render/teardown plus column rotation + arc fade) | +3.8 KB |
| `app.js`: `DriftEngine.activeKeys` adds `'tickRail'`; entries in `_elementSizes` and `_anchorPercents` and `_phaseOffsets` for `tickRail` | +0.3 KB |
| `app.js`: `MacroShifter.timeHomesByFace` read path and `_applyTime()` element-id fork | +0.3 KB |
| `app.js`: `ClockfaceRegistry.normalizeTweaks` Mechanical block | +0.3 KB |
| `app.js`: `window.MechanicalFace` assignment + `SOLARI_PICKER` boot guard | +0.1 KB |
| `style.css`: Mechanical face styles (`#mech-stage`, time, date, arc, grid, cells, tokens) | +2.4 KB |
| `index.html`: JetBrains Mono link tag | +0.1 KB |
| `clockface.html`: JetBrains Mono link tag, Mechanical card stage placeholder | +0.2 KB |
| `clockface.js`: `PREVIEW_STATE` populated, preview clock interval, accelerated rotation | +1.2 KB |
| JetBrains Mono 300 WOFF2 (network only, cached after first hit) | +16 to 20 KB |
| **Total Phase 17 delta (excluding font)** | **~8.7 KB** |
| **Total Phase 17 delta (including font)** | **~24 to 28 KB** |

Phase 17 cumulative total: ~122 to 126 KB. Headroom against the 250 KB target: ~124 KB. Phases 18 to 20 are budgeted at 25 to 35 KB each plus webfonts; headroom remains adequate.

## 15. Test Plan

### Manual

| Test | Expected |
|---|---|
| Open `clockface.html`, scroll to Mechanical card | Live preview renders via `window.MechanicalFace.init(card)` + `render(PREVIEW_STATE, tweaks)` (D4 boot guard active: no fetchers, no live timers, no storage-event reload). `HH:MM` reads 24h with colon in `--type-accent`. Date strip reads `MON · 2026.05.11`. Five complications: `+12° PARTLY CLOUDY`, `024 GOOD`, `H 4.3M 04:22`, `WAX CRES 18%`, `↑ 05:22 ↓ 20:47`. Minute-arc grows from x=80 toward x=1100 over the preview's synthetic 60 s. |
| Open picker, wait 24 s on Mechanical card | Grid column order cycles through all four permutations (`[TEMP,AIR,TIDE,MOON,SUN]` -> `[SUN,TEMP,AIR,TIDE,MOON]` -> `[MOON,SUN,TEMP,AIR,TIDE]` -> `[TIDE,MOON,SUN,TEMP,AIR]`) with 300 ms staggered cross-fades. |
| In picker, open Tweaks panel, set Mechanical `timeFormat` to `12h`, Apply | Main display reloads. Headline time renders as `H:MM AM` with `AM`/`PM` as a separate span at 56 px in `--type-secondary`, baselined to the top of the digits. Colon stays at 236 px in `--type-accent`. TIDE column renders `H 4.3M 4:22 AM` with the AM/PM in `.mech-tok-ampm` (16 px Mono 300, `--type-tertiary`, `letter-spacing: 0.04em`, uppercase). SUN column renders `↑ 5:22 AM ↓ 8:47 PM` with the same AM/PM treatment for both suffixes. Grid columns auto-size via `1fr` and the row fits within the 1020 px grid bounds. |
| Toggle `timeFormat` back to `24h` | TIDE renders `H 4.3M 04:22` and SUN renders `↑ 05:22 ↓ 20:47` with no AM/PM span present in the DOM. Grid columns re-balance via `1fr`. |
| Open `index.html` with `solari.clockface = 'mechanical'` | Mechanical renders. Console shows no warnings. Stage scale is 1.0 on 1180 x 820 iPad viewport. |
| Wait 60 s | Minute-arc reaches x=1100. At second 0 of the next minute, previous grown line fades out over 600 ms while a new grown line starts at x=80. Track at alpha 0.08 is continuous. |
| Wait 3 h (or mock the time) | Time element transitions from Home A (y=320) to Home B (y=440) over 60 s ease-in-out. No discontinuity. |
| Wait 6 h (or mock the time) | Grid column rotation fires. Five cells cross-fade (300 ms out, 300 ms in, 60 ms stagger). Resulting order matches the permutation table for the new local hour. |
| Set system date to Dec 25 | Date strip reads `THU · 2026.12.25`. ObservanceModule mutates `--type-primary` and `--type-accent`; Mechanical inherits both. |
| Set `tide.type` to null in AppState (force tide fallback to exhaust) | Tide column renders `— —M —:—` in `--type-tertiary`. Other columns unaffected. |
| Set `aqi.value` to null in AppState | AIR column renders `—` in `--type-tertiary`. Other columns unaffected. |
| Long-press `#mech-time` for >= 600 ms | `clockface.html` opens. Short tap (< 600 ms) on `#mech-time` toggles the `VersionOverlay` build-info toast. (D3) |
| Resize viewport to 1366 x 1024 | Stage scale recomputes to 1.157; Mechanical scales uniformly. Drift amplitudes unchanged in stage pixels. |
| Run 24 h endurance | Memory growth within 5% of Phase 16 baseline. No DOM node leaks from minute-arc fade clones (the `transitionend` listener removes them). |
| Set `driftIntensity` to `off`, Apply | Time, date, arc, grid all hold their stage anchors with zero drift offset. Pixel-shift safety net continues to apply. |
| Set `driftIntensity` to `restless`, Apply | Drift amplitudes are 1.5x. Time element drifts up to 36 px X / 27 px Y; arc up to 6 px X / 4.5 px Y; date up to 18 px X / 12 px Y. All stay within stage bounds. |
| 03:00 refresher | Stage fades to `#404040` for 30 s, returns to Mechanical. Minute-arc state restores correctly (no orphan fade clones). |

### Automated where possible

- Lint pass on `app.js` (existing CI gate).
- `MechanicalFace.init()` and `MechanicalFace.teardown()` exercised in unit-style assertion: re-init removes the previous subtree before building.
- `ClockfaceRegistry.normalizeTweaks` round-trip for Mechanical-specific malformed inputs:
  - `{ byFace: { mechanical: { timeFormat: 'foo' } } }` -> `'24h'`
  - `{ byFace: { mechanical: { previewMode: 1 } } }` -> `false`
  - `{ byFace: { mechanical: null } }` -> `{ timeFormat: '24h', previewMode: false }`

### Sentry endurance hooks

Existing Phase 16 metrics (`clockface.boot.faceId`, `clockface.tweaks.accent`, etc.) are sufficient. No new hooks for Phase 17.

### Long-running validation

Mechanical must survive a 7-day endurance run with no memory growth and no DriftEngine slowdown, on par with Calm. Specific watch points:

1. Minute-arc fade clones must be removed by `transitionend`. Stalled clones accumulate at 1 per minute, 1440 per day, 10080 per week. A spike in `mech-stage` child count is the signal.
2. The grid cross-fade adds and removes the `is-fading` class. Stuck classes after 6 h boundaries would leave a column invisible.
3. Tide column null-state on a 7-day run where `data/tides.json` becomes exhausted partway through (the weekly refresh action handles this in practice, but the test should confirm graceful collapse).

## 16. Open Questions

Items remaining after the D1-D4 decision pass. None block implementation; all have defaulted resolutions noted below.

1. **JetBrains Mono FOUT on first boot.** The CSS fallback chain in Section 12 (`SF Mono`, `Menlo`, `monospace`) is plausible but un-tested on iPad Safari 18+. iPadOS includes `SF Mono` and `Menlo`; the swap delay should be sub-200 ms over LTE. **Resolution: ship with `font-display: swap` (Google Fonts default). A visible swap on first boot is acceptable for an ambient display that runs for months on a single load.** Self-hosting the woff2 is reserved for a later phase if needed. No user blocker.

2. **Tide value when current event is in the past.** `AppState.tide` carries the "current" event from `TideModule`. If the current event time is past local now (e.g. last fetch was a high tide at 04:22 and it is now 06:00), should the column show the upcoming event instead? Phase 16 Calm rotates through high vs low based on the current slice; Phase 17 inherits the same single slice. **Resolution: keep the current slice as-is and accept that the displayed event may be a few hours stale. Forward-looking selection is a `TideModule` change, out of scope for Phase 17.**

3. **Risk band fallback decision authority.** Q8 reserves a fallback to 12 px at 0.24em tracking if 11 px at 0.28em fails the 2 m read. **Resolution: misaka tests on real hardware during implementation and falls back to 12 px / 0.24em if any of the labels do not read at 2 m; ariadne updates this spec post-hoc.** No user blocker.

4. **Burn-in Layer 3 substitution math (raised during D1-D4 pass, surfaced here for review).** Chihiro's brief described the 6 h column rotation as Mechanical's Layer 3 substitution, but SDD Section 9 specifies a 28-36 s churn cadence for Layer 3. The 6 h rotation alone is far slower. See Section 11 audit for the trade-off argument (per-element drift on every element via Layer 1; 1 Hz minute-arc growth animating ~17 px/s laterally; data-driven value churn from weather/AQI/tide/moon/sun refresh cycles; macro shifts every 3-6 h). **Resolution: document as deliberate trade-off, not a violation. If hermione disagrees during review, add a manual churn mechanism (e.g. a 32 s slot pixel scramble) as a follow-up.** Not a user decision.

## 17. References

- SDD Section 9 (Burn-in Protection, eight layers).
- SDD Section 11.1 (Kinetic transition timing -- not used by Mechanical; the macro grid column swap supersedes).
- SDD Section 12 (Macro position shifts).
- SDD Section 17 (Layout grid, font sizes).
- SDD Section 22 (Acceptance criteria for endurance).
- `docs/phase-16-clockface-foundation.md` (foundation contract Phase 17 inherits).
- `design_handoff_clockface/README.md` Section "Mechanical" (visual reference; superseded by chihiro's Q1-Q12 locks where they differ).
- `app.js:43-52` (`CONFIG.driftClasses`, including the reserved `tickRail` channel activated by Phase 17).
- `app.js:114-119` (`ACCENT_PALETTE`).
- `app.js:1255-1423` (`DriftEngine`, modified by Phase 17 to add `tickRail` to `activeKeys` and to register the new anchor/size/phase).
- `app.js:1425-1487` (`MacroShifter`, extended in Phase 17 to read `timeHomesByFace` and target `#mech-time` for Mechanical).
- `app.js:1979-2028` (`DisplayModule.render` and its trailing `ACTIVE_FACE.render` call site).
- `app.js:2033-2062` (`Stage` helper, unchanged).
- `app.js:2070-2092` (`CalmFace`, the interface shape Mechanical mirrors).
- `app.js:2096-2145` (`ClockfaceRegistry`, extended to register `mechanical` and normalise its tweaks).
- `app.js:2151-2203` (boot IIFE, gated by `SOLARI_PICKER` in Phase 17).
- `clockface.js:11-44` (Phase 16 picker mirror tables and reserved `PREVIEW_STATE` slot Phase 17 populates).
- `style.css:29-50` (stage primitive and reserved drift channel vars; Phase 17 activates `--tickRail-dx`/`--tickRail-dy` writes from JS).
- `index.html:11` (existing Manrope link; JetBrains Mono link added beside it in Phase 17).
- MDN: [`SVGLineElement`](https://developer.mozilla.org/en-US/docs/Web/API/SVGLineElement), [`transitionend`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event), [`font-variant-numeric`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric).
