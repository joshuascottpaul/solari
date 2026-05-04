# Phase 6: Weather Fetch + Sky Color Modulation

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 6 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 6 adds ResilienceManager (fetch wrapper with retry, backoff, and localStorage caching), WeatherModule (polls Open-Meteo every 15 minutes), and weather-based modulation of the sky color palette. This is the first phase that makes network requests. Weather conditions shift the existing altitude-derived color in HSL space (desaturating for clouds, cooling hue for rain, etc.).

## Goals

- ResilienceManager wraps fetch with 3-attempt retry, exponential backoff, 10s timeout, and localStorage caching
- WeatherModule fetches current weather from Open-Meteo and writes `AppState.weather`
- WMO weather codes map to six condition labels: CLEAR, PARTLY_CLOUDY, FOG, RAIN, SNOW, STORM
- SkyColorModule applies HSL modulation based on weather condition after computing the base altitude color
- SunModule adopts API-provided sunrise/sunset/daylight_duration from the Open-Meteo response
- On first load, fetch immediately; then poll every 15 minutes
- On fetch failure, fall back to cached data; if no cache, weather stays null (no modulation applied)

## Non-Goals

- No AQI fetch or smoke/haze modulation (Phase 8)
- No tide fetch (Phase 8)
- No alert fetch (Phase 10)
- No display of weather data in slots (Phase 9 rotator)
- No user-configurable location (hardcoded to Vancouver)

## app.js Changes

### CONFIG Addition

Add `refresh` to CONFIG, after `location`:

```js
refresh: {
  weatherMin: 15
}
```

### AppState Addition

Add `weather` to AppState, after `moon`:

```js
weather: {
  tempC: null,
  code: null,
  condition: null   // 'CLEAR' | 'PARTLY_CLOUDY' | 'FOG' | 'RAIN' | 'SNOW' | 'STORM' | null
}
```

### ResilienceManager

Place after AppState, before all modules. Every future phase that fetches data uses this.

```js
const ResilienceManager = {
  async fetch(url, opts = {}) {
    const maxAttempts = 3;
    const baseDelay = 1000;
    const timeout = 10000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const resp = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(timer);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
      } catch (e) {
        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        }
      }
    }
    return null;  // all attempts failed
  },

  cache(key, value) {
    try {
      localStorage.setItem(`solari_${key}`, JSON.stringify({
        value,
        ts: Date.now()
      }));
    } catch (e) { /* quota exceeded or unavailable */ }
  },

  cached(key) {
    try {
      const raw = localStorage.getItem(`solari_${key}`);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      return { value: entry.value, ageSec: (Date.now() - entry.ts) / 1000 };
    } catch (e) {
      return null;
    }
  }
};
```

Retry schedule: attempt 0 (immediate), attempt 1 (after 1s), attempt 2 (after 2s). Total worst-case wall time: 3 timeouts + 3s delay = 33s.

### WeatherModule

Place after SunModule, before SkyColorModule.

```js
const WeatherModule = {
  _intervalId: null,

  _WMO_MAP: {
    0: 'CLEAR',
    1: 'PARTLY_CLOUDY', 2: 'PARTLY_CLOUDY', 3: 'PARTLY_CLOUDY',
    45: 'FOG', 48: 'FOG',
    51: 'RAIN', 53: 'RAIN', 55: 'RAIN', 56: 'RAIN', 57: 'RAIN',
    61: 'RAIN', 63: 'RAIN', 65: 'RAIN', 66: 'RAIN', 67: 'RAIN',
    80: 'RAIN', 81: 'RAIN', 82: 'RAIN',
    71: 'SNOW', 73: 'SNOW', 75: 'SNOW', 77: 'SNOW', 85: 'SNOW', 86: 'SNOW',
    95: 'STORM', 96: 'STORM', 99: 'STORM'
  },

  init() {},

  start() {
    this.fetch();
    this._intervalId = setInterval(
      () => this.fetch(),
      CONFIG.refresh.weatherMin * 60 * 1000
    );
  },

  async fetch() {
    const lat = CONFIG.location.latitude;
    const lng = CONFIG.location.longitude;
    const tz = CONFIG.location.timezone;
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code` +
      `&daily=sunrise,sunset,daylight_duration` +
      `&timezone=${tz}` +
      `&temperature_unit=celsius&wind_speed_unit=kmh`;

    const data = await ResilienceManager.fetch(url);

    if (data && data.current) {
      const code = data.current.weather_code;
      AppState.weather.tempC = Math.round(data.current.temperature_2m);
      AppState.weather.code = code;
      AppState.weather.condition = this._WMO_MAP[code] || 'CLEAR';
      ResilienceManager.cache('weather', AppState.weather);

      // Update SunModule with API sunrise/sunset (more accurate than SunCalc)
      if (data.daily) {
        this._updateSunFromAPI(data.daily);
      }

      AppState.meta.lastUpdate.weather = Date.now();
      SkyColorModule.update();
    } else {
      // Fetch failed; try cache
      const c = ResilienceManager.cached('weather');
      if (c) {
        Object.assign(AppState.weather, c.value);
        SkyColorModule.update();
      }
      // If no cache, weather stays null; SkyColorModule applies no modulation
    }
  },

  _updateSunFromAPI(daily) {
    // daily.sunrise and daily.sunset are arrays; index 0 = today
    if (daily.sunrise && daily.sunrise[0]) {
      const sr = new Date(daily.sunrise[0]);
      AppState.sun.sunrise = SunModule._formatTime(sr);
    }
    if (daily.sunset && daily.sunset[0]) {
      const ss = new Date(daily.sunset[0]);
      AppState.sun.sunset = SunModule._formatTime(ss);
    }
    if (daily.daylight_duration && daily.daylight_duration[0]) {
      // API returns seconds; convert to minutes
      AppState.sun.dayLengthMin = Math.round(daily.daylight_duration[0] / 60);
    }
  }
};
```

### SkyColorModule Weather Modulation

Replace `SkyColorModule.update()` to apply weather modulation after computing the base altitude color. The modulation operates in HSL space.

Weather modulation table:

| Condition      | Saturation | Lightness | Hue           |
|----------------|------------|-----------|---------------|
| CLEAR          | no change  | no change | no change     |
| PARTLY_CLOUDY  | -10%       | no change | no change     |
| FOG            | -50%       | +5%       | no change     |
| RAIN           | -30%       | no change | +15 (cooler)  |
| SNOW           | -40%       | no change | +30 (blue)    |
| STORM          | -30%       | no change | +15 (cooler)  |

Updated module:

```js
const SkyColorModule = {
  _bands: [
    [-90, -18, [154, 160, 200]],
    [-18,  -6, [122, 134, 176]],
    [ -6,   0, [232, 155, 111]],
    [  0,   6, [244, 197, 108]],
    [  6,  30, [240, 235, 220]],
    [ 30,  90, [242, 242, 242]]
  ],

  // Weather modulation parameters: [satMult, lightAdd, hueAdd]
  // satMult is multiplicative (0.7 = 30% reduction). lightAdd and hueAdd are absolute.
  _weatherMod: {
    CLEAR:         [1.0,   0,  0],
    PARTLY_CLOUDY: [0.90,  0,  0],
    FOG:           [0.50,  5,  0],
    RAIN:          [0.70,  0, 15],
    SNOW:          [0.60,  0, 30],
    STORM:         [0.70,  0, 15]
  },

  update() {
    const alt = AppState.sun.altitude;
    let rgb = this._altitudeToRGB(alt);

    // Phase 6: apply weather modulation
    const cond = AppState.weather.condition;
    if (cond && this._weatherMod[cond]) {
      rgb = this._applyWeatherMod(rgb, this._weatherMod[cond]);
    }

    const root = document.documentElement.style;
    root.setProperty('--type-primary',
      `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    root.setProperty('--type-secondary',
      `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.62)`);
  },

  _applyWeatherMod(rgb, [satMult, lightAdd, hueAdd]) {
    let [h, s, l] = this._rgbToHsl(rgb[0], rgb[1], rgb[2]);
    s *= satMult;
    l = Math.min(100, Math.max(0, l + lightAdd));
    h = (h + hueAdd) % 360;
    return this._hslToRgb(h, s, l);
  },

  // --- RGB <-> HSL conversion (0-255 RGB, 0-360 H, 0-100 S/L) ---

  _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h * 360, s * 100, l * 100];
  },

  _hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1/3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1/3) * 255)
    ];
  },

  _altitudeToRGB(alt) { /* unchanged from Phase 5 */ },
  _lerp(a, b, t)      { /* unchanged from Phase 5 */ }
};
```

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
  WeatherModule.start();   // NEW: begins 15-min poll; first fetch is immediate
})();
```

WeatherModule.start() goes last because its first fetch is async and calls SkyColorModule.update() on completion. The synchronous SkyColorModule.update() at boot ensures colors are set immediately from altitude before the fetch resolves.

## Files Changed

| File   | Change                                                                                    |
|--------|-------------------------------------------------------------------------------------------|
| app.js | Add CONFIG.refresh, AppState.weather, ResilienceManager, WeatherModule; update SkyColorModule with HSL modulation and RGB/HSL converters; update boot sequence |

No HTML or CSS changes.

## Acceptance Criteria

1. On load with network available, `AppState.weather` is populated within a few seconds (check console: `AppState.weather.condition` is not null)
2. `localStorage.getItem('solari_weather')` contains cached weather JSON with a `ts` field
3. Simulate rain: `AppState.weather.condition = 'RAIN'; SkyColorModule.update();` shifts hue cooler and desaturates vs. `AppState.weather.condition = 'CLEAR'; SkyColorModule.update();`
4. Simulate fog: `AppState.weather.condition = 'FOG'; SkyColorModule.update();` produces noticeably desaturated, slightly lighter color
5. Kill network (DevTools offline), wait 15 min for next poll; `AppState.weather` retains cached values
6. Clear localStorage, go offline, reload; `AppState.weather.condition` is null and SkyColorModule uses base altitude palette with no modulation
7. `AppState.sun.sunrise` and `AppState.sun.sunset` update to API-provided values after first successful fetch
8. All previous phase functionality (clock, date, moon disc, altitude-based sky color) still works
9. No errors in console during normal operation or during fetch failures

## References

- SDD Sections: 7.1 (Open-Meteo API), 8.1 (WeatherModule, ResilienceManager), 10.2 (weather modulation), 10.3 (compute order), 16 (AppState.weather), 19 (Phase 6)
- Phase 5 spec: `docs/phase-05-sky-color.md`
