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
- Two vendored libs in `lib/`: `suncalc.js` (MIT, ~3 KB) and `perlin.js` (MIT, ~2 KB).
- `sw.js`: network-first service worker, registered at boot, enables cache busting for Safari Add-to-Home-Screen installs.

## Architecture

**Single shared AppState object** -- fetchers and calculators mutate it directly; a single `DisplayModule.render()` reads it and updates the DOM. No pub-sub, no event bus.

**Module structure** (all in app.js):
- `ClockModule` -- self-correcting setTimeout tick, updates state.time/state.date every second
- `WeatherModule` / `AirQualityModule` / `TideModule` / `AlertModule` -- poll external APIs on independent intervals (15m / 30m / 6h / 15m)
- `SunModule` / `MoonModule` -- astronomical calculations via SunCalc, update every 5m / 6h
- `SkyColorModule` -- computes CSS color vars from sun altitude + weather + observance palette
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
- Storage listener (boot) -- any write to `solari.clockface`, `solari.clockface.tweaks`, or `solari.clockface.applied_at` triggers `location.reload()`; face changes are configuration events, not live state
- Picker (`clockface.html` + `clockface.js`) -- face selection, accent and driftIntensity tweaks, live-drift card preview; long-press 600 ms on moon disc opens it; single tap remains VersionOverlay

## Phase Status

V0 complete (Phases 1-15). V1 in progress.

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
- [ ] Phase 17: Mechanical face (tabular Manrope/JetBrains Mono, minute-arc replaces second rail)
- [ ] Phase 18: Departures face (split-flap row layout, gold border bezels)
- [ ] Phase 19: Editorial face (Cormorant Garamond italic time, almanac voice paragraph)
- [ ] Phase 20: Horizon face (sun and moon arc diagram with hour ticks)

## Key Design Rules

- **"If it feels like a dashboard, it has failed."** -- beauty first, rhythm second, facts third.
- No more than 5 visible elements at any time. No icons, widgets, panels, or boxes.
- All motion must be slower than a slow exhale. Anything faster is a bug.
- Background is always near-black (#0a0a0a, never #000).
- Type weight 200 (Manrope extra-light). Color lives in the type, not in blocks.
- Typography: Calm family = Manrope 200 (selected in CONFIG, others available: editorial, mechanical, almanac).

## Burn-In Protection

Eight independent layers -- defense in depth. See SDD Section 9 for full details:
1. Per-element Perlin drift (coprime periods: 117s, 89s, 143s, 101s, 73s)
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
- **DFO IWLS Tides** (Point Atkinson): `api-iwls.dfo-mpo.gc.ca` -- 6h poll, currently returning 404; fallback to `/data/tides.json` (refreshed weekly by GitHub Actions)
- **EC Weather Alerts** (Metro Vancouver): `weather.gc.ca/rss/battleboard/bcrm30_e.xml` -- 15-min poll, CORS blocked; fallback to `/data/alerts.json`
- **CORS status:** DFO and EC feeds both fail CORS. DFO tides are now kept current via a weekly GitHub Actions workflow (`.github/workflows/refresh-tides.yml`). EC alerts remain on a static fallback.
- **GitHub Actions:** `refresh-tides.yml` runs every Monday at 06:00 UTC, fetches 90 days of predictions from DFO IWLS, and auto-commits updated `data/tides.json`. No-ops cleanly if the fetch fails or the data is unchanged.

## Development

No build step. Open `index.html` in a browser or serve locally:

```
python3 -m http.server 8000
```

Test on iPad Safari for final verification. Layout uses vw/vh units for 1180x820 (11") and 1366x1024 (13") logical viewports.

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
  phase-16-clockface-foundation.md
.github/
  workflows/
    refresh-tides.yml   # weekly cron: fetches and commits DFO tide predictions
```

## Style Notes

- No em dash -- use commas, semicolons, or separate sentences
- Brief, factual, calm tone in docs and comments
- Code should be legible and modular: any module understandable in under 5 minutes (NFR-9)
