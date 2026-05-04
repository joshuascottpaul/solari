# Phase 10: EC Weather Alerts

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 10 of 15                    |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 10 adds AlertModule, which polls the Environment Canada CAP feed for Metro Vancouver weather alerts every 15 minutes. When an alert is active, it preempts Slot B with the alert headline, doubles the hold time to 72s, and reverts automatically when the alert expires or clears.

## Goals

- AlertModule polls `weather.gc.ca` RSS/XML (CAP) feed every 15 minutes
- CORS probe on first fetch; fall back to `/data/alerts.json` on TypeError
- Parse XML with DOMParser, extract active (non-expired) alerts
- Store the most severe active alert in `AppState.alert`
- Truncate alert headline to 60 characters + ellipsis
- When alert is active, preempt Slot B via `RotatorModule.preempt('B', text)`
- When alert clears, release Slot B via `RotatorModule.release('B')`
- Preempted Slot B holds for 72s (double normal 36s) before re-displaying the alert

## Non-Goals

- No almanac entries (Phase 11)
- No holiday/observance entries (Phase 15)
- No multi-alert display; only the most severe active alert is shown
- No alert severity color changes or visual treatments beyond text preemption

## app.js Changes

### CONFIG Additions

Add `alertsMin` to `refresh` and `alertTruncateChars` to `display`:

```js
refresh: {
  weatherMin: 15,
  aqiMin: 30,
  tideHours: 6,
  alertsMin: 15          // NEW
},
display: {
  timeFormat: '12h',
  showSeconds: false,
  dateFormat: 'long',
  alertTruncateChars: 60  // NEW
}
```

### AppState Addition

Add after `tide`:

```js
alert: null   // or { severity, headline, description, expires }
```

### AlertModule

Place after TideModule, before MoonModule.

```js
const AlertModule = {
  _intervalId: null,
  _corsAvailable: null,   // true | false | null (untested)

  init() {},

  start() {
    this._fetchAndUpdate();
    this._intervalId = setInterval(
      () => this._fetchAndUpdate(),
      CONFIG.refresh.alertsMin * 60 * 1000
    );
  },

  async _fetchAndUpdate() {
    const alertData = await this._fetchAlerts();
    if (alertData !== null) {
      ResilienceManager.cache('alerts', alertData);
    } else {
      const c = ResilienceManager.cached('alerts');
      if (c) alertData = c.value;
    }

    const prev = AppState.alert;
    AppState.alert = alertData;
    AppState.meta.lastUpdate.alerts = Date.now();

    if (alertData && !prev) {
      // Alert became active: preempt Slot B
      RotatorModule.preempt('B', this._formatHeadline(alertData.headline));
    } else if (alertData && prev) {
      // Alert updated: refresh preempted text
      RotatorModule.preempt('B', this._formatHeadline(alertData.headline));
    } else if (!alertData && prev) {
      // Alert cleared: release Slot B
      RotatorModule.release('B');
    }
  },

  _formatHeadline(headline) {
    const max = CONFIG.display.alertTruncateChars;
    if (headline.length <= max) return headline.toUpperCase();
    return headline.substring(0, max).toUpperCase() + '\u2026';
  },

  async _fetchAlerts() {
    if (this._corsAvailable !== false) {
      const result = await this._fetchEC();
      if (result.alert !== undefined) {
        this._corsAvailable = true;
        return result.alert;   // may be null (no active alerts)
      }
      if (result.corsBlocked) {
        this._corsAvailable = false;
        console.warn('AlertModule: EC CORS blocked; falling back to /data/alerts.json');
      }
    }
    return await this._fetchLocal();
  },

  async _fetchEC() {
    const url = 'https://weather.gc.ca/rss/battleboard/bcrm30_e.xml';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) {
        console.warn('AlertModule: EC returned HTTP ' + resp.status);
        return { alert: undefined, corsBlocked: false };
      }
      const xml = await resp.text();
      const alert = this._parseCAP(xml);
      return { alert: alert, corsBlocked: false };
    } catch (e) {
      return { alert: undefined, corsBlocked: (e instanceof TypeError) };
    }
  },

  _parseCAP(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const entries = doc.querySelectorAll('entry');
    const now = Date.now();
    const sevOrder = { extreme: 0, severe: 1, moderate: 2, minor: 3 };
    let best = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const title = (entry.querySelector('title') || {}).textContent || '';
      const summary = (entry.querySelector('summary') || {}).textContent || '';
      const category = (entry.querySelector('category') || {}).textContent || '';
      const updated = (entry.querySelector('updated') || {}).textContent || '';
      const expires = (entry.querySelector('expires') || {}).textContent || updated;

      // Skip expired alerts
      if (expires && new Date(expires).getTime() < now) continue;
      // Skip "No watches or warnings" placeholder entries
      if (title.toLowerCase().indexOf('no watches or warnings') !== -1) continue;

      const sev = category.toLowerCase().trim();
      const sevRank = sevOrder[sev] !== undefined ? sevOrder[sev] : 9;

      if (!best || sevRank < best._rank) {
        best = {
          severity: sev || 'unknown',
          headline: title.trim(),
          description: summary.trim(),
          expires: expires,
          _rank: sevRank
        };
      }
    }

    if (!best) return null;
    delete best._rank;
    return best;
  },

  async _fetchLocal() {
    const data = await ResilienceManager.fetch('/data/alerts.json');
    if (!data) return null;
    // Local format: { severity, headline, description, expires } or null
    if (data.headline && data.expires) {
      if (new Date(data.expires).getTime() < Date.now()) return null;
      return data;
    }
    return null;
  }
};
```

### RotatorModule Additions

Add `_preempted` state and two new methods. Add `_preempted` initialization:

```js
// Add to RotatorModule object:
_preempted: { B: null },   // null or { text }
```

Add `preempt` and `release` methods:

```js
preempt(slot, text) {
  const key = slot.toUpperCase();
  this._preempted[key] = { text: text };

  // Immediately display alert text
  this.transition(key === 'A' ? 'A' : 'B', text);

  // Replace Slot B timer with doubled hold time
  if (key === 'B') {
    clearInterval(this._timerB);
    this._timerB = setInterval(
      () => this._rotatePreempted('B'),
      CONFIG.rotation.slotBHoldSec * 2 * 1000   // 72s
    );
  }
},

release(slot) {
  const key = slot.toUpperCase();
  this._preempted[key] = null;

  // Restore normal Slot B timer
  if (key === 'B') {
    clearInterval(this._timerB);
    this._timerB = setInterval(
      () => this._rotate('B'),
      CONFIG.rotation.slotBHoldSec * 1000   // 36s
    );
    // Immediately rotate to next normal source
    this._rotate('B');
  }
},

_rotatePreempted(slot) {
  const key = slot.toUpperCase();
  const p = this._preempted[key];
  if (!p) return;
  // Re-display the alert text (triggers split-flap animation for visual refresh)
  this.transition(key === 'A' ? 'A' : 'B', p.text);
}
```

Modify `_rotate` to check preemption state:

```js
_rotate(slot) {
  // If this slot is preempted, skip normal rotation
  if (this._preempted[slot]) return;
  // ... existing code unchanged
}
```

### Boot Sequence

Add AlertModule.init() and AlertModule.start():

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
  AlertModule.start();             // NEW: 15-min poll + CORS probe
  DriftEngine.start();
  RotatorModule.start();
})();
```

AlertModule.start() runs after TideModule.start() and before RotatorModule.start(). No init() work is needed, but the empty init() is kept for pattern consistency.

## CORS Fallback Behavior

| Scenario | Action |
|----------|--------|
| First fetch succeeds | Set `_corsAvailable = true`, parse XML normally |
| TypeError on fetch | Set `_corsAvailable = false`, log warning, fall back to `/data/alerts.json` |
| HTTP error (4xx/5xx) | Log warning, retry on next 15-min interval (do not mark CORS broken) |
| Local fallback fails | `AppState.alert` stays null, no preemption |

The `/data/alerts.json` fallback file is maintained by a GitHub Actions cron job (same pattern as tides). Format:

```json
{ "severity": "moderate", "headline": "Wind warning in effect", "description": "...", "expires": "2026-05-04T06:00:00Z" }
```

Or `null` if no active alerts.

## Preemption State Machine

```
NORMAL ──[alert active]──> PREEMPTED ──[alert cleared/expired]──> NORMAL
  |                            |
  |  Slot B: 36s rotation      |  Slot B: 72s hold, alert text only
  |  Sources: weather/AQI/tide |  _rotate('B') is a no-op
```

## Acceptance Criteria

1. AlertModule fetches EC CAP feed on boot and every 15 minutes
2. On CORS failure (TypeError), falls back to `/data/alerts.json` permanently for the session
3. On HTTP error, retries on next interval without marking CORS broken
4. XML parsing extracts title, summary, category from `<entry>` elements
5. Expired alerts and "no watches or warnings" placeholders are filtered out
6. When multiple active alerts exist, the most severe is selected
7. `AppState.alert` is `{ severity, headline, description, expires }` or `null`
8. Alert headline is truncated to 60 characters + ellipsis if longer, uppercased
9. When alert activates, Slot B immediately shows alert text via split-flap transition
10. Slot B hold time doubles to 72s during preemption
11. When alert clears, Slot B reverts to normal 36s rotation and immediately shows next source
12. Normal `_rotate('B')` is a no-op while preempted
13. All previous phase functionality intact; no console errors

## References

- SDD Sections: 7.1 (EC CAP feed), 7.2 (CORS fallback), 8.1 (AlertModule interface), 16 (AppState.alert), 18 (truncation), 19 (Phase 10)
- Phase 9 spec: `docs/phase-09-rotator-kinetic.md`
- EC feed URL: `https://weather.gc.ca/rss/battleboard/bcrm30_e.xml`
