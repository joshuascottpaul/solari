# Phase 11: Almanac + Event Countdowns

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 11 of 15                    |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 11 adds AlmanacModule, which merges a static dataset of astronomical events (meteor showers, eclipses) with SunCalc-computed moon phases (full/new moon) and surfaces the nearest upcoming event within a 7-day horizon. When an event is within range, it appears as a new entry in the Slot B rotation.

## Goals

- Create `/data/almanac.json` with meteor shower peaks, eclipses, and notable events for 2026-2030
- AlmanacModule loads the static dataset once at boot and caches it in memory
- Compute next full moon and new moon dates by scanning SunCalc phase data forward 30 days
- Merge static and computed events, filter to 7-day horizon, return the closest
- Store result in `AppState.almanac` as `{ name, date, daysAway }` or `null`
- Add an almanac source to Slot B rotation that formats the event contextually
- Recompute daily (almanac data does not change intra-day)

## Non-Goals

- No solstice/equinox computation (Phase 15, ObservanceModule)
- No holiday or cultural observance entries (Phase 15)
- No perigee/apogee computation (deferred; static data only if needed)
- No user-configurable event list

## `/data/almanac.json` Schema

Array of event objects. Each entry is a one-time occurrence on a specific date.

```json
[
  { "name": "QUADRANTID PEAK", "date": "2026-01-03", "recurs": false },
  { "name": "LYRID PEAK", "date": "2026-04-22", "recurs": false }
]
```

| Field    | Type    | Description |
|----------|---------|-------------|
| `name`   | string  | Uppercase display name, max 20 chars |
| `date`   | string  | ISO date `YYYY-MM-DD` |
| `recurs` | boolean | Always `false` for this phase; reserved for Phase 15 |

### 2026-2030 Dataset

```json
[
  { "name": "QUADRANTID PEAK",    "date": "2026-01-03", "recurs": false },
  { "name": "LYRID PEAK",         "date": "2026-04-22", "recurs": false },
  { "name": "ETA AQUARIID PEAK",  "date": "2026-05-06", "recurs": false },
  { "name": "TOTAL LUNAR ECLIPSE","date": "2026-05-31", "recurs": false },
  { "name": "PERSEID PEAK",       "date": "2026-08-12", "recurs": false },
  { "name": "TOTAL SOLAR ECLIPSE","date": "2026-08-12", "recurs": false },
  { "name": "ORIONID PEAK",       "date": "2026-10-21", "recurs": false },
  { "name": "GEMINID PEAK",       "date": "2026-12-14", "recurs": false },

  { "name": "QUADRANTID PEAK",    "date": "2027-01-03", "recurs": false },
  { "name": "TOTAL LUNAR ECLIPSE","date": "2027-02-20", "recurs": false },
  { "name": "LYRID PEAK",         "date": "2027-04-22", "recurs": false },
  { "name": "ETA AQUARIID PEAK",  "date": "2027-05-06", "recurs": false },
  { "name": "PERSEID PEAK",       "date": "2027-08-12", "recurs": false },
  { "name": "TOTAL SOLAR ECLIPSE","date": "2027-08-02", "recurs": false },
  { "name": "ORIONID PEAK",       "date": "2027-10-21", "recurs": false },
  { "name": "GEMINID PEAK",       "date": "2027-12-14", "recurs": false },

  { "name": "QUADRANTID PEAK",    "date": "2028-01-03", "recurs": false },
  { "name": "LYRID PEAK",         "date": "2028-04-22", "recurs": false },
  { "name": "ETA AQUARIID PEAK",  "date": "2028-05-05", "recurs": false },
  { "name": "PERSEID PEAK",       "date": "2028-08-12", "recurs": false },
  { "name": "ORIONID PEAK",       "date": "2028-10-21", "recurs": false },
  { "name": "TOTAL LUNAR ECLIPSE","date": "2028-12-31", "recurs": false },
  { "name": "GEMINID PEAK",       "date": "2028-12-13", "recurs": false },

  { "name": "QUADRANTID PEAK",    "date": "2029-01-03", "recurs": false },
  { "name": "TOTAL SOLAR ECLIPSE","date": "2029-06-12", "recurs": false },
  { "name": "LYRID PEAK",         "date": "2029-04-22", "recurs": false },
  { "name": "ETA AQUARIID PEAK",  "date": "2029-05-05", "recurs": false },
  { "name": "PERSEID PEAK",       "date": "2029-08-12", "recurs": false },
  { "name": "ORIONID PEAK",       "date": "2029-10-21", "recurs": false },
  { "name": "GEMINID PEAK",       "date": "2029-12-14", "recurs": false },

  { "name": "QUADRANTID PEAK",    "date": "2030-01-03", "recurs": false },
  { "name": "TOTAL LUNAR ECLIPSE","date": "2030-06-15", "recurs": false },
  { "name": "LYRID PEAK",         "date": "2030-04-22", "recurs": false },
  { "name": "ETA AQUARIID PEAK",  "date": "2030-05-05", "recurs": false },
  { "name": "PERSEID PEAK",       "date": "2030-08-12", "recurs": false },
  { "name": "ORIONID PEAK",       "date": "2030-10-21", "recurs": false },
  { "name": "GEMINID PEAK",       "date": "2030-12-14", "recurs": false }
]
```

## app.js Changes

### CONFIG Addition

Add `almanacHorizonDays` to `rotation`:

```js
rotation: {
  slotAHoldSec: 28,
  slotBHoldSec: 36,
  transitionMs: 1500,
  cascadeStaggerMs: 70,
  almanacHorizonDays: 7    // NEW
}
```

### AppState Addition

Add after `alert`:

```js
almanac: null   // or { name, date, daysAway }
```

### AlmanacModule

Place after AlertModule, before MoonModule.

```js
const AlmanacModule = {
  _events: null,       // cached array from almanac.json
  _intervalId: null,

  init() {},

  start() {
    this._loadAndUpdate();
    // Recompute once per hour (moon phase scan is cheap; daily would suffice
    // but hourly catches the midnight boundary without special logic)
    this._intervalId = setInterval(() => this._update(), 60 * 60 * 1000);
  },

  async _loadAndUpdate() {
    await this._loadStatic();
    this._update();
  },

  async _loadStatic() {
    const data = await ResilienceManager.fetch('/data/almanac.json');
    if (Array.isArray(data)) {
      this._events = data;
    } else {
      this._events = [];
      console.warn('AlmanacModule: failed to load /data/almanac.json');
    }
  },

  _update() {
    const horizon = CONFIG.rotation.almanacHorizonDays;
    const now = new Date();
    const todayStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    const horizonMs = horizon * 24 * 60 * 60 * 1000;

    // Gather candidates: static events + computed moon events
    const candidates = [];

    // Static events within horizon
    for (let i = 0; i < this._events.length; i++) {
      const ev = this._events[i];
      const evMs = new Date(ev.date + 'T00:00:00').getTime();
      const daysAway = Math.round((evMs - todayMs) / (24 * 60 * 60 * 1000));
      if (daysAway >= 0 && daysAway <= horizon) {
        candidates.push({ name: ev.name, date: ev.date, daysAway: daysAway });
      }
    }

    // Computed moon events
    const fullMoon = this._findMoonEvent(now, 0.5, 'FULL MOON');
    const newMoon = this._findMoonEvent(now, 0.0, 'NEW MOON');
    if (fullMoon && fullMoon.daysAway <= horizon) candidates.push(fullMoon);
    if (newMoon && newMoon.daysAway <= horizon) candidates.push(newMoon);

    // Pick closest event (smallest daysAway; ties broken by name alphabetically)
    candidates.sort(function(a, b) {
      if (a.daysAway !== b.daysAway) return a.daysAway - b.daysAway;
      return a.name < b.name ? -1 : 1;
    });

    const prev = AppState.almanac;
    AppState.almanac = candidates.length > 0 ? candidates[0] : null;
    AppState.meta.lastUpdate.almanac = Date.now();

    // Refresh rotator if almanac state changed
    if (JSON.stringify(prev) !== JSON.stringify(AppState.almanac)) {
      RotatorModule.refresh();
    }
  },

  _findMoonEvent(now, targetPhase, name) {
    // Scan forward day-by-day for 30 days.
    // Find the date where SunCalc phase is closest to targetPhase.
    const todayStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();

    let bestDist = 1;
    let bestDay = null;

    for (let d = 0; d <= 30; d++) {
      const date = new Date(todayMs + d * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
      // Sample at noon to avoid edge effects
      const illum = SunCalc.getMoonIllumination(date);
      const phase = illum.phase;

      // Distance on circular scale (0 and 1 are the same point)
      let dist = Math.abs(phase - targetPhase);
      if (dist > 0.5) dist = 1 - dist;

      if (dist < bestDist) {
        bestDist = dist;
        bestDay = d;
      }
    }

    // Only accept if the match is within 0.03 of target (roughly 1 day accuracy)
    if (bestDay !== null && bestDist < 0.03) {
      const eventDate = new Date(todayMs + bestDay * 24 * 60 * 60 * 1000);
      const dateStr = eventDate.getFullYear() + '-' +
        String(eventDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(eventDate.getDate()).padStart(2, '0');
      return { name: name, date: dateStr, daysAway: bestDay };
    }
    return null;
  },

  next7Days() {
    return AppState.almanac;
  }
};
```

### Slot B Source Addition

Add a fourth source function to `RotatorModule._sourcesB`, after the tide source:

```js
function() {
  const a = AppState.almanac;
  if (!a) return null;
  if (a.daysAway === 0) return a.name + ' TODAY';
  if (a.daysAway === 1) return a.name + ' TOMORROW';
  // 2-7 days: show abbreviated day name
  const eventDate = new Date(a.date + 'T00:00:00');
  const dayAbbr = ['SUN','MON','TUE','WED','THU','FRI','SAT'][eventDate.getDay()];
  return a.name + ' ' + dayAbbr;
}
```

Sample outputs:
- `"FULL MOON TODAY"`
- `"PERSEID PEAK TOMORROW"`
- `"ETA AQUARIID PEAK WED"`
- `"TOTAL LUNAR ECLIPSE SAT"`

### Boot Sequence

Add AlmanacModule to boot:

```js
(function boot() {
  DisplayModule.init();
  ClockModule.init();
  SunModule.init();
  MoonModule.init();
  RotatorModule.init();
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  SkyColorModule.update();
  MoonModule.start();
  WeatherModule.start();
  AirQualityModule.start();
  TideModule.start();
  AlertModule.start();
  AlmanacModule.start();           // NEW: loads static data, computes moon, hourly refresh
  DriftEngine.start();
  RotatorModule.start();
})();
```

AlmanacModule.start() runs after AlertModule.start() and before DriftEngine.start(). The async load completes in the background; RotatorModule.refresh() is called when data is ready.

## Moon Phase Scanning Algorithm

1. Starting from today, iterate day 0 through day 30.
2. For each day, sample `SunCalc.getMoonIllumination()` at noon local time (avoids midnight edge effects).
3. Compute circular distance from the target phase (0.0 for new moon, 0.5 for full moon). Circular distance: `dist = abs(phase - target); if (dist > 0.5) dist = 1 - dist`.
4. Track the day with the smallest distance.
5. Accept the result only if `bestDist < 0.03` (within ~1 day of true phase). This prevents false positives from quarter moons.
6. Return `{ name, date, daysAway }` or `null`.

The scan runs 31 iterations of a single SunCalc call each. Negligible CPU cost.

## Acceptance Criteria

1. `/data/almanac.json` exists and contains valid JSON with 2026-2030 events
2. AlmanacModule loads the static dataset on boot via ResilienceManager.fetch
3. Next full moon and new moon are computed from SunCalc, not hardcoded
4. Static and computed events are merged and filtered to the 7-day horizon
5. `AppState.almanac` is `{ name, date, daysAway }` for the closest event, or `null`
6. Slot B rotation includes the almanac source when `AppState.almanac` is not null
7. Display format: `"EVENT TODAY"`, `"EVENT TOMORROW"`, or `"EVENT DAY"` (abbreviated)
8. Almanac recomputation runs hourly to catch date rollover
9. If `/data/almanac.json` fails to load, module logs a warning and operates with computed moon events only
10. All previous phase functionality intact; no console errors

## References

- SDD Sections: 8.1 (AlmanacModule interface), 14 (almanac data source), 16 (AppState.almanac), 18 (CONFIG), 19 (Phase 11)
- Phase 10 spec: `docs/phase-10-alerts.md`
- SunCalc API: `SunCalc.getMoonIllumination(date)` returns `{ fraction, phase, angle }`
