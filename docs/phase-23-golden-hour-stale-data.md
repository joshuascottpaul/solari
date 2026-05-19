# Phase 23 -- Golden-Hour Accent and Stale-Data Dimming

**Date:** 2026-05-18
**Status:** Shipped
**Scope:** Two paired token-vocabulary features (no new face, no new module class beyond `StaleMonitor`)
**Branch:** `phase-23-golden-hour-stale-data`

## 1. Summary

Phase 23 ships two token-modulating features that share a single design pass and a single 60 s cadence.

The first is a **golden-hour accent override**. When the sun's altitude sits inside a narrow window around the horizon, `--type-accent` is lerped in RGB space from the user-selected accent toward a fixed warm target (`#C9A14A`). The intensity follows a raised-cosine envelope anchored on altitude (not clock time), so the band slides forward through the year with the sun's angular rate. Faces opt in or out via the existing `accentSkyTrack` flag, which is promoted from reserved hook to actively-read in this phase. Calm, Mechanical, Departures, and Editorial opt in. Horizon opts out so its gold hairline cursor stays fixed.

The second is **per-feed stale-data dimming**. When a fetcher's `AppState.meta.lastUpdate[feed]` timestamp exceeds the per-feed threshold (weather 30 min, AQI 60 min, tide 12 h), the glyph bound to that feed gains an `is-stale` class. The class drops its opacity to 0.6 over a 30 s linear transition. When a fresh poll succeeds, the class is removed and the glyph fades back to 1.0 over 8 s. The asymmetry (slow out, fast in) reads as "fading patience" rather than "broken." Alerts are exempt: the EC CORS fallback file is always clock-stale by design and dimming it would read as a failure mode.

## 2. Motivation

These two ideas are paired in a single phase for three reasons.

**Token-vocabulary cohesion.** Both features extend the same vocabulary -- `--type-accent` modulation and glyph-level opacity. A single design lock keeps the two consistent: golden hour writes a token, stale dim multiplies element alpha, and neither touches structural chrome. Splitting them across two phases would invite drift in the boundary rules (which one writes `--type-accent`? which one touches structural chrome?). Locking them together avoids that.

**Single 60 s cadence.** Golden-hour intensity is recomputed every 60 s inside `SkyColorModule.update()`. `StaleMonitor.update()` runs on its own 60 s timer aligned to the same clock. Two features, one heartbeat.

**Small-effort wins.** Both came out of the polish list compiled after V1 face shipping. Each is a small, contained change on top of an existing module. Phase 23 is the natural batch.

## 3. Locked Decisions

All design decisions are locked in `.claude/agent-memory/chihiro-ui-designer/phase23_design_language.md`. That file is the source of truth. The summary below is for cross-reference.

### Golden-hour accent override

| Lock | Value |
|---|---|
| Altitude window | sun altitude in [-6°, +6°] |
| Envelope shape | raised cosine, peak at altitude = 0 |
| Anchor | altitude (not clock time) |
| Target colour | `GOLDEN_HOUR_TARGET = #C9A14A` |
| Interpolation | RGB-space lerp: `accent_out = lerpRgb(userAccent, GOLDEN_HOUR_TARGET, t)` |
| Per-face opt-out | existing `accentSkyTrack` flag, promoted from reserved hook to actively-read |
| Opt-in faces | Calm, Mechanical, Departures, Editorial |
| Opt-out faces | Horizon |
| Token written | `--type-accent` only |
| Tokens NOT written | `--bezel-accent` (Departures structural chrome stays boot-gold) |
| Cadence | piggyback existing 60 s `SkyColorModule.update()` and 60 s CSS transition |
| Insertion point | `app.js:1368-1373` (the reserved-hook comment block) |

### Stale-data dimming

| Lock | Value |
|---|---|
| Thresholds | weather 30 min, AQI 60 min, tide 12 h |
| Alerts | **exempt** (EC CORS fallback is always clock-stale by design) |
| Source | `AppState.meta.lastUpdate[feed]` (already written by fetchers since Phase 8) |
| Visual | CSS class `is-stale` -> `opacity: 0.6` |
| Fade-out duration | 30 s linear |
| Fade-in (recovery) duration | 8 s linear |
| Granularity | per-glyph, bound to source feed (weather temp + condition share feed) |
| Cadence | `StaleMonitor.update()` every 60 s |
| Refresher interaction | suspended during the 36 s refresher window; classes removed at refresher start; monitor resumes ≥60 s after exit |

### Cross-cutting

- `--bezel-accent` is exempt from golden-hour modulation. The boot-seeded structural-chrome accent is invariant.
- Observance > golden hour for the primary palette. In V1 there is no conflict (observances modulate primary-tier, golden hour modulates accent).
- Golden hour and the 03:00 refresher cannot overlap at Vancouver latitudes (earliest sunrise ~04:55, latest sunset ~21:25).
- Refresher cycle removes `is-stale` and resumes ≥60 s after the 36 s active window exits.

## 4. Architecture and Module Changes

### 4.1 `SkyColorModule` extensions

`SkyColorModule.update()` already runs every 60 s and is the single writer for `--type-primary`, `--type-secondary`, and `--type-tertiary`. Phase 23 extends it to also write `--type-accent` when the active face opts in.

New private helpers:

- `_goldenHourIntensity(altitudeDeg)` -- returns a number in `[0, 1]`. Raised-cosine envelope over the `[-6°, +6°]` window, peak at altitude = 0. Returns 0 outside the window.

  Signature: `_goldenHourIntensity: function(altitudeDeg) -> number`

- `_lerpRgb(rgbA, rgbB, t)` -- linear interpolation in RGB space. Each channel: `aChan + (bChan - aChan) * t`, clamped `[0, 255]`, integer-rounded for CSS output.

  Signature: `_lerpRgb: function([r,g,b], [r,g,b], t) -> [r,g,b]`

- `_hexToRgbCached(hex)` -- the existing `_hexToRgb` helper, called once at module init to convert `GOLDEN_HOUR_TARGET` and the user accent (boot-seeded by `ClockfaceRegistry.applyAccent`) into RGB tuples. Cached on the module to avoid reparsing every 60 s.

  Signature: `_hexToRgbCached: function(hex) -> [r,g,b]`

New constant on `SkyColorModule`:

```
GOLDEN_HOUR_TARGET: '#C9A14A'
GOLDEN_HOUR_WINDOW_DEG: 6
```

Insertion point at `app.js:1368-1373` (the reserved-hook comment block). The block is replaced with an active write path:

1. Read `ACTIVE_FACE.accentSkyTrack`. If `false`, return without writing `--type-accent`.
2. Compute `t = _goldenHourIntensity(AppState.sun.altitude)`.
3. If `t === 0`, write the user accent (clears any prior modulation cleanly).
4. Otherwise compute `accentRgb = _lerpRgb(userAccentRgb, goldenTargetRgb, t)` and write to `--type-accent`.

The existing CSS rule for `--type-accent` transitions over 60 s linear; that transition is unchanged and absorbs the 60 s recalc cadence into a continuous visual ramp.

### 4.2 New `StaleMonitor` module

A new top-level module in `app.js`, sibling to `LuminanceBreath` and `RefresherCycle`. Lives in the module list with those two.

Interface:

```
StaleMonitor = {
  init: function() -> void
  start: function() -> void
  stop: function() -> void           // for refresher suspension
  update: function() -> void          // every 60 s
  _suspend: function() -> void        // refresher-cycle entry
  _resume: function() -> void         // refresher-cycle exit + ≥60 s delay
  _applyClasses: function() -> void   // toggles is-stale per feed
}
```

Internal state:

- `_intervalId` -- the `setInterval` handle for the 60 s recalc.
- `_suspended` -- boolean; true while the refresher cycle is active.
- `_resumeTimerId` -- the deferred `setTimeout` handle used to re-enable after refresher exit (≥60 s).

Per-feed configuration table:

```
CONFIG.stale = {
  enabled: true,
  thresholds: {
    weather: 30 * 60 * 1000,    // 30 min
    aqi:     60 * 60 * 1000,    // 60 min
    tide:    12 * 60 * 60 * 1000 // 12 h
  },
  fadeOutSec: 30,
  fadeInSec: 8,
  recalcMs: 60 * 1000
}
```

Per-feed DOM selector table (lives on `StaleMonitor`, not in CONFIG, because it is implementation detail tied to face DOM):

| Feed | Selectors |
|---|---|
| `weather` | `#weather-glyph` (rotator slot; live only when the rotator surfaces weather), Mechanical `[data-complication="temp"]`, Departures `.dep-status-weather`, Departures `.dep-footer-weather`, Editorial `#ed-footer .ed-foot-cell[data-feed="weather"]`, Horizon `.hz-status-headline` |
| `aqi` | Mechanical `[data-complication="aqi"]`, Departures `.dep-footer-air`, Editorial `[data-feed="aqi"]`, Horizon `.hz-status-air` |
| `tide` | Mechanical `[data-complication="tide"]`, Editorial `[data-feed="tide"]`, Horizon `.hz-status-tide` |

Departures rows (`.dep-row`) are not tagged with `data-feed`. The five rows are sorted next-event by timestamp and reassigned on every tick, so no row is persistently bound to a feed. Weather staleness is instead signalled on the status cell (`.dep-status-weather`) and footer cells (`.dep-footer-weather`, `.dep-footer-air`), which are stable DOM targets.

Element discovery happens once per `update()`; each cycle re-queries the active face's nodes to handle the case where a Mechanical column rotation has moved which DOM node carries which feed. The selectors above assume Phase 23 also adds `data-feed` attributes on the Mechanical, Departures, and Editorial complication nodes; that work is folded into this phase.

Boot order: `StaleMonitor.init()` runs after `ClockfaceRegistry.applyFace()` so the active face's DOM is available. `StaleMonitor.start()` runs alongside `LuminanceBreath.start()` in the boot IIFE.

### 4.3 Fetcher integration

`AppState.meta.lastUpdate.{weather, aqi, tide}` is already written in the existing fetcher success paths:

- `WeatherModule.poll()` writes `AppState.meta.lastUpdate.weather` at `app.js:561`.
- `AirQualityModule.poll()` writes `AppState.meta.lastUpdate.aqi` at `app.js:630`.
- `TideModule.poll()` writes `AppState.meta.lastUpdate.tide` at `app.js:692`.

No changes are needed at these write points. Phase 23 only adds the reader (`StaleMonitor.update`).

Note: `AppState.meta.lastUpdate.alerts` is also written today (`app.js:812`), but the staleness rule does not consult it. The exemption is documented inline in `StaleMonitor` for posterity.

### 4.4 Face object additions

Each face object declares its opt-in stance for `accentSkyTrack`:

| Face | `accentSkyTrack` | Notes |
|---|---|---|
| `CalmFace` | `true` | opt in |
| `MechanicalFace` | `true` | opt in |
| `DeparturesFace` | `true` | opt in; bezel stays boot-gold via `--bezel-accent` invariant |
| `EditorialFace` | `true` | opt in; wire-now, V2-ready when font returns |
| `HorizonFace` | `false` | opt out (already declared in Phase 20; Phase 23 activates the flag) |

The flag's existence in Horizon is unchanged. Calm/Mechanical/Departures/Editorial gain a `true` declaration at the top of each face object, sibling to the `init`/`render`/`teardown` keys.

### 4.5 Refresher integration

`RefresherCycle.run()` already orchestrates a 36 s cycle: 3 s fade-in + 30 s hold + 3 s fade-out. Two single-line additions:

- At the start of `run()`, before the fade-in opacity write, call `StaleMonitor._suspend()`. This clears `is-stale` classes on all monitored elements and stops the 60 s recalc.
- After the fade-out completes (inside the existing `setTimeout` that calls `_schedule()` and `softReload()`), schedule a `setTimeout(StaleMonitor._resume, 60 * 1000)`. This ensures the monitor waits at least 60 s after the cycle exits before re-evaluating, so a stale-by-clock feed does not snap to dimmed the instant the refresher mid-gray clears.

## 5. CSS and Token Model

### 5.1 `is-stale` class

Added to `style.css`:

```css
.is-stale {
  opacity: 0.6;
  transition: opacity 30s linear;
}
.is-stale.is-recovering {
  opacity: 1.0;
  transition: opacity 8s linear;
}
```

`StaleMonitor` applies `is-recovering` for one tick when a feed transitions from stale to fresh, then removes both classes after the 8 s window. The two-class pattern is necessary because CSS cannot specify two transition durations for the same property; the `is-recovering` class swaps the duration for the recovery direction only.

### 5.2 `--bezel-accent` invariant

Confirmed unchanged. `--bezel-accent` is boot-seeded once from the accent palette and never touched by `SkyColorModule` or `ObservanceModule`. Phase 23 adds an inline comment at the `--bezel-accent` declaration to note that the golden-hour path explicitly does not write it.

### 5.3 No new CSS variables

Phase 23 does not introduce new custom properties. Golden-hour modulation reuses `--type-accent`. Stale dim is a class-level opacity change, not a token write.

### 5.4 Bundle impact

Estimated additions:

- `SkyColorModule` helpers and golden-hour write path: ~600 bytes.
- `StaleMonitor` module + CONFIG block: ~2.0 KB.
- `data-feed` attributes on three faces: ~400 bytes.
- CSS (`is-stale`, `is-recovering`): ~150 bytes.
- Face object `accentSkyTrack: true` declarations: ~150 bytes.

**Actual delta: app.js +179 lines (after simplification pass), style.css +13 lines.** Bundle shipped at **229 KB** -- back under the 250 KB cap. Phase 22 had brought the bundle to ~262 KB; Phase 23's simplification pass recovered significant headroom. The cap pressure noted in earlier phases is resolved for now.

## 6. Cadence and Interaction Matrix

| Phase 23 feature | SkyColorModule | RefresherCycle | ObservanceModule | DriftEngine | MacroShifter |
|---|---|---|---|---|---|
| Golden-hour accent | piggyback (writes inside `update()`) | no interaction (window-disjoint at Vancouver latitudes) | precedence: observances win primary palette; golden hour owns accent; no V1 conflict | no interaction (writes token; drift writes transform) | no interaction |
| Stale-data dimming | no interaction (different token surface; opacity vs colour) | suspended for 36 s active window; resume ≥60 s after exit | no interaction | no interaction (opacity multiplies element alpha; drift transforms element) | no interaction |

Both features write at most once per 60 s, and the two writes are independent.

## 7. Burn-In Posture

The eight burn-in layers (SDD Section 9) are evaluated against each Phase 23 feature.

| Layer | Mechanism | Golden hour | Stale dim |
|---|---|---|---|
| 1 | Per-element Perlin drift | unchanged | unchanged |
| 2 | Pixel-shift safety net | unchanged | unchanged |
| 3 | Kinetic slot churn | unchanged | unchanged |
| 4 | Macro position shifts | unchanged | unchanged |
| 5 | Sky-color modulation | **extends layer 5** (adds accent token to the modulated set on opt-in faces) | unchanged |
| 6 | Luminance breath | unchanged | unchanged |
| 7 | Daily refresher at 03:00 | unchanged (window-disjoint) | **interacts** (refresher clears stale classes) |
| 8 | Rendering hygiene | unchanged | unchanged |

Golden hour modulates accent on a daily cycle synchronized to the sun's altitude; the pixel under the accent glyph receives a slow daily color sweep through the `[-6°, +6°]` band twice (sunrise, sunset). This *adds* burn-in protection rather than removing any.

Stale dim is transient: a glyph either holds at opacity 1.0 (fresh) or transitions toward 0.6 and back. It does not pixel-camp at any new fixed position. The class is purely a transparency modifier; underlying pixel positions continue to be moved by drift and macro shifts. No layer regresses.

## 8. Acceptance Criteria

All testable on iPad Air M4 Safari 18, with the display at the indicated face.

1. With Calm active at sun altitude = -3°, `--type-accent` renders as `lerpRgb(userAccent, #C9A14A, 0.5)`. The interpolation factor is within 2% of the expected raised-cosine value (raised-cosine at alt = ±3°: `0.5 * (1 + cos(π·3/6)) = 0.5`).
2. With Calm active at sun altitude = +10°, `--type-accent` renders as the user-selected accent (the unmodified boot value).
3. With Horizon active at sun altitude = 0°, `--type-accent` renders as the user-selected accent (no modulation -- the opt-out).
4. With Mechanical, Departures, or Editorial active, the same modulation as Calm applies. With Departures specifically, `--bezel-accent` renders unchanged (the structural-chrome boot value) regardless of altitude.
5. With Calm active and `AppState.meta.lastUpdate.weather` set to 31 minutes ago, the weather complication element (whichever is currently rendered) carries the `is-stale` class within one 60 s `StaleMonitor.update()` tick.
6. After `is-stale` is applied, the element's computed opacity falls from 1.0 to 0.6 over 30 s, observed by sampling `getComputedStyle(el).opacity` at 5 s intervals.
7. When `AppState.meta.lastUpdate.weather` is updated to `Date.now()` (simulating a fresh poll), the class transitions to `is-recovering` for 8 s and the element returns to opacity 1.0 within that window. After the recovery completes, both `is-stale` and `is-recovering` are removed.
8. With AQI fresh and weather stale, only the weather glyph carries `is-stale`. The AQI glyph remains at opacity 1.0.
9. During the 03:00 refresher cycle, `StaleMonitor.update()` does not fire and no element carries `is-stale` for the 36 s active window. The monitor resumes ≥60 s after the fade-out completes.
10. Alerts: regardless of `AppState.meta.lastUpdate.alerts`, no alert-bearing element receives `is-stale`. Alerts are exempt.
11. Console log shows no errors or unhandled rejections from `SkyColorModule.update()` or `StaleMonitor.update()` over a 24 h endurance run.
12. Bundle size as measured by `wc -c app.js style.css lib/*.js` is within +5 KB of the pre-phase value.

## 9. Visual Review Notes

Risk areas to capture and verify:

- **Muddy mid-band RGB lerp.** When a cool blue user accent traverses to `#C9A14A` in straight RGB space, the path passes through desaturated mid-values. Capture frames at `t = 0, 0.25, 0.5, 0.75, 1.0` (sun altitudes ≈ +6°, +3°, 0°, -3°, -6°). Confirm none of the intermediates reads as washed-out or grey. If a midpoint reads muddy, escalate to a future revision considering HSL or LCH interpolation -- but do not change interpolation space inside this phase.
- **60% opacity legibility at 2-3 m.** Tertiary glyphs in stale state effectively render at ~0.25 alpha against the near-black background. Verify in the actual living room at the canonical viewing distance (2-6 m, warm lamp + ambient daylight, 40-60% display brightness). Stroke-mass for Manrope 200 is already near-hairline; at 0.25 effective alpha it may drop below the perceptual notch. If it does, escalate.
- **Multiple simultaneous stale fades.** Staggered apply was not implemented; multiple feeds crossing their threshold inside the same 60 s tick receive `is-stale` in lockstep. Visual review confirmed the lockstep outcome is gentler than feared -- the accent surface is small enough that simultaneous fades do not read as "the whole screen dimming." Filed as V2 polish (≥2 s stagger per feed). Not a blocker.
- **Sunrise vs sunset perceptual asymmetry.** Same accent target colour, different ambient. Capture both transitions.

Specific capture times (local Vancouver) for a sample day (2026-05-20, sunrise ≈ 05:23, sunset ≈ 20:55):

- 05:08 (altitude ≈ -3°, ascending) -- sunrise mid-band
- 05:23 (altitude ≈ 0°) -- sunrise peak
- 05:38 (altitude ≈ +3°, ascending) -- sunrise exit
- 12:00 (altitude ≈ +60°) -- baseline (no modulation expected)
- 20:40 (altitude ≈ +3°, descending) -- sunset entry
- 20:55 (altitude ≈ 0°) -- sunset peak
- 21:10 (altitude ≈ -3°, descending) -- sunset mid-band

Capture each face that opts in (Calm, Mechanical, Departures, Editorial) at altitude = 0° on the same day, plus Horizon as the opt-out control.

For stale-dim verification: developer console can manually rewind `AppState.meta.lastUpdate.weather` (e.g. `AppState.meta.lastUpdate.weather = Date.now() - 31*60*1000`) to trigger the transition without waiting for a real fetch failure. Capture at t = 0 s, 15 s, 30 s after class apply, then at t = 0 s, 4 s, 8 s after class removal.

## 10. Face-Design Checklist Items in Scope

Phase 23 is not face-level work, but items #5 and #6 of `docs/face-design-checklist.md` apply because the accent token is newly modulated:

- **Item #5 (Stroke mass and contrast under realistic light):** stale-dim opacity 0.6 on Manrope 200 tertiary glyphs at canonical viewing condition (2-6 m, warm lamp + ambient daylight, brightness 40-60%) must remain glanceable. This is the headline visual-review check.
- **Item #6 (The Auto Memory Doll question -- what does this say, and to whom?):** golden hour says "the light is changing; the accent is responding." Stale dim says "this fact is older than its usual freshness; it is not invalid, only quieter." Both messages are addressed to the person who lives with the display.

Items #1-#4 are face-level and do not apply to this phase.

## 11. Out of Scope

Explicit non-goals:

- **No observance / golden-hour conflict resolution.** In V1 the two never collide on the same token surface (observance owns primary, golden hour owns accent). When a V2 feature modulates accent for both reasons simultaneously, that phase will define the precedence rule.
- **No alerts dimming.** Alerts feed is exempt by lock.
- **No manual force-stale toggle.** Developer console can mutate `AppState.meta.lastUpdate.*` directly for testing; no UI affordance is added.
- **No telemetry on stale events.** The error trap from Phase 22 already captures fetch failures; stale state is derivable from those plus the threshold table.
- **No per-glyph staleness indicator (e.g. an italic state, a dot, a label).** Opacity is the only signal.
- **No interpolation-space change.** RGB-space lerp is locked. If visual review surfaces muddy intermediates, the follow-up is a separate phase considering HSL or LCH; not a hot-patch inside Phase 23.
- **No change to the existing 60 s `--type-accent` CSS transition.** Phase 23 piggybacks it.
- **No bundle-cap revisit as a separate task.** Phase 23's simplification pass brought the bundle back under the 250 KB cap (229 KB shipped). No reverting of prior work was required.

## 12. Open Questions

All three open questions are resolved by implementation.

1. **`data-feed` attribute placement on Editorial footer cells.** Resolved. Tide cell tagged `data-feed="tide"`, Air cell tagged `data-feed="aqi"`, Sun cell tagged `data-feed="weather"` (sunrise/sunset come from the Open-Meteo Forecast API, the same feed as weather). Almanac cell left untagged; almanac.json is static and never stale.
2. **Mechanical column rotation timing vs `StaleMonitor.update()`.** Resolved. `_setCellFeed()` reassigns `data-feed` during the column crossfade. After the fifth column's fade completes, `StaleMonitor.update()` is called defensively so the freshly-rotated DOM nodes pick up correct stale state immediately. Cost was ~80 bytes at one call site.
3. **Departures row weather binding.** Resolved. No Departures row carries weather; rows are dynamic next-event lists sorted by timestamp, not feed-bound. Weather staleness is bound to status/footer cells instead (`.dep-status-weather`, `.dep-footer-weather`, `.dep-footer-air`). This is the cleaner design and was adopted in implementation.

## 13. Phase Dependencies

- **Requires:** Phase 8 (`AppState.meta.lastUpdate` already written by all four fetchers). Phase 20 (`accentSkyTrack` reserved hook in `SkyColorModule.update()`). All V1 faces shipped.
- **Unblocks:** No downstream phase depends on Phase 23. Phase 21 (WKWebView shell) is independent and orthogonal.

## 14. Rollout

Standard pipeline.

- Implementation against this spec.
- Simplification pass: dead code, premature abstractions, real bug fixes only.
- Code review: burn-in regression check, spec adherence, architecture, bundle audit (confirm the +5 KB estimate or flag the overage).
- Visual review (required -- both features have a visible surface): capture the timed screenshots listed in Section 9 across all five faces, verify mid-band lerp readability and 60% opacity legibility.
- Docs update: `CLAUDE.md` "Architecture" section -- update Horizon's `accentSkyTrack: false` note to reflect that the flag is now actively-read (no longer "reserved V2 hook"). Add `StaleMonitor` to the module list. Update the eight-layer burn-in list inline note about layer 5 to mention accent modulation on opt-in faces.
- Merge to master with `git merge --no-ff` and tag `phase-23`.

Optional verification: endurance run on the branch (24 h minimum) to confirm no heap growth from `StaleMonitor` and no new error-trap entries from `SkyColorModule.update()`.

## 15. References

- `.claude/agent-memory/chihiro-ui-designer/phase23_design_language.md` -- source of truth for all locks.
- `app.js:345` -- `AppState.meta.lastUpdate` scaffold.
- `app.js:561`, `app.js:630`, `app.js:692`, `app.js:812` -- fetcher write points.
- `app.js:1333-1374` -- `SkyColorModule.update()` and the reserved-hook comment block where the golden-hour write goes.
- `app.js:1918-1971` -- `RefresherCycle.run()` and the suspend/resume call sites.
- `app.js:1973+` -- `LuminanceBreath` (sibling module pattern for `StaleMonitor`).
- `app.js:4162` -- `HorizonFace.accentSkyTrack: false` declaration.
- `docs/face-design-checklist.md` items #5 and #6.
- SDD v0.5 Section 9 (burn-in protection), Section 22 (acceptance criteria).
