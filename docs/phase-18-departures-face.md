# Phase 18: Departures Face

| Field    | Value                                                                  |
|----------|------------------------------------------------------------------------|
| Phase    | 18 of 20 (V1, third face)                                              |
| Status   | Shipped                                                                |
| Shipped  | 2026-05-12                                                             |
| Date     | 2026-05-12                                                             |
| Author   | ariadne                                                                |
| Impl     | misaka                                                                 |
| Depends  | Phase 16 (clockface foundation), Phase 17 (Mechanical face)            |
| Unblocks | None (Phases 19 and 20 are independent face implementations)           |

## 1. Goal

Phase 18 introduces the Departures face, the Solari split-flap board namesake and the signature gesture of the entire app. Five rows of live data cycle on a 45 s cadence with a per-character split-flap cascade. A flap-paired headline time at the top of the stage and a footer status strip frame the board. Departures is the first face to use the reserved `departureRow` drift channel from Phase 16 and the first to seed a structural-chrome CSS variable (`--bezel-accent`) that does not modulate with sky color.

## 2. Scope and Non-Scope

### In scope

- New `DeparturesFace` object in `app.js`, implementing `init(stage) / render(state, tweaks) / teardown()` against the Phase 16 contract (`app.js:2070-2092` CalmFace shape; mirror Mechanical at `app.js:2149-2557`).
- `DeparturesFace` registration in `ClockfaceRegistry.faces` (`app.js:2096-2103`).
- DOM subtree built inside `#stage` by `DeparturesFace.init()`: header strip, flap-pair headline time, status block, board (column header + five rows), footer strip.
- Per-character split-flap cascade reused from the existing `KineticType` machinery; 110 ms stagger, 1500 ms cascade duration, applied to row TIME, EVENT, DETAIL, STATUS cells and to the four headline flap-pair characters.
- `departureRow` drift channel becomes active. Phase 18 introduces five independent phase offsets (`departureRow0` through `departureRow4`) so each row's noise sample is uncorrelated.
- `tickRail` channel reused for the header strip rule and the footer strip; the `tickRail` channel already went live in Phase 17 (the minute-arc rail) and gets two additional element bindings here without configuration changes.
- New CSS variable `--bezel-accent` seeded once at boot from the accent palette; never written by `SkyColorModule` or `ObservanceModule`. Used only by the flap-pair bezel border.
- New CSS variable `--flap-bezel-opacity` driven by the `tweaks.byFace.departures.flapBezelOpacity` tweak (default 0.22, range 0.0 to 0.4).
- Macro shifts: 3 h cadence relocates the entire upper band (header strip + flap-pair time + status block) as a single group, with a ~30 px y-delta. 6 h cadence reflows the board's column widths through a small set of permutations.
- Data-driven past-row dimming: rows whose timestamps have passed render at opacity 0.55 with STATUS reading `PAST` in `--type-tertiary`. Position-based dimming is rejected.
- Per-face tweak schema entry `tweaks.byFace.departures.flapBezelOpacity` (number, default 0.22).
- Picker live-render mode for the Departures card via the `SOLARI_PICKER` boot guard already shipped in Phase 17.
- Burn-in audit per layer; Departures inherits Mechanical's Layer 3 composite argument plus the 45 s row rotation, so Layer 3 is fully satisfied without the trade-off discussion Mechanical needed.

### Non-scope

- Editorial face. Deferred to Phase 19.
- Horizon face. Deferred to Phase 20.
- `boardDensity` toggle (5 versus 8 rows). Rejected by chihiro; Departures ships at 5 rows only.
- Per-row crossfade transitions. Rejected; the per-character split-flap cascade is the signature gesture and is non-negotiable.
- `accentSkyTrack: false` face-level opt-out. Deferred to Phase 20 (Horizon) which needs the full opt-out. Phase 18 freezes only the bezel via the separate `--bezel-accent` CSS variable; imminent-status text continues to track `--type-accent` and modulates with sky color.
- Filled flap-bezel rectangles (the design prototype's `background: #16140f`). Rejected by chihiro; transparent center plus 1 px gold-22% border only.
- Bezel tinting under observance overrides. Bezel is structural chrome and does not repaint; only imminent-status text tints under observance via the standard `--type-accent` path.
- Migrating Calm's picker preview from hand-built mock to a live `CalmFace.render()` call. Same de-scope as Phase 17.
- New webfont loads. JetBrains Mono 300 (the only font Departures uses) was loaded by Phase 17 (`index.html:11+` link tag).

## 3. Inherits from Phase 16 and Phase 17

The following primitives are reused without modification.

| Primitive | Source | What Phase 18 uses |
|---|---|---|
| Stage primitive | `app.js:2033-2062`, `style.css:75-84` | All Departures DOM is built inside `#stage` at 1180x820 pixel coordinates. |
| Face rendering interface | `app.js:2070-2092` (CalmFace), `app.js:2149-2557` (MechanicalFace) | `DeparturesFace.init/render/teardown` mirrors the three-method shape. |
| `ClockfaceRegistry.resolve(faceId)` | `app.js:2105-2109` | Departures registers as `'departures'`; resolve falls back to Calm on any unknown id. |
| `ClockfaceRegistry.normalizeTweaks(raw)` | `app.js:2113-2130` | Extended in Phase 18 to validate `byFace.departures.flapBezelOpacity` (Section 9). |
| Storage contract | `solari.clockface`, `solari.clockface.tweaks`, `solari.clockface.applied_at` | Unchanged. Departures adds a nested entry under `tweaks.byFace.departures`. |
| `storage` event reload | `app.js:2693-2701` | Unchanged. Switching to or from Departures triggers a full reload. |
| Drift class table | `CONFIG.driftClasses` (`app.js:43-52`) | Reads `departureRow` (period 61 s, ampX 6, ampY 4), `tickRail` (79 s, 4/3), `time` (117 s, 24/18). No new class entries; the five row sub-channels are added to `DriftEngine._phaseOffsets` only. |
| Drift intensity multipliers | `DRIFT_INTENSITY_MULT` (`app.js:111-116`) | Applies to all Departures channels including the five row sub-channels. |
| `DriftEngine` activation | `app.js:1306-1307`, `app.js:1335-1341`, `app.js:1395-1401` | Phase 18 adds `'departureRow0'` through `'departureRow4'` to `activeKeys` and registers their anchors and size entries. |
| `MacroShifter` engine | `app.js:1439-1522` | Phase 18 adds a per-face moon-position-style upper-band shift; see Section 13. Mechanical's `_timeHomesByFace` precedent is the model. |
| `SkyColorModule` | `app.js` (sky color block) | Departures inherits `--type-primary`, `--type-secondary`, `--type-tertiary`, `--type-accent` on the 60 s linear transition. `--bezel-accent` is excluded from the transition and is set once at boot. |
| `ObservanceModule` | `app.js` (observance block) | Departures inherits the observance repaint via `--type-primary` and `--type-accent`. The bezel does not repaint under observance overrides. |
| `LuminanceBreath` | `app.js` (luminance breath block) | `filter: brightness(var(--lum-mod))` applies to the flap-pair time, board rows, and header/footer strips. |
| `RefresherCycle` | `app.js:1524+` | Overlay sits outside `#stage` and covers Departures identically. |
| `RotatorModule` | `app.js` (rotator block) | Departures does not surface the rotator slot. Rotator continues to run; its output is read indirectly via `AppState.alertPreempt` for the status block's NEXT-line (see Section 8). |
| `KineticType` | `app.js` (split-flap cascade) | Reused verbatim for per-character cascade on all five row cells and the four headline flap characters. |
| `DisplayModule.render()` | `app.js` (render loop) | Trailing `ACTIVE_FACE.render(AppState, TWEAKS)` call drives Departures per tick. |
| `SOLARI_PICKER` boot guard | `app.js:2639-2644` | Picker loads `app.js` with side-effects suppressed; `window.DeparturesFace` becomes a new export at the foot of `app.js`. |
| JetBrains Mono 300 webfont | `index.html:11+`, `clockface.html` (Phase 17 delta) | Reused. No new font load. |

## 4. New Surface Area

Phase 18 introduces the following net-new elements:

- **DeparturesFace** object (face registration, lifecycle, render).
- **Five `departureRow*` phase offsets** in `DriftEngine._phaseOffsets`, all sharing the existing `departureRow` class config (period 61 s, ampX 6, ampY 4). This is a JS-only change inside `DriftEngine`; `CONFIG.driftClasses` is not edited.
- **`--bezel-accent`** CSS variable. Frozen at boot, never modulated.
- **`--flap-bezel-opacity`** CSS variable, written from `tweaks.byFace.departures.flapBezelOpacity` on boot.
- **`flapBezelOpacity`** tweak schema entry under `byFace.departures`.
- **Upper-band macro shift** for Departures: a per-face two-home table that relocates `#dep-upper` (header strip + flap-pair + status block) as a group every 3 h. Implemented as a Phase 18 extension of `MacroShifter`.
- **Board column reflow** every 6 h: small set of column-width permutations applied to the board's CSS Grid template. Implemented inside `DeparturesFace`, not `MacroShifter` (the change is content-grid-driven, not absolute-position-driven).
- **Past-row dimming logic** inside `DeparturesFace._renderRow()`: data-driven comparison of row timestamp vs `Date.now()`.
- **Picker entry point** long-press attaches to `#dep-time` (the flap-pair time wrapper), mirroring Mechanical's `#mech-time` precedent at `app.js:2149-2557`.

## 5. Element List

All positions are stage pixels (origin top-left of the 1180x820 box). Every drift-bearing element is `position: absolute` with `transform: translate(var(--<class>-dx), var(--<class>-dy))` so it picks up the relevant drift channel.

| Element ID | Stage position (px) | Anchor | Font / weight / size | Content / token notes |
|---|---|---|---|---|
| `#dep-stage` | x=0, y=0; width=1180, height=820 | top-left | n/a | Wrapper for all Departures DOM. No drift. No styling besides `position: absolute; inset: 0`. |
| `#dep-upper` (group) | x=0, y=0; width=1180, height=260 | top-left | n/a | Macro-shift container for header strip + flap-pair + status block. Receives `translate(0, var(--dep-upper-shift-y))` on the 3 h macro cadence (Section 13). No drift channel of its own; child elements carry their own drift. |
| `#dep-header` | x=80, y=60; width=1020 | top-left | JetBrains Mono 300, **12 px**, `letter-spacing: 0.34em`, uppercase, `--type-tertiary` | Three-column space-between `flex` row. Left: `SOLARI · DEPARTURE BOARD`. Center: `VANCOUVER · POINT ATKINSON`. Right: `MON 2026.05.11 · LOCAL`. 1 px `border-bottom: 1px solid var(--rule)`, `padding-bottom: 14px`. Drift via `date` channel (89 s, 12/8). |
| `#dep-time` (wrapper) | x=80, y=140; width=520, height=120 | top-left | JetBrains Mono 300 | Four-character flap-pair headline time. Two flap groups separated by an oversized colon. Drift via `time` channel (117 s, 24/18). |
| `#dep-time .dep-flap-group` (2 instances) | inline-flex | inline-flex | `padding: 4px 14px 2px`, `border-radius: 5px`, `border: 1px solid rgba(244, 197, 108, var(--flap-bezel-opacity, 0.22))` resolved against `--bezel-accent` (see Section 11). No background fill. | Two `<span class="dep-flap-char">` children per group. |
| `#dep-time .dep-flap-char` (4 instances) | inline | inline | JetBrains Mono 300, **96 px**, `font-variant-numeric: tabular-nums`, fixed `0.62em` width per char, `--type-accent` | Each character runs through `KineticType` cascade when its value changes. |
| `#dep-time .dep-colon` | inline | inline | JetBrains Mono 300, **80 px**, `--type-accent`, opacity 0.85, `margin: 0 6px` | Static colon between the two flap groups. |
| `#dep-status` | right=80, y=140; width=360, height=120 | top-right (absolute right) | JetBrains Mono 300, **13 px**, `letter-spacing: 0.30em`, uppercase, `line-height: 1.7` | Three lines, right-aligned: line 1 `NOW · MON` in `--type-tertiary`; line 2 weather summary in `--type-secondary` (`PARTLY CLOUDY 12°`); line 3 next-event countdown in `--type-tertiary` (`SUNSET IN 5H 15M`). Drift via `date` channel (shares the channel with `#dep-header` because both are sibling header-row chrome; the noise sample differs from the header strip by virtue of separate DOM placement but identical phase offset is acceptable for these two non-overlapping elements). |
| `#dep-board-header` | x=80, y=300; width=1020 | top-left | JetBrains Mono 300, **11 px**, `letter-spacing: 0.30em`, uppercase, `--type-tertiary` | Column header row using `grid-template-columns: 110px 110px 1fr 200px`. Four labels: `TIME`, `EVENT`, `DETAIL`, `STATUS`. STATUS column is right-aligned. 1 px `border-bottom: 1px solid var(--rule)`, `padding-bottom: 10px`. Drift via `tickRail` channel (79 s, 4/3). |
| `#dep-board` | x=80, y=340; width=1020 | top-left | JetBrains Mono 300 | Wrapper for the five row entries. No drift channel; each row carries its own. `display: flex; flex-direction: column; gap: 18px`. |
| `.dep-row` (5 instances) | row in `#dep-board` | grid | `grid-template-columns: 110px 110px 1fr 200px`, `column-gap: 24px`, `align-items: baseline` | Each row is one of the five `departureRow0..4` drift sub-channels (Section 7). |
| `.dep-row .dep-time-cell` | grid column 1 | grid cell | JetBrains Mono 300, **22 px**, `font-variant-numeric: tabular-nums`, default `--type-primary`; on imminent rows: `--type-accent` | Per-character `KineticType` cascade on value change. |
| `.dep-row .dep-event-cell` | grid column 2 | grid cell | JetBrains Mono 300, **12 px**, `letter-spacing: 0.28em`, uppercase, `--type-tertiary` | Per-character cascade on value change. |
| `.dep-row .dep-detail-cell` | grid column 3 | grid cell | JetBrains Mono 300, **18 px**, `letter-spacing: 0.10em`, uppercase, `--type-secondary` | Per-character cascade on value change. May include a single span tinted `--type-accent` for an in-line emphasis (e.g. `HIGH 4.3M · POINT ATKINSON` with `HIGH` accented when imminent). |
| `.dep-row .dep-status-cell` | grid column 4 | grid cell | JetBrains Mono 300, **14 px**, `letter-spacing: 0.22em`, uppercase, right-aligned. Imminent: `--type-accent`. Scheduled: `--type-secondary`. Past: `--type-tertiary`. | Per-character cascade on value change. |
| `.dep-row.is-past` | applied to entire row | n/a | n/a | `opacity: 0.55`; STATUS reads `PAST`. |
| `#dep-footer` | x=80, y=760; width=1020 | top-left | JetBrains Mono 300, **11 px**, `letter-spacing: 0.32em`, uppercase, `--type-tertiary` | Three-column `flex` space-between row. Left: `WEATHER · {condition} {temp}°`. Center: `AIR · {label} ({value})`. Right: `{alertCount} ALERTS` or `NO ALERTS`. Drift via `tickRail` channel (shares with `#dep-board-header`; non-overlapping). |

### CSS class names introduced

`dep-stage`, `dep-upper`, `dep-header`, `dep-time`, `dep-flap-group`, `dep-flap-char`, `dep-colon`, `dep-status`, `dep-board-header`, `dep-board`, `dep-row`, `dep-time-cell`, `dep-event-cell`, `dep-detail-cell`, `dep-status-cell`, `is-past`, `is-imminent`, `dep-footer`.

### Drift assignments

| Element | Drift class | Period (s) | ampX / ampY (px) | Phase offset key |
|---|---|---|---|---|
| `#dep-header` | `date` | 89 | 12 / 8 | `date` (shared with Calm/Mechanical date strip) |
| `#dep-time` | `time` | 117 | 24 / 18 | `time` |
| `#dep-status` | `date` | 89 | 12 / 8 | `date` (shared with header; non-overlapping DOM) |
| `#dep-board-header` | `tickRail` | 79 | 4 / 3 | `tickRail` (shared with Mechanical arc; non-overlapping faces never coexist) |
| `#dep-footer` | `tickRail` | 79 | 4 / 3 | `tickRail` (shared with board-header; non-overlapping DOM) |
| `.dep-row` row 0 | `departureRow` | 61 | 6 / 4 | `departureRow0` |
| `.dep-row` row 1 | `departureRow` | 61 | 6 / 4 | `departureRow1` |
| `.dep-row` row 2 | `departureRow` | 61 | 6 / 4 | `departureRow2` |
| `.dep-row` row 3 | `departureRow` | 61 | 6 / 4 | `departureRow3` |
| `.dep-row` row 4 | `departureRow` | 61 | 6 / 4 | `departureRow4` |

The five row sub-channels share `CONFIG.driftClasses.departureRow` configuration (amplitude and period) but each receives a unique phase offset so their noise samples do not correlate. The CSS variables are `--departureRow0-dx`, `--departureRow0-dy`, ..., `--departureRow4-dx`, `--departureRow4-dy`.

`tickRail` shared between `#dep-board-header` and `#dep-footer` is acceptable: both elements use the same CSS variable, so the writes coincide. The two elements drift in identical synchrony, which is visually correct (both are 1 px chrome rules anchored to the board) and does not violate burn-in (each rule drifts within its own pixel band; the synchrony does not introduce a static pixel rectangle).

## 6. Drift Channel Activation

`CONFIG.driftClasses` (`app.js:43-52`) is unchanged. Phase 18 changes only `DriftEngine`'s active-channel list and phase-offset table.

```js
// app.js DriftEngine._phaseOffsets delta (insert)
_phaseOffsets: {
  time:          { x: 0,    y: 100  },
  date:          { x: 200,  y: 300  },
  slot:          { x: 400,  y: 500  },
  moon:          { x: 800,  y: 900  },
  tickRail:      { x: 1000, y: 1100 },
  // Phase 18: five departure-row sub-channels, each sharing the
  // CONFIG.driftClasses.departureRow config (period 61 s, ampX 6, ampY 4)
  // but with independent phase offsets so the rows do not correlate.
  departureRow0: { x: 1200, y: 1300 },
  departureRow1: { x: 1400, y: 1500 },
  departureRow2: { x: 1600, y: 1700 },
  departureRow3: { x: 1800, y: 1900 },
  departureRow4: { x: 2000, y: 2100 }
},
```

```js
// app.js DriftEngine.start() activeKeys delta
const activeKeys = (function () {
  if (ACTIVE_FACE_ID === 'departures') {
    return ['time', 'date', 'tickRail',
            'departureRow0', 'departureRow1', 'departureRow2',
            'departureRow3', 'departureRow4'];
  }
  if (ACTIVE_FACE_ID === 'mechanical') {
    return ['time', 'date', 'slot', 'tickRail'];
  }
  // calm (default)
  return ['time', 'date', 'slot', 'moon'];
})();
```

The Phase 17 implementation hard-coded `['time', 'date', 'slot', 'moon', 'tickRail']` for all faces (`app.js:1307`). Phase 18 generalises this to face-aware activation. The change is conservative: each face declares the set of channels it actually paints; channels not in the active set get neither rAF writes nor CSS variable updates.

### `_elementSizes` additions

```js
// app.js DriftEngine._elementSizes delta (insert)
_elementSizes: {
  time:          { hw: 400, hh: 80 },
  date:          { hw: 160, hh: 28 },
  slot:          { hw: 210, hh: 28 },
  moon:          { hw: 71,  hh: 71 },
  tickRail:      { hw: 510, hh: 4  },
  // Phase 18: row half-extents (1020 px wide, ~30 px tall row content)
  departureRow0: { hw: 510, hh: 18 },
  departureRow1: { hw: 510, hh: 18 },
  departureRow2: { hw: 510, hh: 18 },
  departureRow3: { hw: 510, hh: 18 },
  departureRow4: { hw: 510, hh: 18 }
},
```

### `_anchorPercents` additions

The board sits at stage x=80 to x=1100 (1020 px wide centred on x=590, so anchor x=50%). The five rows stack from y=340 with 18 px gap, ~22 px row height (the cell padding plus the 22 px TIME column dominates). Approximate row centres:

| Row | y (px) | y (% of 820) |
|---|---|---|
| 0 | 360 | 44 |
| 1 | 400 | 49 |
| 2 | 440 | 54 |
| 3 | 480 | 59 |
| 4 | 520 | 63 |

```js
// app.js DriftEngine._anchorPercents delta (insert)
_anchorPercents: {
  time:          { x: 50, y: 44 },
  date:          { x: 50, y: 66 },
  slot:          { x: 50, y: 84 },
  moon:          { x: 84, y: 12 },
  tickRail:      { x: 50, y: 32 },
  // Phase 18: per-row anchors
  departureRow0: { x: 50, y: 44 },
  departureRow1: { x: 50, y: 49 },
  departureRow2: { x: 50, y: 54 },
  departureRow3: { x: 50, y: 59 },
  departureRow4: { x: 50, y: 63 }
},
```

### Why five sub-channels rather than one class with per-instance phase

Two alternatives were considered.

- **Alt A: extend `DriftEngine` to accept per-instance phase offsets for a single class.** Each row would carry an additional property (e.g. `data-drift-phase="0"`) and `DriftEngine._loop` would multiply by that integer. The engine would need a second loop pass to emit per-instance CSS variables (`--departureRow-0-dx`, `--departureRow-0-dy`). This requires reshaping the engine's write loop and changes the CSS variable naming convention.
- **Alt B (chosen): introduce five named entries (`departureRow0` through `departureRow4`) that share the same `CONFIG.driftClasses.departureRow` amplitude and period, with unique phase offsets.** Zero engine refactor; the five entries slot into `_phaseOffsets`, `_elementSizes`, and `_anchorPercents` exactly like every other channel. CSS variable names follow the existing convention (`--departureRow0-dx`, etc.).

Alt B is shipped. The cost is five extra entries in three tables; the savings are zero new engine code and zero new CSS variable conventions.

## 7. CONFIG Additions

`CONFIG.driftClasses` is unchanged. The only `CONFIG` block that gains an entry is the per-face macro shift table.

```js
// app.js CONFIG.macroShift delta (insert)
macroShift: {
  enabled: true,
  timeIntervalHours: 3,
  timeTransitionSec: 60,
  timeHomes: [
    [50, 44], [35, 38], [65, 38],
    [50, 52], [40, 46], [60, 46]
  ],
  timeHomesByFace: {
    mechanical: [[50, 39], [50, 54]],
    // Phase 18: Departures relocates the upper-band group, not a single
    // time element. The home values here are y-delta offsets in px applied
    // to #dep-upper via a CSS variable (--dep-upper-shift-y); see Section 13.
    // The two-entry table alternates between 0 px and -30 px.
    departures: [[0, 0], [0, -30]]
  },
  moonIntervalHours: 6,
  moonTransitionSec: 60,
  moonHomes: [
    [84, 12], [16, 12], [84, 62], [16, 62]
  ]
}
```

Mechanical's `timeHomesByFace` entries are absolute percent coordinates (interpreted by `MacroShifter._applyHome()` as `left:` and `top:` percentages). Departures' entries are y-delta pixel pairs (`[xDelta, yDelta]`); `MacroShifter` reads them differently when `ACTIVE_FACE_ID === 'departures'` (see Section 13). The semantics divergence is documented in code comments at the `MacroShifter._applyTime()` call site.

## 8. Slot Sources and Row Data Binding

Departures has no rotator slot. The five board rows are populated by a dedicated row-builder inside `DeparturesFace`. The builder reads `AppState` slices and returns five row objects, ordered by ascending timestamp; rows whose timestamps have passed remain in the list with `isPast: true`.

### Row schema

```ts
type DepartureRow = {
  time: string;       // "20:47" (24h)
  event: string;      // "SUN", "TIDE", "MOON", "METEOR", "ALERT"
  detail: string;     // "GOLDEN HOUR · SUNSET", "HIGH 4.3M · POINT ATKINSON", ...
  status: string;     // "IN 5H 15M", "ARRIVING", "RISING", "PEAKED", "TOMORROW", "PAST"
  accent: boolean;    // true if imminent (status uses --type-accent)
  isPast: boolean;    // true if time has passed local now
  timestamp: number;  // epoch ms, used for sort and past detection
};
```

### Row sources, in priority order

The row-builder gathers candidate rows from these `AppState` slices, sorts by `timestamp`, then takes the first five. The list is recomputed every tick but DOM writes are gated by content-hash comparison per cell (Section 12 repaint gating).

| Source | AppState slice | Row construction |
|---|---|---|
| Next sun event | `AppState.sun.sunrise`, `AppState.sun.sunset` | Pick the next of sunrise/sunset relative to local now. EVENT = `SUN`, DETAIL = `GOLDEN HOUR · SUNRISE` or `GOLDEN HOUR · SUNSET`, STATUS = `IN {h}H {mm}M` until the event, then `PAST`. |
| Tide event | `AppState.tide.type`, `.heightM`, `.time` | EVENT = `TIDE`, DETAIL = `HIGH {h.h}M · POINT ATKINSON` or `LOW ...`, STATUS = `ARRIVING` if within 60 min of now and not yet passed, else `IN {h}H {mm}M`, else `PAST`. |
| Moon event | `AppState.moon` (next moonrise/moonset from SunCalc, computed by `MoonModule`) | EVENT = `MOON`, DETAIL = `{phaseName} · {illum}%`, STATUS = `RISING` / `SETTING` / `IN {h}H {mm}M` / `PAST`. |
| Almanac entry | `AppState.almanac` (near-term entry from `AlmanacModule`) | EVENT = `METEOR` / `ECLIPSE` (depends on `almanac.kind`), DETAIL = `{name} · PEAK {date}`, STATUS = `TONIGHT` / `TOMORROW` / `PEAKED` / `IN {n}D`. |
| Next-day sunrise | `AppState.sun.nextSunrise` (or recomputed locally) | EVENT = `SUN`, DETAIL = `SUNRISE · CIVIL DAWN {time}`, STATUS = `TOMORROW`. |
| Alert preemption | `AppState.alertPreempt` | When present, row 0 is replaced with EVENT = `ALERT`, DETAIL = `{headline}`, STATUS = `ACTIVE` in `--type-accent`. Other rows shift down by one; row 4 is dropped if necessary. |

### Past-row dimming (data-driven)

The four corners are explicit:

- A row whose `timestamp` is in the past (`< Date.now() - 5 min` grace) sets `isPast: true`.
- `DeparturesFace._renderRow()` applies `class="dep-row is-past"` and writes STATUS = `PAST` in `--type-tertiary`.
- Rows are sorted by `timestamp` ascending, so past rows appear at the top. They are not removed from the list until the row-builder regenerates the candidate set; a past row stays visible for at most the row-builder's recompute window (one tick).
- The dimming is opacity 0.55 on the row, not on individual cells. The split-flap cascade still fires when STATUS transitions to `PAST`.
- Position-based dimming (e.g. always dim row 4) is rejected. The prototype at `design_handoff_clockface/clockface.html:545` applied `opacity: i === 4 ? 0.55 : 1`, which Phase 18 explicitly does not replicate.

### Imminent-row accent

A row whose status begins with `IN 0H` (less than 1 hour away) or that returns `ARRIVING` / `RISING` / `SETTING` sets `accent: true`. `DeparturesFace._renderRow()` applies `class="dep-row is-imminent"` and the STATUS cell renders in `--type-accent`. The DETAIL cell may also include an in-line `<span class="dep-detail-accent">` for emphasis (e.g. `HIGH` in `HIGH 4.3M · POINT ATKINSON`); this span uses `color: var(--type-accent)`.

When `--type-accent` modulates with sky color (continuous, 60 s linear transition), the imminent STATUS text tints in sync. When `ObservanceModule` overrides `--type-accent` (e.g. Christmas Day), the imminent STATUS text adopts the observance accent. The flap-pair bezel does not: it uses `--bezel-accent` (Section 11), which is set once at boot.

### 45 s rotation cadence

The row-builder regenerates its candidate set every 45 s. The set rarely changes between regenerations (sun and tide events tick down through status only), but the cadence ensures rows refresh at least every 45 s even when AppState slices are static. The trigger is a side-effect-free `Math.floor(Date.now() / 45_000)` epoch index compared against the cached last index inside `DeparturesFace._renderBoard()`. When the index increments, the row builder runs; otherwise the previous row set is reused and only the status countdown strings (which depend on `Date.now()`) are recomputed.

Each individual row's content change (any of TIME / EVENT / DETAIL / STATUS differing from the previous render) triggers `KineticType` cascade on the affected cells. The 45 s cadence is the upper bound on freshness; the lower bound is the underlying fetch cadence (sun 5 m, tide 6 h, etc.).

## 9. Per-Face Tweaks

```ts
type DeparturesTweaks = {
  flapBezelOpacity?: number;   // default 0.22; clamped to [0.0, 0.4]
};

type Tweaks = {
  accent: 'gold' | 'sky' | 'sage' | 'paper';
  driftIntensity: 'off' | 'subtle' | 'normal' | 'restless';
  byFace: {
    mechanical?: { timeFormat?: '24h' | '12h'; previewMode?: boolean };
    departures?: DeparturesTweaks;
  };
};
```

### Storage delta

```json
{
  "accent": "gold",
  "driftIntensity": "normal",
  "byFace": {
    "mechanical": { "timeFormat": "24h" },
    "departures": { "flapBezelOpacity": 0.22 }
  }
}
```

### Normalisation

`ClockfaceRegistry.normalizeTweaks(raw)` gains a Departures block alongside the existing Mechanical block:

```js
const DEPARTURES_OPACITY_MIN = 0.0;
const DEPARTURES_OPACITY_MAX = 0.4;
const DEPARTURES_OPACITY_DEFAULT = 0.22;

function clampOpacity(v) {
  if (typeof v !== 'number' || !isFinite(v)) return DEPARTURES_OPACITY_DEFAULT;
  if (v < DEPARTURES_OPACITY_MIN) return DEPARTURES_OPACITY_MIN;
  if (v > DEPARTURES_OPACITY_MAX) return DEPARTURES_OPACITY_MAX;
  return v;
}

// In normalizeTweaks, after the mechanical block:
const dep = (byFace.departures && typeof byFace.departures === 'object')
  ? byFace.departures
  : {};
byFace.departures = {
  flapBezelOpacity: clampOpacity(dep.flapBezelOpacity)
};
```

Unknown values, NaN, non-numeric inputs, and out-of-range values all fall back to 0.22.

### Boot wiring

After `ClockfaceRegistry.applyAccent()` and `applyDriftIntensity()` run at boot (`app.js:2660-2661`), Phase 18 adds:

```js
// app.js boot, after applyDriftIntensity()
if (ACTIVE_FACE_ID === 'departures') {
  const dep = TWEAKS.byFace.departures || {};
  document.documentElement.style.setProperty(
    '--flap-bezel-opacity',
    String(dep.flapBezelOpacity ?? 0.22)
  );
}
```

This is set once at boot; tweak changes go through the storage-event reload path.

## 10. Bezel Accent Mechanism

The bezel is structural chrome. It does not modulate with sky color. It does not repaint under observance overrides. It uses a separate CSS variable seeded once at boot.

### `--bezel-accent`

```js
// app.js ClockfaceRegistry, alongside applyAccent():

applyBezelAccent(accent) {
  // Phase 18: seed --bezel-accent once at boot from the accent palette.
  // SkyColorModule and ObservanceModule do not touch this variable.
  const palette = ACCENT_PALETTE[accent] || ACCENT_PALETTE.gold;
  // Convert hex to "r, g, b" so the CSS can apply alpha via rgba().
  const hex = palette.hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  document.documentElement.style.setProperty('--bezel-accent', `${r}, ${g}, ${b}`);
}
```

Called once from `boot()` after `applyAccent()`. The variable holds the bare RGB triple (`244, 197, 108` for gold) so the CSS can compose `rgba()` with the live `--flap-bezel-opacity`:

```css
.dep-flap-group {
  border: 1px solid rgba(var(--bezel-accent, 244, 197, 108), var(--flap-bezel-opacity, 0.22));
}
```

### Why not face-level `accentSkyTrack: false`

Two approaches were considered.

- **Face-level `accentSkyTrack: false` opt-out.** The face object declares the flag; `SkyColorModule.update()` reads `ACTIVE_FACE.accentSkyTrack` and suspends the `--type-accent` modulation when false. This is the right shape for Horizon (Phase 20), which needs the moon glyph frozen at a cool blue regardless of sky color. But for Departures, the imminent-status text *should* modulate with sky (it carries time-sensitive emphasis and the sky-correlated tint reinforces the rhythm), and only the bezel needs freezing.
- **Per-variable freeze via separate CSS variable (chosen).** The bezel uses `--bezel-accent` (frozen). Imminent-status text uses `--type-accent` (modulates). Both can co-exist on the same face without a face-level toggle.

Phase 18 ships the per-variable approach. The face-level `accentSkyTrack` hook is deferred to Phase 20 where its semantics are unambiguously needed. `DeparturesFace.accentSkyTrack` is implicitly `true` (the default).

## 11. CSS Additions

```css
/* Phase 18: bezel accent (frozen at boot) and bezel opacity tweak */
:root {
  --bezel-accent: 244, 197, 108;   /* gold default; overridden at boot */
  --flap-bezel-opacity: 0.22;       /* tweak; range 0.0 to 0.4 */

  /* Phase 18: row drift offsets, set by DriftEngine */
  --departureRow0-dx: 0px; --departureRow0-dy: 0px;
  --departureRow1-dx: 0px; --departureRow1-dy: 0px;
  --departureRow2-dx: 0px; --departureRow2-dy: 0px;
  --departureRow3-dx: 0px; --departureRow3-dy: 0px;
  --departureRow4-dx: 0px; --departureRow4-dy: 0px;

  /* Phase 18: macro-shift y-delta for the upper band */
  --dep-upper-shift-y: 0px;
}

/* Phase 18: Departures face */
#dep-stage {
  position: absolute;
  inset: 0;
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  color: var(--type-primary);
  font-weight: 300;
}

#dep-upper {
  position: absolute;
  inset: 0 0 auto 0;
  height: 260px;
  transform: translate(0, var(--dep-upper-shift-y));
  transition: transform 60s ease-in-out;
}

#dep-header {
  position: absolute;
  top: 60px;
  left: 80px;
  right: 80px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  letter-spacing: 0.34em;
  color: var(--type-tertiary);
  text-transform: uppercase;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 14px;
  transform: translate(var(--date-dx, 0), var(--date-dy, 0));
  filter: brightness(var(--lum-mod, 1));
}

#dep-time {
  position: absolute;
  top: 140px;
  left: 80px;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  transform: translate(var(--time-dx, 0), var(--time-dy, 0));
  filter: brightness(var(--lum-mod, 1));
}

.dep-flap-group {
  display: inline-block;
  padding: 4px 14px 2px;
  border-radius: 5px;
  border: 1px solid rgba(var(--bezel-accent, 244, 197, 108), var(--flap-bezel-opacity, 0.22));
  color: var(--type-accent);
  font-variant-numeric: tabular-nums;
  font-size: 96px;
  line-height: 1;
}

.dep-flap-char {
  display: inline-block;
  width: 0.62em;
  text-align: center;
}

.dep-colon {
  font-size: 80px;
  color: var(--type-accent);
  opacity: 0.85;
  margin: 0 6px;
}

#dep-status {
  position: absolute;
  top: 140px;
  right: 80px;
  width: 360px;
  font-size: 13px;
  letter-spacing: 0.30em;
  text-transform: uppercase;
  line-height: 1.7;
  text-align: right;
  color: var(--type-tertiary);
  transform: translate(var(--date-dx, 0), var(--date-dy, 0));
  filter: brightness(var(--lum-mod, 1));
}

#dep-status .dep-status-weather { color: var(--type-secondary); }

#dep-board-header {
  position: absolute;
  top: 300px;
  left: 80px;
  right: 80px;
  display: grid;
  grid-template-columns: 110px 110px 1fr 200px;
  gap: 24px;
  font-size: 11px;
  letter-spacing: 0.30em;
  text-transform: uppercase;
  color: var(--type-tertiary);
  border-bottom: 1px solid var(--rule);
  padding-bottom: 10px;
  transform: translate(var(--tickRail-dx, 0), var(--tickRail-dy, 0));
}

#dep-board-header > :nth-child(4) { text-align: right; }

#dep-board {
  position: absolute;
  top: 340px;
  left: 80px;
  right: 80px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dep-row {
  display: grid;
  grid-template-columns: 110px 110px 1fr 200px;
  column-gap: 24px;
  align-items: baseline;
  color: var(--type-secondary);
  filter: brightness(var(--lum-mod, 1));
}

.dep-row[data-row="0"] { transform: translate(var(--departureRow0-dx, 0), var(--departureRow0-dy, 0)); }
.dep-row[data-row="1"] { transform: translate(var(--departureRow1-dx, 0), var(--departureRow1-dy, 0)); }
.dep-row[data-row="2"] { transform: translate(var(--departureRow2-dx, 0), var(--departureRow2-dy, 0)); }
.dep-row[data-row="3"] { transform: translate(var(--departureRow3-dx, 0), var(--departureRow3-dy, 0)); }
.dep-row[data-row="4"] { transform: translate(var(--departureRow4-dx, 0), var(--departureRow4-dy, 0)); }

.dep-row.is-past { opacity: 0.55; }
.dep-row.is-imminent .dep-status-cell { color: var(--type-accent); }

.dep-time-cell {
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  color: var(--type-primary);
}
.dep-row.is-imminent .dep-time-cell { color: var(--type-accent); }

.dep-event-cell {
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--type-tertiary);
}

.dep-detail-cell {
  font-size: 18px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--type-secondary);
}

.dep-detail-accent { color: var(--type-accent); }

.dep-status-cell {
  font-size: 14px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-align: right;
  color: var(--type-secondary);
}

.dep-row.is-past .dep-status-cell { color: var(--type-tertiary); }

#dep-footer {
  position: absolute;
  bottom: 60px;
  left: 80px;
  right: 80px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--type-tertiary);
  transform: translate(var(--tickRail-dx, 0), var(--tickRail-dy, 0));
  filter: brightness(var(--lum-mod, 1));
}
```

`--rule` is the existing 1 px rule color token from Calm / Mechanical (`rgba(255,255,255,0.10)` or equivalent in `style.css`).

## 12. Render Contract

```js
const DeparturesFace = {
  // Cached DOM handles. Populated by init(); never re-queried in render().
  _els: null,
  _lastRowEpoch: -1,
  _lastRowHashes: ['', '', '', '', ''],
  _lastUpperShiftIndex: -1,
  _lastColumnPermIndex: -1,
  _lastMinuteKey: null,

  // -- Lifecycle --

  init(stage) {
    const existing = stage.querySelector('#dep-stage');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'dep-stage';
    root.innerHTML = `
      <div id="dep-upper">
        <div id="dep-header">
          <span class="dep-header-left">SOLARI · DEPARTURE BOARD</span>
          <span class="dep-header-center">VANCOUVER · POINT ATKINSON</span>
          <span class="dep-header-right"></span>
        </div>
        <div id="dep-time">
          <span class="dep-flap-group">
            <span class="dep-flap-char">-</span><span class="dep-flap-char">-</span>
          </span>
          <span class="dep-colon">:</span>
          <span class="dep-flap-group">
            <span class="dep-flap-char">-</span><span class="dep-flap-char">-</span>
          </span>
        </div>
        <div id="dep-status">
          <div class="dep-status-now">NOW · ---</div>
          <div class="dep-status-weather">---</div>
          <div class="dep-status-next">---</div>
        </div>
      </div>
      <div id="dep-board-header">
        <span>TIME</span><span>EVENT</span><span>DETAIL</span><span>STATUS</span>
      </div>
      <div id="dep-board">
        ${[0, 1, 2, 3, 4].map(i => `
          <div class="dep-row" data-row="${i}">
            <span class="dep-time-cell"></span>
            <span class="dep-event-cell"></span>
            <span class="dep-detail-cell"></span>
            <span class="dep-status-cell"></span>
          </div>
        `).join('')}
      </div>
      <div id="dep-footer">
        <span class="dep-footer-weather">---</span>
        <span class="dep-footer-air">---</span>
        <span class="dep-footer-alerts">---</span>
      </div>
    `;
    stage.appendChild(root);

    this._els = {
      root: root,
      upper: root.querySelector('#dep-upper'),
      header: root.querySelector('#dep-header'),
      headerRight: root.querySelector('.dep-header-right'),
      time: root.querySelector('#dep-time'),
      flapChars: Array.from(root.querySelectorAll('.dep-flap-char')),
      statusNow: root.querySelector('.dep-status-now'),
      statusWeather: root.querySelector('.dep-status-weather'),
      statusNext: root.querySelector('.dep-status-next'),
      boardHeader: root.querySelector('#dep-board-header'),
      board: root.querySelector('#dep-board'),
      rows: Array.from(root.querySelectorAll('.dep-row')),
      footerWeather: root.querySelector('.dep-footer-weather'),
      footerAir: root.querySelector('.dep-footer-air'),
      footerAlerts: root.querySelector('.dep-footer-alerts')
    };
    this._lastRowEpoch = -1;
    this._lastRowHashes = ['', '', '', '', ''];
    this._lastUpperShiftIndex = -1;
    this._lastColumnPermIndex = -1;
    this._lastMinuteKey = null;
  },

  // Called every 1 Hz tick by DisplayModule.render().
  render(state, tweaks) {
    this._renderHeader(state);
    this._renderTime(state);
    this._renderStatus(state);
    this._renderBoard(state);
    this._renderFooter(state);
    this._applyMacroShifts(state);
  },

  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._lastRowEpoch = -1;
    this._lastRowHashes = ['', '', '', '', ''];
    this._lastUpperShiftIndex = -1;
    this._lastColumnPermIndex = -1;
    this._lastMinuteKey = null;
  },

  // -- Internal helpers (sketched; full code in implementation) --
  _renderHeader(state)       { /* writes dep-header-right with day + ISO date, gated by date.isoDate */ },
  _renderTime(state)         { /* writes the four flap chars, driven by KineticType on character change */ },
  _renderStatus(state)       { /* writes the three status lines, gated by content hashes */ },
  _renderBoard(state)        { /* builds row candidates every 45 s, writes each cell via KineticType on change */ },
  _renderFooter(state)       { /* writes the three footer strings */ },
  _applyMacroShifts(state)   { /* recomputes upper-band y-delta and column-permutation index, applies if changed */ }
};
```

### Repaint gating

`render()` runs 1 Hz, but most elements change far less often.

| Sub-render | Gate | Cost |
|---|---|---|
| `_renderHeader` | Only when `state.date.isoDate` differs from cached | 86400x reduction vs naive |
| `_renderTime` | Only when `state.time.minutes` differs from cached (the colon and 96 px flap chars only change on minute boundaries) | 60x reduction |
| `_renderStatus` | Only when any of the three lines' content hashes differ from cached | Bounded by data fetcher cadence |
| `_renderBoard` | Computes `Math.floor(Date.now() / 45_000)` epoch; only rebuilds the row candidate set when the epoch advances. Within an epoch, only status countdowns are recomputed (sub-strings of cell content), and even those run through hash-compare before any DOM write. | DOM writes ~every 45 s for at most one cell per row that changed (status) |
| `_renderFooter` | Hash compare on each of three footer strings | Bounded by fetcher cadence |
| `_applyMacroShifts` | Recomputes `Math.floor(hoursSinceMidnight / 3) % 2` (upper-band) and `Math.floor(hoursSinceMidnight / 6) % 3` (column perm); applies only when changed | ~once per 3 h and ~once per 6 h |

The per-character `KineticType` cascade is the only path that allocates `<span>` content per character; it is invoked only when the cell's text changes (i.e. when the gate above already proved a change exists).

### Constraints carried from Phase 16

Per `phase-16-clockface-foundation.md` Section 6:

- Must not mutate `AppState`.
- Must not register `setInterval` / `setTimeout` outside the 1 Hz tick driven by `DisplayModule.render()`. (Departures' 45 s cadence is checked inside `render()` against `Date.now()`, not via timer.)
- Must not add `position: fixed` elements or solid filled blocks. (The flap-pair bezel is transparent center plus 1 px border; not a filled block.)
- Must not read `localStorage` directly; tweaks arrive via `render(state, tweaks)`.
- Must not modify `--type-primary`, `--type-accent`, `--lum-mod`. (`--bezel-accent` and `--flap-bezel-opacity` are new variables owned by Phase 18; only set at boot, never modulated.)

### Picker entry point

`DeparturesFace.init()` does not attach pointer listeners. The existing dispatch at boot (Phase 17 precedent: `VersionOverlay.bind()` selects between `#moon-disc` and `#mech-time` based on `FACE_ID`) gains a `'departures'` branch that selects `#dep-time`. Long-press >= 600 ms opens `clockface.html`; short tap toggles `VersionOverlay`.

```js
// app.js VersionOverlay.bind() delta
const targetId = (function () {
  if (ACTIVE_FACE_ID === 'mechanical') return 'mech-time';
  if (ACTIVE_FACE_ID === 'departures') return 'dep-time';
  return 'moon-disc';
})();
const target = document.getElementById(targetId);
// ... existing long-press + short-tap binding logic ...
```

### Registration and exports

```js
// app.js:2096-2103 delta
const ClockfaceRegistry = {
  faces: {
    calm: CalmFace,
    mechanical: MechanicalFace,
    departures: DeparturesFace,   // Phase 18
    // editorial:  EditorialFace,  // Phase 19
    // horizon:    HorizonFace     // Phase 20
  },
  // ...
};

// app.js:2635-2637 delta (foot of file)
window.CalmFace = CalmFace;
window.MechanicalFace = MechanicalFace;
window.DeparturesFace = DeparturesFace;   // Phase 18
window.ClockfaceRegistry = ClockfaceRegistry;
```

## 13. Macro Shift Behaviour

### Upper-band y-shift (every 3 h)

The entire upper band (`#dep-upper`: header strip + flap-pair time + status block) translates as a group along the y-axis on a 3 h cadence. Two homes only:

- Home A: `--dep-upper-shift-y: 0px`
- Home B: `--dep-upper-shift-y: -30px`

`MacroShifter._applyTime()` is extended to dispatch on `ACTIVE_FACE_ID`:

```js
_applyTime(withTransition) {
  if (ACTIVE_FACE_ID === 'departures') {
    // Phase 18: upper-band y-delta, applied to #dep-upper via CSS variable.
    // The variable already carries a 60 s CSS transition (see Section 11).
    var homes = CONFIG.macroShift.timeHomesByFace.departures;
    var home = homes[this._timeIndex];
    document.documentElement.style.setProperty('--dep-upper-shift-y', home[1] + 'px');
    // DriftEngine anchors do not change; the upper band shifts as a layout
    // group, but each child element's drift anchor is still its child position
    // within #dep-upper. The visible motion is the sum of group y-delta and
    // per-child drift, which is correct.
    return;
  }
  // Existing Calm + Mechanical path
  var home = this._timeHomes()[this._timeIndex];
  this._applyHome(this._timeElementId(), home, CONFIG.macroShift.timeTransitionSec, 'time', withTransition);
},
```

The 60 s ease-in-out transition is identical to Mechanical's home-to-home move and Calm's six-position cycle, so the visual rhythm matches across faces.

### Board column-width reflow (every 6 h)

The board header and each row share a `grid-template-columns` value. Phase 18 cycles through three permutations on a 6 h cadence:

| Phase index | Local hours | `grid-template-columns` |
|---|---|---|
| 0 | 00:00 to 05:59 and 18:00 to 23:59 | `110px 110px 1fr 200px` (default) |
| 1 | 06:00 to 11:59 | `120px 100px 1fr 210px` |
| 2 | 12:00 to 17:59 | `100px 120px 1fr 190px` |

The active index is `Math.floor(hoursSinceMidnight / 6) % 3`. `hoursSinceMidnight` is the 24h fractional value `h24 + minutes / 60`, where `h24` is the 24h-resolved integer hour obtained from `_resolve24h(state)[0]`. Do not use `state.time.hours` directly: it may be 12h-formatted (1-12) when `tweaks.byFace.departures.timeFormat` is `'12h'`, which would produce wrong perm indices after noon. Spec/code drift note (corrected 2026-05-12): the original pseudocode below used `state.time.hours` without 24h resolution; mikasa fixed this in shipped code via `_resolve24h`. The implementation lives in `DeparturesFace._applyMacroShifts(state)`:

```js
const COLUMN_PERMS = [
  '110px 110px 1fr 200px',
  '120px 100px 1fr 210px',
  '100px 120px 1fr 190px'
];

_applyMacroShifts(state) {
  // h24 is the 24h-resolved integer hour: this._resolve24h(state)[0]
  // Do NOT use state.time.hours; it may be 12h-formatted.
  const h24 = this._resolve24h(state)[0];
  const h = h24 + state.time.minutes / 60;

  // Upper-band index (3 h cadence)
  const upperIdx = Math.floor(h / 3) % 2;
  if (upperIdx !== this._lastUpperShiftIndex) {
    const y = upperIdx === 0 ? '0px' : '-30px';
    document.documentElement.style.setProperty('--dep-upper-shift-y', y);
    this._lastUpperShiftIndex = upperIdx;
  }

  // Column-permutation index (6 h cadence)
  const colIdx = Math.floor(h / 6) % 3;
  if (colIdx !== this._lastColumnPermIndex) {
    const perm = COLUMN_PERMS[colIdx];
    this._els.boardHeader.style.gridTemplateColumns = perm;
    for (const row of this._els.rows) {
      row.style.gridTemplateColumns = perm;
    }
    this._lastColumnPermIndex = colIdx;
  }
}
```

The grid layout transition is not animated; the column-width swap happens instantly. The cell content shifts by a few pixels and the next per-character `KineticType` cascade (within at most 45 s) absorbs the visual change. If the instant swap reads as jarring in hermione's review, a 600 ms CSS transition on `grid-template-columns` can be added in a follow-up; CSS Grid `transition` on `grid-template-columns` is supported in iPad Safari 18+.

### Why a separate dispatch path rather than a `MacroShifter._applyUpper()` method

`MacroShifter` was designed in Phase 12 around moving named elements (`#time`, `#moon-disc`) by `left:` / `top:` percentage. Departures' upper-band shift uses a CSS variable, not absolute positioning, because `#dep-upper` is itself a layout container whose children carry their own drift transforms. Stacking a `MacroShifter._applyHome()` left/top write on `#dep-upper` would conflict with the child drift transforms. The CSS-variable path is the simpler primitive for this use case.

The board column-reflow is content-grid-driven (which percentages map to which columns), not geometric, and so lives inside `DeparturesFace` directly, mirroring the Phase 17 precedent where Mechanical's 6 h column rotation lives in `MechanicalFace` rather than `MacroShifter`.

## 14. Burn-In Compliance Audit

Eight layers, mapped to Departures elements. Departures supplies Layer 3 directly via the 45 s row rotation plus the per-character split-flap cascade, unlike Mechanical's composite argument.

| # | Layer | Status on Departures | Notes |
|---|---|---|---|
| 1 | Per-element Perlin drift | Active | `time` 117 s (flap-pair headline), `date` 89 s (header strip + status block), `tickRail` 79 s (board header + footer), `departureRow0..4` 61 s (one per row). All pairwise coprime per the Phase 16 table; the five row sub-channels share the 61 s period but differ in noise phase. |
| 2 | Pixel-shift safety net | Active | +/- 4 px every 6 min applies on top of stage-clamped drift on every active channel. |
| 3 | Kinetic transitions | Active and direct | 45 s row rotation triggers per-character `KineticType` cascade on any row cell whose content changed. The 1500 ms cascade with 110 ms stagger churns pixels across all five rows at a far higher frequency than the SDD's 28-36 s threshold. Departures is the only V1 face that satisfies Layer 3 in its original form. |
| 4 | Macro shifts | Active | Upper-band y-shift every 3 h (~30 px translate). Board column-width reflow every 6 h (three permutations). |
| 5 | Sky-color modulation | Active | Mechanical's Phase 17 fix (`--type-tertiary` modulating on the 60 s linear transition) is carried into Departures. All four tokens modulate. The bezel does not participate; it uses `--bezel-accent` which is frozen at boot. The bezel is 1 px chrome and well below the burn-in threshold. |
| 6 | Luminance breath | Active | `filter: brightness(var(--lum-mod))` is applied to `#dep-header`, `#dep-time`, `#dep-status`, `.dep-row`, and `#dep-footer`. The board header and rule lines (1 px) inherit token color modulation but are individually too small to need brightness oscillation. |
| 7 | Daily refresher | Active | 03:00 fade to `#404040` for 30 s. `#refresher-overlay` sits outside `#stage` and covers Departures identically to Calm. |
| 8 | Rendering hygiene | Active | Background `#0a0a0a`. Type weight 300 (matches Mechanical). The bezel is 1 px transparent-center border, not a filled block. The footer and header rule lines are 1 px. No icons, no widgets. |

### Longest-static-pixel worst case

The element most at risk is the colon between the two flap groups: it is `--type-accent` at 80 px, has no character churn (the colon glyph is always `:`), and only its position changes via the parent's `time` drift channel.

- The colon at 80 px is roughly 4 px wide.
- `time` drift: ampX 24, ampY 18, period 117 s. The colon traverses its full X amplitude band in 58.5 s.
- Pixel-shift safety net: +/- 4 px every 6 min.
- Upper-band macro shift: every 3 h, ~30 px y-delta.
- Sky-color modulation continuously alters `--type-accent`.

No pixel inside the colon stays lit for more than ~58 s without movement. The bezel border at `--flap-bezel-opacity: 0.22` (default) gold is similarly small (1 px line, ~4 char-wide bezel sides) and rides on the `time` drift channel.

The five row sub-channels at ampX 6, ampY 4, period 61 s give the smallest per-element amplitude on the face. The composite of (a) 1 px / 1 s drift updates, (b) 45 s row cadence, (c) 110 ms per-character cascade on every value change, and (d) 6 h column reflow exceeds Layer 1 + Layer 3 + Layer 4 requirements with substantial margin.

## 15. Bundle Budget Audit

Phase 17 cumulative total per `phase-17-mechanical-face.md` Section 14: ~122 to 126 KB.

Phase 18 deltas (estimates):

| Change | Delta |
|---|---|
| `app.js`: `DeparturesFace` object (init, render, teardown, row builder, macro shift dispatch) | +5.2 KB |
| `app.js`: `DriftEngine._phaseOffsets` / `_elementSizes` / `_anchorPercents` row sub-channel entries | +0.5 KB |
| `app.js`: `DriftEngine.start()` face-aware `activeKeys` switch | +0.2 KB |
| `app.js`: `MacroShifter._applyTime()` Departures branch | +0.2 KB |
| `app.js`: `ClockfaceRegistry.normalizeTweaks` Departures block; `applyBezelAccent()` helper | +0.4 KB |
| `app.js`: `window.DeparturesFace` export; `VersionOverlay.bind()` Departures branch | +0.1 KB |
| `style.css`: Departures face styles (stage, upper, header, time, flap, status, board, rows, footer) | +3.2 KB |
| `clockface.js`: Departures preview card, `PREVIEW_STATE` row additions, accelerated rotation | +1.4 KB |
| **Total Phase 18 delta** | **~11.2 KB** |

Phase 18 cumulative total: ~133 to 137 KB. Headroom against the 250 KB target: ~113 KB. No new font load (JetBrains Mono 300 already shipped in Phase 17). Phases 19 (Editorial, with Cormorant Garamond) and 20 (Horizon) remain budgeted at 25 to 35 KB each plus the Cormorant webfont; headroom remains adequate.

## 16. Test Plan

### Manual

| Test | Expected |
|---|---|
| Open `index.html` with `solari.clockface = 'departures'` | Departures renders. Console shows no warnings. Stage scale is 1.0 on 1180 x 820 iPad viewport. Header strip reads `SOLARI · DEPARTURE BOARD / VANCOUVER · POINT ATKINSON / {DAY3} {ISO} · LOCAL`. Headline flap-pair time reads current 24h `HH:MM` with colon in `--type-accent`. Status block reads three lines including the next-event countdown. Board has five rows (or fewer if `AppState` is incomplete; null rows render as em-dash placeholders). |
| Wait 60 s on Departures | Headline minute flap pair fires per-character cascade on minute change (110 ms stagger, 1500 ms cascade duration; visible split-flap motion on at most two characters). |
| Wait 45 s on Departures | Row content refreshes. Any cell whose value changed triggers per-character cascade. Cells whose values did not change render unchanged. |
| Open `clockface.html`, scroll to Departures card | Live preview renders via `window.DeparturesFace.init(card)` + `render(PREVIEW_STATE, tweaks)`. Five rows visible with mock data. Flap-pair time reads `14:32`. |
| Open Tweaks panel, drag `flapBezelOpacity` to 0.0 | Flap-pair bezel border becomes invisible (still 1 px wide, alpha 0). |
| Drag `flapBezelOpacity` to 0.4 | Bezel border darkens to alpha 0.4 of the gold value. Border remains 1 px wide. |
| Apply with `flapBezelOpacity: 0.4` | Main display reloads. `--flap-bezel-opacity` reads `0.4`. Bezel border renders at `rgba(244, 197, 108, 0.4)`. |
| Apply with `accent: 'sage'` | Main display reloads. `--type-accent` becomes `#A9C29A`. The colon, headline flap chars, imminent-row STATUS text, and DETAIL `.dep-detail-accent` spans all tint sage. `--bezel-accent` becomes the sage RGB triple (`169, 194, 154`); the bezel border tints sage. SkyColorModule continues to modulate `--type-accent` but not `--bezel-accent`. |
| Wait 60 s while accent is `sage` | The bezel border holds at the sage tint; `--type-accent` modulates on the 60 s sky-color transition; the colon and imminent text shift in tint while the bezel does not. |
| Trigger an `AppState.alertPreempt` (e.g. mock an alert in DevTools) | Row 0 becomes `ALERT / {headline} / ACTIVE`, STATUS in `--type-accent`. Other rows shift down by one; row 4 is dropped. |
| Wait 3 h (or mock the time) | Upper band translates by -30 px on a 60 s ease-in-out. No discontinuity. The four flap chars stay legible during the transition. |
| Wait 6 h (or mock the time) | `grid-template-columns` swaps to a new permutation. Cell contents shift by a few pixels; next row refresh re-anchors each cell. |
| Set `tide.type` to null | Tide row (if it was in the candidate set) is replaced by the next available source (e.g. moon or almanac). If no replacement is available, the row renders an em-dash placeholder. |
| Set system date to Dec 25 | Header strip reads `THU 2026.12.25 · LOCAL`. ObservanceModule mutates `--type-primary` and `--type-accent`. Imminent row STATUS tints to the observance accent. Bezel does NOT tint to the observance accent (it stays at `--bezel-accent` from boot). |
| Set `driftIntensity` to `off` | All Departures elements hold their stage anchors. Pixel-shift safety net continues to apply. Rows still cascade on content change. |
| Set `driftIntensity` to `restless` | Drift amplitudes are 1.5x. Headline flap-pair drifts up to 36 px X / 27 px Y; rows up to 9 px X / 6 px Y. All stay within stage bounds. |
| Resize viewport to 1366 x 1024 | Stage scale recomputes to 1.157; Departures scales uniformly. Drift amplitudes unchanged in stage pixels. |
| Long-press `#dep-time` for >= 600 ms | `clockface.html` opens. Short tap (< 600 ms) toggles `VersionOverlay`. |
| Past row appearance | A row whose timestamp falls 6 min into the past (5 min grace plus 1 tick) sets `is-past`. Row opacity drops to 0.55, STATUS reads `PAST` in `--type-tertiary`. The split-flap cascade fires on the STATUS transition. |
| 03:00 refresher | Stage fades to `#404040` for 30 s, returns to Departures. Row content state restores correctly (no orphan KineticType char spans). |

### Automated where possible

- Lint pass on `app.js` (existing CI gate).
- `DeparturesFace.init()` / `teardown()` idempotency: re-init removes the previous subtree before building.
- `ClockfaceRegistry.normalizeTweaks` round-trip for Departures malformed inputs:
  - `{ byFace: { departures: { flapBezelOpacity: 'foo' } } }` -> `0.22`
  - `{ byFace: { departures: { flapBezelOpacity: -0.5 } } }` -> `0.0`
  - `{ byFace: { departures: { flapBezelOpacity: 1.0 } } }` -> `0.4`
  - `{ byFace: { departures: null } }` -> `{ flapBezelOpacity: 0.22 }`

### Sentry endurance hooks

Existing Phase 16/17 metrics (`clockface.boot.faceId`, `clockface.tweaks.accent`, etc.) are sufficient. Add one Departures-specific watch point:

| Metric | Source | Reason |
|---|---|---|
| `departures.row.epoch` | `DeparturesFace._renderBoard` | Confirms the 45 s row rotation epoch is advancing. Spikes (epoch frozen for > 2 min) signal a row-builder bug. |

### Long-running validation

Departures must survive a 7-day endurance run with no memory growth and no DriftEngine slowdown. Specific watch points:

1. `KineticType` cascade char spans must be reused, not allocated per cascade. A cell that fires 5760 cascades in 24 h must not accumulate orphaned `<span>` nodes. The existing `RotatorModule` cascade implementation reuses spans; the Departures row cells must do the same.
2. Row-builder candidate-set rebuild must not allocate fresh objects every tick. The 45 s gate prevents unnecessary rebuilds; within an epoch the cached row array is reused.
3. The five `departureRow*` CSS variable writes must not push the rAF cadence below 58 fps p99.

## 17. Picker Integration

Phase 18 follows the Phase 17 pattern exactly. `window.DeparturesFace` is exported at the foot of `app.js`; `clockface.js` calls `window.DeparturesFace.init(card)` and `render(PREVIEW_STATE, tweaks)` on a 1 Hz interval. The `SOLARI_PICKER` boot guard at `app.js:2644` suppresses all fetchers, timers, and the storage-event reload listener in the picker context.

### `liveRender: true`

The picker section that renders the Departures card declares `liveRender: true` in its registry entry (`clockface.js` face entries):

```js
// clockface.js face registry delta
faces: [
  { id: 'calm',        name: 'CALM',        liveRender: false },
  { id: 'mechanical',  name: 'MECHANICAL',  liveRender: true },
  { id: 'departures',  name: 'DEPARTURES',  liveRender: true },  // Phase 18
  { id: 'editorial',   name: 'EDITORIAL',   liveRender: false }, // placeholder
  { id: 'horizon',     name: 'HORIZON',     liveRender: false }  // placeholder
]
```

When `liveRender` is true, the picker mounts the face's `init(card)` and runs the 1 Hz preview interval. When false, the placeholder card from Phase 16 (COMING SOON · PHASE NN) is rendered instead. The flag was introduced in Phase 17 for Mechanical; Departures is the second face to use it.

### PREVIEW_STATE additions

Phase 17 populated `PREVIEW_STATE` with time / date / sun / moon / weather / aqi / tide. Phase 18 adds nothing; the Departures row builder reads only those existing slices plus `almanac` (already populated by Phase 17). The picker preview will show five rows derived from the seeded mock data.

### Accelerated cadence in preview

`tweaks.byFace.departures.previewMode` is not introduced. The 45 s row rotation is fast enough that a picker reviewer sees it within a normal session. The 3 h upper-band shift and 6 h column reflow are not exercised in preview; the implementer may add a `previewMode` flag later if needed, but Phase 18 ships without one.

### Apply behaviour

`flapBezelOpacity` is persisted on Apply via the existing atomic three-key write pattern. The picker writes:

```json
{
  "accent": "gold",
  "driftIntensity": "normal",
  "byFace": {
    "mechanical": { "timeFormat": "24h" },
    "departures": { "flapBezelOpacity": 0.22 }
  }
}
```

No new picker chrome is required. The Tweaks panel adds a slider for `flapBezelOpacity` (range 0.0 to 0.4, step 0.02, label `BEZEL OPACITY`) when the active face is Departures. The slider is hidden for Calm and Mechanical.

## 18. Open Questions

The locked decision pass resolved the major design questions (5-row only, per-character cascade, header y=60, column grid `'110px 110px 1fr 200px'`, data-driven past dimming, transparent bezel with separate `--bezel-accent`, 45 s rotation, drift channel reuse with five sub-channel phase offsets). Items remaining are minor implementation choices with defaulted resolutions; none block implementation.

**Shipped status (updated 2026-05-12):**

- **KineticType stagger override** -- SHIPPED. mikasa added `_STAGGER_MS: 110` as a per-face constant on `DeparturesFace`; `KineticType.animate(cell, text, this._STAGGER_MS)` is the call site. The spec referenced the stagger in prose but left the per-face override as an implementer detail; mikasa resolved it correctly.
- **MoonModule extension** (`moonrise`, `moonset`, `alwaysUp`, `alwaysDown` on `AppState.moon`) -- SHIPPED. mikasa added these fields for Phase 18 moon row data; they are also reused by Phase 20 (Horizon). See CLAUDE.md Architecture section.
- **5-min past-row grace** -- SHIPPED as specified (item 3 below). Acceptable per the pre-ship resolution; no follow-up required unless usability review flags it.
- **`detailAccentWord` field** on `DepartureRow` -- dead code in shipped implementation. The field is set in the row-builder but never read by `_renderRow`. Flagged as a cleanup candidate; see `todo.md`.

1. **Grid template animation on 6 h column reflow.** Phase 18 swaps `grid-template-columns` instantly. iPad Safari 18+ supports a CSS transition on `grid-template-columns`, which would let the swap animate over 600 ms. **Resolution: ship without the transition. If hermione's visual review flags the swap as jarring, add `transition: grid-template-columns 600ms ease-in-out` to `.dep-row` and `#dep-board-header` in a follow-up.** No user blocker.

2. **Row sort with no data.** When fewer than five candidate rows exist (e.g. boot before all fetchers have completed), the empty slots render as five em-dash placeholders. **Resolution: render placeholder rows with EVENT = `—`, DETAIL = `—`, STATUS = `—`, no cascade. The board layout stays stable; the cells fade in once data arrives.** Implementer detail; not a chihiro question.

3. **Past-row removal window.** A past row stays visible for at most one row-builder regeneration (up to 45 s). **Resolution: ship as-is. The 45 s ceiling is short enough that stale past rows are not visible long. If usability review flags it, the row-builder can be triggered immediately on any cell's `isPast` transition.** No user blocker.

4. **Drift shared anchors for `date` and `tickRail` between sibling elements.** `#dep-header` and `#dep-status` both bind to `--date-dx`/`--date-dy` (so their drift is synchronised); `#dep-board-header` and `#dep-footer` both bind to `--tickRail-dx`/`--tickRail-dy` similarly. **Resolution: accept the synchrony. The two pairs are non-overlapping DOM at opposite ends of the stage; synchronous drift is visually invisible and removes the need for additional sub-channels. If burn-in review disagrees, sub-channel offsets can be added in the same shape as `departureRow0..4`.** No user blocker.

## 19. References

- SDD Section 9 (Burn-in Protection, eight layers).
- SDD Section 11.1 (Kinetic transition timing, used directly by Departures).
- SDD Section 12 (Macro position shifts).
- SDD Section 17 (Layout, font sizes).
- SDD Section 22 (Acceptance criteria for endurance).
- `docs/phase-16-clockface-foundation.md` (foundation contract Phase 18 inherits).
- `docs/phase-17-mechanical-face.md` (canonical face-spec shape; this document mirrors its structure).
- `design_handoff_clockface/README.md` lines 149-181 (Departures visual reference; chihiro's locked decisions supersede where they differ).
- `design_handoff_clockface/clockface.html` lines 490-560 (Departures prototype; reference only, not implementation target).
- `app.js:43-52` (`CONFIG.driftClasses`, including the reserved `departureRow` channel activated by Phase 18).
- `app.js:88-107` (`CONFIG.macroShift`, extended in Phase 18 with the `departures` entry under `timeHomesByFace`).
- `app.js:111-127` (`DRIFT_INTENSITY_MULT` and `ACCENT_PALETTE`).
- `app.js:1278-1284` (`DriftEngine._phaseOffsets`, extended with five row sub-channels).
- `app.js:1296-1330` (`DriftEngine.start()`, generalised to face-aware `activeKeys`).
- `app.js:1335-1341` (`DriftEngine._elementSizes`, extended with row entries).
- `app.js:1395-1401` (`DriftEngine._anchorPercents`, extended with per-row anchors).
- `app.js:1439-1522` (`MacroShifter`, extended with the Departures upper-band dispatch).
- `app.js:2070-2092` (`CalmFace`, the interface shape Departures mirrors).
- `app.js:2149-2557` (`MechanicalFace`, the direct precedent for face-object structure and picker integration).
- `app.js:2623-2702` (boot IIFE and `SOLARI_PICKER` guard).
- `app.js:2635-2637` (window-scope face exports; `window.DeparturesFace` added in Phase 18).
- `clockface.js` (picker; Phase 18 adds Departures preview card and the `flapBezelOpacity` slider).
- MDN: [`CSS custom properties`](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties), [`grid-template-columns`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns), [`transitionend`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event).
