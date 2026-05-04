# Phase 3: Sun and Moon Math

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 3 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 3 adds SunModule and MoonModule, which use the vendored SunCalc library to compute sun position, sunrise/sunset times, and moon phase data. Results are written to AppState and verified via console.log. No DOM changes beyond adding a script tag for SunCalc.

## Goals

- SunModule computes altitude, azimuth, sunrise, sunset, and day length every 5 minutes
- MoonModule computes phase, illumination, terminator angle, and phase name every 6 hours
- All results stored in AppState.sun and AppState.moon
- Console output on boot confirms correct values
- SunCalc vendored at lib/suncalc.js and loaded before app.js

## Non-Goals

- No moon disc SVG rendering (Phase 4)
- No sky color computation (Phase 5)
- No AlmanacModule or equinox/solstice calculation (Phases 11, 15)
- No DOM writes from SunModule or MoonModule
- No DisplayModule changes

## Changes to index.html

Add the SunCalc script tag before app.js:

```html
  <script src="lib/suncalc.js"></script>
  <script src="app.js"></script>
</body>
```

No other HTML changes.

## Vendor lib/suncalc.js

Fetch the SunCalc library (MIT license, ~3 KB) from https://github.com/mourner/suncalc and save it as `lib/suncalc.js`. The library exposes a global `SunCalc` object. No modifications to the source.

## app.js Implementation

### CONFIG Addition

Add `location` to CONFIG, after the existing `display` block:

```js
const CONFIG = {
  display: {
    timeFormat: '12h',
    showSeconds: false,
    dateFormat: 'long'
  },
  location: {
    name: 'Vancouver, BC',
    latitude: 49.2827,
    longitude: -123.1207,
    timezone: 'America/Vancouver'
  }
};
```

### AppState Additions

Add `sun` and `moon` to AppState, after the existing `date` block:

```js
sun: {
  altitude: 0,        // degrees
  azimuth: 0,         // degrees
  sunrise: '',         // formatted time string
  sunset: '',          // formatted time string
  dayLengthMin: 0      // minutes
},
moon: {
  phase: 0,            // 0-1
  illumination: 0,     // 0-1
  terminatorAngle: 0,  // degrees
  phaseName: ''        // e.g. 'Waxing Gibbous'
}
```

### SunModule

Place after ClockModule, before DisplayModule.

```js
const SunModule = {
  _intervalId: null,

  init() {},

  start() {
    this.update();
    this._intervalId = setInterval(() => this.update(), 5 * 60 * 1000);
  },

  update() {
    try {
      const now = new Date();
      const lat = CONFIG.location.latitude;
      const lng = CONFIG.location.longitude;

      // Sun position
      const pos = SunCalc.getPosition(now, lat, lng);
      AppState.sun.altitude = this._toDeg(pos.altitude);
      AppState.sun.azimuth = this._toDeg(pos.azimuth) + 180;
      // SunCalc azimuth: 0 = south, negative = east. +180 converts to
      // compass bearing: 0 = north, 90 = east, 180 = south, 270 = west.

      // Sunrise and sunset
      const times = SunCalc.getTimes(now, lat, lng);
      AppState.sun.sunrise = this._formatTime(times.sunrise);
      AppState.sun.sunset = this._formatTime(times.sunset);

      // Day length in minutes
      const diffMs = times.sunset.getTime() - times.sunrise.getTime();
      AppState.sun.dayLengthMin = Math.round(diffMs / 60000);

      AppState.meta.lastUpdate.sun = now.getTime();
    } catch (e) {
      // Continues on next interval
    }
  },

  _toDeg(rad) {
    return Math.round((rad * 180 / Math.PI) * 10) / 10;
  },

  _formatTime(date) {
    if (CONFIG.display.timeFormat === '12h') {
      const h = date.getHours() % 12 || 12;
      const m = String(date.getMinutes()).padStart(2, '0');
      const ap = date.getHours() < 12 ? 'AM' : 'PM';
      return h + ':' + m + ' ' + ap;
    }
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
};
```

**Radians to degrees.** `_toDeg` multiplies by 180/PI and rounds to one decimal place. SunCalc returns all angles in radians.

**Azimuth conversion.** SunCalc defines azimuth as 0 = south, with negative values east of south and positive values west of south. Adding 180 converts to standard compass bearing (0 = north). The result is always 0-360 because SunCalc's range is [-PI, PI], which maps to [-180, 180], and +180 yields [0, 360].

**Time formatting.** `_formatTime` respects `CONFIG.display.timeFormat`. In 12h mode it produces "6:14 AM" or "8:32 PM" (unpadded hour). In 24h mode it produces "06:14" or "20:32" (zero-padded hour).

### MoonModule

Place after SunModule, before DisplayModule.

```js
const MoonModule = {
  _intervalId: null,

  _PHASE_NAMES: [
    'New Moon',         // 0.000
    'Waxing Crescent',  // 0.125
    'First Quarter',    // 0.250
    'Waxing Gibbous',   // 0.375
    'Full Moon',        // 0.500
    'Waning Gibbous',   // 0.625
    'Last Quarter',     // 0.750
    'Waning Crescent'   // 0.875
  ],

  init() {},

  start() {
    this.update();
    this._intervalId = setInterval(() => this.update(), 6 * 60 * 60 * 1000);
  },

  update() {
    try {
      const now = new Date();
      const illum = SunCalc.getMoonIllumination(now);

      AppState.moon.phase = Math.round(illum.phase * 1000) / 1000;
      AppState.moon.illumination = Math.round(illum.fraction * 1000) / 1000;
      AppState.moon.terminatorAngle = Math.round(illum.angle * 180 / Math.PI);
      AppState.moon.phaseName = this._phaseName(illum.phase);

      AppState.meta.lastUpdate.moon = now.getTime();
    } catch (e) {
      // Continues on next interval
    }
  },

  _phaseName(phase) {
    // Divide the 0-1 cycle into 8 equal segments of 0.125 each.
    // Segment boundaries: 0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375.
    // A phase of 0.94 wraps back to 'New Moon'.
    const index = Math.round(phase * 8) % 8;
    return this._PHASE_NAMES[index];
  }
};
```

**Phase name mapping.** The 0-1 phase value is multiplied by 8 and rounded to the nearest integer, giving indices 0-8. Modulo 8 wraps index 8 back to 0 (New Moon), so values near 1.0 correctly map to New Moon. The eight segments and their center values:

| Index | Center | Name            |
|-------|--------|-----------------|
| 0     | 0.000  | New Moon        |
| 1     | 0.125  | Waxing Crescent |
| 2     | 0.250  | First Quarter   |
| 3     | 0.375  | Waxing Gibbous  |
| 4     | 0.500  | Full Moon       |
| 5     | 0.625  | Waning Gibbous  |
| 6     | 0.750  | Last Quarter    |
| 7     | 0.875  | Waning Crescent |

**Terminator angle.** `illum.angle` is the angle of the moon's bright limb position axis, in radians. Converted to degrees and rounded to an integer. Phase 4 uses this to orient the moon disc SVG shadow.

### Boot Sequence

Replace the existing boot IIFE:

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

  // TEMPORARY: Phase 3 verification. Remove in Phase 4.
  console.log('[Phase 3] sun:', JSON.stringify(AppState.sun));
  console.log('[Phase 3] moon:', JSON.stringify(AppState.moon));
})();
```

Order: all init() calls first, then all start() calls. The console.log lines run after start() because SunModule.start() and MoonModule.start() each call update() synchronously before setting up their intervals.

### Module Order in app.js

After Phase 3, the top-level declarations in app.js are, in order:

1. `CONFIG`
2. `AppState`
3. `ClockModule`
4. `SunModule`
5. `MoonModule`
6. `DisplayModule`
7. Boot IIFE

## Files Changed

| File             | Change                                            |
|------------------|---------------------------------------------------|
| app.js           | Add CONFIG.location, AppState.sun, AppState.moon, SunModule, MoonModule, update boot |
| index.html       | Add `<script src="lib/suncalc.js"></script>` before app.js |
| lib/suncalc.js   | Vendor SunCalc library (new file)                 |

No changes to style.css.

## Acceptance Criteria

1. Open `localhost:8000`; no console errors
2. Console shows `[Phase 3] sun:` with altitude between -90 and 90, azimuth between 0 and 360, sunrise and sunset as formatted time strings, dayLengthMin as a positive integer
3. Console shows `[Phase 3] moon:` with phase 0-1, illumination 0-1, terminatorAngle as an integer, phaseName as one of the eight defined names
4. In DevTools: `AppState.sun.altitude` returns a number with one decimal place
5. In DevTools: `AppState.moon.phaseName` returns a non-empty string
6. Change `CONFIG.display.timeFormat` to `'24h'`; reload; sunrise/sunset show 24h format (e.g., "06:14")
7. Change `CONFIG.display.timeFormat` to `'12h'`; reload; sunrise/sunset show 12h format (e.g., "6:14 AM")
8. Time display and date display still work correctly (Phase 2 not broken)
9. Wait 5 minutes; `AppState.meta.lastUpdate.sun` advances (SunModule interval fires)
10. No DOM changes beyond the SunCalc script tag; moon disc SVG is unchanged

## References

- SDD Sections: 8.1 (SunModule, MoonModule), 16 (AppState), 18 (CONFIG), 19 (Phase 3)
- Phase 2 spec: `docs/phase-02-live-clock.md`
- SunCalc library: https://github.com/mourner/suncalc (MIT)
