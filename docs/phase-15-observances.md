# Phase 15: Holiday and Observance System

Status: Draft | 2026-05-03

## Summary

Phase 15 adds `ObservanceModule`, the final module in the SDD. It detects holidays and astronomical events, applies two treatment levels (major: full palette override + slot entry; light: hue tint + glyph in date string), and supports custom user-defined observances. This completes all 15 phases of the V0 build.

## Goals

- Implement `ObservanceModule` with the five public methods: `active()`, `activePalette()`, `dateString()`, `glyph()`, `slotEntry()`.
- Compute solstice and equinox dates astronomically using SunCalc solar longitude.
- Add `CONFIG.observances` with the built-in schedule and custom observance support.
- Add `AppState.observance`.
- Integrate with `SkyColorModule` (override/tint), `DisplayModule` (date string + glyph), and `RotatorModule` (slot B entry for major observances).

## Non-Goals

- Multi-day observances (all observances revert at local midnight).
- Southern hemisphere date flipping (solstice/equinox names are fixed to northern hemisphere semantics per SDD).
- User-facing UI for adding custom observances (CONFIG edit only).

## Proposed Design

### CONFIG addition

Add after `CONFIG.luminanceBreath`:

```js
observances: {
  builtInEnabled: true,
  customObservances: [
    // { name: 'JOSH BIRTHDAY', date: '07-15', glyph: '\u2737',
    //   treatment: 'major',
    //   palette: { mode: 'override', primary: '#F4C56C' },
    //   slotEntry: 'JOSH BIRTHDAY' }
  ]
}
```

### AppState addition

Add after `AppState.rotator`:

```js
observance: null
// When active: { name, glyph, treatment, palette, slotEntry, dateString }
```

### ObservanceModule

```js
const ObservanceModule = {
  _builtIn: [
    { name: 'CHRISTMAS DAY',    date: '12-25', glyph: '\u2744', treatment: 'major',
      palette: { mode: 'override', primary: '#F4C56C' }, slotEntry: 'CHRISTMAS DAY' },
    { name: "NEW YEAR'S DAY",   date: '01-01', glyph: '\u2726', treatment: 'major',
      palette: { mode: 'override', primary: '#C8D4E8' }, slotEntry: "NEW YEAR'S DAY" },
    { name: 'SPRING EQUINOX',   date: 'equinox-spring', glyph: '\u273F', treatment: 'light',
      palette: { mode: 'tint', hueShift: 30, satShift: 0 } },
    { name: 'SUMMER SOLSTICE',  date: 'solstice-summer', glyph: '\u2609', treatment: 'light',
      palette: { mode: 'tint', hueShift: 10, satShift: 10 } },
    { name: 'FALL EQUINOX',     date: 'equinox-fall', glyph: '\u2766', treatment: 'light',
      palette: { mode: 'tint', hueShift: 20, satShift: 5 } },
    { name: 'WINTER SOLSTICE',  date: 'solstice-winter', glyph: '\u263E', treatment: 'light',
      palette: { mode: 'tint', hueShift: -25, satShift: 0 } },
    { name: 'HALLOWEEN',        date: '10-31', glyph: '\u25D0', treatment: 'light',
      palette: { mode: 'tint', hueShift: 45, satShift: -10 } }
  ],

  _astroCache: {},   // { year: { 'equinox-spring': 'MM-DD', ... } }
  _lastDate: null,
  _intervalId: null,

  init() {},

  start() {
    this.update();
    this._intervalId = setInterval(() => this.update(), 60 * 1000);
  },

  update() {
    const now = new Date();
    const todayISO = AppState.date.isoDate;
    if (todayISO === this._lastDate) return;  // already resolved today
    this._lastDate = todayISO;

    const year = now.getFullYear();
    const mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' +
                 String(now.getDate()).padStart(2, '0');

    // Build candidate list
    const candidates = [];

    // Custom observances (highest priority)
    const custom = CONFIG.observances.customObservances || [];
    for (let i = 0; i < custom.length; i++) {
      if (custom[i].date === mmdd) {
        candidates.push({ ...custom[i], priority: 0 });
      }
    }

    // Built-in observances
    if (CONFIG.observances.builtInEnabled) {
      for (let i = 0; i < this._builtIn.length; i++) {
        const obs = this._builtIn[i];
        const resolvedDate = this._resolveDate(obs.date, year);
        if (resolvedDate === mmdd) {
          const pri = obs.treatment === 'major' ? 1 : 2;
          candidates.push({ ...obs, priority: pri });
        }
      }
    }

    // Conflict resolution: lowest priority number wins
    candidates.sort((a, b) => a.priority - b.priority);
    const winner = candidates.length > 0 ? candidates[0] : null;

    if (winner) {
      const monthName = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
      const day = now.getDate();
      AppState.observance = {
        name: winner.name,
        glyph: winner.glyph,
        treatment: winner.treatment,
        palette: winner.palette,
        slotEntry: winner.slotEntry || null,
        dateString: winner.glyph + ' ' + winner.name + ' \u00B7 ' +
                    monthName + ' ' + day + ' ' + winner.glyph
      };
    } else {
      AppState.observance = null;
    }

    SkyColorModule.update();
    RotatorModule.refresh();
  },

  active()        { return AppState.observance; },
  activePalette() { return AppState.observance ? AppState.observance.palette : { mode: 'none' }; },
  dateString()    { return AppState.observance ? AppState.observance.dateString : null; },
  glyph()         { return AppState.observance ? AppState.observance.glyph : null; },
  slotEntry()     { return AppState.observance ? AppState.observance.slotEntry : null; },

  _resolveDate(dateSpec, year) {
    // Fixed dates: 'MM-DD'
    if (/^\d{2}-\d{2}$/.test(dateSpec)) return dateSpec;
    // Astronomical dates: 'equinox-spring', 'solstice-summer', etc.
    if (!this._astroCache[year]) {
      this._astroCache[year] = this._computeAstroDates(year);
    }
    return this._astroCache[year][dateSpec] || null;
  },

  _computeAstroDates(year) {
    // Target solar longitudes (degrees)
    const targets = {
      'equinox-spring':  0,
      'solstice-summer': 90,
      'equinox-fall':    180,
      'solstice-winter': 270
    };
    const result = {};

    for (const [key, targetLng] of Object.entries(targets)) {
      result[key] = this._findSolarLongitudeCrossing(year, targetLng);
    }
    return result;
  },

  _findSolarLongitudeCrossing(year, targetDeg) {
    // Approximate windows to narrow the scan
    const windows = {
      0:   [2, 15, 3, 25],   // Spring equinox: Mar 15 - Mar 25
      90:  [5, 17, 6, 25],   // Summer solstice: Jun 17 - Jun 25
      180: [8, 19, 9, 26],   // Fall equinox: Sep 19 - Sep 26
      270: [11, 18, 12, 25]  // Winter solstice: Dec 18 - Dec 25
    };
    const w = windows[targetDeg];
    const start = new Date(year, w[0], w[1], 12, 0, 0);  // noon UTC
    const end   = new Date(year, w[2], w[3], 12, 0, 0);

    let bestDate = start;
    let bestDist = 360;

    // Scan day by day within the window
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const lng = this._solarLongitude(d);
      let dist = Math.abs(lng - targetDeg);
      if (dist > 180) dist = 360 - dist;  // wrap-around for 0/360 boundary
      if (dist < bestDist) {
        bestDist = dist;
        bestDate = new Date(d);
      }
    }

    return String(bestDate.getMonth() + 1).padStart(2, '0') + '-' +
           String(bestDate.getDate()).padStart(2, '0');
  },

  _solarLongitude(date) {
    // Compute ecliptic longitude from SunCalc sun position.
    // SunCalc does not expose ecliptic longitude directly, so we
    // derive it from the sun's right ascension and the obliquity
    // of the ecliptic.
    //
    // Simpler approach: use the astronomical algorithm directly.
    // Julian centuries from J2000.0:
    const JD = date.getTime() / 86400000 + 2440587.5;
    const T = (JD - 2451545.0) / 36525.0;

    // Mean longitude (degrees)
    const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    // Mean anomaly (degrees)
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;
    const Mrad = M * Math.PI / 180;

    // Equation of center (degrees)
    const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
              (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
              0.000289 * Math.sin(3 * Mrad);

    // Sun's ecliptic longitude
    let lng = (L0 + C) % 360;
    if (lng < 0) lng += 360;
    return lng;
  }
};
```

### Solstice/equinox computation detail

The `_solarLongitude()` method uses the standard VSOP87-simplified algorithm (Meeus, Chapter 25). It computes Julian centuries from J2000.0, derives the mean longitude and mean anomaly, applies the equation of center, and returns the ecliptic longitude in degrees. Accuracy is within 0.01 degrees, which is sufficient for day-level resolution.

The scan window for each event is 8-11 days wide (e.g., Mar 15-25 for spring equinox). This means at most 44 iterations per year for all four events. The results are cached per year in `_astroCache`, so the computation runs once per year.

### SkyColorModule integration

Add to `SkyColorModule.update()`, after the AQI hue shift block and before writing CSS vars:

```js
// Phase 15: observance palette
const obsPalette = ObservanceModule.activePalette();
if (obsPalette.mode === 'override') {
  // Replace computed color entirely
  rgb = SkyColorModule._hexToRgb(obsPalette.primary);
} else if (obsPalette.mode === 'tint') {
  // Apply hue/sat shift on top of sky + weather color
  rgb = SkyColorModule._applyWeatherMod(rgb,
    [1.0 + (obsPalette.satShift || 0) / 100, 0, obsPalette.hueShift || 0]);
}
```

Add helper to `SkyColorModule`:

```js
_hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
```

The tint `satShift` is converted to a multiplicative factor: `satShift: 10` becomes `satMult: 1.10` (10% increase). `satShift: -10` becomes `satMult: 0.90` (10% decrease). This reuses the existing `_applyWeatherMod` pipeline without modification.

### DisplayModule integration

Modify `DisplayModule.render()`, in the date rendering section:

```js
// Date line: check for observance override
const obs = AppState.observance;
if (obs) {
  this._els.dateText.textContent = obs.dateString;
} else {
  this._els.dateText.textContent = d.dayOfWeek + ' \u00B7 ' + d.month + ' ' + d.day;
}
```

### RotatorModule integration

Add a source function to the end of `RotatorModule._sourcesB`:

```js
function() {
  var obs = AppState.observance;
  if (!obs || !obs.slotEntry) return null;
  return obs.slotEntry;
}
```

This adds the observance as one entry in Slot B's rotation. For major observances (Christmas, New Year), it appears alongside weather, AQI, tide, and almanac entries. The existing rotation logic handles it; no timer changes needed.

### Conflict resolution

Priority is encoded as a numeric rank during candidate evaluation:

| Priority | Source | Example |
|---|---|---|
| 0 | Custom observance | JOSH BIRTHDAY |
| 1 | Built-in major | CHRISTMAS DAY |
| 2 | Built-in light | HALLOWEEN |

If Dec 25 has both a custom observance and Christmas, the custom observance wins. If a solstice and Halloween somehow collide (they cannot, but the logic is general), the higher-treatment built-in wins.

### Date string formatting

Major observances: `"[glyph] [NAME] · [MONTH] [DAY] [glyph]"`
Example: `"❄ CHRISTMAS DAY · DECEMBER 25 ❄"`

Light observances: same format.
Example: `"☉ SUMMER SOLSTICE · JUNE 21 ☉"`

Both treatments use the same format because the date string replaces the default `"Wednesday · May 3"` line entirely. The glyph appears on both sides to maintain visual symmetry.

### Boot sequence update

Add `ObservanceModule.init()` in the init block (after `RotatorModule.init()`). Add `ObservanceModule.start()` after `LuminanceBreath.start()` and before `RotatorModule.start()`:

```js
MacroShifter.start();
RefresherCycle.start();
LuminanceBreath.start();
ObservanceModule.start();             // Phase 15: observances
RotatorModule.start();
```

ObservanceModule must start before RotatorModule so that any slot entry is available when Slot B initializes.

### Files changed

| File | Change |
|---|---|
| `app.js` | Add `CONFIG.observances`, add `AppState.observance`, add `ObservanceModule`, add `_hexToRgb` to `SkyColorModule`, modify `SkyColorModule.update()`, modify `DisplayModule.render()`, add source to `RotatorModule._sourcesB`, update boot sequence |

Total: approximately 130 lines of JS.

## Alternatives Considered

### A: Hardcoded equinox/solstice dates

Use fixed dates (Mar 20, Jun 21, Sep 22, Dec 21) instead of computing solar longitude.

**Pros:** Zero computation. No dependency on Julian date math.
**Cons:** Off by 1-2 days in some years. The SDD explicitly says "computed astronomically, not hardcoded" (Section 13.4).

**Why rejected:** The SDD is unambiguous. The solar longitude computation is 15 lines and runs once per year.

### B: SunCalc-derived ecliptic longitude

Use SunCalc's sun position (altitude/azimuth) to back-derive ecliptic longitude via right ascension and obliquity transforms.

**Pros:** Reuses existing vendored library.
**Cons:** SunCalc does not expose ecliptic coordinates. Deriving them from equatorial coordinates requires the obliquity of the ecliptic and an inverse rotation, which is more code than the direct mean-longitude + equation-of-center approach. SunCalc's internal model is also simplified and not guaranteed to be more accurate than Meeus Chapter 25.

**Why rejected:** The direct VSOP87-simplified formula is shorter, self-contained, and well-documented.

## Testing

Set the system date to each observance and verify:

| Test | Expected |
|---|---|
| Set date to Dec 25 | Date line shows "❄ CHRISTMAS DAY · DECEMBER 25 ❄". Sky color is #F4C56C regardless of time. Slot B includes "CHRISTMAS DAY". |
| Set date to Jan 1 | Date line shows "✦ NEW YEAR'S DAY · JANUARY 1 ✦". Sky color is #C8D4E8. Slot B includes "NEW YEAR'S DAY". |
| Set date to ~Jun 21 | Date line shows "☉ SUMMER SOLSTICE · JUNE 21 ☉" (date may be 20 or 21). Sky color has hue +10, sat +10% on top of normal sky. No slot entry. |
| Set date to Oct 31 | Date line shows "◐ HALLOWEEN · OCTOBER 31 ◐". Sky color has hue +45, sat -10% on top of normal sky. No slot entry. |
| Set date to Jul 15 with custom observance configured | Custom observance overrides any built-in for that date. |
| Set date to Dec 26 | No observance active. Date line shows normal format. Sky color is normal. |

## Open Questions

None. The SDD fully specifies the observance system. All built-in dates, glyphs, palette behaviors, and conflict resolution rules are defined.
