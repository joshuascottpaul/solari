# Handoff: Solari Clockface Picker (5 faces)

## Overview

A face-picker companion for the Solari living-room clock app. The user scrolls vertically through 5 fullscreen clock faces, optionally tweaks per-face settings, and clicks **Apply** to set the active face on the main display. Designed to be left running 24/7 on an iPad in a landscape orientation, viewed from across a room.

The picker is a single page; the active face is stored in `localStorage` so the main Solari app reads it on boot (and on storage events).

## About the Design Files

`clockface.html` in this folder is a **design reference** — a working HTML/React prototype showing the intended look, motion, and interaction of the picker and each of the 5 faces. It is not meant to be shipped directly.

Your task is to recreate these designs in the existing Solari codebase, reusing whatever component, state, and styling patterns the rest of that app already establishes. Treat the HTML as the spec for visuals and behavior; treat the existing app as the spec for code shape.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and motion. Recreate visually 1:1.

## Constraints (driving every decision)

1. **Legible from ~6 m** (across a living room). Time numerals are huge — between 200px and 360px on a 1180×820 stage. Don't shrink them when porting.
2. **Burn-in safe.** The display runs 24/7 on an OLED iPad. There is no element that occupies a fixed pixel rectangle for hours. Every face element drifts on multi-period sine functions (different periods per element so the composition never re-aligns), and avoids large solid-color filled blocks. Faces use type on near-black, never panel fills.
3. **iPad landscape**, 1180×820 design canvas, scaled to viewport via CSS transform from a fixed-size stage.

## Files in this handoff

- `clockface.html` — the prototype. Open it in a browser to see all 5 faces, the Tweaks panel, the dot navigation, and the Apply behavior.

The prototype is self-contained (one HTML file with inline React via Babel standalone). The patterns to lift into your codebase are described below.

## App / page structure

Vertical scroll-snap container, each face is a full-viewport `<section>` with `scroll-snap-align: start`. Right-edge dot navigation lets the user jump faces. The bottom toolbar shows: face name, tweaks toggle, Apply button.

When the user clicks **Apply**, write three keys to `localStorage` and the main app picks them up:

```js
localStorage.setItem('solari.clockface', faceId);                  // 'calm' | 'mechanical' | 'departures' | 'editorial' | 'horizon'
localStorage.setItem('solari.clockface.tweaks', JSON.stringify(t));// face-specific knobs (see below)
localStorage.setItem('solari.clockface.applied_at', String(Date.now()));
```

The main Solari app should read these on boot:

```js
const FACE   = localStorage.getItem('solari.clockface') || 'calm';
const TWEAKS = JSON.parse(localStorage.getItem('solari.clockface.tweaks') || '{}');
```

…and listen to `window.addEventListener('storage', …)` so the display updates live when the user clicks Apply on another tab/window.

## Shared design tokens

Background is near-black sky, type is sky-tinted off-white. There is one accent color (warm gold) used sparingly to pick out one element per face.

```css
--bg:              #0A0B0F   /* near-black sky background */
--bg-elev:         #16140f   /* very subtle elevation, used for split-flap bezels only */
--type-primary:    rgba(240, 235, 220, 0.92)
--type-secondary:  rgba(240, 235, 220, 0.62)
--type-tertiary:   rgba(240, 235, 220, 0.38)
--type-accent:     #F4C56C   /* warm gold — single accent */
--rule:            rgba(255, 255, 255, 0.10)
```

**Type stack**

| Use | Family | Weight |
|---|---|---|
| Calm headline / large numerals | Manrope | 200 |
| Mechanical / monospace data | JetBrains Mono | 400 |
| Editorial display | Instrument Serif (italic) | 400 |
| Horizon big time | Manrope | 200 |
| Small caps labels | JetBrains Mono | 400 (uppercase, letter-spacing 0.24–0.32em) |

**Stage dimensions:** 1180×820 design pixels, scaled via CSS `transform: scale(...)` to fit the viewport while preserving aspect ratio. Letterbox in `--bg`.

## Burn-in mitigation (CRITICAL — applies to every face)

Each visual element on every face is wrapped in a "drift" container whose transform is animated on a unique multi-sine schedule:

```js
function drift(seed, intensity, ampPxXY) {
  // returns { transform: `translate(dx px, dy px)` }
  // dx = sin(t / Px1) * sin(t / Px2) * ampX * intensity
  // dy = sin(t / Py1) * sin(t / Py2) * ampY * intensity
  // periods are coprime per element: 117, 89, 143, 101, 73 seconds
}
```

The amplitude is small (1–4 pixels) so it reads as still, not animated, but no element holds the same pixel for long. Periods are deliberately coprime so the global composition never repeats. The drift intensity is exposed as a per-face Tweak (`Off` / `Subtle` / `Normal` / `Restless`).

When you port this, **keep this system intact**. Do not replace it with a single global animation, do not let any persistent element have `position: fixed` without drift, and do not add solid filled cards/panels. Type on near-black is the rule.

Additionally on the Departures face: the headline time uses split-flap bezels with a thin 1px gold border at 22% alpha — small enough that the panels don't qualify as "filled blocks" for burn-in.

## The 5 faces

For each face: layout, type, colors, content, and the per-face Tweaks knobs the picker exposes. Coordinates are in design pixels relative to the 1180×820 stage; the entire stage scales together.

---

### 1. Calm (`id: 'calm'`)

The current Solari aesthetic, refined. Centered, vertical, monolithic.

**Layout**
- Time numerals: `H:MM` (12h or 24h per Tweak), centered horizontally, `top: 360px`, anchored by `translate(-50%, -50%)`.
- Below time at `top: 560px`: a single rotating "slot" line that cycles through complications every 8 seconds with a 600ms vertical wipe.
- Below slot at `top: 640px`: small day-of-week and date in tertiary type.

**Type**
- Time: Manrope 200, **280px**, `letter-spacing: -0.02em`, `line-height: 1`. The colon is the gold accent at 0.85 opacity.
- Slot: Manrope 300, **38px**, `letter-spacing: 0.04em`, secondary color.
- Date strip: Manrope 400, **14px**, uppercase, `letter-spacing: 0.32em`, tertiary color.

**Slot rotation content**
1. `WEATHER {tempC}° {CONDITION}`
2. `TIDE HIGH {height}m · {time}`
3. `MOON {phase} · {illum}%`
4. `AIR · AQI {value} {label}`
5. `{almanac.name} · {almanac.distance}`

**Tweaks**
- `timeFormat`: `12h` / `24h`
- `drift`: 0 / 0.5 / 1 / 2

---

### 2. Mechanical (`id: 'mechanical'`)

Mechanical-watch reference — monospace, tabular numerals, a 60-tick second rail across the top.

**Layout**
- Top of stage at `y: 60`: full-width row of 60 tick marks. Each tick is a 1px vertical line, 12px tall. The current second's tick is gold and 24px tall; ticks at 0/15/30/45 are slightly taller.
- Centered time at `top: 360`: `HH:MM:SS` (24h, seconds always live).
- Below at `top: 580`: a 5-column instrument grid of complications (Weather / Tide / Moon / Air / Almanac). Each column is a label/value stack in monospace.

**Type**
- Time: JetBrains Mono 200, **300px**, tabular, `letter-spacing: -0.02em`. The seconds are typeset 40% smaller than HH:MM and 0.62 opacity, baseline-aligned.
- Tick rail: 1px lines, no type.
- Instrument grid: labels uppercase **16px** mono `letter-spacing: 0.14em` tertiary; values primary, **22px** mono.

**Tweaks**
- `drift`: 0 / 0.5 / 1 / 2

---

### 3. Departures (`id: 'departures'`)

The split-flap board — the signature face, leaning into the Solari name.

**Layout (single horizontal header strip)**
- Header rule at `y: 50` left-to-right: "SOLARI · DEPARTURE BOARD" / "{station}" / "{day} {YYYY.MM.DD} · LOCAL".
- At `top: 140`, full-width row split into two halves:
  - **Left**: `HH:MM` set as four split-flap chars (each in a black bezel with a 1px gold border at 22% alpha, padded `4px 14px 2px`, radius 5px). Inner FlapChar is **96px** monospace gold, tabular, fixed `0.62em` width per char. The colon is **80px** gold at 0.85 opacity, sits between the two flap pairs.
  - **Right**: a 3-line uppercase mono status block at **13px**, `letter-spacing: 0.30em`:
    `NOW · {DAY3}` / `{condition} {temp}°` / `SUNSET IN 5H 15M` (or active countdown).

**Layout (the board)**
- At `top: 300`, a column-headed table: `TIME / EVENT / DETAIL / STATUS`, header in tertiary mono **11px** `letter-spacing: 0.30em`, `border-bottom: 1px solid var(--rule)`, padding-bottom 10px.
- At `top: 340`, vertical stack of departure rows. Each row is a 4-column grid `'120px 100px 1fr 140px'` aligned baseline:
  - **TIME**: tabular mono **22px** primary
  - **EVENT**: mono **14px** uppercase tertiary `letter-spacing: 0.24em`
  - **DETAIL**: mono **18px** secondary, may include the gold accent on key tokens
  - **STATUS**: tabular mono **14px** uppercase, color-coded (gold = imminent, primary = scheduled, tertiary = past)

Sample rows (use live data in production):
| Time | Event | Detail | Status |
|---|---|---|---|
| 20:47 | SUN | GOLDEN HOUR · SUNSET | IN 5H 15M |
| 04:22 | TIDE | HIGH 4.3M · POINT ATKINSON | ARRIVING |
| 22:14 | MOON | WAXING CRESCENT · 18% | RISING |
| 21:00 | METEOR | ETA AQUARIIDS · PEAK MAY 6 | PEAKED |
| 05:12 | SUN | SUNRISE · CIVIL DAWN 04:38 | TOMORROW |

- Footer strip at `bottom: 50`: `WEATHER · {condition} {temp}°` / `AIR · {label} ({value})` / `NO ALERTS` — mono **11px** `letter-spacing: 0.32em` tertiary, three columns space-between.

**Tweaks**
- `drift`: 0 / 0.5 / 1 / 2

---

### 4. Editorial (`id: 'editorial'`)

A magazine-cover treatment — large italic serif, asymmetric column composition, almanac voice.

**Layout**
- Time set huge and asymmetric on the LEFT column at `top: 200`: `HH:MM` (or `H:MM AM` per Tweak), Instrument Serif italic, **360px**, `line-height: 0.9`, `letter-spacing: -0.04em`. The colon is gold. AM/PM if used: Manrope 200, 56px, normal style, vertical-align top.
- Right column, top, at `right: 110, top: 220, width: 320`:
  - Tertiary mono kicker **14px** `letter-spacing: 0.32em`: `THIS EVENING`
  - Primary italic **64px** Instrument Serif: `{Weekday},`
  - Secondary italic **52px**: `{Month} {Day}.`
- Right column, mid, at `right: 110, top: 470, width: 360`: a flowing italic paragraph in Instrument Serif **26px** `line-height: 1.35`, secondary color, with key facts pulled into primary. Example copy:
  > *"**Twelve degrees**, partly cloudy. Golden hour beginning at **{goldenHour}**; the moon, a {phase.lower()} at {illum} percent."*
- Footer at `left: 100, right: 100, bottom: 90`: 4-column grid (Tide / Air / Sun / Almanac). Each column is a label (mono uppercase **12px** tertiary `letter-spacing: 0.22em`) over a value (Instrument Serif **22px** primary). Vertical 1px rules between columns; 1px top rule.

**Tweaks**
- `timeFormat`: `12h` / `24h`
- `drift`: 0 / 0.5 / 1 / 2

---

### 5. Horizon (`id: 'horizon'`)

The day, drawn. The face IS a diagram — a sun arc and a moon arc traced across the horizon line, with the live time written below. Both luminaries drift across the page over the course of the day, naturally rotating which pixels they occupy.

**Layout**
- Header strip at `top: 50, left/right: 80`, three-column space-between, mono **12px** `letter-spacing: 0.32em` uppercase tertiary:
  - Left: `HORIZON · 49.32°N 123.13°W`
  - Center: `{DAY3} · {YYYY.MM.DD}`
  - Right: `DAYLIGHT {Hh} {MM}M`
- An SVG covering the full stage (`viewBox: 0 0 1180 820`) draws the diagram:
  - **Horizon line** at `y: 440`, from x=80 to x=1100, `rgba(255,255,255,0.22)`, 1px.
  - **Hour ticks** below the horizon: 25 ticks at `y: 440` to `y: 446` (or `y: 454` at the 0/6/12/18/24 majors, with `strokeWidth: 1.2`). All `rgba(255,255,255,0.20)`.
  - **Sun arc**: dashed quadratic `M {srX} {hY} Q {sunMidX} {hY - arcH*1.6} {ssX} {hY}`, `arcH=240`, stroke `rgba(244,197,108,0.22)`, dash `2 7`. Drawn whether or not the sun is currently up.
  - **Moon arc**: same construction with its OWN moonrise/moonset `x` positions, lower amplitude (`arcH*0.62`), stroke `rgba(168,199,255,0.18)`, dash `1 6`.
  - **Sunrise / sunset notches**: 16px vertical ticks centered on the horizon at `srX` and `ssX`, `rgba(244,197,108,0.55)`.
  - **Moonrise / moonset notches**: 12px ticks at `mrX` and `msX`, `rgba(168,199,255,0.45)`.
  - **Sun glyph** (only when sun is up): radial-gradient glow `r=60` + filled disk `r=18` in `#F4C56C`. A 1px dashed gold drop-line connects the disk to the horizon.
  - **Moon glyph** (only when moon is up): radial-gradient glow `r=34` + faint full-disk outline `r=13` (so the dark side is suggested) + a phase-correct crescent path on top. The crescent is computed from `illumPct` and `waxing` so today's 18% waxing crescent reads as a thin sliver, not a generic dot.
  - **Now hairline**: vertical 1px line at `xAt(nowF)` from `y: 120` to `y: 468`, `rgba(244,197,108,0.45)`.
- Hour-label strip at `top: 472`: `00:00 / 06:00 / 12:00 / 18:00 / 24:00` in mono **11px** `letter-spacing: 0.24em` tertiary, x-positioned over each major tick.
- Sun/moon arc-terminal labels at `top: 498`: `☀ ↑ {sunrise}` and `☀ ↓ {sunset}` in gold-tinted mono **10px**, `☾ ↑ {moonrise}` and `☾ ↓ {moonset}` in blue-tinted mono **10px**, x-positioned over each notch.
- **Big time** bottom-left at `left: 90, top: 560`: Manrope 200, **220px**, tabular, `letter-spacing: -0.02em`. Colon is gold at 0.55 opacity.
- **Status block** bottom-right at `right: 90, top: 580`, right-aligned, mono **13px** `letter-spacing: 0.28em` uppercase, `line-height: 2`:
  - Headline (gold if day, secondary if night): `☀ DAY · {condition} {temp}°` / `☾ NIGHT · {condition} {temp}°`
  - `GOLDEN HOUR · {time}`
  - `MOON · {phase} {illum}%`
  - `TIDE · HIGH {h}m at {time}`
  - `AIR · AQI {value} {label}` (extra-faint)

**Computation**
```js
const parseHM = (s) => { /* parses "5:12 AM" or "20:47" → fraction of day [0..1] */ };
const sunriseF  = parseHM(sun.sunrise);
const sunsetF   = parseHM(sun.sunset);
const moonriseF = parseHM(moon.moonrise);
const moonsetF  = parseHM(moon.moonset);
const nowF      = (h*3600 + m*60 + s) / 86400;
const isDay   = nowF >= sunriseF && nowF <= sunsetF;
const moonUp  = moonsetF > moonriseF
  ? (nowF >= moonriseF && nowF <= moonsetF)
  : (nowF >= moonriseF || nowF <= moonsetF);  // wrap-around midnight
// Sun position on its arc: p = (nowF - sunriseF) / (sunsetF - sunriseF)
//   x = srX + p*(ssX - srX); y = horizonY - sin(p*π) * arcH
// Moon position: same with moonriseF/moonsetF and the lower-amplitude arcH.
```

**Phase-correct crescent path** (for the moon glyph)

```js
function moonPhasePath(cx, cy, r, illumFrac, waxing) {
  const w   = Math.abs(1 - 2 * illumFrac);  // terminator ellipse half-width factor
  const lit = waxing ? 1 : 0;               // 1 = lit limb on right
  if (illumFrac <= 0.5) {
    // crescent: outer arc on lit limb, terminator ellipse arc back
    return `M ${cx} ${cy-r} A ${r} ${r} 0 0 ${lit} ${cx} ${cy+r} `
         + `A ${r*w} ${r} 0 0 ${1-lit} ${cx} ${cy-r} Z`;
  }
  // gibbous: full-disk arc + terminator ellipse arc
  return   `M ${cx} ${cy-r} A ${r} ${r} 0 1 ${lit} ${cx} ${cy+r} `
         + `A ${r*w} ${r} 0 0 ${lit} ${cx} ${cy-r} Z`;
}
```

**Tweaks**
- `timeFormat`: `12h` / `24h`
- `drift`: 0 / 0.5 / 1 / 2

---

## Tweaks panel

A floating panel docked to bottom-right, ~320px wide, showing the active face's knobs. Each knob is a labeled segmented control (`Off / Subtle / Normal / Restless` for drift; `12h / 24h` for time format). Tweaks edits update the page live AND get persisted to `localStorage` only on **Apply**.

The picker page itself does not need to drive the main display — it only writes the `localStorage` keys listed at the top of this README. The main app reads them.

## Required `AppData` shape

The picker mocks data in a single `AppData` object so faces can be reviewed independently. The real Solari app's existing data sources should map onto the same shape:

```ts
type AppData = {
  weather: { tempC: number; condition: string; glyph?: string; }
  aqi:     { value: number; label: string; }
  tide:    { type: 'high'|'low'; heightM: number; timeStr: string; station: string; }
  moon:    { phase: string; illumPct: number; moonrise: string; moonset: string; waxing: boolean; glyph?: string; }
  sun:     { sunrise: string; sunset: string; goldenHour: string; civilDawn: string; }
  almanac: { name: string; kind: string; peak: string; distance: string; }
  station: string
}
```

Time strings accept both `5:12 AM` and `20:47` formats — `parseHM` handles either.

## Implementation notes for porting

- Keep the 1180×820 design canvas + scale-to-viewport approach. Don't try to make each face responsive at the pixel level — let CSS `transform: scale(...)` do it.
- Drive a single `now` clock at the app root and pass it into every face. Tick at 1Hz.
- The drift hook is just `setState` of a counter inside `requestAnimationFrame`; periods are in seconds, so converting elapsed ms → seconds and `Math.sin` is enough.
- All five faces should remount when the active face changes; no need to keep them mounted off-screen.
- For Apply: write the three `localStorage` keys, post a same-window `storage`-like event, and visually confirm with a brief checkmark animation in the toolbar. The main app picks up the change either on its `storage` listener or by re-reading on next tick.
- Do not introduce new color tokens or new fonts beyond the table above. The palette is intentionally tight.

## Out of scope

- Live data wiring to weather/tide/moon/air APIs (the picker uses mock values).
- Any face beyond the 5 included.
- Persisting tweaks on every keystroke — only on Apply.
