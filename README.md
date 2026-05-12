# Solari

An ambient display for iPad, showing time, weather, tides, moon phase, and astronomical events for Vancouver, BC.

Solari is a beautiful object first, a quiet sense of rhythm second, a source of facts third. It runs 24/7 in a living room, never demanding attention. Named after the Solari split-flap departure boards -- the kinetic split-flap transitions are the signature detail.

Live: [joshuascottpaul.github.io/solari](https://joshuascottpaul.github.io/solari/)

## What it shows

- Time and date
- Current weather and temperature
- Air quality index (AQI)
- Tide times (Point Atkinson, DFO)
- Moon phase disc
- Astronomical events: sunrise, sunset, civil twilight, golden hour
- Upcoming almanac events: meteor showers, eclipses
- Holiday and custom observances

## Key features

- 5 selectable clockfaces: Calm, Mechanical, Departures, Editorial, Horizon (V1 feature complete)
- Split-flap kinetic transitions on rotating content slots
- Sky-colored typography that shifts with sun altitude, weather, and observances
- 8-layer burn-in protection: Perlin drift, pixel-shift, kinetic churn, macro position shifts, sky-color modulation, luminance breath, daily 03:00 refresher cycle, and rendering hygiene
- Perlin-noise drift with coprime periods keeps every element in slow, independent motion

## Faces

Five faces ship with V1. Each is a distinct visual voice on the same underlying data engine.

### Calm

The default. Manrope 200 time at 165 px, single rotating slot, moon disc bottom-right. Quiet, centered, minimal.

![Calm face](screenshots/faces/calm.png)

### Mechanical

JetBrains Mono 300 tabular numerals at 236 px with gold colon, five-column complications grid (MOON / SUN / TEMP / AIR / TIDE) at the bottom, minute-arc hairline at the top.

![Mechanical face](screenshots/faces/mechanical.png)

### Departures

The Solari namesake. Split-flap board with gold-bezel hour-minute flap pair, five rotating event rows (sun/tide/moon/almanac), per-character cascade animation on row updates, header strip and footer chrome.

![Departures face](screenshots/faces/departures.png)

### Editorial

Magazine-cover composition. Large italic time on the left, mirrored right-column kicker and date block, rotating literary almanac paragraph that cross-fades every 32 seconds. Layout flips every 6 hours. Note: the Editorial picker card shows a placeholder in the current release; apply it via the URL method or `localStorage` instead (see below).

![Editorial face](screenshots/faces/editorial.png)

### Horizon

Astronomy as truth. Full-stage SVG diagram with sun and moon arcs, 25 hour ticks, phase-correct moon crescent, dipping behind the horizon line at rise and set. Gold hairline cursor sweeps left-to-right over 24 hours. Big time in the bottom corner, status block right.

![Horizon face](screenshots/faces/horizon.png)

## Changing faces

### Open the picker

Three ways to reach the picker:

| Method | How |
|---|---|
| Long-press (iPad) | Hold the time numerals or moon disc for 600 ms |
| Direct URL | Navigate to `https://joshuascottpaul.github.io/solari/clockface.html` |
| localStorage (advanced) | Open DevTools console and run `localStorage.setItem('solari.clockface', 'mechanical')` then reload |

A short single tap on the moon disc or time numerals opens the version overlay instead. Hold longer (600 ms) for the picker.

Valid face IDs for the localStorage method: `calm`, `mechanical`, `departures`, `editorial`, `horizon`.

### Using the picker

Scroll vertically through the five face cards. The toolbar at the bottom shows the face name and a counter.

Tap the Tweaks button (bottom-right) to open the tweaks panel:

| Tweak | Options |
|---|---|
| Accent color | gold, sky, sage, paper |
| Drift intensity | off, subtle, normal, restless |
| Mechanical: time format | 12h, 24h |
| Horizon: time format | 12h, 24h |
| Departures: bezel opacity | slider, 0.0 to 0.4 |

Tap Apply (gold button) to save. The main display reloads automatically within 2.4 seconds and a toast confirms the change.

On desktop you can navigate with ArrowUp / ArrowDown, j / k, or PageUp / PageDown. Escape closes the tweaks panel.

### First-run defaults

On first visit, localStorage is empty. The display defaults to Calm with gold accent and normal drift intensity.

## Technology

Vanilla HTML, CSS, and JavaScript. No framework, no build step, no API keys. Total size: approximately 256 KB uncompressed (V1 complete, all 5 faces shipped). Deployed as static files via GitHub Pages.

Vendored libraries in `lib/` (both MIT-licensed): SunCalc for astronomical calculations, Perlin for noise generation.

External data comes from free public APIs: Open-Meteo (weather, AQI), DFO IWLS (tides), Environment Canada (weather alerts). The live DFO tides feed currently returns errors; tides are served from a static fallback at `data/tides.json`, refreshed weekly by a GitHub Actions workflow.

## Run locally

```
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. Use Safari on iPad for final verification.

## Deploy

Push to `main`. GitHub Pages serves the files directly -- no build step required.

## iPad setup

1. Open `https://joshuascottpaul.github.io/solari/` in Safari.
2. Tap Share, then Add to Home Screen.
3. Open the app from the home screen (enables full-screen, hides browser chrome).
4. Plug in the iPad and set it in a fixed landscape position.

### Recommended settings

| Setting | Value |
|---|---|
| Auto-Lock | Never |
| Auto-Brightness | On |
| Reduce White Point | On, approximately 25% |
| True Tone | On |
| Display brightness | 40-60% |

### Monthly maintenance

Power-cycle the iPad for 30 minutes once a month to allow full thermal rest.

## Getting updates

A single tap on the moon disc (Calm) or the time numerals (Mechanical) shows the version overlay: build hash and deploy date.

When a new version is live on GitHub Pages, the overlay shows "UPDATE AVAILABLE · TAP TO RELOAD". Tap it to force-fetch fresh files. This is the recommended way to update a running iPad install.

### Service worker caching

On first visit, all assets are cached for offline use. Subsequent visits may be served from the cache until the version overlay detects a new commit. If you need to force a fresh load during development:

- Safari: Develop menu, Empty Caches, then reload
- Chrome: DevTools, right-click the reload button, Empty Cache and Hard Reload

## Sleep and wake

The clock self-corrects after the iPad wakes from sleep. The rotator resumes where it left off. All burn-in protection layers (drift, macro shifts, luminance breath) resume automatically. No manual intervention is needed.

## Configuration

Edit the `CONFIG` object at the top of `app.js`. Key options:

| Key | Default | Description |
|---|---|---|
| `display.timeFormat` | `'12h'` | `'12h'` or `'24h'` |
| `display.showSeconds` | `false` | Show seconds in time display |
| `observances.customObservances` | `[]` | Add custom dates with name, glyph, palette, and treatment |
| `refresher.enabled` | `true` | Enable daily 03:00 burn-in refresher |
| `luminanceBreath.enabled` | `true` | Enable 30-minute luminance oscillation |

To add a custom observance, uncomment and edit the example entry in `CONFIG.observances.customObservances`.

## License

Source code is MIT-licensed. Vendored libraries (`lib/suncalc.js`, `lib/perlin.js`) are also MIT-licensed.
