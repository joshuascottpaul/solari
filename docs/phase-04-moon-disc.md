# Phase 4: Moon Disc SVG Rendering

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 4 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 4 replaces the placeholder circle in #moon-disc with a rendered moon showing the current phase. MoonModule gains a `renderDisc(el)` method that draws a globe (dim full circle) plus a lit-portion path computed from `AppState.moon.phase`. DisplayModule calls it when moon data is available.

## Goals

- MoonModule.renderDisc(el) draws the moon phase into the existing SVG element
- Lit portion shape matches the real lunar phase from AppState.moon.phase
- Globe outline visible at all phases (including new moon) as a faint circle
- SVG redrawn only when moon data updates (every 6h), not every tick
- Phase 3 temporary console.logs removed

## Non-Goals

- No sky color changes (Phase 5)
- No drift or position animation (Phase 7)
- No macro corner shifts (Phase 12)
- No earthshine, surface texture, or craters

## app.js Changes

### MoonModule.renderDisc(el)

Add to MoonModule, after the existing `_phaseName` method:

```js
renderDisc(el) {
  const phase = AppState.moon.phase;
  const R = 48;
  const cx = 50;
  const cy = 50;

  // Globe: always-visible faint disc
  // Lit portion: brighter path shaped by the terminator

  // Compute terminator x-offset.
  // phase 0 = new (no lit area), 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
  //
  // For 0-0.5 (waxing): lit area grows from right side
  //   sweepFrac goes from 0 to 1
  //   terminatorX = R * cos(sweepFrac * PI)  -- starts at R (no lit), ends at -R (full)
  //   The lit side is the RIGHT semicircle + terminator curve
  //
  // For 0.5-1 (waning): lit area shrinks from left side
  //   sweepFrac goes from 1 to 0
  //   terminatorX = R * cos(sweepFrac * PI)  -- starts at -R (full), ends at R (no lit)
  //   The lit side is the LEFT semicircle + terminator curve

  let sweepFrac, litSide;
  if (phase <= 0.5) {
    sweepFrac = phase * 2;           // 0 to 1
    litSide = 'right';
  } else {
    sweepFrac = (1 - phase) * 2;     // 1 to 0
    litSide = 'left';
  }

  const tX = R * Math.cos(sweepFrac * Math.PI);

  // Build the lit-portion path.
  // The path traces from top of disc to bottom, then back to top:
  //   1. Arc along the lit semicircle (half the disc outline)
  //   2. Arc back along the terminator curve (an elliptical arc)
  //
  // Top point: (cx, cy - R)   Bottom point: (cx, cy + R)
  //
  // Semicircle arc (top to bottom):
  //   For right-lit: sweep clockwise (sweep-flag 1)
  //   For left-lit:  sweep counter-clockwise (sweep-flag 0)
  //
  // Terminator arc (bottom back to top):
  //   An elliptical arc with rx = abs(tX), ry = R
  //   Sweep direction depends on sign of tX:
  //     tX > 0 means terminator bulges toward lit side (gibbous)
  //     tX < 0 means terminator bulges toward dark side (crescent)
  //     tX = 0 means straight line (quarter)

  const top = `${cx} ${cy - R}`;
  const bot = `${cx} ${cy + R}`;

  // Semicircle: always uses rx=R, ry=R
  const semiSweep = litSide === 'right' ? 1 : 0;
  const semiArc = `A ${R} ${R} 0 0 ${semiSweep} ${bot}`;

  // Terminator: elliptical arc from bottom back to top
  const absT = Math.abs(tX);
  // When tX > 0 and litSide is right, terminator curves right (toward lit) = gibbous
  // When tX < 0 and litSide is right, terminator curves left (toward dark) = crescent
  // Sweep flag: 1 if tX < 0 (crescent, concave inward), 0 if tX >= 0 (gibbous, convex outward)
  const termSweep = tX < 0 ? 1 : 0;
  const termArc = `A ${absT < 0.1 ? 0.1 : absT} ${R} 0 0 ${termSweep} ${top}`;

  const litPath = `M ${top} ${semiArc} ${termArc}`;

  // Skip rendering if phase is essentially new moon (nothing visible)
  const showLit = sweepFrac > 0.01;

  el.innerHTML =
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--type-primary)" opacity="0.06"/>` +
    (showLit
      ? `<path d="${litPath}" fill="var(--type-primary)" opacity="0.3"/>`
      : '');
}
```

**Algorithm walkthrough with concrete values:**

| Phase | Name            | sweepFrac | tX    | litSide | Result                            |
|-------|-----------------|-----------|-------|---------|-----------------------------------|
| 0.000 | New Moon        | 0.00      | 48.0  | right   | No lit path (sweepFrac < 0.01)    |
| 0.125 | Waxing Crescent | 0.25      | 33.9  | right   | Thin lit sliver on right          |
| 0.250 | First Quarter   | 0.50      | 0.0   | right   | Right half lit (straight terminator) |
| 0.375 | Waxing Gibbous  | 0.75      | -33.9 | right   | Right 3/4 lit (bulging terminator)  |
| 0.500 | Full Moon       | 1.00      | -48.0 | right   | Full disc lit                     |
| 0.625 | Waning Gibbous  | 0.75      | -33.9 | left    | Left 3/4 lit                      |
| 0.750 | Last Quarter    | 0.50      | 0.0   | left    | Left half lit                     |
| 0.875 | Waning Crescent | 0.25      | 33.9  | left    | Thin lit sliver on left           |

**Opacity values:**
- Globe circle: 0.06 (barely visible, gives shape at new moon)
- Lit path: 0.3 (enough to read the phase but still ambient)

### MoonModule._lastRenderedPhase

Add a tracking field to avoid redundant SVG redraws:

```js
_lastRenderedPhase: -1,
```

Add to MoonModule at the top, alongside `_intervalId`.

### DisplayModule Changes

Add `moonDisc` to the `_els` cache in `DisplayModule.init()`:

```js
moonDisc: document.getElementById('moon-disc')
```

Add to the end of `DisplayModule.render()`:

```js
// Moon disc: re-render only when phase value changes
if (AppState.moon.phase !== MoonModule._lastRenderedPhase && this._els.moonDisc) {
  MoonModule.renderDisc(this._els.moonDisc);
  MoonModule._lastRenderedPhase = AppState.moon.phase;
}
```

This check runs every tick (once per second) but only calls renderDisc when the phase value has actually changed. Since MoonModule.update() runs every 6h and rounds to three decimal places, redraws are rare.

### Boot Sequence

Remove the two Phase 3 console.log lines:

```js
(function boot() {
  DisplayModule.init();
  ClockModule.init();
  SunModule.init();
  MoonModule.init();
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  MoonModule.start();
})();
```

## Files Changed

| File     | Change                                                        |
|----------|---------------------------------------------------------------|
| app.js   | Add MoonModule.renderDisc(), MoonModule._lastRenderedPhase, update DisplayModule.init() and render(), remove Phase 3 console.logs |

No changes to index.html or style.css.

## Acceptance Criteria

1. Open localhost:8000; the moon SVG shows a visible phase shape (not just a circle)
2. The faint globe circle (opacity 0.06) is visible even when the moon is nearly new
3. The lit portion corresponds to the current real moon phase (compare with timeanddate.com)
4. Right side is lit during waxing (phases 0-0.5); left side during waning (0.5-1)
5. No console.log output from Phase 3 remains
6. In DevTools: `MoonModule._lastRenderedPhase` equals `AppState.moon.phase`
7. In DevTools: `document.querySelector('#moon-disc path')` returns an element (unless new moon)
8. In DevTools: manually set `AppState.moon.phase = 0.5; MoonModule._lastRenderedPhase = -1;` and wait one second; the moon shows a full disc
9. Repeat with phase values 0, 0.25, 0.75 to verify new, first quarter, last quarter
10. Time and date display still work correctly (Phase 2 not broken)

## References

- SDD Sections: 8.1 (MoonModule.renderDisc), 17 (layout), 19 (Phase 4)
- Phase 3 spec: `docs/phase-03-sun-moon-math.md`
