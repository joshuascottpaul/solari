# Phase 20: Horizon Face

| Field    | Value                                                            |
|----------|------------------------------------------------------------------|
| Phase    | 20 of 20 (V1, final face)                                        |
| Status   | Shipped                                                          |
| Shipped  | 2026-05-12                                                       |
| Date     | 2026-05-12                                                       |
| Author   | ariadne                                                          |
| Impl     | misaka                                                           |
| Depends  | Phase 16 (Clockface Foundation, shipped 2026-05-07), Phase 17 (Mechanical, shipped 2026-05-11), Phase 18 (Departures, shipped 2026-05-12), Phase 19 (Editorial, shipped 2026-05-12) |
| Unblocks | V1 feature complete                                              |

## 1. Goal

Phase 20 introduces the Horizon face: the day, drawn. The face is a diagram. A full-stage SVG renders a horizon line at mid-stage, dashed sun and moon arcs from rise to set, the live sun and moon discs on their arcs (phase-correct crescent for the moon), 24 hour ticks below the horizon, and a vertical 1 px gold hairline cursor at the current moment. Below the horizon strip, a 220 px Manrope 200 big time sits bottom-left and a four-line JetBrains Mono status block sits bottom-right.

The face encodes time astronomically rather than typographically. Astronomy is the truth; the big-time numerals are a footnote. Two new substrate mechanisms ship with this face and become available to future V2 work: (a) `MoonModule` adds `moonrise` and `moonset` to `AppState.moon` via `SunCalc.getMoonTimes`; (b) `SkyColorModule` reads an opt-out flag from the active face (`accentSkyTrack`) and suspends `--type-accent` modulation when the face requests it. Horizon is the first face to set `accentSkyTrack = false`: its gold (`#F4C56C`) hairline, headline, and big-time colon stay fixed across all six sky-altitude bands so the diagram reads coherently from astronomical night to midday.

This is the last face. After Phase 20 lands, V1 is feature complete.

## 2. Scope and Non-Scope

### In scope

- New `HorizonFace` object in `app.js`, implementing `init(stage) / render(state, tweaks) / teardown()` against the Phase 16 contract.
- `HorizonFace` registration in `ClockfaceRegistry.faces`.
- DOM subtree built inside `#stage` by `HorizonFace.init()`: a full-stage SVG diagram (1180 x 820 viewBox), header strip, hour-label strip, arc-terminal labels, big-time block, status block.
- `sun` and `horizon` drift channels become active. The `horizon` period is bumped from 101 s to **109 s** before this spec lands (see Section 15 and Section 7); 109 s is the next prime above 101, pairwise coprime with every other channel.
- `MoonModule` extension: `moonrise`, `moonset`, `alwaysUp`, `alwaysDown` fields added to `AppState.moon` via `SunCalc.getMoonTimes(date, lat, lng)` (`lib/suncalc.js:257`). The existing 6 h poll cadence covers it.
- `SkyColorModule` extension: a single conditional that reads `ACTIVE_FACE.accentSkyTrack` and skips the `--type-accent` write when the active face opts out. Modulation of `--type-primary`, `--type-secondary`, `--type-tertiary` continues unchanged.
- Per-face tweak schema entry `tweaks.byFace.horizon = { timeFormat: '12h' | '24h', starField: boolean }`. `starField` defaults `false` and is reserved (no render path in Phase 20).
- Per-face macro shift: big-time cross-fades between two homes every **6 h** (cross-fade, not translate). Extends Phase 19's `timeIntervalHoursByFace` mechanism; adds a new `timeTransitionStyleByFace` mechanism so MacroShifter knows to fade rather than translate.
- Phase-correct crescent rendering of the moon disc on its arc (formula from chihiro's prototype, `design_handoff_clockface/clockface.html:739-751`).
- Clip-at-horizon: both sun and moon discs get an SVG `clipPath` so the disc dips behind the horizon line at rise/set rather than overhanging it.
- Edge-case handling for `alwaysUp` (arc hidden, disc rendered at `xAt(0.5)` near arc apex) and `alwaysDown` moon (arc and disc both hidden; status block MOON line still renders).
- Picker live preview: the picker invokes `HorizonFace.init(card)` + `HorizonFace.render(PREVIEW_STATE, tweaks)` on a 1 Hz interval via the `SOLARI_PICKER` boot guard precedent (Phase 17 Section 13).
- Burn-in audit per layer, with special attention to the horizon line at y=440 and the 25 fixed-x hour ticks.

### Non-scope

- Starfield render path. The schema reserves `starField: false`; no render code ships in Phase 20.
- `arcAmplitude` tweak (mentioned in Phase 16 Section 13 placeholder). Not in chihiro's locked tweak list for Horizon; deferred to V2 if needed.
- `showHourLabels` tweak (mentioned in Phase 16 Section 13 placeholder). Hour labels always render in Phase 20.
- Latitude / location override. Coordinates remain `CONFIG.location.latitude` / `.longitude` (49.2827, -123.1207). The header strip shows `49.32°N 123.13°W` as a static label.
- Polar latitude failure modes beyond `alwaysUp` / `alwaysDown` (e.g. 24 h sun in summer at 70°N). Vancouver at 49°N never enters these regimes in practice; the code handles the flags defensively but no field test is required at higher latitudes.
- A second tweak schema entry beyond `timeFormat` and `starField`.
- Hot-swap from Calm / Mechanical / Departures / Editorial to Horizon without page reload. Phase 16 reload-on-apply still applies.
- Migrating Calm's picker card to a live preview. Out of scope here as in Phase 17, Phase 18, Phase 19.

## 3. Inherits from Phase 16 / 17 / 18 / 19

The following primitives are reused without modification:

| Primitive | Source | What Phase 20 uses |
|---|---|---|
| Stage primitive | `app.js` Phase 16 Section 5, `style.css` `#stage` rules | All Horizon DOM is built inside `#stage`, positioned in 1180 x 820 pixel coordinates. |
| Face rendering interface | Phase 16 Section 6 (`init/render/teardown`) | `HorizonFace` mirrors the three-method shape exactly. |
| `ClockfaceRegistry.resolve(faceId)` | Phase 16 Section 6 | Horizon registers as `'horizon'`. Unknown face id falls back to Calm. |
| `ClockfaceRegistry.normalizeTweaks(raw)` | Phase 16 Section 3, extended by Phases 17-19 | Extended in Phase 20 to normalise `byFace.horizon.timeFormat` and `byFace.horizon.starField`. |
| Storage contract | Phase 16 Section 3 | Same three keys. Horizon adds a nested entry under `tweaks.byFace.horizon`. |
| `storage` event reload | Phase 16 Section 9 | Unchanged. Switching to or from Horizon triggers a full reload. |
| Drift class table | `CONFIG.driftClasses` | Activates `sun` (101 s) and `horizon` (109 s, **bumped from 101 s in this phase**). Read-only consumer of existing entries. |
| Drift intensity multipliers | `DRIFT_INTENSITY_MULT` | Applies to `sun` and `horizon` like every other channel. |
| Accent palette | `ACCENT_PALETTE` | `--type-accent` writes pick up here on boot. Sky modulation of `--type-accent` is suspended on Horizon via `accentSkyTrack = false`. |
| `MacroShifter` engine | Phase 17 Section 7 (per-face `timeHomesByFace`), Phase 19 (per-face `timeIntervalHoursByFace`) | Extended in Phase 20: per-face `timeTransitionStyleByFace`. |
| `DriftEngine` | Phase 17 Section 6 (activation pattern) | Activates `sun` and `horizon` channels by adding them to `DriftEngine.activeKeys` and registering anchor/size/phase entries. |
| `SkyColorModule` | `app.js:1117+` | Extended in Phase 20: conditional accent write gated by `ACTIVE_FACE.accentSkyTrack`. |
| `ObservanceModule` | `app.js:853+` | Horizon participates in observance repaints of `--type-primary` (status block headline NIGHT case, hour labels, status block MOON/TIDE/AIR lines). The accent override path under observance does still fire even when `accentSkyTrack = false`; observance is a higher-priority signal than sky banding. See Section 11. |
| `LuminanceBreath` | `app.js:1544+` | Horizon applies `filter: brightness(var(--lum-mod))` on the big-time block, header strip, and status block. The SVG diagram does not receive the brightness filter (its line strokes are already alpha-blended near the burn-in floor and adding a brightness filter to a 1180x820 SVG would hurt rAF cost). |
| `RefresherCycle` | `app.js:1489+` | `#refresher-overlay` covers the full stage identically to other faces. |
| `RotatorModule` | `app.js:1650+` | Horizon does not surface a rotating slot. Rotator continues to run; its output is not read. |
| `DisplayModule.render()` | `app.js:1993+` | The trailing `ACTIVE_FACE.render(AppState, TWEAKS)` call becomes Horizon's per-tick driver. |
| `SOLARI_PICKER` boot guard | Phase 17 Section 13 | Picker preview suppression mechanism. Horizon reuses verbatim. |

## 4. New Surface Area

Phase 20 introduces four small, named additions to the runtime substrate. Each is reusable by future V2 work; each is scoped narrowly so it does not regress existing faces.

### 4.1 `accentSkyTrack` opt-out on face objects

A face object may declare `accentSkyTrack: false` at top level. `SkyColorModule.update()` reads `ACTIVE_FACE.accentSkyTrack` (default `true` when the property is absent) and skips the `--type-accent` write when the active face opts out. Implementation lives in `SkyColorModule`, not in the face; the face only declares.

```js
// HorizonFace declares:
const HorizonFace = {
  accentSkyTrack: false,
  init(stage)    { /* ... */ },
  render(state, tweaks) { /* ... */ },
  teardown()     { /* ... */ }
};
```

```js
// SkyColorModule.update() (around app.js:1167-1174) gains a conditional:
const skipAccent = (ACTIVE_FACE && ACTIVE_FACE.accentSkyTrack === false);
root.setProperty('--type-primary',   `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
root.setProperty('--type-secondary', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.62)`);
root.setProperty('--type-tertiary',  `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.42)`);
if (!skipAccent) {
  root.setProperty('--type-accent', /* current accent-modulation expression */);
}
```

The `ACTIVE_FACE` reference is the same module-scope constant that the boot IIFE assigns (Phase 16 Section 9). It is already defined at the time `SkyColorModule.update()` first runs.

The `accent` global tweak (set by the picker) still writes the initial `--type-accent` floor color on boot; only the 60 s sky-altitude modulation is suspended. Observance overrides (`ObservanceModule.activePalette()`) continue to write `--type-accent` directly; see Section 11.

This hook was reserved in Phase 16 Section 13 ("Phase 20 Horizon may need to opt out") and is implemented for the first time here. The mechanism is general; Phase 18 may also opt out for the gold split-flap text, and Phase 19's italic numerals may opt out independently. Each face declares its own flag.

### 4.2 `MoonModule` moonrise/moonset extension

`SunCalc.getMoonTimes(date, lat, lng)` (`lib/suncalc.js:257`) returns `{ rise, set }` `Date` objects, or `{ alwaysUp: true }` or `{ alwaysDown: true }` flags when the moon does not cross the horizon during the 24 h window. `MoonModule.update()` adds four fields to `AppState.moon`:

```js
// AppState.moon gains:
moon: {
  phase: 0,
  illumination: 0,
  terminatorAngle: 0,
  phaseName: '',
  moonrise: '',        // formatted time string, e.g. '14:32' (24h)
  moonset:  '',        // formatted time string
  alwaysUp:   false,   // true when getMoonTimes returns alwaysUp
  alwaysDown: false    // true when getMoonTimes returns alwaysDown
}
```

`MoonModule.update()` gains four lines:

```js
// app.js MoonModule.update() (around app.js:1051-1065)
const mt = SunCalc.getMoonTimes(now, CONFIG.location.latitude, CONFIG.location.longitude);
AppState.moon.moonrise   = mt.rise ? _formatTime(mt.rise) : '';
AppState.moon.moonset    = mt.set  ? _formatTime(mt.set)  : '';
AppState.moon.alwaysUp   = mt.alwaysUp   === true;
AppState.moon.alwaysDown = mt.alwaysDown === true;
```

The existing 6 h poll cadence is sufficient. The horizon crossings move by ~50 min per day; 6 h granularity introduces at most a 5 % positional error in arc-endpoint x coordinates between polls, which is below the 1 px discrimination floor of the 1020 px-wide horizon strip.

Both `_formatTime` paths (12 h and 24 h) already exist in `app.js:186-196`. `HorizonFace.render()` re-parses the time string back into a fractional day (Section 9, `parseHM`); this avoids a parallel `mr_iso`/`ms_iso` AppState field. The string round-trip costs ~5 µs per tick.

### 4.3 `MacroShifter.timeTransitionStyleByFace`

Phase 19 introduced `timeIntervalHoursByFace` for per-face cadence. Phase 20 introduces `timeTransitionStyleByFace` for per-face style (`'translate'` default, `'fade'` for Horizon). The two new keys are sibling tables on `CONFIG.macroShift`. When the active face has an entry in `timeTransitionStyleByFace` equal to `'fade'`, `MacroShifter._applyTime()` runs a cross-fade instead of a CSS translate transition.

```js
// CONFIG.macroShift addition (additions only)
macroShift: {
  enabled: true,
  timeIntervalHours: 3,
  timeTransitionSec: 60,
  timeHomes: [ /* unchanged */ ],
  timeHomesByFace: {
    mechanical: [[50, 39], [50, 54]],
    horizon:    [[8, 68], [92, 68]]     // bottom-left, bottom-right (px-percent)
  },
  // Phase 19: per-face cadence
  timeIntervalHoursByFace: {
    horizon: 6
  },
  // Phase 20: per-face style. 'translate' (default) tweens position; 'fade'
  // crosses the time element to its new home with opacity, no translate.
  timeTransitionStyleByFace: {
    horizon: 'fade'
  },
  moonIntervalHours: 6,
  moonTransitionSec: 60,
  moonHomes: [ /* unchanged */ ]
}
```

The Horizon big-time block at 220 px is large enough that a position translate over 60 s reads as obvious motion rather than ambient drift. Chihiro locked cross-fade to avoid drawing attention to the macro shift. The fade implementation is in `MacroShifter`, not `HorizonFace`; the face only renders into the element at whatever home is currently active.

#### Cross-fade implementation

When the `timeTransitionStyleByFace[FACE_ID] === 'fade'`:

1. At shift time, `MacroShifter._applyTime()` adds class `mech-time-fade-out` to the element (CSS sets `opacity: 0`, transition 400 ms ease-out).
2. After 400 ms (`setTimeout(..., 400)`), `MacroShifter` instantly swaps the home position (writes the new `top`/`left` values) while opacity is still 0.
3. `MacroShifter` removes `mech-time-fade-out`, adds `mech-time-fade-in` (CSS sets `opacity: 1`, transition 400 ms ease-in). The fade-in completes 400 ms later.

Total wall-clock span: 800 ms. The element is invisible for the 400 ms gap during which the position swap happens. No translate, no slide.

```css
#horizon-time {
  transition: opacity 400ms ease-out;
}
#horizon-time.mech-time-fade-out { opacity: 0; transition-timing-function: ease-out; }
#horizon-time.mech-time-fade-in  { opacity: 1; transition-timing-function: ease-in;  transition-duration: 400ms; }
```

The classes are shared with future fade-style transitions (`mech-` prefix is misleading post-Phase-17; renaming to `face-time-fade-*` is recommended during implementation but not blocking). All Mechanical's translate-style macro shifts continue to apply through CSS `top`/`left` writes, not these classes.

### 4.4 `tickRail` and `slot` channels on hour-label strip and arc-terminal labels

The hour-label strip (5 fixed-x labels) reuses the existing `date` drift channel (89 s, 12/8 px). The arc-terminal labels (4 labels) reuse the existing `slot` channel (143 s, 12/8 px). No new channels are introduced. See Section 7 for the drift assignment table.

## 5. Element List

All positions are stage pixels (origin top-left of the 1180 x 820 box). Every element is `position: absolute` with `transform` carrying the appropriate drift offset.

| Element ID | Stage position (px) | Anchor | Font / weight / size | Content / token notes |
|---|---|---|---|---|
| `#horizon-header` | x=80 to x=1100, y=50 | left=80, right=80, top=50 | JetBrains Mono 300, **12 px**, `letter-spacing: 0.32em`, uppercase, `--type-tertiary` | Three-column flex space-between. Left: `HORIZON · 49.32°N 123.13°W`. Center: `{DAY3} · {YYYY.MM.DD}`. Right: `DAYLIGHT {Hh} {MM}M`. |
| `#horizon-sky` (SVG) | x=0, y=0, width=1180, height=820 | viewBox 0 0 1180 820 | n/a | Full-stage SVG. Children listed in Section 9. `preserveAspectRatio="none"` is **not** set; we want intrinsic aspect since the stage already enforces 1180x820 box. |
| `#horizon-hour-labels` | x=0 to x=1180, y=472, height=18 | absolute strip | JetBrains Mono 300, **11 px**, `letter-spacing: 0.24em`, `--type-tertiary` | 5 labels: `00:00`, `06:00`, `12:00`, `18:00`, `24:00`. Each positioned at `xAt(h/24)` with `transform: translateX(-50%)`. |
| `#horizon-arc-labels` | x=0 to x=1180, y=498 (sun row) and y=512 (moon row) | absolute strip | JetBrains Mono 300, **10 px**, `letter-spacing: 0.28em` | Four labels: `☀ ↑ {sunrise}` and `☀ ↓ {sunset}` at y=498, both in `rgba(244,197,108,0.60)`; `☾ ↑ {moonrise}` and `☾ ↓ {moonset}` at y=512, both in `rgba(168,199,255,0.55)`. Each positioned at the corresponding arc-terminal x with `transform: translateX(-50%)`. |
| `#horizon-time` (wrapper) | x=90, y=560 (Home A, bottom-left) or x=1090 with `right:90` (Home B, bottom-right) | absolute, no auto-anchor; macro shift swaps `left`/`right` | Manrope 200, **220 px**, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.02em`, `line-height: 1`, `white-space: nowrap`, `--type-primary` | `H:MM` (12h) or `HH:MM` (24h). Colon `<span class="horizon-colon">` in `--type-accent`, opacity 0.55, fixed gold (accentSkyTrack opt-out keeps it). 12h mode adds `<span class="horizon-ampm">` at 42 px Manrope 300, `letter-spacing: 0.18em`, `vertical-align: top`, `margin-left: 18px`, `--type-secondary`. |
| `#horizon-status` | x=1090 (anchored right=90), y=580 | top-right anchored, `text-align: right` | JetBrains Mono 300, **13 px**, `letter-spacing: 0.28em`, uppercase, `line-height: 2.0` | Five lines, see Section 6 for token treatment. |

### CSS class names introduced

`horizon-stage`, `horizon-header`, `horizon-sky`, `horizon-time`, `horizon-colon`, `horizon-ampm`, `horizon-status`, `horizon-hour-labels`, `horizon-arc-labels`. SVG-internal classes (children of `#horizon-sky`): `horizon-sun-arc`, `horizon-moon-arc`, `horizon-line`, `horizon-tick`, `horizon-tick-major`, `horizon-sun-disc`, `horizon-sun-halo`, `horizon-sun-drop`, `horizon-moon-disc-outline`, `horizon-moon-halo`, `horizon-moon-crescent`, `horizon-cursor`, `horizon-sr-notch`, `horizon-ss-notch`, `horizon-mr-notch`, `horizon-ms-notch`, `horizon-disc-clip`.

The wrapper element is `<div id="horizon-stage">` mounted inside `#stage` by `HorizonFace.init()`. `horizon-stage` does not get its own drift channel; drift is on its children.

## 6. Status Block Content

Right-anchored at `right: 90px`, `top: 580px`. Five lines, `line-height: 2.0`:

| Line | Template (24h) | Color treatment | Notes |
|---|---|---|---|
| 1 | `☀ DAY · {condition} {temp}°` (day) or `☾ NIGHT · {condition} {temp}°` (night) | `--type-accent` (fixed gold) when `isDay`; `--type-secondary` when night | The "DAY" headline keeps fixed gold regardless of sky band. Determination: `isDay = nowF >= sunriseF && nowF <= sunsetF`. |
| 2 | `GOLDEN HOUR · {time}` | `--type-tertiary` | Computed from `AppState.sun.sunset` minus 1 h (or `sunrise + 1 h` during morning band). The first golden hour after the current moment, formatted per `tweaks.byFace.horizon.timeFormat`. See "Golden hour computation" below. |
| 3 | `MOON · {phase} {illum}%` | `--type-tertiary` | `AppState.moon.phaseName` uppercased, `AppState.moon.illumination * 100` rounded. |
| 4 | `TIDE · HIGH {h}m at {time}` or `LOW {h}m at {time}` | `--type-tertiary` | `AppState.tide.type` (HIGH/LOW), `AppState.tide.heightM` (one decimal), `AppState.tide.time` formatted per tweak. Falls back to `TIDE · —` when slice is null. |
| 5 | `AIR · AQI {value} {label}` | `--type-tertiary` at opacity 0.7 | `AppState.aqi.value` (3 digits, zero-padded), `AppState.aqi.band` uppercased (GOOD/MODERATE/UNHEALTHY/...). The `opacity: 0.7` is applied as an inline style on the line element. |

### Golden hour computation

Golden hour is approximated as the hour bracketing each solar horizon event. The status line shows the next golden hour after the current moment:

- If `nowF < sunriseF - 1/24`: show evening golden hour from the previous day's tail (`sunset - 1 h` of the prior day's data). At a 6 h refresh cadence the prior day's sunset is usually still in the cache; if not, fall back to `MORNING {sunrise}`.
- If `sunriseF - 1/24 <= nowF < sunriseF`: show `MORNING {sunrise}`.
- If `nowF < sunsetF - 1/24`: show `EVENING {sunset - 1h}`.
- Otherwise: show `EVENING {sunset}` until tomorrow's sunrise window.

For the V1 ship, an acceptable simplification: always render `GOLDEN HOUR · {sunset_minus_1h}` formatted per `timeFormat` tweak. The status line is decorative; the user does not depend on it for hard timing. This simplification is the implementation default unless misaka reads the prior-day fallback path during integration.

## 7. Drift Assignments

The diagram is dense with fixed-position pixel mass (the horizon line at y=440, 25 hour ticks at fixed x, both arc paths). The drift channel split is structured so that each visual cluster moves on a distinct period, and no element pair shares a drift sine.

| Element | Drift class | Period (s) | ampX / ampY (px) |
|---|---|---|---|
| `#horizon-time` | `time` | 117 | 24 / 18 |
| `#horizon-header` | `date` | 89 | 12 / 8 |
| `#horizon-hour-labels` | `date` | 89 | 12 / 8 |
| `#horizon-arc-labels` | `slot` | 143 | 12 / 8 |
| `#horizon-status` | `slot` | 143 | 12 / 8 |
| `#horizon-sky` (diagram interior: horizon line, 25 ticks, 4 notches, both arcs) | `horizon` | **109** (bumped from 101) | 18 / 12 |
| Sun disc + halo + drop-line (SVG group `<g class="horizon-sun-glyph">`) | `sun` | 101 | 18 / 12 |
| Moon disc + halo + crescent (SVG group `<g class="horizon-moon-glyph">`) | `moon` | 73 | 18 / 12 |

### Critical: `horizon` period must be bumped from 101 s to 109 s before this spec lands

Phase 16 reserved `sun` and `horizon` at the same 101 s period, on the assumption that the channels would not coexist on a single face. Horizon (Phase 20) drives both simultaneously: the diagram interior on `horizon` and the sun disc/halo/drop-line on `sun`. If both share 101 s, they oscillate in lock-step, defeating the coprime-periods burn-in argument from Phase 16 Section 8.

Resolution: bump `CONFIG.driftClasses.horizon.periodSec` from 101 to **109 s**. 109 is the next prime above 101 and is pairwise coprime with every other channel:

| Pair | gcd |
|---|---|
| 73 (moon) and 109 | 1 |
| 79 (tickRail) and 109 | 1 |
| 89 (date) and 109 | 1 |
| 101 (sun) and 109 | 1 |
| 117 (time = 9 * 13) and 109 | 1 |
| 143 (slot = 11 * 13) and 109 | 1 |
| 61 (departureRow) and 109 | 1 |

This is a one-line CONFIG change in `app.js:49`. The implementation order is: bump the period in Phase 20's first commit; verify no other face is impacted (no face activates `horizon` before Phase 20); proceed with the rest of Horizon implementation.

### Drift implementation deltas

`DriftEngine.activeKeys` (Phase 17 Section 6 pattern) adds `'sun'` and `'horizon'`:

```js
// app.js:1295 delta (Phase 20)
const activeKeys = ['time', 'date', 'slot', 'moon', 'tickRail', 'sun', 'horizon'];
```

`DriftEngine._elementSizes` registers the two new sizes (used by viewport clamping):

```js
// app.js:1323 delta (Phase 20)
sun:     { hw: 60, hh: 60 },     // halo radius bounds
horizon: { hw: 510, hh: 410 }    // half-width/half-height of the full diagram
```

`DriftEngine._anchorPercents` registers the two anchors:

```js
// app.js:1382 delta (Phase 20)
sun:     { x: 50, y: 50 },   // sun disc moves around its computed (x, y) per render
horizon: { x: 50, y: 50 }    // diagram interior centered on stage
```

`DriftEngine._phaseOffsets` registers two unique offsets so the channels do not start in phase:

```js
// app.js:1268 delta (Phase 20)
sun:     { x: 1300, y: 1400 },
horizon: { x: 1500, y: 1600 }
```

The numbers are arbitrary; they only need to differ from every other channel's offsets. They serve to decorrelate the channel start positions on a fresh boot.

### CSS variable hookup

```css
/* style.css additions (Phase 20). Phase 16 already declared these reserved vars. */
.horizon-sky-drift {
  transform: translate(var(--horizon-dx), var(--horizon-dy));
  transform-origin: center center;
}
.horizon-sun-drift {
  transform: translate(var(--sun-dx), var(--sun-dy));
}
.horizon-moon-glyph-drift {
  transform: translate(var(--moon-dx), var(--moon-dy));
}
```

Drift is applied via `transform` on the SVG group elements (`<g>`), not on the SVG root. The SVG root sits at `position: absolute; inset: 0` with no transform. The interior `<g class="horizon-sky-drift">` wraps the horizon line, the 25 ticks, the 4 notches, and both arcs. Two separate `<g>` elements wrap the sun glyph and the moon glyph for their per-disc drift channels.

The hairline cursor (`#horizon-cursor`) sits inside the `<g class="horizon-sky-drift">` group, so it picks up `horizon` drift like the rest of the interior. The cursor x is recomputed every tick from `nowF`; drift is a small additive offset on top of that x.

## 8. Per-Face Macro Shift (Big-Time Cross-Fade)

Two homes for `#horizon-time`, every 6 h, cross-fade rather than translate.

### Homes table

`CONFIG.macroShift.timeHomesByFace.horizon = [[8, 68], [92, 68]]`

Interpreted as percentages of the 1180 x 820 stage:

| Home | x (%) | y (%) | x (px) | y (px) | Anchor |
|---|---|---|---|---|---|
| A | 8 | 68 | 94 | 558 | `left: 90px; right: auto;` (bottom-left, near left edge) |
| B | 92 | 68 | 1086 | 558 | `left: auto; right: 90px;` (bottom-right, near right edge) |

In practice, Home A applies `left: 90px; right: auto;` and Home B applies `left: auto; right: 90px;`, both at `top: 560px`. The `8 / 92` percentages are stored in CONFIG only as machine-readable position hints; the actual `MacroShifter._applyTime()` implementation for Horizon writes the absolute `left` / `right` / `top` values directly (the percent-based home table is the existing schema, not a literal stylesheet target).

### Cadence

6 h. Phase 19 introduced `CONFIG.macroShift.timeIntervalHoursByFace`; Horizon adds `horizon: 6` to that table.

### Style

Cross-fade per Section 4.3:

1. t=0: `mech-time-fade-out` (opacity 1 -> 0 over 400 ms ease-out).
2. t=400 ms: position swap (Home A -> Home B or vice versa) while opacity is 0.
3. t=400 ms: `mech-time-fade-in` (opacity 0 -> 1 over 400 ms ease-in).
4. t=800 ms: stable at new home.

Total span 800 ms. No translate, no slide.

### Status block and other elements

The status block does not macro-shift. It always sits at `right: 90; top: 580`. The big-time's two homes are intentionally mirror-positioned (bottom-left vs bottom-right) so that the status block at bottom-right reads as a counterpart to the big-time on either home. When the big-time is at Home B (right side, also bottom-right area), the status block and big-time both sit on the right; they do not collide because the big-time at 220 px is on top (top=560) and the status block sits below it (top=580) with a different x-anchor depending on whether the big-time is at Home A (left) or Home B (right).

Practically: at Home B, big-time occupies `right: 90; top: 560; width: ~520px` (the digits) and the status block at `right: 90; top: 580; line-height: 2.0 * 13 = 26 px * 5 lines = 130 px` overlaps in the y-band 580-710 with the big-time at 560-780. The status block's text reads from `right: 90` leftward; the big-time at Home B reads from `right: 90` leftward also. Implementation must verify on the iPad that the two do not visually collide; if they do, the macro-shift home table moves to two stacked homes (e.g. `[8, 68]` and `[8, 30]`, both bottom-left, swapping rather than left-right).

**Open question O3 (Section 20)**: confirm on hardware that Home B does not collide with the status block. Fallback: replace Home B with `[8, 30]` (top-left).

## 9. Diagram Geometry

All coordinates are inside the SVG viewBox `0 0 1180 820`. The SVG's CSS box is `position: absolute; left: 0; top: 0; width: 1180px; height: 820px`.

### Constants

```js
const dayLeft   = 80;
const dayRight  = 1100;
const dayWidth  = dayRight - dayLeft;     // 1020
const horizonY  = 440;
const arcH      = 240;                     // sun arc peak height above horizon (before *1.6)
const moonArcH  = arcH * 0.62;             // 148.8 -- moon arc peak height (before *1.6)
const peakFac   = 1.6;                     // quadratic Bezier peak factor (control-point lift)
const sunR      = 18;
const sunHaloR  = 60;
const moonR     = 13;
const moonHaloR = 34;
```

`xAt(frac) = dayLeft + frac * dayWidth`, where `frac` is the fractional day in `[0, 1]`.

### Horizon line

```html
<line class="horizon-line"
      x1="70" y1="440" x2="1100" y2="440"
      stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
```

The line extends 10 px past `dayLeft` on the left for visual closure (the prototype at `clockface.html:794-795` uses `dayLeft - 10`). The 22 % alpha at 1 px on a 1180 px line is below the SDD's burn-in threshold by design; the line moves on the `horizon` drift channel (109 s) so even this faint pixel mass does not stay put.

### Hour ticks (25 of them)

```js
// In HorizonFace.init(), produced once and never recomputed:
for (let h = 0; h <= 24; h++) {
  const x = xAt(h / 24);
  const major = h % 6 === 0;
  // Major ticks at h=0, 6, 12, 18, 24 (5 ticks, strokeWidth 1.2, length 14 px)
  // Minor ticks at all other h (20 ticks, strokeWidth 0.8, length 6 px)
  const tickClass = major ? 'horizon-tick-major' : 'horizon-tick';
  // <line x1=x y1=440 x2=x y2=440 + (major ? 14 : 6) stroke="rgba(255,255,255,0.20)" .../>
}
```

The 25-tick set is static for the life of the face. Re-rendering it every tick would be wasteful and unnecessary; the ticks are written once at `init()` and then carried by the `horizon` drift channel via their parent `<g class="horizon-sky-drift">`.

### Sun arc

Quadratic Bezier from sunrise to sunset, peaking at noon:

```js
const srX     = xAt(sunriseF);
const ssX     = xAt(sunsetF);
const sunMidX = (srX + ssX) / 2;
const sunArc  = `M ${srX} ${horizonY} Q ${sunMidX} ${horizonY - arcH * peakFac} ${ssX} ${horizonY}`;
```

```html
<path d="..." stroke="rgba(244,197,108,0.22)" stroke-dasharray="2 7"
      stroke-width="1" fill="none" class="horizon-sun-arc"/>
```

The control point sits at `(sunMidX, horizonY - 384)` for default `arcH=240, peakFac=1.6`. The visible arc peak is at `(sunMidX, horizonY - 192)` (the midpoint between baseline and control). The arc is drawn whether or not the sun is currently up.

### Moon arc

Same construction with moonrise/moonset and lower amplitude:

```js
const mrX = xAt(moonriseF);
const msX_clamped = moonsetF > moonriseF ? xAt(moonsetF) : xAt(1);
const moonMidX = (mrX + msX_clamped) / 2;
const moonArc = `M ${mrX} ${horizonY} Q ${moonMidX} ${horizonY - moonArcH * peakFac} ${msX_clamped} ${horizonY}`;
```

```html
<path d="..." stroke="rgba(168,199,255,0.18)" stroke-dasharray="1 6"
      stroke-width="1" fill="none" class="horizon-moon-arc"/>
```

`moonset < moonrise` means the moon sets on the following calendar day; we draw to the day-edge (`xAt(1)`) and `MoonModule` will refresh past midnight to a new moonrise/moonset pair.

### Sun disc positioning

`isDay = nowF >= sunriseF && nowF <= sunsetF`. When `isDay`:

```js
const p   = (nowF - sunriseF) / (sunsetF - sunriseF);   // 0 at sunrise, 1 at sunset
const sx  = srX + p * (ssX - srX);
const sy  = horizonY - Math.sin(p * Math.PI) * arcH;
```

Note `arcH=240`, not `arcH * peakFac`. The disc travels along a sine curve (the prototype uses sine; the path uses a quadratic Bezier whose visual peak does not coincide with the sine peak. The 1.6 peak factor in the path is a visual lift to make the dashed arc read clearly above the horizon; the disc's actual position is the simpler sine curve. This is intentional per the prototype: the path is decorative, the disc carries the truth).

Rendered as `<g class="horizon-sun-glyph horizon-sun-drift">`:

```html
<g class="horizon-sun-glyph horizon-sun-drift" clip-path="url(#horizon-disc-clip)">
  <circle cx="{sx}" cy="{sy}" r="60" fill="url(#sunGlow)"/>
  <circle cx="{sx}" cy="{sy}" r="18" fill="#F4C56C"/>
  <line   x1="{sx}" y1="{sy + 18}" x2="{sx}" y2="440"
          stroke="rgba(244,197,108,0.35)" stroke-width="1" stroke-dasharray="2 4"/>
</g>
```

The drop-line connects the disc bottom (`sy + sunR`) to the horizon (`horizonY`). It is sun-up only; when the sun is below the horizon, the entire group is hidden via `display="none"`.

### Moon disc positioning

`moonUp` per Section 11. When `moonUp`:

```js
const lenF     = moonsetF > moonriseF ? (moonsetF - moonriseF) : ((1 - moonriseF) + moonsetF);
const elapsedF = nowF >= moonriseF    ? (nowF - moonriseF)     : ((1 - moonriseF) + nowF);
const p_moon   = lenF > 0 ? elapsedF / lenF : 0;
const mx       = mrX + p_moon * (msX_clamped - mrX);
const my       = horizonY - Math.sin(p_moon * Math.PI) * moonArcH;
```

Rendered as `<g class="horizon-moon-glyph horizon-moon-glyph-drift">`:

```html
<g class="horizon-moon-glyph horizon-moon-glyph-drift" clip-path="url(#horizon-disc-clip)">
  <circle cx="{mx}" cy="{my}" r="34" fill="url(#moonGlow)"/>
  <circle cx="{mx}" cy="{my}" r="13"
          fill="rgba(168,199,255,0.10)" stroke="rgba(168,199,255,0.28)" stroke-width="0.6"/>
  <path d="{moonPhasePath(mx, my, 13)}" fill="rgba(228,236,250,0.92)"/>
</g>
```

The faint full-disk outline at r=13 makes the dark side of a crescent suggested rather than absent. The phase-correct crescent path sits on top.

### Clip-at-horizon path

Both glyph groups apply `clip-path="url(#horizon-disc-clip)"`. The clip path is a single rect spanning the upper half of the stage (`y < horizonY + 1`):

```html
<defs>
  <clipPath id="horizon-disc-clip">
    <rect x="0" y="0" width="1180" height="441"/>
  </clipPath>
</defs>
```

At sunrise (`sy = horizonY - 0 = 440`), the disc center is on the horizon; the lower half clips, the upper half is visible. As the sun rises, the visible portion grows. At sunset, the inverse. The 1 px slack (`height: 441` instead of 440) avoids the disc completely disappearing at the exact horizon crossing moment.

The moon clip is the same rect; both groups reference the same `clipPath`.

### Now-hairline cursor

```js
const cx = xAt(nowF);
```

```html
<line class="horizon-cursor"
      x1="{cx}" y1="120" x2="{cx}" y2="468"
      stroke="rgba(244,197,108,0.45)" stroke-width="1"/>
```

The cursor spans y=120 (above the diagram top) to y=468 (28 px below the horizon, inside the hour-tick zone). It is the only continuously-moving SVG primitive: every tick (1 Hz) the cursor's `x1` and `x2` are recomputed and written. The cursor sits inside `<g class="horizon-sky-drift">` so it picks up `horizon` drift like the rest of the interior.

The 1020 px / 86400 s = 0.0118 px/s cursor velocity is sub-pixel for every second; the cursor x advances by 1 px every ~85 s. The render writes the floating-point value (e.g. `x1="513.47"`); the browser rasterises with sub-pixel anti-aliasing.

### Sunrise / sunset notches

```html
<line class="horizon-sr-notch" x1="{srX}" y1="432" x2="{srX}" y2="448"
      stroke="rgba(244,197,108,0.55)" stroke-width="1"/>
<line class="horizon-ss-notch" x1="{ssX}" y1="432" x2="{ssX}" y2="448"
      stroke="rgba(244,197,108,0.55)" stroke-width="1"/>
```

16 px tall (8 px above, 8 px below the horizon line), gold at 55 % alpha.

### Moonrise / moonset notches

```html
<line class="horizon-mr-notch" x1="{mrX}" y1="434" x2="{mrX}" y2="446"
      stroke="rgba(168,199,255,0.45)" stroke-width="1"/>
<line class="horizon-ms-notch" x1="{msX_clamped}" y1="434" x2="{msX_clamped}" y2="446"
      stroke="rgba(168,199,255,0.45)" stroke-width="1"/>
```

12 px tall, cool blue at 45 % alpha.

### Radial gradients

Defined once in `<defs>`; used by both glyph halos:

```html
<defs>
  <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#F4C56C" stop-opacity="0.28"/>
    <stop offset="60%"  stop-color="#F4C56C" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#F4C56C" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="#A8C7FF" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#A8C7FF" stop-opacity="0"/>
  </radialGradient>
</defs>
```

## 10. SunCalc Integration (moonrise / moonset)

The smallest possible MoonModule change. Four lines inside `update()`:

```js
// app.js MoonModule.update() (current block ~app.js:1051-1065 plus four lines)
update() {
  try {
    const now = new Date();
    const illum = SunCalc.getMoonIllumination(now);

    AppState.moon.phase = Math.round(illum.phase * 1000) / 1000;
    AppState.moon.illumination = Math.round(illum.fraction * 1000) / 1000;
    AppState.moon.terminatorAngle = Math.round(illum.angle * 180 / Math.PI);
    AppState.moon.phaseName = this._phaseName(illum.phase);

    // Phase 20: moonrise/moonset for HorizonFace
    const mt = SunCalc.getMoonTimes(now, CONFIG.location.latitude, CONFIG.location.longitude);
    AppState.moon.moonrise   = mt.rise ? _formatTime(mt.rise) : '';
    AppState.moon.moonset    = mt.set  ? _formatTime(mt.set)  : '';
    AppState.moon.alwaysUp   = mt.alwaysUp   === true;
    AppState.moon.alwaysDown = mt.alwaysDown === true;

    AppState.meta.lastUpdate.moon = now.getTime();
  } catch (e) {
    // Continues on next interval; AppState.moon retains last good values.
  }
}
```

### Edge cases

| State | `AppState.moon` fields | `HorizonFace` behaviour |
|---|---|---|
| Normal (rises and sets within the 24 h window) | `moonrise` and `moonset` populated; `alwaysUp` and `alwaysDown` both false | Arc and disc rendered normally per Section 9. |
| `alwaysUp` (rare at Vancouver lat; can occur near full moon at high latitudes; **not expected at 49°N** but defensively handled) | `moonrise = ''`, `moonset = ''`, `alwaysUp = true`, `alwaysDown = false` | Arc is hidden (`<path class="horizon-moon-arc" display="none"/>`). Disc is rendered at `(xAt(0.5), horizonY - moonArcH)` (apex of the implicit overhead pass), still with phase-correct crescent and clip-path. Status block MOON line renders as normal (phase + illum %). Arc-terminal labels for moonrise/moonset render as `☾ ↑ —` and `☾ ↓ —`. |
| `alwaysDown` | `moonrise = ''`, `moonset = ''`, `alwaysUp = false`, `alwaysDown = true` | Arc hidden. Disc hidden (the entire `<g class="horizon-moon-glyph">` group set to `display="none"`). Status block MOON line continues to render (phase + illum %; the moon is still tracked even when below horizon). Arc-terminal labels for moonrise/moonset render as `☾ ↑ —` and `☾ ↓ —`. |
| Slice loading (boot before first MoonModule tick) | All fields default empty / false | Arc hidden, disc hidden, status block MOON line renders as `MOON · —` until first tick. |

The flag fields (`alwaysUp`, `alwaysDown`) are mutually exclusive but both default to `false`. Render code checks both: if either is true, suppress the arc; if `alwaysDown`, additionally suppress the disc.

### `parseHM` in HorizonFace

To convert the formatted strings back to fractional day for x-positioning, `HorizonFace.render()` carries a local `parseHM` helper:

```js
function parseHM(s) {
  // Accepts "HH:MM" (24h) or "H:MM AM"/"H:MM PM" (12h). Returns 0..1.
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return (h + mm / 60) / 24;
}
```

Identical to the prototype helper at `design_handoff_clockface/clockface.html:679-687`.

### moonUp determination

```js
const moonUp = (AppState.moon.alwaysUp)
  ? true
  : (AppState.moon.alwaysDown ? false :
     (moonsetF > moonriseF
        ? (nowF >= moonriseF && nowF <= moonsetF)
        : (nowF >= moonriseF || nowF <= moonsetF)));   // wrap-around past midnight
```

The wrap-around case handles a moon that rises at e.g. 22:00 today and sets at e.g. 05:00 tomorrow: `moonsetF < moonriseF`, and the moon is up when `nowF >= 0.917` (22:00) **or** `nowF <= 0.208` (05:00). The prototype at `clockface.html:695-697` handles this correctly.

## 11. `accentSkyTrack` Opt-Out Mechanism

### Why Horizon opts out

The gold hairline cursor at 45 % alpha and the big-time colon at 55 % alpha and the `☀ DAY` status headline are three fixed-gold accents that signal time, location, and presence. If they modulated through the six sky-altitude bands (gold at noon, cool blue at twilight, indigo at deep night), the diagram would lose its visual anchor: at deep night the cursor would tint indigo and disappear into the near-black background. Chihiro locked `accentSkyTrack = false` so the gold reads consistently across all six bands.

### Implementation

`SkyColorModule.update()` at `app.js:1140-1174` writes four CSS custom properties:

- `--type-primary`
- `--type-secondary`
- `--type-tertiary`
- `--type-accent`

Phase 17 fixed a pre-existing bug where the 60 s linear transition omitted `--type-tertiary`. Phase 20 adds one more conditional: when `ACTIVE_FACE.accentSkyTrack === false`, the `--type-accent` write is skipped.

Implementation order in `update()`:

```js
update() {
  const alt = AppState.sun.altitude;
  let rgb = this._altitudeToRGB(alt);
  // ... existing weather/AQI/observance mods ...

  const root = document.documentElement.style;
  root.setProperty('--type-primary',   `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  root.setProperty('--type-secondary', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.62)`);
  root.setProperty('--type-tertiary',  `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.42)`);

  // Phase 20: accent opt-out
  const skipAccent = (typeof ACTIVE_FACE !== 'undefined'
                      && ACTIVE_FACE
                      && ACTIVE_FACE.accentSkyTrack === false);
  if (!skipAccent) {
    // Existing accent-modulation write (per Phase 16 / 17 / 18 / 19 logic)
    root.setProperty('--type-accent', /* current accent-modulation expression */);
  }
}
```

The `typeof ACTIVE_FACE !== 'undefined'` guard handles the boot ordering case where `SkyColorModule.update()` might be called before the boot IIFE has resolved `ACTIVE_FACE`. Implementation should verify that `ACTIVE_FACE` is resolved before `SkyColorModule.update()` first runs (in the Phase 16 boot sequence, `ACTIVE_FACE` is resolved on line 522 and `SkyColorModule.update()` first runs on line 542, so the guard is precautionary).

### Observance interaction

`ObservanceModule.activePalette()` returns a palette that `SkyColorModule.update()` consults inside the existing modulation block (`app.js:1158-1166`). The observance palette can override `--type-primary` (mode `'override'`) or tint it (mode `'tint'`). Observance does not currently write `--type-accent` directly; `--type-accent` is written by `SkyColorModule` based on the accent-tweak floor plus sky-altitude modulation.

When `accentSkyTrack = false`, the sky-altitude modulation is suspended for `--type-accent`. The accent floor color (set by the accent tweak on boot, e.g. `#F4C56C` for gold) remains. Observance does not currently modify this floor; if a future observance wants to override the accent (e.g. Christmas red), it should write `--type-accent` directly via `ObservanceModule._applyPaletteSideEffects()`. That hook is reserved for future work and out of scope here.

### Initial accent on boot

Phase 16 Section 8 `ClockfaceRegistry.applyAccent(TWEAKS.accent)` writes `--type-accent` once on boot. For Horizon, that initial write is the only write `--type-accent` ever receives, since `SkyColorModule.update()` skips the accent path. The gold (`#F4C56C` from `ACCENT_PALETTE.gold.hex`) is therefore fixed for the entire session.

If the user picks `accent = 'sky'` while on Horizon, the cursor and big-time colon become the sky-blue hex (`#7FA8C9`) and remain that for the session, never modulating. Same for sage, paper. The face concept (a fixed visual anchor) carries across all four accent palette entries.

## 12. Phase-Correct Crescent Rendering

Direct port of the prototype's `moonPhasePath` (`design_handoff_clockface/clockface.html:739-751`), with one rename for clarity:

```js
function moonPhasePath(cx, cy, r, illumFrac, waxing) {
  // illumFrac in [0..1] (AppState.moon.illumination)
  // waxing: boolean. True when AppState.moon.phase < 0.5 (waxing portion of the cycle).
  // Returns an SVG path 'd' attribute string for the lit portion of the moon disc.
  const w = Math.abs(1 - 2 * illumFrac);  // terminator ellipse half-width factor (0..1)
  const lit = waxing ? 1 : 0;             // sweep flag: 1 = lit limb on right
  if (illumFrac <= 0.5) {
    // Crescent: outer arc on lit limb, terminator ellipse arc back to top
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${lit} ${cx} ${cy + r} `
         + `A ${r * w} ${r} 0 0 ${1 - lit} ${cx} ${cy - r} Z`;
  }
  // Gibbous: full-disk arc plus terminator ellipse arc
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 ${lit} ${cx} ${cy + r} `
       + `A ${r * w} ${r} 0 0 ${lit} ${cx} ${cy - r} Z`;
}
```

### `waxing` determination

`AppState.moon.phase` is in `[0, 1]`. `phase < 0.5` is the waxing half (new -> first quarter -> waxing gibbous -> full); `phase >= 0.5` is the waning half (full -> waning gibbous -> last quarter -> waning crescent).

```js
const waxing = AppState.moon.phase < 0.5;
```

### Render call

In `HorizonFace.render()` inside the moon block:

```js
const illumClamped = Math.max(0.02, Math.min(0.98, AppState.moon.illumination));
const d = moonPhasePath(mx, my, moonR, illumClamped, waxing);
crescentPathEl.setAttribute('d', d);
```

The illumination clamp `[0.02, 0.98]` avoids degenerate paths at exact new moon and exact full moon. At new moon (`illumination = 0`), `w = 1` and the terminator ellipse has the same width as the disc, producing a thin slit; the 0.02 clamp keeps the path drawable as a hairline-thin crescent. At full moon, the gibbous path with `w = 1` produces a full disk; the 0.98 clamp leaves a 2 % sliver of dark side, which reads as a full moon at this size.

### Terminator orientation

The path assumes the lit limb is to the **right** when waxing and to the **left** when waning. This matches the Northern Hemisphere observer's view of the Moon, which Vancouver (49°N) shares. Southern Hemisphere observers see the reverse; the prototype does not handle this and Phase 20 does not either.

The terminator angle in `AppState.moon.terminatorAngle` (degrees, computed by SunCalc) is **not used** for the crescent rendering on Horizon. The disc on the arc is small (r=13) and the angle correction would not be visually discriminable at that scale. The simple left/right limb split is sufficient.

If a future face wants a fully oriented terminator (e.g. a large Editorial moon glyph), that face implements its own crescent rendering using `AppState.moon.terminatorAngle`. Out of scope here.

## 13. Render Contract

### Sketch

```js
const HorizonFace = {
  accentSkyTrack: false,                // Phase 20 opt-out (Section 11)

  _els: null,
  _lastMinuteKey: null,                 // gates time/header repaints
  _lastIsoDate: null,                   // gates header date repaint
  _staticBuilt: false,                  // gates one-shot static SVG element creation

  init(stage) {
    const existing = stage.querySelector('#horizon-stage');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'horizon-stage';
    root.innerHTML = HORIZON_TEMPLATE;   // header, sky SVG with <defs>, big-time, status block, etc.
    stage.appendChild(root);

    this._els = {
      root: root,
      header: root.querySelector('#horizon-header'),
      headerLocLeft:  root.querySelector('.horizon-header-loc'),
      headerMid:      root.querySelector('.horizon-header-mid'),
      headerRight:    root.querySelector('.horizon-header-daylight'),
      sky:            root.querySelector('#horizon-sky'),
      skyDriftGroup:  root.querySelector('.horizon-sky-drift'),
      sunGlyphGroup:  root.querySelector('.horizon-sun-glyph'),
      moonGlyphGroup: root.querySelector('.horizon-moon-glyph'),
      sunArc:         root.querySelector('.horizon-sun-arc'),
      moonArc:        root.querySelector('.horizon-moon-arc'),
      srNotch:        root.querySelector('.horizon-sr-notch'),
      ssNotch:        root.querySelector('.horizon-ss-notch'),
      mrNotch:        root.querySelector('.horizon-mr-notch'),
      msNotch:        root.querySelector('.horizon-ms-notch'),
      sunDisc:        root.querySelector('.horizon-sun-disc'),
      sunHalo:        root.querySelector('.horizon-sun-halo'),
      sunDrop:        root.querySelector('.horizon-sun-drop'),
      moonDiscOutline:root.querySelector('.horizon-moon-disc-outline'),
      moonHalo:       root.querySelector('.horizon-moon-halo'),
      moonCrescent:   root.querySelector('.horizon-moon-crescent'),
      cursor:         root.querySelector('.horizon-cursor'),
      hourLabels:     Array.from(root.querySelectorAll('.horizon-hour-label')),
      srLabel:        root.querySelector('.horizon-sr-label'),
      ssLabel:        root.querySelector('.horizon-ss-label'),
      mrLabel:        root.querySelector('.horizon-mr-label'),
      msLabel:        root.querySelector('.horizon-ms-label'),
      time:           root.querySelector('#horizon-time'),
      hh:             root.querySelector('.horizon-hh'),
      colon:          root.querySelector('.horizon-colon'),
      mm:             root.querySelector('.horizon-mm'),
      ampm:           root.querySelector('.horizon-ampm'),
      status:         root.querySelector('#horizon-status'),
      statusHeadline: root.querySelector('.horizon-status-headline'),
      statusGolden:   root.querySelector('.horizon-status-golden'),
      statusMoon:     root.querySelector('.horizon-status-moon'),
      statusTide:     root.querySelector('.horizon-status-tide'),
      statusAir:      root.querySelector('.horizon-status-air')
    };

    this._buildStatic();         // 25 hour ticks, hour labels, all written once
    this._lastMinuteKey = null;
    this._lastIsoDate   = null;
  },

  render(state, tweaks) {
    const ht = (tweaks.byFace && tweaks.byFace.horizon) || {};
    this._renderDiagram(state, ht);    // arcs, notches, disc positions, cursor, arc-labels
    this._renderTime(state, ht);       // gated on minute change
    this._renderHeader(state);         // gated on iso-date change for the date, every tick for daylight
    this._renderStatus(state, ht);     // gated on minute change for headline (day/night), per tick is fine
  },

  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._staticBuilt = false;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
  },

  // ---- internal helpers ----
  _buildStatic() { /* 25 hour ticks, 5 hour labels, <defs>, horizon line. Written once. */ },
  _renderDiagram(state, ht) { /* arcs, notches, disc positions, cursor, arc-terminal labels. Updates per minute except cursor (per tick). */ },
  _renderTime(state, ht)    { /* hours/colon/minutes/ampm. Gated on minute change. */ },
  _renderHeader(state)      { /* date middle and daylight right. Date gated on isoDate change. */ },
  _renderStatus(state, ht)  { /* five status lines. Gated on minute change. */ }
};
```

### Repaint gating

`render()` runs 1 Hz. Most elements change far less often:

| Sub-render | Gate | Tick cost |
|---|---|---|
| `_renderDiagram` cursor x | every tick | One SVG attribute write per second |
| `_renderDiagram` arcs / notches / disc positions / arc-labels | minute key changes (or moon slice changes; check `AppState.meta.lastUpdate.moon` cache) | ~1 write/min |
| `_renderTime` digits | minute key changes | ~1 write/min |
| `_renderHeader` date | iso date changes | ~1 write/day |
| `_renderHeader` daylight | iso date changes (daylight is a function of day, not time) | ~1 write/day |
| `_renderStatus` headline (day/night) | every tick (cheap) or minute (sufficient): minute | ~1 write/min |
| `_renderStatus` golden hour | minute (cheap to write each minute, doesn't change quickly) | ~1 write/min |
| `_renderStatus` MOON / TIDE / AIR | minute is plenty | ~1 write/min |

Per-tick cost on Horizon: **one SVG attribute write** (the cursor `x1`/`x2`). All other writes are gated.

### Boot ordering

`HorizonFace.init(stage)` runs before `MoonModule.start()` in the boot sequence (Phase 16 Section 9). At first render, `AppState.moon.moonrise` and `.moonset` are empty strings. The render code must handle empty strings gracefully (arc hidden, arc-terminal label as `☾ ↑ —`, etc.) until the first MoonModule tick completes (~5 ms after start, since it runs synchronously on first call).

In practice, the first render tick happens ~1 s after boot (ClockModule tick), by which time MoonModule has already populated the moon fields. The empty-string state is theoretical but the code handles it for safety.

### Constraints carried from Phase 16

Per `phase-16-clockface-foundation.md` Section 6:

- Must not mutate `AppState`.
- Must not register `setInterval` / `setTimeout` outside the 1 Hz tick.
- Must not add `position: fixed` elements or solid filled blocks.
- Must not read `localStorage` directly.
- Must not modify `--type-primary`, `--type-accent`, or `--lum-mod` directly.

`HorizonFace` satisfies all of these. The minute-change gating and per-tick cursor update use no timers; both are driven by the existing 1 Hz tick. The big-time cross-fade transitions are owned by `MacroShifter`, not by `HorizonFace`.

### Picker entry point

Long-press (>= 600 ms) on `#horizon-time` (the largest stable element on the face) opens `clockface.html`. Short tap (< 600 ms) toggles `VersionOverlay`. The dispatch logic in `app.js` boot (Phase 17 Section 9 `VersionOverlay.bind()` fork) is extended:

```js
// app.js boot, VersionOverlay.bind() selection (Phase 20 delta)
const gestureSurface =
  FACE_ID === 'mechanical' ? document.getElementById('mech-time') :
  FACE_ID === 'departures' ? document.getElementById('dep-headline') :  // Phase 18
  FACE_ID === 'editorial'  ? document.getElementById('ed-time')      :  // Phase 19
  FACE_ID === 'horizon'    ? document.getElementById('horizon-time') :  // Phase 20
                             document.getElementById('moon-disc');      // Calm default
VersionOverlay.bind(gestureSurface);
```

The fork pattern is Phase 17's; Phase 20 just adds the Horizon branch.

## 14. CSS Additions

Approximate. Misaka tunes as needed.

```css
/* Phase 20: Horizon face */

#horizon-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

#horizon-header {
  position: absolute;
  left: 80px;
  right: 80px;
  top: 50px;
  display: flex;
  justify-content: space-between;
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  font-weight: 300;
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--type-tertiary);
  transform: translate(var(--date-dx), var(--date-dy));
}

#horizon-sky {
  position: absolute;
  left: 0;
  top: 0;
  width: 1180px;
  height: 820px;
  pointer-events: none;
}

#horizon-time {
  position: absolute;
  top: 560px;
  /* Home A (default): left: 90px; right: auto; */
  /* Home B (applied by MacroShifter): left: auto; right: 90px; */
  left: 90px;
  right: auto;
  font-family: 'Manrope', system-ui, sans-serif;
  font-weight: 200;
  font-size: 220px;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--type-primary);
  filter: brightness(var(--lum-mod));
  transform: translate(var(--time-dx), var(--time-dy));
  transition: opacity 400ms ease-out;
}

.horizon-colon {
  color: var(--type-accent);
  opacity: 0.55;
  margin: 0 0.02em;
}

.horizon-ampm {
  display: inline-block;
  font-size: 42px;
  font-weight: 300;
  letter-spacing: 0.18em;
  vertical-align: top;
  margin-left: 18px;
  color: var(--type-secondary);
}

#horizon-time.mech-time-fade-out { opacity: 0; transition-timing-function: ease-out; transition-duration: 400ms; }
#horizon-time.mech-time-fade-in  { opacity: 1; transition-timing-function: ease-in;  transition-duration: 400ms; }

#horizon-status {
  position: absolute;
  right: 90px;
  top: 580px;
  text-align: right;
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  font-weight: 300;
  font-size: 13px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--type-tertiary);
  line-height: 2.0;
  filter: brightness(var(--lum-mod));
  transform: translate(var(--slot-dx), var(--slot-dy));
}

.horizon-status-headline.is-day   { color: var(--type-accent); }
.horizon-status-headline.is-night { color: var(--type-secondary); }
.horizon-status-air               { opacity: 0.7; }

#horizon-hour-labels {
  position: absolute;
  left: 0;
  right: 0;
  top: 472px;
  height: 18px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  font-weight: 300;
  font-size: 11px;
  letter-spacing: 0.24em;
  color: var(--type-tertiary);
  transform: translate(var(--date-dx), var(--date-dy));
}

.horizon-hour-label {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

#horizon-arc-labels {
  position: absolute;
  left: 0;
  right: 0;
  top: 498px;
  height: 28px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  font-weight: 300;
  font-size: 10px;
  letter-spacing: 0.28em;
  transform: translate(var(--slot-dx), var(--slot-dy));
}

.horizon-sr-label, .horizon-ss-label {
  position: absolute;
  transform: translateX(-50%);
  color: rgba(244, 197, 108, 0.60);
}

.horizon-mr-label, .horizon-ms-label {
  position: absolute;
  top: 14px;
  transform: translateX(-50%);
  color: rgba(168, 199, 255, 0.55);
}

/* SVG interior drift wrappers */
.horizon-sky-drift {
  transform: translate(var(--horizon-dx), var(--horizon-dy));
  transform-origin: center center;
}
.horizon-sun-glyph {
  transform: translate(var(--sun-dx), var(--sun-dy));
}
.horizon-moon-glyph-drift {
  transform: translate(var(--moon-dx), var(--moon-dy));
}
```

## 15. CONFIG Additions

```js
// app.js CONFIG block delta (Phase 20). Existing keys not shown.

// One-line bump: from 101 to 109. CRITICAL: this must land in Phase 20's
// first commit, before any other Horizon work. See Section 7.
driftClasses: {
  // ... existing entries ...
  horizon: { ampX: 18, ampY: 12, periodSec: 109 },   // BUMPED from 101
  // ... other existing entries unchanged ...
},

macroShift: {
  // ... existing keys ...
  timeHomesByFace: {
    mechanical: [[50, 39], [50, 54]],
    horizon:    [[8, 68], [92, 68]]      // Phase 20
  },
  timeIntervalHoursByFace: {              // Phase 19 introduced
    horizon: 6                             // Phase 20 adds
  },
  timeTransitionStyleByFace: {             // Phase 20 introduced
    horizon: 'fade'                        // 'fade' or 'translate' (default)
  }
  // ... moon settings unchanged ...
}
```

No changes to `CONFIG.location`, `CONFIG.refresh`, `CONFIG.refresher`, `CONFIG.luminanceBreath`, `CONFIG.rotation`, `CONFIG.observances`, `CONFIG.pixelShift`, `CONFIG.tweakDefaults`, or `CONFIG.build`.

## 16. Burn-In Audit (Horizon face)

The diagram introduces several fixed-coordinate primitives the previous faces did not have: the horizon line spanning the full stage at y=440, the 25 hour ticks at fixed x, the four notches at sunrise/sunset/moonrise/moonset (which move only by a few px per day), and the dashed arc paths (which move only over a year as the sun's declination changes). The audit accounts for each.

| # | Layer | Status on Horizon | Notes |
|---|---|---|---|
| 1 | Per-element Perlin drift | Active | `time` 117 s, `date` 89 s (header + hour labels), `slot` 143 s (status block + arc labels), `moon` 73 s (moon glyph), `sun` 101 s (sun glyph), `horizon` 109 s (diagram interior). All pairwise coprime. Phase 20 is the first phase where `sun` and `horizon` carry pixels. |
| 2 | Pixel-shift safety net | Active | `+/- 4 px` every 6 min, applied on top of stage-clamped drift. Unchanged from Phase 16. |
| 3 | Kinetic transitions (Calm) -> distributed churn (Horizon) | Active via composite coverage similar to Mechanical's argument. See "Layer 3 trade-off" below. | Horizon has no RotatorModule slot. The minute-key-gated arc/notch repaints occur once per minute; the per-tick cursor x update is 1 px per ~85 s (sub-pixel per tick). The 6 h macro shift on the big-time covers the largest element. |
| 4 | Macro shifts | Active | Big-time cross-fades between two homes every 6 h. Moon is not on the Horizon face's macro-shift target list (the moon disc moves naturally across the diagram as part of its arc traverse; this is moon position via astronomy, not via MacroShifter). |
| 5 | Sky-color modulation | Partially active. `--type-primary`, `--type-secondary`, `--type-tertiary` continue to modulate on the 60 s linear transition. `--type-accent` is suspended (Section 11). | The big-time numerals (in `--type-primary`) and the status block (in `--type-tertiary`) continue to modulate. The gold elements (cursor, colon, `☀ DAY` headline) are fixed by design. |
| 6 | Luminance breath | Active | `filter: brightness(var(--lum-mod))` is applied to `#horizon-time`, `#horizon-status`, `#horizon-header`. The SVG diagram does not receive the brightness filter (see Section 3 note); the diagram's strokes are already alpha-blended near the floor and adding a brightness filter to the 1180x820 SVG would hurt rAF cost. |
| 7 | Daily refresher | Active | 03:00 fade to `#404040` for 30 s. `#refresher-overlay` covers Horizon identically. |
| 8 | Rendering hygiene | Active | Background `#0a0a0a`. Manrope 200 for time, JetBrains Mono 300 for labels and status. No filled blocks. The thickest stroke is 1.2 px on major hour ticks; the largest fixed alpha pixel is the sun-disc fill at `#F4C56C` solid (r=18, area ~1018 px²), which moves continuously across the diagram. The horizon line at 1 px / 22 % alpha and the dashed arcs at 1 px / 22 % alpha are well below the SDD's burn-in threshold for OLED-class panels. |

### Layer 3 trade-off

Same argument as Mechanical (Phase 17 Section 11): no rotator-driven 28-36 s slot churn. Coverage is supplied by:

| Mechanism | Cadence | Coverage |
|---|---|---|
| Per-element Perlin drift (Layer 1) | continuous, periods 73 / 89 / 101 / 109 / 117 / 143 s | Six drift channels active. The slowest channel `slot` (143 s) still re-positions every pixel within ~143 s. |
| Cursor advance | 1 Hz, ~0.012 px/s lateral, 1 px every ~85 s | The cursor pixel column is uniquely the only element on a fixed x for >85 s; drift on the `horizon` channel (109 s, ampX 18) re-distributes those pixels across an 18 px band. |
| Sun and moon disc motion | continuous, sun ~1.4 px/min, moon similar | The two discs are the only large filled regions on the diagram, and they traverse the full width (1020 px) every active day. The drift channels add 18/12 px on top. |
| Macro shifts (Layer 4) | big-time every 6 h | Big-time alternates two homes; the largest typography element does not stay put. |
| Daily refresher (Layer 7) | 03:00 daily | Full-stage 30 s mid-gray hold. |

### Pixel hold analysis for the fixed primitives

- **Horizon line (1 px / y=440 / 22 % alpha)**: drift on `horizon` channel (109 s, 18/12 px) wraps the entire line, so any given pixel along the line is lit for at most 109 s before the line drifts off it. Pixel-shift safety net adds another 4 px every 6 min. The line is on the screen continuously over a year, but no single pixel is.
- **Hour ticks (1 px width, 6-14 px height, 20 % alpha)**: same `horizon` drift wraps the entire tick set. Each tick is at a fixed x relative to the diagram, but the diagram drifts, so the tick's effective x walks an 18 px band on a 109 s period. The major ticks at 1.2 px width have a slightly larger footprint than the minors but well under the burn-in threshold.
- **Dashed arcs (1 px, 18-22 % alpha, dashed)**: the dashing breaks the line into 1-2 px on / 6-7 px off segments. Drift on `horizon` walks the whole arc. The dashes shift their position relative to fixed pixels as the arc drifts; no single pixel along an arc dash is lit for more than 109 s without a drift-induced gap.
- **Sunrise / sunset notches (1 px / 16 px / 55 % alpha)**: each notch is at a fixed x for the day (the notch x moves by ~3 minutes per day, ~2 px per day). The notch lives inside the `<g class="horizon-sky-drift">` group, so the 109 s drift wraps the notch. Over a year, the seasonal motion in notch x is ~600 px (sunrise from 4 AM in June to 8 AM in December), which is its own slow burn-in mitigation.
- **Moonrise / moonset notches (1 px / 12 px / 45 % alpha)**: notch x moves ~50 min per day (~36 px per day), so the notch x cycles through the full 1020 px stage band every ~28 days. Independent of all other channels.

### Worst-case pixel-hold analysis

- `#horizon-time` (Manrope 200, 220 px): the colon glyph is the only stable character within `H:MM`. Drift on `time` (117 s, 24 px X) carries the colon glyph through its full amplitude in ~58 s. Plus macro shift every 6 h (cross-fade between Home A and Home B; the colon location changes entirely on the macro boundary). No issue.
- `#horizon-header` (12 px Mono 300): tertiary type. Drift on `date` (89 s, 12 px X). The location string `HORIZON · 49.32°N 123.13°W` is fixed for the life of the face; the day-3 and date change daily. Drift plus daily date change plus 6 min pixel-shift plus 03:00 refresher cover it.
- Horizon line and hour ticks: covered by the audit table above.

### Risk band

The `--type-tertiary` modulation gap was a pre-existing V0 bug fixed in Phase 17. Phase 20 inherits the fix; no new risk band. The faintest visible primitive is the moon arc at `rgba(168,199,255,0.18)`, 1 px dashed; visibility verified in the prototype against the calm baseline. Implementer must verify on real iPad hardware at 2 m viewing distance.

## 17. Bundle Budget Audit

Phase 19 baseline (estimated, since Phase 19 is not yet shipped): ~140-150 KB runtime, ~22-25 KB picker delta. Phase 20 deltas:

| Change | Delta |
|---|---|
| `app.js`: `HorizonFace` object (init/render/teardown + diagram building) | +5.5 KB |
| `app.js`: `MoonModule` 4-line extension (moonrise/moonset/alwaysUp/alwaysDown) | +0.2 KB |
| `app.js`: `SkyColorModule` accent opt-out conditional | +0.1 KB |
| `app.js`: `MacroShifter` cross-fade branch + `timeTransitionStyleByFace` read | +0.4 KB |
| `app.js`: `DriftEngine.activeKeys` adds `sun` + `horizon`; new entries in `_elementSizes`, `_anchorPercents`, `_phaseOffsets` | +0.2 KB |
| `app.js`: `CONFIG.driftClasses.horizon.periodSec` bump (one line) | 0 KB |
| `app.js`: `ClockfaceRegistry.normalizeTweaks` Horizon block (`timeFormat`, `starField`) | +0.3 KB |
| `app.js`: `window.HorizonFace` assignment | 0.05 KB |
| `style.css`: Horizon face styles (`#horizon-*`, SVG drift wrappers) | +3.0 KB |
| `clockface.html`: Horizon card stage placeholder | +0.1 KB |
| `clockface.js`: `PREVIEW_STATE.moon.moonrise`/`moonset`/flags populated; Horizon-card render mount | +0.4 KB |
| **Total Phase 20 delta** | **~10.3 KB** |

No new fonts. Phase 17 (JetBrains Mono 300), Phase 19 (Cormorant Garamond 300 italic), and the existing Manrope 200/300 cover Horizon's typography.

Phase 20 cumulative estimate: ~150-160 KB. Headroom against the 250 KB target: ~90 KB. Comfortable.

## 18. Test Plan

### Manual

| Test | Expected |
|---|---|
| Open `clockface.html`, scroll to Horizon card | Live preview renders via `window.HorizonFace.init(card)` + `render(PREVIEW_STATE, tweaks)`. Diagram visible: horizon line, 25 ticks, sun arc (gold dashed), moon arc (blue dashed), sun disc with halo on its arc, moon disc with phase-correct crescent, hairline cursor at the preview's `nowF`. Status block reads `☀ DAY · PARTLY CLOUDY 12°` / `GOLDEN HOUR · 7:47 PM` / `MOON · WAXING CRESCENT 18%` / `TIDE · HIGH 4.3m at 4:22 AM` / `AIR · AQI 024 GOOD`. Big-time reads `2:32 PM` (12h default for Horizon per `tweaks.byFace.horizon.timeFormat`). |
| In picker, set Horizon `timeFormat` to `24h`, Apply | Main display reloads with `solari.clockface = 'horizon'`. Big-time reads `14:32` (no AM/PM span). Status block times render as `19:47`, `04:22`. Arc-terminal labels render as `☀ ↑ 05:22 ☀ ↓ 20:47 ☾ ↑ 14:32 ☾ ↓ 02:18` per current AppState. |
| Open `index.html` with `solari.clockface = 'horizon'`, daytime | Sun disc visible on its arc, traveling left-to-right over the day. Moon disc visible if moonUp per `AppState.moon.moonrise`/`moonset`. Cursor at `xAt(nowF)`. Status block headline reads `☀ DAY · ...`. |
| Same, after sunset | Sun disc and drop-line hidden. Sun arc still drawn (dashed gold). Cursor continues to advance past the sunset notch. Status block headline reads `☾ NIGHT · ...` in `--type-secondary`. |
| Wait through midnight (or mock the time) | Cursor returns to x=80 at `nowF = 0`. Sun arc re-renders with the new day's sunriseF/sunsetF after MoonModule's next tick. Moon arc re-renders for the new day. |
| Wait 6 h (or mock the time) | Big-time cross-fades to the alternate home over 800 ms (400 ms fade-out, 400 ms fade-in with position swap at the 400 ms midpoint). No translate, no slide. Status block does not move. |
| Toggle `accent` from gold to sky in picker, Apply | The big-time colon, the cursor, and the `☀ DAY` headline become sky-blue (`#7FA8C9`). They remain sky-blue for the entire session, never modulating with sky altitude. Other elements (big-time digits, status block text in tertiary) continue to modulate through the 6 sky bands. |
| Set system date to Dec 25 | `ObservanceModule.update()` writes a Christmas palette override to `--type-primary`. Horizon's big-time digits, header strip date, and status block tertiary lines pick up the override. Cursor and colon (gold accent) remain fixed gold. Arc-terminal labels (gold-tinted and blue-tinted with literal rgba) are not affected by the override (they use literal rgba, not `--type-accent`). |
| Force `AppState.moon.alwaysUp = true` (manual edit in console) | Moon arc hidden. Moon disc rendered at `(xAt(0.5), horizonY - moonArcH)` with phase-correct crescent. Status block MOON line continues to render. Arc-terminal labels for moonrise/moonset render as `☾ ↑ —` and `☾ ↓ —`. |
| Force `AppState.moon.alwaysDown = true` | Moon arc hidden. Moon disc hidden. Status block MOON line continues to render. Arc-terminal labels render as `☾ ↑ —` and `☾ ↓ —`. |
| Force `AppState.tide.type = null` | Status block TIDE line reads `TIDE · —`. Other lines unaffected. |
| Force `AppState.aqi.value = null` | Status block AIR line reads `AIR · AQI — —` in `--type-tertiary` at 0.7 opacity. |
| At sunrise / sunset (within 30 s) | Sun disc passes through the horizon. Clip path makes the disc dip below the horizon line rather than overlapping it. Drop-line shortens to zero at the exact horizon crossing. |
| At moonrise / moonset (within 30 s) | Moon disc passes through the horizon. Clip path makes the disc dip below the horizon line. |
| Long-press `#horizon-time` for >= 600 ms | `clockface.html` opens. Short tap (< 600 ms) toggles `VersionOverlay`. |
| Resize viewport to 1366 x 1024 | Stage scale recomputes to 1.157. Horizon scales uniformly. Drift amplitudes unchanged in stage pixels. SVG vector strokes remain crisp. |
| Run 24 h endurance | Memory growth within 5 % of Phase 19 baseline. No SVG attribute leak (the per-tick cursor update overwrites a single attribute; nothing is created or removed at runtime once `_buildStatic()` completes). |
| Set `driftIntensity` to `off`, Apply | Diagram interior, sun disc, moon disc, big-time, status block all hold their stage anchors with zero drift offset. Cursor still advances per tick (cursor x is data-driven, not drift-driven). |
| Set `driftIntensity` to `restless`, Apply | Drift amplitudes 1.5x normal. Sun disc drifts up to 27 px X / 18 px Y on its arc. Diagram interior drifts up to 27/18 px. |
| 03:00 refresher | Stage fades to `#404040` for 30 s, returns to Horizon. No orphan SVG elements (e.g. stale clip-path), no broken arc paths. |
| 6 h boundary while in middle of big-time cross-fade | The cross-fade in progress completes naturally (next `MacroShifter` tick re-triggers). The element does not get stuck at opacity 0. |

### Latitude edge cases (not normally seen at 49°N)

These tests use mocked latitude values to verify defensive code paths. They are not field tests:

| Mocked location | Expected behaviour |
|---|---|
| Lat 70°N in June (sun never sets) | `SunCalc` returns no setting for the sun. AppState.sun.sunset remains empty string. **Out of scope for Phase 20.** The sun arc rendering assumes `sunriseF < sunsetF` and a valid sunset; if sunset is empty, `parseHM` returns 0, and the arc renders from `xAt(sunriseF)` to `xAt(0)`. Visual: a degenerate sun arc. The face does not handle this case; the Vancouver coords in CONFIG never produce it. |
| Lat 70°N in December (sun never rises) | Same as above with rise/set swapped. Out of scope. |
| Lat 70°N: moon alwaysUp returns true | `AppState.moon.alwaysUp = true`. Code path tested per the alwaysUp test row above. |
| Lat 70°N: moon alwaysDown returns true | `AppState.moon.alwaysDown = true`. Code path tested per the alwaysDown test row above. |

### Automated

- Lint pass on `app.js` (existing CI gate).
- `HorizonFace.init()` and `HorizonFace.teardown()` exercised: re-init removes the previous subtree before building.
- `ClockfaceRegistry.normalizeTweaks` round-trip for Horizon-specific inputs:
  - `{ byFace: { horizon: { timeFormat: 'foo' } } }` -> `'12h'` (default for Horizon is 12h per chihiro's brief).
  - `{ byFace: { horizon: { starField: 'yes' } } }` -> `false` (only literal `true` is accepted).
  - `{ byFace: { horizon: null } }` -> `{ timeFormat: '12h', starField: false }`.
- `parseHM` edge cases: `''`, `'25:00'`, `'12:60'`, `'12:00 PM'`, `'12:00 AM'`, `'00:00'`. All produce valid `[0, 1]` fractions or default 0 cleanly.
- `moonPhasePath` smoke test at illumFrac `0.0`, `0.02`, `0.25`, `0.5`, `0.75`, `0.98`, `1.0` for both `waxing=true` and `waxing=false`. All produce parsable SVG path strings.

### Sentry endurance hooks

Existing Phase 16/17/19 metrics are sufficient. No new hooks for Phase 20.

### Long-running validation

Horizon must survive a 7-day endurance run with no memory growth and no DriftEngine slowdown. Specific watch points:

1. The per-tick cursor x update should not allocate. Confirm via memory profile.
2. `MoonModule.update()` runs every 6 h. Confirm the four new field writes do not leak.
3. `SkyColorModule.update()` runs every 60 s. Confirm the new `skipAccent` conditional adds no measurable cost.
4. The 6 h big-time cross-fade adds and removes two CSS classes. Confirm no stuck class state after a multi-day run.
5. SVG path attribute writes (the cursor `x1`/`x2`, the arc `d` attributes at minute boundaries, the crescent `d` attribute at moon-update boundaries) must not accumulate orphan DOM.

## 19. Picker Integration

`HorizonFace` registers as the fifth card in the picker. The `SOLARI_PICKER` boot guard from Phase 17 Section 13 is reused verbatim. `window.HorizonFace = HorizonFace` is added to the existing export block at the foot of `app.js`.

### Preview state additions

`PREVIEW_STATE` in `clockface.js` is extended to include moonrise/moonset and the flags:

```js
// clockface.js PREVIEW_STATE delta (Phase 20)
moon: {
  phase: 0.18,
  illumination: 0.18,
  phaseName: 'Waxing Crescent',
  terminatorAngle: 0,
  moonrise: '14:32',     // 12h fields are populated as 12h when needed; the
  moonset:  '02:18',     // parseHM helper handles both formats.
  alwaysUp:   false,
  alwaysDown: false
}
```

### Render loop

The picker advances `PREVIEW_STATE.time` every second (per Phase 17 pattern). Horizon's cursor advances visibly during preview. The big-time updates every minute. The sun and moon disc positions on their arcs animate slowly as the preview clock advances; over a 2-minute preview session, the discs traverse ~3-4 px laterally.

```js
// In clockface.js, after Horizon card stage setup:
window.HorizonFace.init(horizonCardStage);

let previewClockId = setInterval(() => {
  PREVIEW_STATE.time.seconds = (PREVIEW_STATE.time.seconds + 1) % 60;
  if (PREVIEW_STATE.time.seconds === 0) {
    PREVIEW_STATE.time.minutes = (PREVIEW_STATE.time.minutes + 1) % 60;
    if (PREVIEW_STATE.time.minutes === 0) {
      PREVIEW_STATE.time.hours = (PREVIEW_STATE.time.hours + 1) % 24;
    }
  }
  window.HorizonFace.render(PREVIEW_STATE, previewTweaks);
}, 1000);
```

The `accentSkyTrack = false` declaration on the face is consumed by `SkyColorModule` on the main display. The picker does not run `SkyColorModule`, so the accent color in the picker preview comes solely from `previewTweaks.accent` and stays fixed without further consideration.

### Apply behaviour

Same as Phase 16/17/19: `Apply` writes `solari.clockface = 'horizon'` and `solari.clockface.tweaks = JSON.stringify(tweaks)`. The main display's `storage` listener triggers a full reload.

`tweaks.byFace.horizon.starField` is included in the persisted tweaks even though it has no render path in Phase 20. Future phases (V2) can light up the feature by adding a render branch keyed on this flag.

## 20. Open Questions

The following items require resolution during implementation or hardware verification. None block the spec; all have defaulted resolutions.

1. **MoonModule edge case during MoonModule's first tick before HorizonFace renders.** If `HorizonFace.init()` runs before `MoonModule.start()` (which is the Phase 16 boot order, with face init at line 532 and `MoonModule.start()` at line 543), the first render call (~1 s later, on the first ClockModule tick) will see populated `AppState.moon.moonrise` etc. because `MoonModule.start()` calls `update()` synchronously. The brief gap between init and first render is theoretical only. **Resolution: code defensively. If `moonrise === ''` and `alwaysUp === false` and `alwaysDown === false`, hide the moon arc and disc and render arc-terminal labels as `☾ ↑ —` and `☾ ↓ —`.** Confirm during implementation that the synchronous call ordering holds.

2. **Picker preview moonrise/moonset format.** The picker mocks `moonrise` and `moonset` as fixed strings. Should they be 12h or 24h, given the picker's default tweak set may not match the Horizon default? **Resolution: store the picker mocks in 24h format (`'14:32'`, `'02:18'`); `parseHM` handles both 12h and 24h transparently. The picker preview renders per the current `previewTweaks.byFace.horizon.timeFormat`, which defaults to `12h`. So the visible label will be `2:32 PM` / `2:18 AM`, computed from the 24h mock strings.** Confirm misaka follows this convention so the picker preview matches what a 12h-tweaked main display would show.

3. **Macro-shift Home B collision risk.** Home B at `(right: 90, top: 560)` puts the 220 px big-time digits in the same horizontal anchor as the status block (`right: 90, top: 580`). The big-time digits stretch leftward; the status block text reads rightward. They share the same right-edge anchor but the big-time vertically sits at 560 and the status at 580; the big-time's 220 px height extends to ~720 (or ~780 with descenders), overlapping the status block's 580-710 band. **Resolution: implementation must verify on the iPad that the two do not visually collide. If they do, replace Home B with `[8, 30]` (top-left) and rename the home table semantically.** Hardware check required.

4. **SkyColorModule API change confirmation.** Section 11 specifies that `SkyColorModule.update()` is extended to read `ACTIVE_FACE.accentSkyTrack`. The module currently has no notion of the active face. The reference is to a module-scope `ACTIVE_FACE` constant set in the boot IIFE (Phase 16 Section 9). **Resolution: confirm at implementation time that `ACTIVE_FACE` is accessible from within `SkyColorModule.update()` (it is, since it's defined in the same `app.js` module scope as `SkyColorModule`). The `typeof` guard is precautionary.**

5. **Phase 19 dependency.** This spec assumes Phase 19 introduces `timeIntervalHoursByFace` (Section 4.3). If Phase 19's final spec lands without that mechanism, Phase 20 introduces it instead. The behaviour and code shape are identical; only the attribution shifts. **Resolution: ariadne updates this spec to claim authorship of `timeIntervalHoursByFace` if Phase 19 does not ship it. No user blocker.**

6. **Status-block AIR opacity stacking.** The status block uses `--type-tertiary` (alpha 0.42) plus a per-line `opacity: 0.7` for AIR. Stacked, the AIR line is rendered at ~29 % effective alpha against the `#0a0a0a` background. Confirm legibility on iPad at 2 m. If insufficient, drop the per-line `opacity: 0.7` and accept full tertiary alpha for AIR. **Resolution: hardware check required during implementation.**

7. **Golden hour exact-time computation.** Section 6 lists three branching cases for golden hour selection; the production code may default to "always show the evening golden hour" for simplicity. **Resolution: ship the simplified version unless misaka has bandwidth to implement the morning/evening fork.** Not a user blocker.

## 21. Shipped Status

Resolved items from implementation and hermione review. All were closed before merge.

- **Horizon drift period 109 s** -- SHIPPED. Spec text initially read 101 s in an early draft. chihiro flagged the coprime collision with the `sun` channel (also 101 s); period was bumped to 109 s (next prime above 101) before merge. All references in `CONFIG.driftClasses` and the burn-in audit reflect 109 s.
- **`preserveAspectRatio` not set on SVG** -- SHIPPED. Spec compliance: mikasa caught an unintentional `preserveAspectRatio="none"` attribute in draft code and removed it; the viewBox is 1180x820 matching the stage exactly, so no attribute is needed.
- **`_renderStatus` gate key** -- SHIPPED. mikasa added a `_renderStatus` gate key to prevent the status block from re-rendering every tick when data is unchanged, matching the pattern from Mechanical and Departures.
- **Horizon line x2 = DAY_RIGHT (1100)** -- SHIPPED. Initial draft had `x2 = DAY_RIGHT + 10` (1110); corrected to 1100 before merge so the horizon line terminates cleanly at the day-arc boundary.
- **Bundle size** -- SHIPPED at 255,607 bytes uncompressed (393 bytes under the 256,000-byte cap with Google Fonts CDN excluded, consistent with prior phase audits).
- **`accentSkyTrack` opt-out** -- SHIPPED as a hook. The `SkyColorModule` conditional that reads `ACTIVE_FACE.accentSkyTrack` is live code. However, today's V1 `SkyColorModule` does not modulate `--type-accent` on any sky-altitude band (the V0 modulation logic was removed in an earlier phase). The guard documents the V2 contract: if sky-altitude accent modulation is ever added back, Horizon's opt-out will activate automatically without a code change.

## 22. References

- SDD Section 9 (Burn-in Protection, eight layers).
- SDD Section 11.1 (Kinetic transition timing -- not used by Horizon).
- SDD Section 12 (Macro position shifts -- extended in Phase 19 / Phase 20 to per-face style).
- SDD Section 17 (Layout, font sizes).
- SDD Section 22 (Acceptance criteria for endurance).
- `docs/phase-16-clockface-foundation.md` (foundation contract Phase 20 inherits, especially Sections 3, 5, 6, 8, 9, 13).
- `docs/phase-17-mechanical-face.md` (canonical face-spec shape Phase 20 mirrors; Section 7 introduced `timeHomesByFace`; Section 13 introduced `SOLARI_PICKER` boot guard).
- `design_handoff_clockface/README.md` lines 204-270 (Horizon visual reference).
- `design_handoff_clockface/clockface.html` lines 670-902 (Horizon SVG generation reference; phase-correct crescent at lines 739-751).
- `app.js:43-52` (`CONFIG.driftClasses`; Phase 20 bumps `horizon` from 101 to 109).
- `app.js:88-107` (`CONFIG.macroShift`; Phase 20 adds `timeTransitionStyleByFace`).
- `app.js:1031-1115` (`MoonModule`; Phase 20 adds four lines).
- `app.js:1117-1175` (`SkyColorModule.update`; Phase 20 adds one conditional).
- `app.js` `DriftEngine` block (Phase 20 activates `sun` and `horizon` channels).
- `app.js` `MacroShifter` block (Phase 20 adds the fade branch).
- `lib/suncalc.js:257-309` (`SunCalc.getMoonTimes`).
- MDN: [`SVG clipPath`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath), [`SVG radialGradient`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/radialGradient), [`CSS opacity transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions).
