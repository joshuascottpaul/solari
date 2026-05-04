# Phase 5: Sky Color from Sun Altitude

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 5 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 5 adds SkyColorModule, which reads `AppState.sun.altitude` and writes `--type-primary`, `--type-secondary`, and `--type-accent` as CSS custom properties on `:root`. Typography color shifts continuously through the day via smooth interpolation between six altitude bands. CSS `@property` declarations enable the 60s linear transitions already declared in style.css.

## Goals

- SkyColorModule.update() computes colors from sun altitude and sets CSS vars
- Colors interpolate smoothly between altitude bands (no visible snapping)
- --type-secondary is derived dynamically from --type-primary at 62% opacity
- --type-accent remains fixed at #F4C56C
- @property declarations registered in style.css for transition support
- Update runs on SunModule's 5-minute interval (plus once at boot)

## Non-Goals

- No weather-based color modulation (Phase 6)
- No observance palette overrides (Phase 15)
- No luminance breath / --lum-mod interaction (Phase 14)
- No ambient light sensor adaptation

## style.css Changes

Add `@property` declarations at the top of the file, before the `:root` block. These register the custom properties as `<color>` types so CSS transitions can interpolate them.

```css
@property --type-primary {
  syntax: '<color>';
  inherits: true;
  initial-value: #F0EBDC;
}

@property --type-secondary {
  syntax: '<color>';
  inherits: true;
  initial-value: rgba(240, 235, 220, 0.62);
}

@property --type-accent {
  syntax: '<color>';
  inherits: true;
  initial-value: #F4C56C;
}
```

No other CSS changes. The `:root` transition declaration from Phase 1 (`transition: --type-primary 60s linear, ...`) now takes effect with these registrations.

## app.js Changes

### SkyColorModule

Add after MoonModule, before DisplayModule:

```js
const SkyColorModule = {
  // Altitude bands: [minAlt, maxAlt, [r, g, b]]
  // Ordered from lowest altitude to highest.
  _bands: [
    [-90, -18, [154, 160, 200]],  // astronomical night: #9AA0C8
    [-18,  -6, [122, 134, 176]],  // deep twilight:      #7A86B0
    [ -6,   0, [232, 155, 111]],  // civil twilight:      #E89B6F
    [  0,   6, [244, 197, 108]],  // sunrise/sunset:      #F4C56C
    [  6,  30, [240, 235, 220]],  // morning/afternoon:   #F0EBDC
    [ 30,  90, [242, 242, 242]]   // midday:              #F2F2F2
  ],

  update() {
    const alt = AppState.sun.altitude;
    const rgb = this._altitudeToRGB(alt);
    const root = document.documentElement.style;

    root.setProperty('--type-primary',
      `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    root.setProperty('--type-secondary',
      `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.62)`);
    // --type-accent stays fixed; later phases override it
  },

  _altitudeToRGB(alt) {
    const bands = this._bands;

    // Clamp to band range
    if (alt <= bands[0][0]) return bands[0][2];
    if (alt >= bands[bands.length - 1][1]) return bands[bands.length - 1][2];

    // Find which band the altitude falls in
    for (let i = 0; i < bands.length; i++) {
      const [lo, hi, rgb] = bands[i];
      if (alt >= lo && alt < hi) {
        // t = position within this band, 0 at lo edge, 1 at hi edge
        const t = (alt - lo) / (hi - lo);

        // Interpolate toward the next band's color.
        // At t=0 (band floor) use this band's color.
        // At t=1 (band ceiling) use next band's color.
        const next = (i < bands.length - 1) ? bands[i + 1][2] : rgb;
        return this._lerp(rgb, next, t);
      }
    }

    // Fallback (should not reach)
    return bands[4][2];
  },

  _lerp(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
};
```

### Interpolation algorithm

The `_altitudeToRGB` function finds the band containing the current sun altitude, computes a linear parameter `t` (0 at the band's lower edge, 1 at its upper edge), and interpolates in RGB space toward the next band's color.

Concrete example at altitude -3 (civil twilight, band [-6, 0]):

```
t = (-3 - (-6)) / (0 - (-6)) = 3/6 = 0.5
bandColor  = [232, 155, 111]  (civil twilight)
nextColor  = [244, 197, 108]  (sunrise/sunset)
result     = [238, 176, 110]  (midpoint blend)
```

Full altitude-to-color table:

| Altitude | t within band | Interpolated RGB    | Visual |
|----------|---------------|---------------------|--------|
| -25      | clamped       | (154, 160, 200)     | muted indigo |
| -18      | 0.00          | (154, 160, 200)     | muted indigo |
| -12      | 0.50          | (138, 147, 188)     | indigo-violet blend |
| -6       | 0.00          | (122, 134, 176)     | deep blue-violet |
| -3       | 0.50          | (177, 145, 144)     | twilight-amber blend |
| 0        | 0.00          | (232, 155, 111)     | warm amber-rose |
| 3        | 0.50          | (238, 176, 110)     | amber-gold blend |
| 6        | 0.00          | (244, 197, 108)     | warm gold |
| 18       | 0.50          | (242, 216, 164)     | gold-cream blend |
| 30       | 0.00          | (240, 235, 220)     | warm cream |
| 60       | 0.50          | (241, 239, 231)     | cream-white blend |
| 90       | clamped       | (242, 242, 242)     | cool near-white |

### Boot Sequence

Call `SkyColorModule.update()` once at boot after SunModule.start(), and piggyback on SunModule's interval so sky color always updates immediately after sun position:

```js
(function boot() {
  DisplayModule.init();
  ClockModule.init();
  SunModule.init();
  MoonModule.init();
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  SkyColorModule.update();         // initial color from current altitude
  MoonModule.start();
})();
```

Update `SunModule.update()` to call `SkyColorModule.update()` at the end:

```js
update() {
  try {
    // ... existing sun position code ...
    AppState.meta.lastUpdate.sun = now.getTime();
    SkyColorModule.update();       // recompute colors after altitude changes
  } catch (e) {
    // Continues on next interval
  }
}
```

This avoids a separate setInterval. SkyColorModule updates exactly when its input (sun altitude) changes: every 5 minutes and once at boot.

## Files Changed

| File      | Change                                                                   |
|-----------|--------------------------------------------------------------------------|
| style.css | Add three @property declarations before :root block                      |
| app.js    | Add SkyColorModule object, call from SunModule.update() and boot()       |

## Acceptance Criteria

1. Open localhost:8000; time and date text are colored (not the Phase 1 default cream at all times)
2. In DevTools, `getComputedStyle(document.documentElement).getPropertyValue('--type-primary')` returns an rgb() value
3. In DevTools, `getComputedStyle(document.documentElement).getPropertyValue('--type-secondary')` returns an rgba() value with 0.62 alpha
4. Manually test altitude bands: `AppState.sun.altitude = -20; SkyColorModule.update();` sets primary to muted indigo (154, 160, 200)
5. Manually test interpolation: `AppState.sun.altitude = -3; SkyColorModule.update();` produces a blended color, not a band edge
6. Manually test midday: `AppState.sun.altitude = 45; SkyColorModule.update();` sets primary near (241, 239, 231)
7. After changing altitude, wait 60s; observe the text color smoothly transitioning (no snap)
8. Moon disc uses var(--type-primary) so its appearance shifts with the sky color
9. --type-accent remains #F4C56C regardless of altitude
10. Time and date display still work correctly (Phases 2-4 not broken)

## References

- SDD Sections: 8.1 (SkyColorModule), 10.1 (palette by altitude), 10.3 (compute order), 17.1 (CSS vars), 19 (Phase 5)
- Phase 4 spec: `docs/phase-04-moon-disc.md`
