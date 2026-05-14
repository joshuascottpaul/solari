# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Solari** is an ambient display web app designed to run 24/7 on an iPad Air M4 in a living room. It shows time, date, weather, tides, air quality, moon phase, and astronomical/holiday observances for Vancouver, BC. Named after the Solari split-flap departure boards -- the kinetic typography transitions are the signature interaction.

The authoritative specification is `2026 04 27 10 15 PM - SDD - Ambient Display V0.5.docx` (frozen for implementation). All design decisions are finalized there.

## Technology and Constraints

- **Vanilla HTML/CSS/JS only.** No frameworks, no build step, no npm. Source files = deployed files.
- **No API keys.** All external data comes from free, public, CORS-enabled APIs (Open-Meteo, DFO IWLS, EC weather.gc.ca).
- **No backend.** Static hosting on GitHub Pages. Client-only architecture.
- **Total bundle target: 250 KB uncompressed.**
- **Target: iPad Air M4 Safari, landscape, always-on.** Must run continuously for months.
- Two runtime files: `app.js` (CONFIG, AppState, all modules, render loop) and `style.css`. A single-purpose picker page (`clockface.html`, `clockface.js`) is the justified third JS file; the always-on display never loads it. `data.js` exists as a placeholder but is not loaded.
- Two vendored libs in `lib/`: `suncalc.js` (MIT, ~9 KB) and `perlin.js` (MIT, ~2 KB).
- `sw.js`: network-first service worker, registered at boot, enables cache busting for Safari Add-to-Home-Screen installs.

## Architecture

**Single shared AppState object** -- fetchers and calculators mutate it directly; a single `DisplayModule.render()` reads it and updates the DOM. No pub-sub, no event bus.

**Module structure** (all in app.js):
- `ClockModule` -- self-correcting setTimeout tick, updates state.time/state.date every second
- `WeatherModule` / `AirQualityModule` / `TideModule` / `AlertModule` -- poll external APIs on independent intervals (15m / 30m / 6h / 15m)
- `SunModule` / `MoonModule` -- astronomical calculations via SunCalc, update every 5m / 6h
- `SkyColorModule` -- computes CSS color vars from sun altitude + weather + observance palette; all four tokens (`--type-primary`, `--type-secondary`, `--type-tertiary`, `--type-accent`) modulate on a 60s linear transition; `--type-tertiary` modulation was a pre-existing V0 condition made visible by Phase 17
- `ObservanceModule` -- holiday/observance system with two treatment levels (major, light) + custom dates
- `RotatorModule` / `KineticType` -- single slot cycling through complications (watch-face analogy) with split-flap transitions; reads `AppState.alertPreempt` each tick to preempt with alert headlines
- `DriftEngine` -- single rAF loop driving Perlin-noise drift for all elements (coprime periods)
- `MacroShifter` -- relocates time (6 positions, every 3h) and moon (4 corners, every 6h)
- `RefresherCycle` -- 03:00 daily LCD burn-in mitigation (fade to #404040 for 30s)
- `LuminanceBreath` -- CSS `--lum-mod` oscillates +/-15% on 30-min sine wave
- `ResilienceManager` -- fetch wrapper with retry/backoff + localStorage caching
- `DisplayModule` -- reads AppState, writes DOM; called every tick; ends each tick with `ACTIVE_FACE.render(AppState, TWEAKS)`
- `VersionOverlay` -- tap moon disc to see build hash and deploy date; polls GitHub API hourly; shows "UPDATE AVAILABLE · TAP TO RELOAD" when a new commit is detected on master
- `Stage` -- creates the 1180x820 fixed canvas, computes `--stage-scale` via CSS transform on boot and resize
- `ClockfaceRegistry` -- face lookup, normalizes localStorage values, falls back to `calm` on invalid input; applies accent and driftIntensity tweaks on boot
- `CalmFace` -- Phase 16 face object; `init/render/teardown` contract; `render()` is a no-op in Phase 16 (shipped DisplayModule handles Calm DOM writes); placeholder for Phases 17-20 faces in the same shape
- `MechanicalFace` -- Phase 17 face object; first face with real (non-no-op) `render(state, tweaks)` logic; builds a five-column complications grid (TEMP, AIR, TIDE, MOON, SUN at y=620), HH:MM time at 236 px JetBrains Mono 300, and a 1 px minute-arc hairline at y=265; time alternates two homes every 3h; grid columns rotate every 6h via deterministic permutation; `tweaks.byFace.mechanical.timeFormat` controls 24h/12h
- `DeparturesFace` -- Phase 18 face object; split-flap board with five data rows, per-character KineticType cascade (110 ms stagger), gold bezel borders on the flap-pair headline time, per-row Perlin drift via five independent `departureRow0..4` sub-channels; `tweaks.byFace.departures.flapBezelOpacity` controls bezel opacity
- `EditorialFace` -- Phase 19 face object; magazine-cover composition with Cormorant Garamond 300 italic time at 360 px, paired right-column block (kicker + weekday + month-day), 8-template literary paragraph selected by `(period, weather-state, moon-phase)` tuple hash cycling every 32 s with 1200 ms cross-fade, 4-column footer of facts, italic observance dropline on light observance days; time and right-column block shift as a paired composition every 6 h via `CONFIG.macroShift.timeIntervalHoursByFace` and `CONFIG.macroShift.rightBlockHomesByFace`; drift amplitude overridden per-face via `CONFIG.driftClasses.timeByFace`; `tweaks.byFace.editorial.timeFormat` controls 24h/12h; `DriftEngine._elementSizesByFace` clamps drift geometry per face; cross-fade race guarded by `_fadeTimerId`; `ObservanceModule._builtIn` entries carry a new `name_long` field consumed by the dropline; Cormorant Garamond 300 italic font link was removed from `index.html` and `clockface.html` in a user-directed V1 rollback; Editorial falls back to Georgia on both the main display and picker (V2 follow-up; see todo.md)
- `HorizonFace` -- Phase 20 face object (final V1 face); astronomy-truth face; full-stage 1180x820 SVG with dashed sun and moon arcs from rise to set, live discs on their arcs, 25 hour ticks below the horizon line at y=440, and a 1 px gold hairline cursor at the current minute; big-time at 220 px Manrope 200 sits at a single fixed home (`left: 140, top: 560`) -- Phase 20.1 (2026-05-13) collapsed the original two-home macro shift to a single home after a measured-width audit showed the 685 px block caused left-clip at Home A and overlap with the status block at Home B; status block (MOON, TIDE, AIR, SUN) relocated to top-right (`top: 140, right: 60`) in Phase 20.1, pairing with the header strip; `accentSkyTrack = false` prevents `SkyColorModule` from modulating `--type-accent` so the gold hairline and big-time colon stay fixed across all sky-altitude bands; SVG `clipPath` at `y >= horizonY` clips sun and moon discs as they dip behind the horizon at rise/set; `alwaysUp` and `alwaysDown` edge cases handled; `tweaks.byFace.horizon.timeFormat` controls 24h/12h; drift uses `sun` (101 s) and `horizon` (109 s, bumped from 101 s for coprime separation) channels; `window.HorizonFace` exported for picker preview; picker long-press target is `#horizon-time`; cross-fade classes (`is-fade-out`, `is-fade-in`) and `timeTransitionStyleByFace.horizon = 'fade'` are preserved as a reserved hook but are unreachable in 20.1 because `MacroShifter` no longer schedules a shift for Horizon (`timeIntervalHoursByFace.horizon = 0`)
- `CONFIG.faceActiveKeys` -- face-keyed table mapping each face ID to its set of active drift channel keys; `DriftEngine.start()` reads this instead of hard-coding a channel list; adding Phase 20 requires only a new table entry
- `--bezel-accent` CSS variable -- structural-chrome accent seeded once at boot from the accent palette; never written by `SkyColorModule` or `ObservanceModule`; used only by the Departures flap-pair bezel border (opted out of sky modulation via a separate CSS var, not the `--type-accent` path)
- `MoonModule` AppState extensions -- `AppState.moon.moonrise`, `.moonset`, `.alwaysUp`, `.alwaysDown` added in Phase 18 for Departures row data; reused by Phase 20 (Horizon); computed via `SunCalc.getMoonTimes` on the existing 6 h poll cadence
- `accentSkyTrack` face property -- a face may declare `accentSkyTrack: false` at the top level of its face object; `SkyColorModule.update()` reads this flag and skips the `--type-accent` CSS write when the active face opts out; modulation of `--type-primary`, `--type-secondary`, and `--type-tertiary` continues unchanged; Horizon is the only V1 face to set this; the hook is reserved for future V2 faces
- `CONFIG.macroShift.timeTransitionStyleByFace` -- per-face table (`'translate'` default, `'fade'` for Horizon); when set to `'fade'`, `MacroShifter._applyTime()` cross-fades the time element to its new home (400 ms fade-out, instant position swap at opacity 0, 400 ms fade-in) rather than using a CSS translate transition; introduced alongside Phase 19's `timeIntervalHoursByFace`
- `CONFIG.driftClasses.horizon.periodSec` -- set to 109 s (bumped from the Phase 16 reserved value of 101 s to avoid a coprime collision with the `sun` channel at 101 s); 109 is the next prime above 101 and is pairwise coprime with all other drift periods (117, 89, 143, 79, 73)
- `HorizonFace._moonPhasePath()` -- internal helper; generates a phase-correct crescent SVG path from `AppState.moon.phase` and `AppState.moon.terminatorAngle`; formula from chihiro's prototype (`design_handoff_clockface/clockface.html:739-751`)
- `SOLARI_PICKER` boot guard -- `clockface.html` sets `window.SOLARI_PICKER = true` before loading `app.js`; the boot IIFE returns early, skipping all fetchers, timers, render loop, and storage-event listener; face class objects remain available to `clockface.js` via `window.MechanicalFace` / `window.CalmFace` / `window.DeparturesFace` / `window.EditorialFace` / `window.HorizonFace` exports; `clockface.js` reads `ACCENT_PALETTE` via an explicit dual-source comment matching the pattern established in Phase 17
- Storage listener (boot) -- any write to `solari.clockface`, `solari.clockface.tweaks`, or `solari.clockface.applied_at` triggers `location.reload()`; face changes are configuration events, not live state
- Picker (`clockface.html` + `clockface.js`) -- face selection, accent and driftIntensity tweaks, live-drift card preview; long-press 600 ms on moon disc (Calm), `#mech-time` (Mechanical), `#dep-time` (Departures), `#ed-time` (Editorial), or `#horizon-time` (Horizon) opens it; single tap remains VersionOverlay; Mechanical, Departures, Editorial, and Horizon cards mount live face renders; Calm card remains hand-built mock

## Phase Status

V0 complete (Phases 1-15). V1 ships 4 faces (Calm, Mechanical, Departures, Horizon); Editorial deferred (code merged but webfont and picker live-render rolled back per user direction, V2).

- [x] Phase 1: Static layout
- [x] Phase 2: Live clock and date
- [x] Phase 3: Sun and moon math
- [x] Phase 4: Moon disc SVG rendering
- [x] Phase 5: Sky color from sun altitude
- [x] Phase 6: Weather fetch + color modulation
- [x] Phase 7: Perlin drift
- [x] Phase 8: AQI + tides (DFO returns 404; fallback data/tides.json active)
- [x] Phase 9: Rotator + kinetic split-flap transitions
- [x] Phase 10: EC alerts (CORS blocked; fallback data/alerts.json active)
- [x] Phase 11: Almanac + time-until-next
- [x] Phase 12: Macro position shifts
- [x] Phase 13: Daily refresher cycle + 24h soft reload
- [x] Phase 14: Luminance breath
- [x] Phase 15: Holiday/observance system
- [x] Phase 16: Clockface foundation -- Stage primitive, face registry, CalmFace, picker page, storage contract, accent and driftIntensity tweaks (V1 opening phase)
- [x] Phase 17: Mechanical face -- MechanicalFace with five-column complications grid, JetBrains Mono 300, minute-arc hairline, per-face macro shifts, SOLARI_PICKER boot guard, picker live preview
- [x] Phase 18: Departures face -- DeparturesFace with five data rows, per-character split-flap cascade, gold bezel borders, five independent departureRow drift sub-channels, face-aware DriftEngine activeKeys, MoonModule moonrise/moonset extensions
- [~] Phase 19: Editorial face -- partial (code shipped; Cormorant Garamond webfont and picker live-render rolled back per user direction; falls back to Georgia; V2 restore)
- [x] Phase 20: Horizon face -- HorizonFace with full-stage 1180x820 SVG diagram, sun and moon arcs, 25 hour ticks, phase-correct crescent, 1 px gold hairline cursor, 220 px Manrope 200 big-time, accentSkyTrack opt-out, CONFIG.macroShift.timeTransitionStyleByFace (cross-fade path retained as reserved hook; macro shift for Horizon disabled in Phase 20.1)

## Key Design Rules

- **"If it feels like a dashboard, it has failed."** -- beauty first, rhythm second, facts third.
- No more than 5 visible elements at any time. No icons, widgets, panels, or boxes.
- All motion must be slower than a slow exhale. Anything faster is a bug.
- Background is always near-black (#0a0a0a, never #000).
- Type weight 200 (Manrope extra-light). Color lives in the type, not in blocks.
- Typography: Calm family = Manrope 200 (selected in CONFIG, others available: editorial, mechanical, almanac).

## Burn-In Protection

Eight independent layers -- defense in depth. See SDD Section 9 for full details:
1. Per-element Perlin drift (coprime periods: 117s, 89s, 143s, 73s, 101s, 109s, 79s, 61s)
2. Pixel-shift safety net (+-4px every 6 min)
3. Kinetic transitions churn slot pixels every 28s/36s
4. Macro position shifts (time every 3h, moon every 6h)
5. Sky-color modulation (continuous)
6. Luminance breath (30-min sine wave)
7. Daily refresher at 03:00 (30s mid-gray hold)
8. Rendering hygiene (near-black bg, weight 200, no solid blocks)

## External APIs

- **Open-Meteo Forecast** (weather + sun): `api.open-meteo.com/v1/forecast` -- Vancouver coords, 15-min poll
- **Open-Meteo Air Quality**: `air-quality-api.open-meteo.com/v1/air-quality` -- 30-min poll
- **DFO IWLS Tides** (Point Atkinson): `api-iwls.dfo-mpo.gc.ca` -- 6h poll, currently returning 404; fallback to `data/tides.json` (refreshed weekly by GitHub Actions)
- **EC Weather Alerts** (Metro Vancouver): `weather.gc.ca/rss/battleboard/bcrm30_e.xml` -- 15-min poll, CORS blocked; fallback to `data/alerts.json`
- **CORS status:** DFO and EC feeds both fail CORS. DFO tides are now kept current via a weekly GitHub Actions workflow (`.github/workflows/refresh-tides.yml`). EC alerts remain on a static fallback.
- **GitHub Actions:** `refresh-tides.yml` runs every Monday at 06:00 UTC, fetches 90 days of predictions from DFO IWLS, and auto-commits updated `data/tides.json`. No-ops cleanly if the fetch fails or the data is unchanged.

## Development

No build step. Open `index.html` in a browser or serve locally:

```
python3 -m http.server 8000
```

Test on iPad Safari for final verification. As of Phase 16, the main display renders into a fixed 1180x820 `#stage` element that is centred and scaled via CSS transform (`--stage-scale`) to fit any viewport; the only remaining vw/vh consumer is the version overlay.

## Phase Delivery Pipeline

Standard agent flow for shipping a phase, in order:

1. **ripley** -- review handoff or scope, surface architectural risks and decisions needing input
2. **chihiro** -- resolve design decisions (typography, colour, motion, layout)

   > **Face-level work:** chihiro consults `docs/face-design-checklist.md` at design lock before finalizing any face that introduces or revises a clockface.
   > **Face-level work (uncertainty / revision / new primitive):** invoke **motoko** for operational coherence review before signing off; address any named drift before handing off to ariadne.

3. **ariadne** -- draft phase spec from locked decisions; revise if open questions need resolution

   > **Face-level work:** ariadne embeds the checklist's measured widths, stated fulcrum, viewing-distance assumption, reference vocabulary, light verification, and Auto Memory Doll paragraph directly into the phase spec.
   > **Face-level work (if motoko reviewed):** address motoko's named drift in the spec, or document explicitly why the user chose to ship with it.

4. **misaka** -- implement against the spec
5. **mikasa** -- simplify the implementation (dead code, premature abstractions, real bug fixes only)
6. **hermione** -- code review (burn-in, spec adherence, architecture, bundle audit)
7. **shizuku** -- update docs (CLAUDE.md, README.md, spec status)
8. **leia** -- commit, push, open PR if required

Optional verification before merge or push to production:

- **clarice** -- live-page diagnostic (console errors, render verification, picker functionality)
- **coraline** -- visual review (screenshots, calm aesthetic, "no dashboard" check, accent palette; for face-level work, re-verify checklist items 1 and 2)
- **sentry** -- endurance run (heap, DOM stability, burn-in oscillation, fetch health)

Triggered review (face-level only):

- **motoko** -- operational coherence; verifies that spec claims and running system agree; distinct from chihiro (who makes design choices), coraline (who verifies pixels), and the checklist (which verifies declared values); invoked by chihiro on uncertainty, face revision, or system-primitive introduction -- not a mandatory pipeline step

Phase work happens on a feature branch (e.g. `phase-17-mechanical`) so master stays at the last verified state until merge. Verification agents run on the branch before merge.

### Context discipline

After leia successfully commits or pushes a phase, suggest `/compact` to the user in the main session. Pipeline-driven phases accumulate tool output (diffs, network logs, file lists) that is no longer load-bearing once the work is shipped; compacting between phases keeps context lean for the next one. Skip the suggestion if nothing actually shipped (clean tree, aborted run).

### Git workflow

Direct merges to master are the authorized workflow for this project. The Solari repo is single-developer with an AI-agent review pipeline (hermione gates every merge), so self-approved PRs would re-stamp work the pipeline already gated. Master auto-deploys to GitHub Pages, so a bad merge is visible within minutes -- faster feedback than any CI gate currently provides.

Pattern per phase: feature branch (`phase-N-name`), pipeline runs (ripley/chihiro/ariadne/misaka/mikasa/hermione/shizuku), then leia merges to master with `git merge --no-ff` and pushes. Leia's security warnings about direct-to-master pushes are advisory only and should be acknowledged but not redirected; this is the established and intended pattern.

Every phase merge is tagged (`phase-16` through `phase-N`) so reverts have a clear target: `git reset --hard phase-19` or `git revert <merge-sha>`. Backfilled tags exist for the V1 phases (16-20).

Revisit this when any of: a second human contributor joins, real CI is added (bundle-size check, lint, Safari smoke test), or branch protection becomes desirable.

## Repository Structure

```
index.html
style.css
app.js          # CONFIG + AppState + all modules + render loop
clockface.html  # picker page (single-purpose configuration; never loaded by the display)
clockface.js    # picker logic: face registry rendering, tweaks, apply, live preview drift
sw.js           # network-first service worker for Safari Add-to-Home-Screen
data.js         # placeholder (not loaded)
lib/
  suncalc.js    # vendored, MIT, ~9 KB
  perlin.js     # project-authored, MIT, ~2 KB
data/
  almanac.json  # meteor showers, eclipses 2026-2030
  tides.json    # tide data, refreshed weekly via GitHub Actions (DFO IWLS)
  alerts.json   # fallback alert data (EC CORS blocked)
manifest.json
icons/          # empty (falls back to screenshot icon)
docs/           # phase implementation specs and design notes
  face-design-checklist.md        # discipline doc for face-level work; consulted at design lock, embedded in spec, verified at visual review
  phase-16-clockface-foundation.md
  phase-17-mechanical-face.md
  phase-18-departures-face.md
  phase-19-editorial-face.md
  phase-20-horizon-face.md
  phase-20.1-horizon-overlap-fix.md
.github/
  workflows/
    refresh-tides.yml   # weekly cron: fetches and commits DFO tide predictions
```

## Style Notes

- No em dash -- use commas, semicolons, or separate sentences
- Brief, factual, calm tone in docs and comments
- Code should be legible and modular: any module understandable in under 5 minutes (NFR-9)

Active TODO items live in `todo.md`.
