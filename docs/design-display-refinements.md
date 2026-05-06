# Display Refinements -- Post-V0 Polish

**Status:** Draft  
**Date:** 2026-05-05  
**Scope:** Four targeted changes to improve information quality and visual polish. Small feature scope (< 1 week total).

---

## Summary

Four refinements to the Solari display: add the year to the date line, make the sunrise/sunset rotator slots context-aware, explore color as a richer information carrier, and fix the invisible tide data. These address usability gaps discovered during live running, not new features from the SDD.

## Constraints

No build step, no npm. 250 KB total bundle target. iPad Safari 18+ only. 7+ day continuous runtime. No API keys. Single shared AppState object, single render loop. Eight-layer burn-in protection (SDD Section 9).

---

## 1. Add Year to Date Display

### Current Behavior

`DisplayModule.render()` writes:

```
Wednesday · May 5
```

`AppState.date.year` is already computed by `ClockModule._updateState()` but never rendered.

### Proposed Change

Append the year to the date line:

```
Wednesday · May 5 · 2026
```

The observance override already replaces the entire date string when active, so the year only appears on non-observance days. This is correct -- observance dates like "CHRISTMAS DAY · DECEMBER 25" are self-evident.

**Code change** in `DisplayModule.render()`, line 1844:

```js
// Before:
this._els.dateText.textContent = d.dayOfWeek + ' \u00B7 ' + d.month + ' ' + d.day;

// After:
this._els.dateText.textContent = d.dayOfWeek + ' \u00B7 ' + d.month + ' ' + d.day + ' \u00B7 ' + d.year;
```

No new AppState fields. No CSS changes. No burn-in implications (the date element is already drifted and macro-shifted with the time cluster).

### Alternatives Considered

**Year on its own line.** Rejected. Adding another DOM element violates the SDD's "no more than 5 visible elements" rule. The date line already has room.

**Two-digit year ("26").** Rejected. The ambient display is not a dashboard; the full year reads more naturally and has the unhurried quality the SDD calls for.

### Acceptance Criteria

- The date line reads "DayOfWeek · Month Day · Year" on non-observance days.
- On observance days, the observance string continues to replace the entire date line (no year appended).
- The date element does not clip or overflow on the 11" iPad Air viewport (1180x820 logical).

---

## 2. Context-Aware Sun Event Slots

### Current Behavior

The rotator has three sun-related sources:

| Index | Source | Output |
|-------|--------|--------|
| 0 | Sunrise | `SUNRISE 5:14 AM` |
| 2 | Sunset | `SUNSET 8:47 PM` |
| 6 | Time-until-next | `SUNSET IN 3H 22M` |

Sources 0 and 2 always return their values regardless of whether the event has passed. After sunrise, showing "SUNRISE 5:14 AM" is stale information. After sunset, showing "SUNSET 8:47 PM" is stale.

Source 6 (time-until-next) already has the right context-awareness logic but provides a different kind of information (countdown vs. absolute time).

### Proposed Change

Merge sources 0 and 2 into a single context-aware source that shows the next relevant sun event:

```
Before sunrise:     SUNRISE 5:14 AM
After sunrise:      SUNSET 8:47 PM
After sunset:       SUNRISE 5:14 AM    (tomorrow's)
```

This replaces two sources with one, which has a secondary benefit: the rotator cycle has fewer entries, giving each remaining source (weather, AQI, tide, daylight, time-until, almanac, observance) more screen time.

**Implementation:**

Replace sources at index 0 and 2 with a single source. Remove the now-redundant separate sunrise/sunset sources.

```js
// New combined source (replaces indices 0 and 2):
function() {
  const sr = AppState.sun.sunrise;
  const ss = AppState.sun.sunset;
  if (!sr || !ss) return null;
  const now = new Date();
  const todaySr = RotatorModule._parseSunTime(sr);
  const todaySs = RotatorModule._parseSunTime(ss);
  if (!todaySr || !todasSs) return null;

  if (now < todaySr) {
    return 'SUNRISE ' + sr;
  } else if (now < todaySs) {
    return 'SUNSET ' + ss;
  } else {
    // After sunset: show tomorrow's sunrise time.
    // We only have today's sunrise string, but the time value
    // is the same +/- 1 minute day-to-day. Acceptable.
    return 'SUNRISE ' + sr;
  }
}
```

The `_sources` array goes from 9 entries to 8. The `_index` wraps via modulo so no index management is needed.

**AppState.sun additions for tomorrow's sunrise (optional enhancement):**

To show tomorrow's exact sunrise time after today's sunset, `SunModule.update()` could compute tomorrow's sunrise via `SunCalc.getTimes(tomorrow, lat, lng)` and store it as `AppState.sun.tomorrowSunrise`. This adds ~0 bytes of memory and one extra SunCalc call per 5-minute update. If the 1-minute approximation from reusing today's time is acceptable, this is unnecessary.

### Alternatives Considered

**Keep both sources but return null when stale.** This works but creates a gap in the rotation where two consecutive null sources are skipped. Merging into one source is cleaner and gives other sources more rotation time.

**Show both sunrise and sunset always, but dim the past event.** Not possible in the current single-slot text rotation model. Would require a visual treatment that does not exist.

### Acceptance Criteria

- Before sunrise: the rotator shows `SUNRISE [time]`.
- Between sunrise and sunset: the rotator shows `SUNSET [time]`.
- After sunset: the rotator shows `SUNRISE [time]` (tomorrow's, or today's as approximation).
- The "SUNSET IN / SUNRISE IN" countdown source (currently index 6) continues to function independently.
- Total rotator source count decreases by one.

---

## 3. Color as Information Carrier

### Current Behavior

`SkyColorModule` already modulates `--type-primary` and `--type-secondary` based on:

1. **Sun altitude** -- 6 color bands from night (#9AA0C8) through twilight to midday (#F2F2F2).
2. **Weather condition** -- saturation reduction for clouds/fog, hue shift for rain/snow.
3. **AQI** -- 30-degree hue shift when air quality is unhealthy or worse.
4. **Observance palette** -- override or tint on holidays.

All text and the moon disc inherit these colors. The background is always #0a0a0a.

### Analysis

The SDD's design rule is: "Color lives in the type, not in blocks." The existing system already uses color as an information carrier through the type color. The question is whether additional data dimensions should modulate color.

**Candidates for additional color modulation:**

| Signal | Current treatment | Color opportunity | Risk |
|--------|------------------|-------------------|------|
| AQI (good/moderate) | No modulation | Subtle warmth shift for moderate AQI | Low -- a few degrees of hue shift is imperceptible unless looked for |
| Tide state (rising/falling) | None | Extremely subtle -- would need to encode direction in hue | High -- there is no natural color association for tides. Feels arbitrary |
| Temperature | Shown as text in rotator | Warm/cool shift already partially covered by sun altitude bands | Medium -- redundant with altitude-based color |
| Rain active | Hue +15 via weather mod | Could increase saturation of blue shift | Low -- strengthening existing signal |
| Season | None | Slow seasonal hue drift over months | Low -- beautiful, but invisible day-to-day. Only noticeable over weeks |

### Recommendation

The existing system is well-calibrated. Two low-risk additions are worth considering:

**A. Moderate AQI warmth.** Currently, only unhealthy+ AQI triggers a hue shift. Adding a gentler shift for `moderate` (AQI 51-100) would provide earlier ambient awareness of air quality without waiting for "unhealthy" threshold. Suggested: 10-degree hue shift, 5% saturation reduction.

```js
// In SkyColorModule.update(), after the existing AQI block:
if (aqiBand === 'moderate') {
  rgb = this._applyWeatherMod(rgb, [0.95, 0, 10]);
}
```

**B. Seasonal hue drift.** A slow, nearly invisible tint that shifts with the day of the year. This would make the display feel subtly different in February vs. August without any explicit seasonal indicator. Implementation: compute day-of-year, map to a hue offset (0-15 degrees), apply as a tint.

```js
// Seasonal tint: peaks at +12 degrees hue in summer, -8 in winter
const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
const seasonalHue = 2 + 10 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
// Apply as final layer before setting CSS vars
rgb = this._applyWeatherMod(rgb, [1.0, 0, seasonalHue]);
```

**Not recommended:** Encoding tide state or temperature in color. Tides have no natural color mapping, and temperature is already partially encoded through the sun altitude system. Adding these would move toward "dashboard" territory.

### Non-Goals

- No new CSS custom properties. The existing `--type-primary` and `--type-secondary` carry all color information.
- No colored backgrounds, panels, or blocks. Color stays in the type.
- No per-element color variation. All text shares the same color palette.

### Open Questions

1. Is the seasonal drift desirable, or does it add complexity without benefit? It would be invisible in daily use and only noticeable across months. The SDD does not mention seasonal color.
2. Should moderate AQI modulation be implemented, or is the current "only warn when unhealthy" threshold the right call? Vancouver's AQI is frequently in the moderate range during summer wildfire season; a persistent warmth shift during those months could be informative.

---

## 4. Tide Information Visibility

### Problem

Tide data is not appearing in the rotator. The root cause is that the fallback data in `/data/tides.json` is stale.

**Current fallback contents (as of 2026-05-05):**

```json
[
  { "type": "high", "heightM": 4.3, "time": "2026-05-04T04:22:00-07:00" },
  { "type": "low",  "heightM": 1.2, "time": "2026-05-04T10:15:00-07:00" },
  { "type": "high", "heightM": 3.8, "time": "2026-05-04T16:48:00-07:00" },
  { "type": "low",  "heightM": 0.9, "time": "2026-05-04T23:01:00-07:00" }
]
```

All four events are from May 4. `TideModule.next()` calls `this._events.find(e => new Date(e.time).getTime() > now)`, which returns `null` because all events are in the past. When `next()` returns null, `_applyNext()` sets nothing on AppState, so `AppState.tide.type` stays null, and the rotator source at index 5 returns null. The slot is silently skipped every rotation cycle.

The DFO API (`api-iwls.dfo-mpo.gc.ca`) is also returning 404 (documented in CLAUDE.md), so the fallback is the only data source.

### Causal Chain

```
DFO API returns 404
  -> falls back to /data/tides.json
    -> all events are in the past (stale file)
      -> TideModule.next() returns null
        -> AppState.tide.type stays null
          -> rotator source returns null
            -> tide slot is skipped
```

There is a re-fetch guard in `_applyNext()` (lines 483-488) that triggers when all events are in the past and `_events` is non-empty. But this re-fetch hits the same stale file again, producing the same result. The guard prevents infinite loops but does not solve the data staleness.

### Proposed Fix: Two Layers

**Layer 1: Update the fallback file.** Replace `/data/tides.json` with tide predictions far enough in the future to remain valid for months. Point Atkinson tide predictions are published years in advance by DFO. A file covering May 2026 through December 2026 (~1,400 events at 4/day) would be approximately 70 KB uncompressed, well within budget.

The file can be generated from the CHS (Canadian Hydrographic Service) tide tables, which are public domain. Update the file periodically (quarterly) as part of manual maintenance.

**Layer 2: Show the most recent past event when no future event exists.** As a defensive fallback, if `TideModule.next()` returns null, show the most recent past event with a "(PAST)" or similar indicator. This prevents total silence even with stale data.

```js
// In TideModule, add a lastPast() method:
lastPast() {
  const now = Date.now();
  let best = null;
  for (let i = 0; i < this._events.length; i++) {
    const t = new Date(this._events[i].time).getTime();
    if (t <= now && (!best || t > new Date(best.time).getTime())) {
      best = this._events[i];
    }
  }
  return best;
}
```

Modify `_applyNext()` to fall back to `lastPast()`:

```js
_applyNext() {
  const ev = this.next() || this.lastPast();
  if (ev) {
    AppState.tide.type = ev.type;
    AppState.tide.heightM = ev.heightM;
    AppState.tide.time = ev.time;
    AppState.meta.lastUpdate.tide = Date.now();
  }
  // Remove the re-fetch-when-all-past guard (it loops on stale data)
}
```

And adjust the rotator source to indicate whether the event is past:

```js
// In rotator source index 5:
function() {
  const t = AppState.tide;
  if (t.type === null) return null;
  const label = t.type === 'high' ? 'HIGH TIDE' : 'LOW TIDE';
  const h = t.heightM !== null ? t.heightM.toFixed(1) + 'M' : '';
  let timeStr = '';
  if (t.time) {
    timeStr = _formatTime(new Date(t.time));
  }
  return label + ' ' + h + ' ' + timeStr;
}
```

No change to the rotator source format is needed. Showing a past tide event time is still informative -- the user knows approximately where in the tidal cycle they are.

### Long-Term: Automated Fallback Refresh

CLAUDE.md mentions "Plan B (GitHub Actions cron) not yet implemented" for both DFO tides and EC alerts. A GitHub Actions workflow that fetches DFO tide predictions weekly and commits updated `/data/tides.json` would eliminate manual maintenance. This is out of scope for this document but is the correct long-term fix.

### Acceptance Criteria

- With updated `/data/tides.json`, the rotator shows tide information (e.g., `HIGH TIDE 4.3M 4:22 AM`).
- If all tide events are in the past, the most recent past event is shown rather than nothing.
- The tide rotator source appears during normal rotation and is not permanently skipped.
- No memory leaks from the re-fetch guard loop on stale data.

---

## Reliability and Failure Modes

| Change | Failure mode | Mitigation |
|--------|-------------|------------|
| Year in date | Date element wider; could clip on narrow viewports | Test on 1180x820. Manrope is narrow; "Wednesday · September 24 · 2026" is the widest case at ~35 characters. Current element has no width constraint. |
| Context-aware sun | `_parseSunTime` returns null if time format is unexpected | Existing null-guard in source function handles this. Falls through to next source. |
| Color modulation | HSL conversion rounding errors accumulate over 7+ days | `SkyColorModule.update()` recomputes from scratch each call (no accumulated state). Safe. |
| Tide fallback | `lastPast()` shows increasingly stale data if file is never updated | Acceptable degradation. The data is directionally correct (tide patterns repeat ~daily). Log a warning when showing data > 48h old. |

---

## Phase Dependencies

These changes are independent of each other and can be implemented in any order. All four depend only on the completed V0 codebase.

The tide fix depends on generating an updated `/data/tides.json` file with future predictions.

---

## Open Questions

1. **Year format:** "2026" or "'26"? Recommendation: "2026" (full year).
2. **Tomorrow's sunrise accuracy:** Is reusing today's sunrise time acceptable after sunset, or should `SunModule` compute tomorrow's sunrise explicitly? The difference is ~1 minute day-to-day at Vancouver's latitude.
3. **Seasonal color drift:** Worth implementing, or unnecessary complexity? See Section 3 analysis.
4. **Moderate AQI color:** Should AQI 51-100 trigger a subtle color shift? Vancouver sees moderate AQI frequently during wildfire season.
5. **Tide data source:** Who generates the updated `/data/tides.json`? Manual download from CHS, or automate via GitHub Actions?

---

## References

- SDD Section 9: Burn-in protection (eight layers)
- SDD Section 17: Layout and typography
- SDD Section 22: Acceptance criteria
- CLAUDE.md: Phase status, API status, project constraints
- CHS Tide Tables: https://www.tides.gc.ca/en/stations/07795 (Point Atkinson)
- DFO IWLS API: `api-iwls.dfo-mpo.gc.ca` (currently returning 404)
