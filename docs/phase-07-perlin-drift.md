# Phase 7: Perlin Drift

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 7 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 7 adds DriftEngine, a single requestAnimationFrame loop that applies Perlin-noise-based positional drift to all five visible elements. This is burn-in protection Layer 1 (SDD Section 9.2). A pixel-shift safety net (Layer 2) adds a small random offset every 6 minutes as a backstop against Perlin dwell.

## Goals

- DriftEngine runs a single rAF loop that drives independent drift for time, date, slot A, slot B, and moon
- Each element samples 1D Perlin noise at a unique phase offset; coprime periods prevent re-synchronization
- DriftEngine writes CSS custom properties (`--time-dx`, `--time-dy`, etc.) already defined in style.css
- Pixel-shift safety net applies an additional random offset (+-4px) to all elements every 6 minutes
- No DOM reads, no layout triggers; only `setProperty()` calls on `document.documentElement.style`
- The rAF loop coexists with ClockModule's setTimeout tick; they are independent

## Non-Goals

- No macro position shifts (Phase 12)
- No kinetic transitions (Phase 9)
- No luminance breath (Phase 14)
- No daily refresher (Phase 13)
- No user-configurable drift parameters

## lib/perlin.js

Vendor or create a minimal 1D Perlin noise module. The file exposes a single global function.

**Interface:**

```js
// Returns a value in [-1, 1] for any float input.
// Deterministic: same input always produces same output.
function perlin1d(x) { ... }
```

**Requirements:**

- Classic 1D gradient noise with smooth interpolation (quintic fade curve preferred over linear)
- Deterministic permutation table (no randomized seed; all Solari instances produce identical drift)
- Under 2 KB unminified
- No dependencies
- MIT license header

**Implementation sketch (classic 1D Perlin):**

```js
// lib/perlin.js -- 1D Perlin noise, MIT license
(function() {
  // Permutation table (256 entries, doubled to avoid modulo wrapping)
  var p = new Uint8Array(512);
  var perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,
    140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,
    247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,
    57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,
    74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,
    60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,
    65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,
    200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,
    52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,
    207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,
    119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
    129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,
    218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,
    81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,
    4,184,204,176,115,121,50,45,127,4,150,254,138,236,205,93,
    222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  for (var i = 0; i < 256; i++) p[i] = p[i + 256] = perm[i];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x) { return (hash & 1) === 0 ? x : -x; }

  window.perlin1d = function(x) {
    var xi = Math.floor(x) & 255;
    var xf = x - Math.floor(x);
    var u = fade(xf);
    return lerp(grad(p[xi], xf), grad(p[xi + 1], xf - 1), u);
  };
})();
```

The `grad` function uses a single bit to select +x or -x, producing output in approximately [-1, 1]. The quintic fade curve (`6t^5 - 15t^4 + 10t^3`) produces smooth second-derivative-continuous motion.

## app.js Changes

### CONFIG Addition

Add `drift` to CONFIG, after `refresh`:

```js
drift: {
  time:  { ampX: 80, ampY: 60, periodSec: 117 },
  date:  { ampX: 24, ampY: 14, periodSec: 89  },
  slotA: { ampX: 18, ampY: 14, periodSec: 143 },
  slotB: { ampX: 18, ampY: 14, periodSec: 101 },
  moon:  { ampX: 60, ampY: 40, periodSec: 73  },
  pixelShiftIntervalMin: 6,
  pixelShiftAmplitude: 4
}
```

Periods are coprime (117, 89, 143, 101, 73). The five elements never re-synchronize.

### DriftEngine

Place after SkyColorModule, before DisplayModule.

```js
const DriftEngine = {
  _entries: [],
  _startTime: 0,
  _rafId: null,
  _rootStyle: null,

  // Pixel-shift safety net (Layer 2)
  _shiftDx: 0,
  _shiftDy: 0,
  _shiftIntervalId: null,

  // Phase offsets: large primes so no two elements share a noise region.
  // Each element gets a unique X offset and Y offset.
  _phaseOffsets: {
    time:  { x: 0,   y: 100 },
    date:  { x: 200, y: 300 },
    slotA: { x: 400, y: 500 },
    slotB: { x: 600, y: 700 },
    moon:  { x: 800, y: 900 }
  },

  register(cssPrefix, params) {
    // cssPrefix: 'time' | 'date' | 'slot-a' | 'slot-b' | 'moon'
    // params: { ampX, ampY, periodSec }
    // configKey: 'time' | 'date' | 'slotA' | 'slotB' | 'moon'
    const configKey = cssPrefix.replace('-', '').replace('a', 'A').replace('b', 'B');
    // Cleaner: pass configKey explicitly
    this._entries.push({
      cssPrefix: cssPrefix,
      ampX: params.ampX,
      ampY: params.ampY,
      periodSec: params.periodSec,
      phaseX: this._phaseOffsets[params._key].x,
      phaseY: this._phaseOffsets[params._key].y
    });
  },

  start() {
    this._rootStyle = document.documentElement.style;
    this._startTime = performance.now() / 1000;

    // Register all five elements
    const d = CONFIG.drift;
    this._entries = [];

    const elements = [
      { css: 'time',   key: 'time',  cfg: d.time  },
      { css: 'date',   key: 'date',  cfg: d.date  },
      { css: 'slot-a', key: 'slotA', cfg: d.slotA },
      { css: 'slot-b', key: 'slotB', cfg: d.slotB },
      { css: 'moon',   key: 'moon',  cfg: d.moon  }
    ];

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var phase = this._phaseOffsets[el.key];
      this._entries.push({
        cssPrefix: el.css,
        ampX: el.cfg.ampX,
        ampY: el.cfg.ampY,
        periodSec: el.cfg.periodSec,
        phaseX: phase.x,
        phaseY: phase.y
      });
    }

    // Start pixel-shift safety net
    this._shiftIntervalId = setInterval(
      () => this._pixelShift(),
      d.pixelShiftIntervalMin * 60 * 1000
    );

    // Start rAF loop
    this._loop();
  },

  _loop() {
    var t = performance.now() / 1000 - this._startTime;
    var root = this._rootStyle;
    var shiftX = this._shiftDx;
    var shiftY = this._shiftDy;

    for (var i = 0; i < this._entries.length; i++) {
      var e = this._entries[i];
      var sampleX = t / e.periodSec + e.phaseX;
      var sampleY = t / e.periodSec + e.phaseY;
      var dx = e.ampX * perlin1d(sampleX) + shiftX;
      var dy = e.ampY * perlin1d(sampleY) + shiftY;
      root.setProperty('--' + e.cssPrefix + '-dx', dx.toFixed(1) + 'px');
      root.setProperty('--' + e.cssPrefix + '-dy', dy.toFixed(1) + 'px');
    }

    this._rafId = requestAnimationFrame(() => this._loop());
  },

  _pixelShift() {
    var amp = CONFIG.drift.pixelShiftAmplitude;
    this._shiftDx = (Math.random() * 2 - 1) * amp;
    this._shiftDy = (Math.random() * 2 - 1) * amp;
  }
};
```

**How the loop works, frame by frame:**

1. `t` = seconds since DriftEngine.start()
2. For each element, compute `sampleX = t / periodSec + phaseX` and `sampleY = t / periodSec + phaseY`
3. `dx = ampX * perlin1d(sampleX) + pixelShiftDx`
4. `dy = ampY * perlin1d(sampleY) + pixelShiftDy`
5. Write `--{prefix}-dx` and `--{prefix}-dy` via `setProperty()`
6. CSS transforms in style.css (`translate(var(--time-dx), var(--time-dy))`) handle the actual movement

**Performance notes:**

- 5 elements x 2 Perlin samples = 10 noise evaluations per frame. Each is ~10 arithmetic operations. Negligible.
- 10 `setProperty()` calls per frame. No DOM reads, no layout forced. The browser batches these with the rAF paint.
- `toFixed(1)` avoids sub-pixel precision beyond 0.1px, which is the browser's rendering resolution anyway.

**Phase offsets explained:**

The offsets (0, 100, 200, ..., 900) place each element's noise sample at a distant point on the Perlin gradient. Because Perlin noise has a period of 256 on the permutation table, offsets separated by 100 sample from uncorrelated regions. The X and Y offsets for each element are also separated by 100, preventing diagonal-only motion.

**Pixel-shift safety net:**

Every 6 minutes, `_pixelShift()` picks a random offset in [-4, +4] for both X and Y. This offset is added to every element's drift. If Perlin noise happens to dwell near zero (statistically unlikely but possible), the pixel shift ensures no element stays fixed for more than 6 minutes.

### Boot Sequence

```js
(function boot() {
  DisplayModule.init();
  ClockModule.init();
  SunModule.init();
  MoonModule.init();
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  SkyColorModule.update();
  MoonModule.start();
  WeatherModule.start();
  DriftEngine.start();           // NEW: begins rAF loop + pixel-shift timer
})();
```

DriftEngine.start() goes last. It has no dependencies on AppState and begins writing CSS vars immediately.

## index.html Changes

Add the perlin.js script before suncalc.js:

```html
<script src="lib/perlin.js"></script>
<script src="lib/suncalc.js"></script>
<script src="app.js"></script>
```

## Files Changed

| File       | Change                                                                     |
|------------|----------------------------------------------------------------------------|
| lib/perlin.js | New file: 1D Perlin noise function (~50 lines, MIT)                    |
| index.html | Add `<script src="lib/perlin.js">` before suncalc.js                      |
| app.js     | Add CONFIG.drift, DriftEngine module, update boot sequence                 |

No CSS changes. The drift offset vars and transforms are already in style.css from Phase 1.

## Acceptance Criteria

1. On load, all five elements begin drifting visibly within 1 second
2. Time element drifts the most (up to 80px horizontal). Moon is second. Date and slots drift subtly.
3. No two elements move in unison; directions and speeds are clearly independent
4. `getComputedStyle(document.documentElement).getPropertyValue('--time-dx')` returns a non-zero px value that changes each frame
5. After 6 minutes, the pixel-shift offset changes (inspect `DriftEngine._shiftDx`; it should be non-zero after the first interval fires)
6. All motion is slower than a slow exhale; no element visually "jumps" between frames
7. `perlin1d(0.5)` returns the same value on every call (deterministic)
8. CPU usage on iPad Air M4 Safari stays under 5% with drift running (rAF + 10 noise samples + 10 setProperty calls per frame)
9. All previous phase functionality (clock, date, moon disc, sky color, weather) still works
10. No errors in console during normal operation

## References

- SDD Sections: 8.1 (DriftEngine), 9.2 (burn-in Layer 1 + Layer 2), 18 (CONFIG.drift), 19 (Phase 7)
- Phase 6 spec: `docs/phase-06-weather.md`
