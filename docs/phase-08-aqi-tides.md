# Phase 8: AQI + Tides

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 8 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 8 adds AirQualityModule and TideModule. Both fetch from public APIs on independent poll intervals and write to AppState. No UI display yet (Phase 9). SkyColorModule gains AQI-based hue modulation for unhealthy air. The DFO tides endpoint is probed for CORS; if it fails, TideModule falls back to a local `/data/tides.json` file.

## Goals

- AirQualityModule polls Open-Meteo Air Quality API every 30 minutes; writes `AppState.aqi`
- TideModule polls DFO IWLS API every 6 hours; writes `AppState.tide` with the next upcoming high/low event
- `TideModule.next()` returns the next high/low event after `Date.now()`; triggers re-fetch if all events are in the past
- SkyColorModule shifts hue +30 degrees toward warm/orange when AQI band is `unhealthy` or worse
- CORS probe: TideModule attempts a direct fetch on boot; if it fails, falls back to `/data/tides.json`
- Both modules use ResilienceManager for retry/backoff and localStorage caching

## Non-Goals

- No slot display of AQI or tide data (Phase 9)
- No EC weather alerts (Phase 10)
- No GitHub Actions workflow for tide data (documented as Plan B; built only if CORS confirmed broken)

## app.js Changes

### CONFIG Additions

```js
refresh: {
  weatherMin: 15,   // existing
  aqiMin: 30,       // NEW
  tideHours: 6      // NEW
},
location: {
  name: 'Vancouver, BC',
  latitude: 49.2827,
  longitude: -123.1207,
  timezone: 'America/Vancouver',
  tideStation: '07795'   // NEW: Point Atkinson
}
```

### AppState Additions

```js
aqi: {
  value: null,       // US AQI integer (0-500)
  pm25: null,        // PM2.5 in ug/m3
  band: null         // 'good' | 'moderate' | 'unhealthy' | 'very_unhealthy' | 'hazardous'
},
tide: {
  type: null,        // 'high' | 'low'
  heightM: null,     // metres
  time: null         // ISO 8601 string with timezone offset
}
```

### AirQualityModule

Place after WeatherModule.

```js
const AirQualityModule = {
  _intervalId: null,

  _BANDS: [
    [  0,  50, 'good'],
    [ 51, 100, 'moderate'],
    [101, 150, 'unhealthy'],
    [151, 200, 'very_unhealthy'],
    [201, 500, 'hazardous']
  ],

  init() {},

  start() {
    this.fetch();
    this._intervalId = setInterval(
      () => this.fetch(),
      CONFIG.refresh.aqiMin * 60 * 1000
    );
  },

  async fetch() {
    const lat = CONFIG.location.latitude;
    const lng = CONFIG.location.longitude;
    const tz = CONFIG.location.timezone;
    const url =
      'https://air-quality-api.open-meteo.com/v1/air-quality' +
      '?latitude=' + lat +
      '&longitude=' + lng +
      '&current=us_aqi,pm2_5' +
      '&timezone=' + tz;

    const data = await ResilienceManager.fetch(url);

    if (data && data.current) {
      const aqi = data.current.us_aqi;
      const pm25 = data.current.pm2_5;
      AppState.aqi.value = aqi;
      AppState.aqi.pm25 = pm25;
      AppState.aqi.band = this._band(aqi);
      ResilienceManager.cache('aqi', AppState.aqi);
      AppState.meta.lastUpdate.aqi = Date.now();
      SkyColorModule.update();
    } else {
      const c = ResilienceManager.cached('aqi');
      if (c) Object.assign(AppState.aqi, c.value);
    }
  },

  _band(aqi) {
    for (const [lo, hi, name] of this._BANDS) {
      if (aqi >= lo && aqi <= hi) return name;
    }
    return 'hazardous';  // above 500
  }
};
```

**API response shape (Open-Meteo Air Quality):**

```json
{
  "current": {
    "time": "2026-05-03T14:00",
    "us_aqi": 23,
    "pm2_5": 5.2
  }
}
```

### TideModule

Place after AirQualityModule.

```js
const TideModule = {
  _intervalId: null,
  _events: [],           // cached array of tide events from last fetch
  _corsAvailable: null,  // true | false | null (untested)

  init() {},

  start() {
    this._fetchAndUpdate();
    this._intervalId = setInterval(
      () => this._fetchAndUpdate(),
      CONFIG.refresh.tideHours * 60 * 60 * 1000
    );
  },

  async _fetchAndUpdate() {
    const events = await this._fetchEvents();
    if (events && events.length > 0) {
      this._events = events;
      ResilienceManager.cache('tide_events', events);
    } else {
      // Try cache
      const c = ResilienceManager.cached('tide_events');
      if (c) this._events = c.value;
    }
    this._applyNext();
  },

  next() {
    const now = Date.now();
    const ev = this._events.find(e => new Date(e.time).getTime() > now);
    return ev || null;
  },

  _applyNext() {
    const ev = this.next();
    if (ev) {
      AppState.tide.type = ev.type;
      AppState.tide.heightM = ev.heightM;
      AppState.tide.time = ev.time;
      AppState.meta.lastUpdate.tide = Date.now();
    } else if (this._events.length > 0) {
      // All events in the past; re-fetch
      this._fetchAndUpdate();
    }
  },

  async _fetchEvents() {
    // Try DFO API first (if CORS not yet known to be broken)
    if (this._corsAvailable !== false) {
      const events = await this._fetchDFO();
      if (events) {
        this._corsAvailable = true;
        return events;
      }
      // If this was the first attempt and it failed, mark CORS broken
      if (this._corsAvailable === null) {
        this._corsAvailable = false;
        console.warn('TideModule: DFO CORS failed; falling back to /data/tides.json');
      }
    }

    // Fallback: local file
    return await this._fetchLocal();
  },

  async _fetchDFO() {
    const station = CONFIG.location.tideStation;
    const now = new Date();
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const url =
      'https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/' + station + '/data' +
      '?time-series-code=wlp-hilo' +
      '&from=' + now.toISOString() +
      '&to=' + to.toISOString();

    const data = await ResilienceManager.fetch(url);
    if (!data) return null;
    return this._parseDFO(data);
  },

  _parseDFO(data) {
    // DFO returns: [{ "eventDate": "...", "value": 4.7,
    //                 "qcFlagCode": "...", "timeSeriesId": "..." }, ...]
    // The wlp-hilo series alternates high/low. Value > previous = high.
    if (!Array.isArray(data) || data.length === 0) return null;

    const events = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const heightM = Math.round(d.value * 100) / 100;
      // Determine high/low: compare with neighbors
      const prev = i > 0 ? data[i - 1].value : null;
      const next = i < data.length - 1 ? data[i + 1].value : null;
      let type;
      if (prev !== null) {
        type = heightM > prev ? 'high' : 'low';
      } else if (next !== null) {
        type = heightM > next ? 'high' : 'low';
      } else {
        type = 'high';  // single event, assume high
      }
      events.push({
        type: type,
        heightM: heightM,
        time: d.eventDate
      });
    }
    return events;
  },

  async _fetchLocal() {
    const data = await ResilienceManager.fetch('/data/tides.json');
    if (!data || !Array.isArray(data)) return null;
    // Local format matches our internal event shape:
    // [{ "type": "high", "heightM": 4.7, "time": "ISO8601" }, ...]
    return data;
  }
};
```

**DFO IWLS API request:**

```
GET https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/07795/data
  ?time-series-code=wlp-hilo
  &from=2026-05-03T14:00:00.000Z
  &to=2026-05-04T14:00:00.000Z
```

**DFO response shape (expected):**

```json
[
  { "eventDate": "2026-05-03T16:32:00Z", "value": 4.72, "qcFlagCode": "2", "timeSeriesId": "..." },
  { "eventDate": "2026-05-03T22:08:00Z", "value": 1.13, "qcFlagCode": "2", "timeSeriesId": "..." }
]
```

**Fallback `/data/tides.json` format:**

```json
[
  { "type": "high", "heightM": 4.72, "time": "2026-05-03T16:32:00-07:00" },
  { "type": "low",  "heightM": 1.13, "time": "2026-05-03T22:08:00-07:00" }
]
```

### CORS Probe Logic

TideModule probes CORS implicitly on its first fetch. ResilienceManager.fetch already uses `fetch()` with AbortController. If the DFO server does not send `Access-Control-Allow-Origin`, the browser rejects the request and ResilienceManager returns `null` after 3 retries.

On first failure, TideModule sets `_corsAvailable = false`, logs a warning, and falls back to `/data/tides.json` for this session and all subsequent fetches. On success, it sets `_corsAvailable = true` and continues using the DFO API.

The CORS result should be documented in the commit message or a comment in app.js after testing.

### SkyColorModule AQI Modulation

Add to `SkyColorModule.update()`, after the weather modulation block:

```js
// Phase 8: AQI hue shift for unhealthy air
const aqiBand = AppState.aqi.band;
if (aqiBand === 'unhealthy' || aqiBand === 'very_unhealthy' || aqiBand === 'hazardous') {
  rgb = this._applyWeatherMod(rgb, [1.0, 0, 30]);
}
```

This reuses the existing `_applyWeatherMod` method. The parameters `[1.0, 0, 30]` mean: no saturation change, no lightness change, +30 degree hue shift toward warm/orange. The shift stacks with any active weather modulation.

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
  AirQualityModule.start();   // NEW: 30-min poll
  TideModule.start();         // NEW: 6h poll + CORS probe
  DriftEngine.start();
})();
```

AirQualityModule starts before TideModule. Both fire their first fetch immediately. DriftEngine remains last.

## Files Changed

| File       | Change                                                                     |
|------------|----------------------------------------------------------------------------|
| app.js     | Add CONFIG.refresh.aqiMin, CONFIG.refresh.tideHours, CONFIG.location.tideStation, AppState.aqi, AppState.tide, AirQualityModule, TideModule, SkyColorModule AQI hue shift, boot sequence update |
| data/tides.json | New file: manually populated tide data for fallback testing (not committed to git long-term if CORS works) |

No HTML or CSS changes. No new dependencies.

## Acceptance Criteria

1. After boot, `AppState.aqi.value` is a non-null integer and `AppState.aqi.band` is one of the five valid strings
2. `AppState.aqi.band` maps correctly: value 45 produces `good`, value 75 produces `moderate`, value 120 produces `unhealthy`
3. AirQualityModule re-fetches every 30 minutes (verify `_intervalId` is set with 1800000ms interval)
4. After boot, `AppState.tide.type` is `high` or `low`, `AppState.tide.heightM` is a number, `AppState.tide.time` is a valid ISO 8601 string
5. `TideModule.next()` returns the first event with a time after `Date.now()`; returns `null` if no future events exist
6. If DFO CORS fails, console shows the warning and `TideModule._corsAvailable === false`; subsequent fetches read `/data/tides.json` without re-attempting DFO
7. If DFO CORS succeeds, `TideModule._corsAvailable === true` and no fallback is used
8. When `AppState.aqi.band` is `unhealthy`, sky color hue shifts +30 degrees compared to the same sun altitude with `good` AQI
9. When `AppState.aqi.band` is `good` or `moderate`, no AQI hue shift is applied
10. Both modules use ResilienceManager.cache/cached; after a failed fetch, cached values are restored to AppState
11. All previous phase functionality still works; no console errors

## References

- SDD Sections: 7.1 (API endpoints), 7.2 (CORS), 8.1 (module interfaces), 10.2 (weather/AQI modulation), 16 (AppState schema), 18 (CONFIG), 19 (Phase 8)
- Phase 7 spec: `docs/phase-07-perlin-drift.md`
