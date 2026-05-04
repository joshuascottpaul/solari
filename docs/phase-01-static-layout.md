# Phase 1: Static Layout, Hardcoded Data, Dark Page

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 1 of 15                     |
| Status    | Approved                     |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 1 creates 6 files that render a static dark page with 5 hardcoded elements (time, date, moon disc, slot A, slot B) at their SDD-specified positions. No JavaScript executes. No animation is visible. This is the foundation every subsequent phase builds on.

## SDD Requirements Addressed

- **Section 17**: DOM structure (`#display`, `#time`, `#date`, `#moon-disc`, `#slot-a`, `#slot-b`, `#refresher-overlay`)
- **Section 17.1**: CSS custom properties and transition declarations
- **Section 12**: Moon disc SVG placeholder
- **Section 15**: PWA manifest
- **Section 2.3**: Design philosophy (near-black bg, weight 200, no dashboard feel)

## Goals

- All 5 elements visible at correct positions on 1180x820 viewport
- Background is `#0a0a0a`, all type is Manrope weight 200
- All positioning routed through CSS custom properties (ready for drift/shift in later phases)
- Transition declarations present per SDD 17.1 (no visible effect yet)
- PWA manifest in place
- Total source under 10 KB

## Non-Goals

- No JavaScript execution (app.js and data.js are comment-only placeholders, not loaded)
- No live data, no API calls
- No animation, no drift, no transitions firing
- No icon files (manifest references them; browser falls back gracefully)
- No `@property` registration (Phase 5)

## Proposed Design

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@200&display=swap">
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="style.css">
  <title>Solari</title>
</head>
<body>
  <main id="display">
    <svg id="moon-disc" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="var(--type-primary)" opacity="0.18"/>
    </svg>
    <div id="time">
      <span class="hours">2</span><span class="colon">:</span><span class="minutes">32</span><span class="ampm">PM</span>
    </div>
    <div id="date">
      <span class="glyph"></span><span class="text">Wednesday &middot; April 27</span>
    </div>
    <div id="slot-a" class="slot">
      <span class="label">SUNSET</span><span class="value">8:32 PM</span>
    </div>
    <div id="slot-b" class="slot">
      <span class="label">CLEAR</span><span class="value">18&deg;</span>
    </div>
    <div id="refresher-overlay"></div>
  </main>
</body>
</html>
```

No `<script>` tags in Phase 1.

### style.css

#### Custom Properties (on `:root`)

```css
:root {
  /* SDD 17.1 colors */
  --bg: #0a0a0a;
  --type-primary: #F0EBDC;
  --type-secondary: rgba(240, 235, 220, 0.62);
  --type-accent: #F4C56C;
  --lum-mod: 1;

  /* Position vars (SDD 17) */
  --time-x: 50%;  --time-y: 47%;
  --moon-x: 91%;  --moon-y: 14%;
  --date-x: 50%;  --date-y: 58%;
  --slot-a-x: 30%; --slot-a-y: 78%;
  --slot-b-x: 70%; --slot-b-y: 78%;

  /* Drift offsets -- all 0 until Phase 7 */
  --time-dx: 0px;  --time-dy: 0px;
  --moon-dx: 0px;  --moon-dy: 0px;
  --date-dx: 0px;  --date-dy: 0px;
  --slot-a-dx: 0px; --slot-a-dy: 0px;
  --slot-b-dx: 0px; --slot-b-dy: 0px;

  /* SDD 17.1: @property needed for custom property transitions (Phase 5) */
  transition: --type-primary 60s linear, --type-secondary 60s linear, --type-accent 60s linear;
}
```

#### Reset and Body

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  overflow: hidden;
  background: var(--bg);
  font-family: 'Manrope', sans-serif;
  font-weight: 200;
  -webkit-font-smoothing: antialiased;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

#display { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
```

#### Typography Sizing

| Element         | CSS selector     | font-size | Approx at 1180px |
|-----------------|------------------|-----------|-------------------|
| Time digits     | `#time`          | `14vw`    | 165px             |
| Colon           | `#time .colon`   | `11.5vw`  | 136px             |
| AM/PM           | `#time .ampm`    | `3.2vw`   | 38px              |
| Date            | `#date`          | `2.0vw`   | 24px              |
| Slot label      | `.slot .label`   | `1.6vw`   | 19px              |
| Slot value      | `.slot .value`   | `2.4vw`   | 28px              |

#### Positioning

Every element uses absolute positioning with the same transform pattern:

```css
transform: translate(-50%, -50%) translate(var(--[id]-dx), var(--[id]-dy));
```

| Selector     | left             | top              | color                  |
|--------------|------------------|------------------|------------------------|
| `#time`      | `var(--time-x)`  | `var(--time-y)`  | `var(--type-primary)`  |
| `#date`      | `var(--date-x)` [50%]  | `var(--date-y)` [58%]  | `var(--type-secondary)`|
| `#moon-disc` | `var(--moon-x)` [91%]  | `var(--moon-y)` [14%]  | n/a (fill in SVG)      |
| `#slot-a`    | `var(--slot-a-x)` [30%]| `var(--slot-a-y)` [78%]| see below              |
| `#slot-b`    | `var(--slot-b-x)` [70%]| `var(--slot-b-y)` [78%]| see below              |

All elements: `position: absolute; text-align: center;`

#### Element-Specific Rules

```css
#time { color: var(--type-primary); line-height: 1; transition: left 60s ease-in-out, top 60s ease-in-out; }
#time .ampm { vertical-align: top; margin-left: 0.1em; }

#date { color: var(--type-secondary); letter-spacing: 0.04em; }

#moon-disc {
  width: 12vw; height: 12vw;
  transition: left 60s ease-in-out, top 60s ease-in-out;
}

.slot { text-align: center; }
.slot .label {
  display: block; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--type-secondary);
}
.slot .value { display: block; color: var(--type-primary); }

#refresher-overlay {
  position: fixed; inset: 0;
  background: #404040; opacity: 0;
  pointer-events: none; z-index: 100;
}
```

### manifest.json

```json
{
  "name": "Solari",
  "short_name": "Solari",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### app.js

```js
// app.js -- Solari application modules. Loaded from Phase 2 onward.
```

### data.js

```js
// data.js -- Solari data fetchers and astronomical math. Loaded from Phase 2 onward.
```

Neither file is referenced by a `<script>` tag in Phase 1.

## Phase Dependencies

None. This is Phase 1.

## Acceptance Criteria

1. `python3 -m http.server 8000` from repo root; open `localhost:8000`
2. Browser resized to 1180x820: all 5 elements visible at specified positions
3. Background is `#0a0a0a` (verify via DevTools computed style, not eyeball)
4. All text renders Manrope weight 200 (check DevTools computed font)
5. Time color is `#F0EBDC`; date and slot labels are `rgba(240, 235, 220, 0.62)`
6. No scrolling occurs; long-press does not select text
7. Console is clean (no errors, no scripts loaded)
8. Moon disc SVG renders upper-right, circle visible at 18% opacity
9. Refresher overlay exists in DOM but is invisible (`opacity: 0`)
10. Total source of all 6 files is under 10 KB
11. After implementation: chihiro reviews visual design, coraline checks both iPad viewports (1180x820 and 1366x1024)

## References

- SDD Sections: 2.3, 12, 15, 17, 17.1
- CLAUDE.md (repo root)
- Plan: `iridescent-painting-wozniak.md`
