// app.js -- Solari application modules. Loaded from Phase 2 onward.

const CONFIG = {
  display: {
    timeFormat: '12h',   // '12h' | '24h'
    showSeconds: false,
    dateFormat: 'long',   // 'long' = "Wednesday · May 3"
    alertTruncateChars: 60
  },
  location: {
    name: 'Vancouver, BC',
    latitude: 49.2827,
    longitude: -123.1207,
    timezone: 'America/Vancouver',
    tideStation: '5cebf1de3d0f4a073c4bb994',
    ecAlertRegion: 'bcrm30'
  },
  refresh: {
    weatherMin: 15,
    aqiMin: 30,
    tideHours: 6,
    alertsMin: 15,
    softReloadHours: 24
  },
  rotation: {
    slotHoldSec: 32,
    transitionMs: 1500,
    cascadeStaggerMs: 70,
    almanacHorizonDays: 7
  },
  // Phase 16: face system foundation
  clockface: {
    defaultFaceId: 'calm',
    reloadOnApply: true
  },
  stage: {
    width: 1180,
    height: 820
  },
  // Per-element-class drift parameters. Phase 16 active: time, date, slot, moon.
  // Reserved (unused until 17-20): sun (P20), horizon (P20), departureRow (P18), tickRail (P17).
  // All seven periods are pairwise coprime.
  driftClasses: {
    time:         { ampX: 24, ampY: 18, periodSec: 117 },
    date:         { ampX: 12, ampY: 8,  periodSec: 89  },
    slot:         { ampX: 12, ampY: 8,  periodSec: 143 },
    moon:         { ampX: 18, ampY: 12, periodSec: 73  },
    sun:          { ampX: 18, ampY: 12, periodSec: 101 },
    horizon:      { ampX: 18, ampY: 12, periodSec: 101 },
    departureRow: { ampX: 6,  ampY: 4,  periodSec: 61  },
    tickRail:     { ampX: 4,  ampY: 3,  periodSec: 79  }
  },
  pixelShift: {
    intervalMin: 6,
    amplitude: 4
  },
  tweakDefaults: {
    accent: 'gold',
    driftIntensity: 'normal',
    byFace: {}
  },
  refresher: {
    enabled: true,
    triggerHour: 3,
    holdSec: 30,
    fadeSec: 3,
    color: '#404040'
  },
  luminanceBreath: {
    enabled: true,
    periodMin: 30,
    amplitude: 0.15
  },
  observances: {
    builtInEnabled: true,
    customObservances: [
      // { name: 'JOSH BIRTHDAY', date: '07-15', glyph: '\u2737',
      //   treatment: 'major',
      //   palette: { mode: 'override', primary: '#F4C56C' },
      //   slotEntry: 'JOSH BIRTHDAY' }
    ]
  },
  build: {
    version: '0.5',
    hash: 'd876bb7',
    date: '2026-05-05'
  },
  macroShift: {
    enabled: true,
    timeIntervalHours: 3,
    timeTransitionSec: 60,
    timeHomes: [
      [50, 44], [35, 38], [65, 38],
      [50, 52], [40, 46], [60, 46]
    ],
    moonIntervalHours: 6,
    moonTransitionSec: 60,
    moonHomes: [
      [84, 12], [16, 12], [84, 62], [16, 62]
    ]
  }
};

// Phase 16: drift intensity multipliers applied across all driftClasses.
const DRIFT_INTENSITY_MULT = {
  off:      0.0,
  subtle:   0.5,
  normal:   1.0,
  restless: 1.5
};

// Phase 16: accent palette. `gold` is the shipped V0 value; sky/sage/paper are
// chihiro's starting values, flagged for visual tuning in 17-20.
const ACCENT_PALETTE = {
  gold:  { hex: '#F4C56C', secondary: 'rgba(240, 235, 220, 0.62)' },
  sky:   { hex: '#7FA8C9', secondary: 'rgba(220, 232, 245, 0.62)' },
  sage:  { hex: '#9CB48A', secondary: 'rgba(225, 235, 218, 0.62)' },
  paper: { hex: '#E8E0D0', secondary: 'rgba(240, 235, 220, 0.62)' }
};

const AppState = {
  time: {
    hours: 0,
    minutes: 0,
    seconds: 0,
    ampm: null
  },
  date: {
    dayOfWeek: '',
    day: 0,
    month: '',
    year: 0,
    isoDate: ''
  },
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
  },
  weather: {
    tempC: null,
    code: null,
    condition: null      // 'CLEAR' | 'PARTLY_CLOUDY' | 'FOG' | 'RAIN' | 'SNOW' | 'STORM' | null
  },
  aqi: {
    value: null,       // US AQI integer (0-500)
    pm25: null,        // PM2.5 in ug/m3
    band: null         // 'good' | 'moderate' | 'unhealthy' | 'very_unhealthy' | 'hazardous'
  },
  tide: {
    type: null,        // 'high' | 'low'
    heightM: null,     // metres
    time: null         // ISO 8601 string with timezone offset
  },
  alert: null,         // or { severity, headline, description, expires }
  alertPreempt: null,  // or formatted headline string; rotator reads this to preempt slot
  almanac: null,       // or { name, date, daysAway }
  rotator: {
    text: '',
    index: 0
  },
  observance: null,
  // When active: { name, glyph, treatment, palette, slotEntry, dateString }
  meta: {
    bootedAt: null,
    lastUpdate: {}
  }
};

function _formatTime(date) {
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
    console.warn('ResilienceManager: all attempts failed for', url);
    return null;
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
  },

  softReload() {
    const uptime = Date.now() - AppState.meta.bootedAt;
    if (uptime > CONFIG.refresh.softReloadHours * 3600000) {
      location.reload();
    }
  }
};

const ClockModule = {
  start() {
    this._tick();
  },

  now() {
    return new Date();
  },

  _tick() {
    const now = this.now();
    this._updateState(now);
    DisplayModule.render();

    // Self-correcting timeout:
    // Target the next whole second boundary.
    // Calculate ms until the next second, then adjust
    // for any drift from the expected tick time.
    const msToNextSecond = 1000 - now.getMilliseconds();
    setTimeout(() => this._tick(), msToNextSecond);
  },

  _updateState(now) {
    try {
      const h24 = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      if (CONFIG.display.timeFormat === '12h') {
        AppState.time.hours = h24 % 12 || 12;
        AppState.time.ampm = h24 < 12 ? 'AM' : 'PM';
      } else {
        AppState.time.hours = h24;
        AppState.time.ampm = null;
      }
      AppState.time.minutes = m;
      AppState.time.seconds = s;

      // Only recompute date fields when the calendar day changes
      const iso = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');

      if (iso !== AppState.date.isoDate) {
        AppState.date.dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
        AppState.date.day = now.getDate();
        AppState.date.month = now.toLocaleDateString('en-US', { month: 'long' });
        AppState.date.year = now.getFullYear();
        AppState.date.isoDate = iso;
      }

      AppState.meta.lastUpdate.clock = now.getTime();
    } catch (e) {
      // Tick continues on next cycle even if this one fails
    }
  }
};

const SunModule = {
  _intervalId: null,

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
      AppState.sun.sunrise = _formatTime(times.sunrise);
      AppState.sun.sunset = _formatTime(times.sunset);

      // Day length in minutes
      const diffMs = times.sunset.getTime() - times.sunrise.getTime();
      AppState.sun.dayLengthMin = Math.round(diffMs / 60000);

      AppState.meta.lastUpdate.sun = now.getTime();
      SkyColorModule.update();       // recompute colors after altitude changes
    } catch (e) {
      // Continues on next interval
    }
  },

  _toDeg(rad) {
    return Math.round((rad * 180 / Math.PI) * 10) / 10;
  }
};

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
      RotatorModule.refresh();
    } else {
      // Fetch failed; try cache
      const c = ResilienceManager.cached('weather');
      if (c) {
        Object.assign(AppState.weather, c.value);
        SkyColorModule.update();
        RotatorModule.refresh();
      }
      // If no cache, weather stays null; SkyColorModule applies no modulation
    }
  },

  _updateSunFromAPI(daily) {
    // daily.sunrise and daily.sunset are arrays; index 0 = today
    if (daily.sunrise && daily.sunrise[0]) {
      AppState.sun.sunrise = _formatTime(new Date(daily.sunrise[0]));
    }
    if (daily.sunset && daily.sunset[0]) {
      AppState.sun.sunset = _formatTime(new Date(daily.sunset[0]));
    }
    if (daily.daylight_duration && daily.daylight_duration[0]) {
      // API returns seconds; convert to minutes
      AppState.sun.dayLengthMin = Math.round(daily.daylight_duration[0] / 60);
    }
  }
};

const AirQualityModule = {
  _intervalId: null,

  _BANDS: [
    [  0,  50, 'good'],
    [ 51, 100, 'moderate'],
    [101, 150, 'unhealthy'],
    [151, 200, 'very_unhealthy'],
    [201, 500, 'hazardous']
  ],

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
      RotatorModule.refresh();
    } else {
      const c = ResilienceManager.cached('aqi');
      if (c) {
        Object.assign(AppState.aqi, c.value);
        RotatorModule.refresh();
      }
    }
  },

  _band(aqi) {
    for (const [lo, hi, name] of this._BANDS) {
      if (aqi >= lo && aqi <= hi) return name;
    }
    return 'hazardous';  // above 500
  }
};

const TideModule = {
  _intervalId: null,
  _events: [],           // cached array of tide events from last fetch
  _corsAvailable: null,  // true | false | null (untested)

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
    RotatorModule.refresh();
  },

  next() {
    const now = Date.now();
    const future = this._events.find(e => new Date(e.time).getTime() > now);
    if (future) return future;
    // No future events; show the most recent past event
    if (this._events.length > 0) return this._events[this._events.length - 1];
    return null;
  },

  _applyNext() {
    const ev = this.next();
    if (ev) {
      AppState.tide.type = ev.type;
      AppState.tide.heightM = ev.heightM;
      AppState.tide.time = ev.time;
      AppState.meta.lastUpdate.tide = Date.now();
    } else if (this._events.length > 0 && !this._refetchInFlight) {
      // All events in the past; re-fetch once (guard prevents re-entry loop)
      this._events = [];
      this._refetchInFlight = true;
      this._fetchAndUpdate().finally(() => { this._refetchInFlight = false; });
    }
  },

  async _fetchEvents() {
    // Try DFO API first (if CORS not yet known to be broken)
    if (this._corsAvailable !== false) {
      const result = await this._fetchDFO();
      if (result.events) {
        this._corsAvailable = true;
        return result.events;
      }
      // Only mark CORS broken on TypeError (network/CORS failure),
      // not on HTTP errors (400, 500, etc.) which should be retried.
      if (result.corsBlocked) {
        this._corsAvailable = false;
        console.warn('TideModule: DFO CORS blocked; falling back to /data/tides.json');
      } else if (result.httpStatus) {
        console.warn('TideModule: DFO returned HTTP ' + result.httpStatus + '; will retry next interval');
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
      '?time-series-code=wlp' +
      '&from=' + now.toISOString() +
      '&to=' + to.toISOString();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) {
        return { events: null, httpStatus: resp.status, corsBlocked: false };
      }
      const data = await resp.json();
      const events = this._parseDFO(data);
      return { events: events, httpStatus: null, corsBlocked: false };
    } catch (e) {
      // TypeError indicates a network-level / CORS failure
      const isCors = (e instanceof TypeError);
      return { events: null, httpStatus: null, corsBlocked: isCors };
    }
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

const AlertModule = {
  _intervalId: null,
  _corsAvailable: null,   // true | false | null (untested)

  start() {
    this._fetchAndUpdate();
    this._intervalId = setInterval(
      () => this._fetchAndUpdate(),
      CONFIG.refresh.alertsMin * 60 * 1000
    );
  },

  async _fetchAndUpdate() {
    let alertData = await this._fetchAlerts();
    if (alertData !== null) {
      ResilienceManager.cache('alerts', alertData);
    } else {
      const c = ResilienceManager.cached('alerts');
      if (c) alertData = c.value;
    }

    AppState.alert = alertData;
    AppState.meta.lastUpdate.alerts = Date.now();

    // Write preemption state; RotatorModule reads this on each rotation tick
    AppState.alertPreempt = alertData
      ? this._formatHeadline(alertData.headline)
      : null;
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
    const region = CONFIG.location.ecAlertRegion;
    const url = 'https://weather.gc.ca/rss/battleboard/' + region + '_e.xml';
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

const AlmanacModule = {
  _events: null,       // cached array from almanac.json
  _intervalId: null,

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

    // Gather candidates: static events + computed moon events
    const candidates = [];

    // Static events within horizon
    if (this._events) {
      for (let i = 0; i < this._events.length; i++) {
        const ev = this._events[i];
        const evMs = new Date(ev.date + 'T00:00:00').getTime();
        const daysAway = Math.round((evMs - todayMs) / (24 * 60 * 60 * 1000));
        if (daysAway >= 0 && daysAway <= horizon) {
          candidates.push({ name: ev.name, date: ev.date, daysAway: daysAway });
        }
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

};

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
    const start = new Date(year, w[0], w[1], 12, 0, 0);  // noon local
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
    // VSOP87-simplified solar longitude (Meeus, Chapter 25).
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

const MoonModule = {
  _intervalId: null,
  _lastRenderedPhase: -1,

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

  renderDisc(el) {
    const phase = AppState.moon.phase;
    const R = 48;
    const cx = 50;
    const cy = 50;

    let sweepFrac, litSide;
    if (phase <= 0.5) {
      sweepFrac = phase * 2;           // 0 to 1
      litSide = 'right';
    } else {
      sweepFrac = (1 - phase) * 2;     // 1 to 0
      litSide = 'left';
    }

    const tX = R * Math.cos(sweepFrac * Math.PI);

    const top = `${cx} ${cy - R}`;
    const bot = `${cx} ${cy + R}`;

    // Semicircle: always uses rx=R, ry=R
    const semiSweep = litSide === 'right' ? 1 : 0;
    const semiArc = `A ${R} ${R} 0 0 ${semiSweep} ${bot}`;

    // Terminator: elliptical arc from bottom back to top
    const absT = Math.abs(tX);
    const termSweep = tX < 0 ? 1 : 0;
    const termArc = `A ${absT < 0.1 ? 0.1 : absT} ${R} 0 0 ${termSweep} ${top}`;

    const litPath = `M ${top} ${semiArc} ${termArc}`;

    // Skip lit path if phase is essentially new moon
    const showLit = sweepFrac > 0.01;

    el.innerHTML =
      `<circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--type-primary)" opacity="0.06"/>` +
      (showLit
        ? `<path d="${litPath}" fill="var(--type-primary)" opacity="0.3"/>`
        : '');
  },

  _phaseName(phase) {
    // Divide the 0-1 cycle into 8 equal segments of 0.125 each.
    // Segment boundaries: 0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375.
    // A phase of 0.94 wraps back to 'New Moon'.
    const index = Math.round(phase * 8) % 8;
    return this._PHASE_NAMES[index];
  }
};

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

    // Phase 8: AQI color modulation
    const aqiBand = AppState.aqi.band;
    if (aqiBand === 'moderate') {
      rgb = this._applyWeatherMod(rgb, [0.95, 0, 8]);   // subtle warmth
    } else if (aqiBand === 'unhealthy' || aqiBand === 'very_unhealthy' || aqiBand === 'hazardous') {
      rgb = this._applyWeatherMod(rgb, [1.0, 0, 30]);
    }

    // Phase 15: observance palette
    const obsPalette = ObservanceModule.activePalette();
    if (obsPalette.mode === 'override') {
      rgb = this._hexToRgb(obsPalette.primary);
    } else if (obsPalette.mode === 'tint') {
      rgb = this._applyWeatherMod(rgb,
        [1.0 + (obsPalette.satShift || 0) / 100, 0, obsPalette.hueShift || 0]);
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
    h = ((h + hueAdd) % 360 + 360) % 360;
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

  _hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },

  _lerp(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
};

const DriftEngine = {
  _entries: [],
  _startTime: 0,
  _rafId: null,
  _rootStyle: null,

  // Pixel-shift safety net (Layer 2)
  _shiftDx: 0,
  _shiftDy: 0,
  _shiftIntervalId: null,

  // Phase offsets: large separations so no two elements share a noise region.
  // Each element gets a unique X offset and Y offset.
  _phaseOffsets: {
    time:  { x: 0,   y: 100 },
    date:  { x: 200, y: 300 },
    slot:  { x: 400, y: 500 },
    moon:  { x: 800, y: 900 }
  },

  // Phase 16: drift intensity multiplier (read from Tweaks at boot).
  // Multiplies ampX/ampY across every entry. 0 = drift fully suppressed
  // (pixel-shift safety net still applies). Re-applied on storage change
  // via full reload.
  _intensityMult: 1.0,

  setIntensity(mult) {
    this._intensityMult = (typeof mult === 'number' && mult >= 0) ? mult : 1.0;
  },

  start() {
    this._rootStyle = document.documentElement.style;
    this._startTime = performance.now() / 1000;

    // Register Phase 16 active drift classes. Reserved classes (sun, horizon,
    // departureRow, tickRail) are declared in CONFIG.driftClasses but not
    // mounted here until their faces ship.
    const dc = CONFIG.driftClasses;
    this._entries = [];

    const activeKeys = ['time', 'date', 'slot', 'moon'];

    for (let i = 0; i < activeKeys.length; i++) {
      const key = activeKeys[i];
      const cfg = dc[key];
      const phase = this._phaseOffsets[key];
      this._entries.push({
        cssPrefix: key,
        ampX: cfg.ampX,
        ampY: cfg.ampY,
        periodSec: cfg.periodSec,
        phaseX: phase.x,
        phaseY: phase.y
      });
    }

    // Start pixel-shift safety net
    this._shiftIntervalId = setInterval(
      () => this._pixelShift(),
      CONFIG.pixelShift.intervalMin * 60 * 1000
    );

    // Start rAF loop
    this._loop();
  },

  // Approximate element sizes (half-width, half-height) for viewport clamping.
  // Used to keep elements fully on-screen with a 10px inset margin.
  _elementSizes: {
    time:    { hw: 400, hh: 80  },
    date:    { hw: 160, hh: 28  },
    slot:    { hw: 210, hh: 28  },
    moon:    { hw: 71,  hh: 71  }
  },

  _loop() {
    const t = performance.now() / 1000 - this._startTime;
    const root = this._rootStyle;
    const shiftX = this._shiftDx;
    const shiftY = this._shiftDy;
    // Phase 16: clamp against the fixed stage box, not the viewport.
    // The CSS transform on #stage handles fit-to-viewport scaling.
    const vw = CONFIG.stage.width;
    const vh = CONFIG.stage.height;
    const margin = 10;
    const mult = this._intensityMult;

    for (let i = 0; i < this._entries.length; i++) {
      const e = this._entries[i];
      const sampleX = t / e.periodSec + e.phaseX;
      const sampleY = t / e.periodSec + e.phaseY;
      let dx = e.ampX * mult * perlin1d(sampleX) + shiftX;
      let dy = e.ampY * mult * perlin1d(sampleY) + shiftY;

      // Stage-box clamping: keep the element's bounding box within a 10px inset
      const size = this._elementSizes[e.cssPrefix];
      if (size) {
        let anchorX = e._anchorPxX;
        let anchorY = e._anchorPxY;
        if (anchorX === undefined) {
          anchorX = this._resolveAnchorX(e.cssPrefix, vw);
          anchorY = this._resolveAnchorY(e.cssPrefix, vh);
          e._anchorPxX = anchorX;
          e._anchorPxY = anchorY;
        }
        const minDx = margin + size.hw - anchorX;
        const maxDx = vw - margin - size.hw - anchorX;
        const minDy = margin + size.hh - anchorY;
        const maxDy = vh - margin - size.hh - anchorY;
        if (dx < minDx) dx = minDx;
        if (dx > maxDx) dx = maxDx;
        if (dy < minDy) dy = minDy;
        if (dy > maxDy) dy = maxDy;
      }

      root.setProperty('--' + e.cssPrefix + '-dx', dx.toFixed(1) + 'px');
      root.setProperty('--' + e.cssPrefix + '-dy', dy.toFixed(1) + 'px');
    }

    this._rafId = requestAnimationFrame(() => this._loop());
  },

  // Current stage position of each element, used to compute the drift-clamp
  // origin. MacroShifter calls updateAnchor() when it moves time or moon.
  // Note: these are mutable state, not the same as CONFIG.macroShift home tables.
  // CONFIG.macroShift carries the full list of homes to cycle through; these
  // carry only the current active position (and include date/slot, which never shift).
  _anchorPercents: {
    time:    { x: 50, y: 44 },
    date:    { x: 50, y: 66 },
    slot:    { x: 50, y: 84 },
    moon:    { x: 84, y: 12 }
  },

  _resolveAnchorX(cssPrefix, vw) {
    var p = this._anchorPercents[cssPrefix];
    return p ? (p.x / 100) * vw : vw / 2;
  },

  _resolveAnchorY(cssPrefix, vh) {
    var p = this._anchorPercents[cssPrefix];
    return p ? (p.y / 100) * vh : vh / 2;
  },

  _pixelShift() {
    var amp = CONFIG.pixelShift.amplitude;
    this._shiftDx = (Math.random() * 2 - 1) * amp;
    this._shiftDy = (Math.random() * 2 - 1) * amp;
  },

  updateAnchor(key, xPercent, yPercent) {
    // Update the cached anchor percent so viewport clamping uses the new home position.
    // key is 'time' or 'moon' (matches _anchorPercents keys).
    var p = this._anchorPercents[key];
    if (p) {
      p.x = xPercent;
      p.y = yPercent;
    }
    // Invalidate cached pixel values so _loop recomputes on next frame.
    for (var i = 0; i < this._entries.length; i++) {
      var e = this._entries[i];
      if (e.cssPrefix === key) {
        e._anchorPxX = undefined;
        e._anchorPxY = undefined;
        break;
      }
    }
  }
};

const MacroShifter = {
  _timeIndex: 0,
  _moonIndex: 0,
  _timeTimerId: null,
  _moonTimerId: null,

  start() {
    if (!CONFIG.macroShift.enabled) return;

    // Deterministic initial index from current hour
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    this._timeIndex = Math.floor(h / CONFIG.macroShift.timeIntervalHours) % CONFIG.macroShift.timeHomes.length;
    this._moonIndex = Math.floor(h / CONFIG.macroShift.moonIntervalHours) % CONFIG.macroShift.moonHomes.length;

    // Apply initial positions (no transition on first set)
    this._applyTime(false);
    this._applyMoon(false);

    // Schedule recurring shifts
    this._timeTimerId = setInterval(
      () => this.shiftTime(),
      CONFIG.macroShift.timeIntervalHours * 60 * 60 * 1000
    );
    this._moonTimerId = setInterval(
      () => this.shiftMoon(),
      CONFIG.macroShift.moonIntervalHours * 60 * 60 * 1000
    );
  },

  shiftTime() {
    this._timeIndex = (this._timeIndex + 1) % CONFIG.macroShift.timeHomes.length;
    this._applyTime(true);
  },

  shiftMoon() {
    this._moonIndex = (this._moonIndex + 1) % CONFIG.macroShift.moonHomes.length;
    this._applyMoon(true);
  },

  _applyHome(elementId, home, transitionSec, anchorKey, withTransition) {
    var el = document.getElementById(elementId);
    if (!el) return;
    if (withTransition) {
      el.style.transition = 'left ' + transitionSec + 's ease-in-out, top ' + transitionSec + 's ease-in-out';
    } else {
      el.style.transition = 'none';
    }
    el.style.left = home[0] + '%';
    el.style.top = home[1] + '%';
    DriftEngine.updateAnchor(anchorKey, home[0], home[1]);
  },

  _applyTime(withTransition) {
    var home = CONFIG.macroShift.timeHomes[this._timeIndex];
    this._applyHome('time', home, CONFIG.macroShift.timeTransitionSec, 'time', withTransition);
  },

  _applyMoon(withTransition) {
    var home = CONFIG.macroShift.moonHomes[this._moonIndex];
    this._applyHome('moon-disc', home, CONFIG.macroShift.moonTransitionSec, 'moon', withTransition);
  }
};

const RefresherCycle = {
  _timerId: null,
  _overlay: null,

  init() {
    this._overlay = document.getElementById('refresher-overlay');
  },

  start() {
    if (!CONFIG.refresher.enabled) return;
    // Set CSS transition duration dynamically to match CONFIG
    this._overlay.style.transition = 'opacity ' + CONFIG.refresher.fadeSec + 's linear';
    this._schedule();
  },

  _schedule() {
    const ms = this._msUntilNext();
    this._timerId = setTimeout(() => this.run(), ms);
  },

  _msUntilNext() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(CONFIG.refresher.triggerHour, 0, 0, 0);

    // If target is in the past or within the cycle window, push to tomorrow
    const cycleDurationMs = (CONFIG.refresher.fadeSec * 2 + CONFIG.refresher.holdSec) * 1000;
    if (target.getTime() <= now.getTime() + cycleDurationMs) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  },

  run() {
    const fade = CONFIG.refresher.fadeSec * 1000;
    const hold = CONFIG.refresher.holdSec * 1000;
    const el = this._overlay;

    // Step 1: fade to opaque (CSS transition handles the ramp)
    el.style.opacity = '1';

    // Step 2: after fade-in completes, hold, then fade back
    setTimeout(() => {
      el.style.opacity = '0';

      // Step 3: after fade-out completes, schedule next + soft reload check
      setTimeout(() => {
        this._schedule();
        ResilienceManager.softReload();
      }, fade);
    }, fade + hold);
  }
};

const LuminanceBreath = {
  _intervalId: null,

  start() {
    if (!CONFIG.luminanceBreath.enabled) return;
    this._update();
    this._intervalId = setInterval(() => this._update(), 30000);
  },

  _update() {
    const periodSec = CONFIG.luminanceBreath.periodMin * 60;
    const amp = CONFIG.luminanceBreath.amplitude;
    const t = Date.now() / 1000;
    const mod = 1 + amp * Math.sin(2 * Math.PI * t / periodSec);
    document.documentElement.style.setProperty('--lum-mod', mod.toFixed(4));
  }
};

const KineticType = {
  _GLYPHS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\u00B7\u00B0+-',

  create(el) {
    const text = el.textContent;
    el.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = text[i];
      el.appendChild(span);
    }
  },

  animate(el, newString) {
    const oldChars = el.querySelectorAll('.char');
    const oldLen = oldChars.length;
    const newLen = newString.length;

    // Pad or trim spans to match new string length
    if (newLen > oldLen) {
      for (let i = oldLen; i < newLen; i++) {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ' ';
        el.appendChild(span);
      }
    } else if (newLen < oldLen) {
      for (let i = oldLen - 1; i >= newLen; i--) {
        el.removeChild(oldChars[i]);
      }
    }

    const spans = el.querySelectorAll('.char');
    const stagger = CONFIG.rotation.cascadeStaggerMs;

    for (let i = 0; i < newLen; i++) {
      const span = spans[i];
      const target = newString[i];
      const current = span.textContent;

      if (current === target) continue;

      // Schedule cascade for this position
      this._cascadeChar(span, target, i * stagger);
    }
  },

  _cascadeChar(span, target, delay) {
    const glyphs = this._GLYPHS;
    const randGlyph = () => glyphs[Math.floor(Math.random() * glyphs.length)];

    // Number of rapid subs: random 5-9
    const rapidCount = 5 + Math.floor(Math.random() * 5);
    // Number of slow subs: 2-3
    const slowCount = 2 + Math.floor(Math.random() * 2);

    let t = delay;

    // Phase 1: hold (150ms)
    t += 150;

    // Phase 2: rapid substitutions (~80ms each)
    for (let r = 0; r < rapidCount; r++) {
      const g = randGlyph();
      setTimeout(() => { span.textContent = g; }, t);
      t += 70 + Math.floor(Math.random() * 20); // 70-90ms
    }

    // Phase 3: slow substitutions (~120ms each)
    for (let s = 0; s < slowCount; s++) {
      const g = randGlyph();
      setTimeout(() => { span.textContent = g; }, t);
      t += 100 + Math.floor(Math.random() * 40); // 100-140ms
    }

    // Phase 4: lock target + accent flash
    setTimeout(() => {
      span.textContent = target;
      span.classList.add('char--flash');
    }, t);

    setTimeout(() => {
      span.classList.remove('char--flash');
    }, t + 200);
  }
};

const RotatorModule = {
  _slotEl: null,
  _timer: null,
  _lastPreempt: null,  // tracks previous alertPreempt value for edge detection

  // Complications: each returns a formatted string or null to decline.
  // The rotator cycles through them, skipping nulls.
  _sources: [
    // Next sun event: shows whichever of sunrise/sunset is next
    function() {
      const now = new Date();
      const sr = RotatorModule._parseSunTime(AppState.sun.sunrise);
      const ss = RotatorModule._parseSunTime(AppState.sun.sunset);
      if (!sr || !ss) return null;
      if (now < sr) return 'SUNRISE ' + AppState.sun.sunrise;
      if (now < ss) return 'SUNSET ' + AppState.sun.sunset;
      return null;  // after sunset, skip -- "SUNRISE IN" countdown covers this window
    },
    // Weather
    function() {
      const w = AppState.weather;
      if (w.condition === null || w.tempC === null) return null;
      const labels = {
        CLEAR: 'CLEAR', PARTLY_CLOUDY: 'PARTLY CLOUDY',
        FOG: 'FOG', RAIN: 'RAIN', SNOW: 'SNOW', STORM: 'STORM'
      };
      return (labels[w.condition] || w.condition) + ' ' + w.tempC + '\u00B0';
    },
    // AQI
    function() {
      const a = AppState.aqi;
      if (a.value === null) return null;
      const bandLabels = {
        good: 'GOOD', moderate: 'MODERATE', unhealthy: 'UNHEALTHY',
        very_unhealthy: 'V UNHEALTHY', hazardous: 'HAZARDOUS'
      };
      return 'AQI ' + a.value + ' ' + (bandLabels[a.band] || '');
    },
    // Daylight
    function() {
      const mins = AppState.sun.dayLengthMin;
      if (!mins) return null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return 'DAYLIGHT ' + h + 'H ' + String(m).padStart(2, '0') + 'M';
    },
    // Tide
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
    },
    // Time until next sun event
    function() {
      const now = new Date();
      const todaySr = RotatorModule._parseSunTime(AppState.sun.sunrise);
      const todaySs = RotatorModule._parseSunTime(AppState.sun.sunset);
      if (!todaySr || !todaySs) return null;

      let target, label;
      if (now < todaySr) {
        target = todaySr;
        label = 'SUNRISE IN';
      } else if (now < todaySs) {
        target = todaySs;
        label = 'SUNSET IN';
      } else {
        // After sunset: show time until tomorrow's sunrise.
        target = new Date(todaySr.getTime() + 24 * 60 * 60 * 1000);
        label = 'SUNRISE IN';
      }

      const diffMin = Math.max(0, Math.round((target - now) / 60000));
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return label + ' ' + h + 'H ' + String(m).padStart(2, '0') + 'M';
    },
    // Almanac
    function() {
      const a = AppState.almanac;
      if (!a) return null;
      if (a.daysAway === 0) return a.name + ' TODAY';
      if (a.daysAway === 1) return a.name + ' TOMORROW';
      // 2-7 days: show abbreviated day name
      const eventDate = new Date(a.date + 'T00:00:00');
      const dayAbbr = ['SUN','MON','TUE','WED','THU','FRI','SAT'][eventDate.getDay()];
      return a.name + ' ' + dayAbbr;
    },
    // Observance
    function() {
      var obs = AppState.observance;
      if (!obs || !obs.slotEntry) return null;
      return obs.slotEntry;
    }
  ],

  init() {
    this._slotEl = document.getElementById('slot');

    // Set initial content from first available complication
    const initText = this._nextText();
    this._slotEl.textContent = initText || '';
    KineticType.create(this._slotEl);
  },

  start() {
    this._timer = setInterval(
      () => this._rotate(),
      CONFIG.rotation.slotHoldSec * 1000
    );
  },

  _rotate() {
    const preempt = AppState.alertPreempt;

    // Alert active: animate only when text appears or changes
    if (preempt) {
      if (preempt !== this._lastPreempt) {
        this._lastPreempt = preempt;
        AppState.rotator.text = preempt;
        KineticType.animate(this._slotEl, preempt);
      }
      return;
    }

    // Alert just cleared: resume normal rotation
    this._lastPreempt = null;

    const text = this._nextText();
    if (text === null) return; // all complications null; hold current
    AppState.rotator.text = text;
    KineticType.animate(this._slotEl, text);
  },

  _nextText() {
    const sources = this._sources;
    const len = sources.length;

    // Try each source starting from next index; skip nulls
    for (let attempt = 0; attempt < len; attempt++) {
      AppState.rotator.index = (AppState.rotator.index + 1) % len;
      const text = sources[AppState.rotator.index]();
      if (text !== null) return text;
    }
    return null;
  },

  _parseSunTime(timeStr) {
    // Parse "6:14 AM" or "18:14" into a Date for today
    if (!timeStr) return null;
    const now = new Date();
    const parts = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
    if (!parts) return null;
    let h = parseInt(parts[1], 10);
    const m = parseInt(parts[2], 10);
    if (parts[3]) {
      const ap = parts[3].toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  },

  // Called by data modules after their first fetch completes.
  // If slot is still blank, fill it with the first available complication.
  refresh() {
    if (!this._slotEl) return;
    if (AppState.rotator.text === '') {
      const text = this._nextText();
      if (text !== null) {
        AppState.rotator.text = text;
        this._slotEl.textContent = text;
        KineticType.create(this._slotEl);
      }
    }
  }
};

const VersionOverlay = {
  _el: null,
  _timerId: null,
  _pollId: null,
  _swReg: null,
  _deployedHash: null,   // baked-in hash, never overwritten
  _liveHash: null,       // latest hash from GitHub API
  _liveDate: null,
  _updateAvailable: false,
  _prompted: false,      // true after showing "UPDATE AVAILABLE"
  _lastShowTime: 0,      // timestamp of last _show() call for tap debounce

  init() {
    const moon = document.getElementById('moon-disc');
    if (!moon) return;

    // Use localStorage to remember the last version we reloaded into.
    // Without this, the hardcoded CONFIG.build.hash is always stale after
    // a deploy, and every reload would still show "UPDATE AVAILABLE".
    const acked = localStorage.getItem('solari_acked_hash');
    this._deployedHash = acked || CONFIG.build.hash;
    this._checkForUpdate();
    this._pollId = setInterval(() => this._checkForUpdate(), 60 * 60 * 1000);
    this._registerSW();

    // Phase 16: long-press 600ms opens the clockface picker; short tap shows
    // the version overlay. Using press-start + press-end timestamps avoids
    // conflicting with the existing single-tap behaviour. Single tap is
    // reserved for VersionOverlay; long press is the picker gesture.
    // Touch and mouse paths are mutually exclusive on iPad Safari (touchend
    // fires; the synthesized click is suppressed by the preventDefault below).
    const LONG_PRESS_MS = 600;
    let pressStart = 0;
    let pressTimer = null;
    let longPressFired = false;

    const onPressStart = () => {
      pressStart = Date.now();
      longPressFired = false;
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        longPressFired = true;
        // Navigate to picker. The display will reload (or be reloaded by
        // the storage event) when Apply is clicked there.
        try { window.location.href = 'clockface.html'; } catch (err) {}
      }, LONG_PRESS_MS);
    };

    const onPressEnd = (e) => {
      e.preventDefault();
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      // If the long-press already fired, navigation is in flight; skip the tap.
      if (longPressFired) return;
      const duration = Date.now() - pressStart;
      if (duration < LONG_PRESS_MS) {
        this._onTap();
      }
    };

    const onPressCancel = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      longPressFired = false;
    };

    if ('ontouchstart' in window) {
      moon.addEventListener('touchstart', onPressStart, { passive: true });
      moon.addEventListener('touchend', onPressEnd);
      moon.addEventListener('touchcancel', onPressCancel);
    } else {
      moon.addEventListener('mousedown', onPressStart);
      moon.addEventListener('mouseup', onPressEnd);
      moon.addEventListener('mouseleave', onPressCancel);
    }
  },

  _registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js')
      .then(reg => { this._swReg = reg; })
      .catch(() => {});
  },

  _checkForUpdate() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch('https://api.github.com/repos/joshuascottpaul/solari/commits/master',
          { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        clearTimeout(timer);
        if (!data) return;
        this._liveHash = data.sha.slice(0, 7);
        this._liveDate = data.commit.committer.date.slice(0, 10);

        if (this._liveHash !== this._deployedHash) {
          this._updateAvailable = true;
          if (this._swReg) this._swReg.update().catch(() => {});
        }
      })
      .catch(() => { clearTimeout(timer); });
  },

  _onTap() {
    // Debounce: ignore taps within 500ms of the last _show() call
    if (Date.now() - this._lastShowTime < 500) return;

    // Second tap after seeing "UPDATE AVAILABLE": acknowledge and reload
    if (this._updateAvailable && this._prompted) {
      try { localStorage.setItem('solari_acked_hash', this._liveHash); } catch (e) {}
      location.reload();
      return;
    }
    this._show();
  },

  _show() {
    if (!this._el) {
      this._el = document.createElement('div');
      this._el.className = 'version-overlay';
      document.body.appendChild(this._el);
    }

    this._lastShowTime = Date.now();

    if (this._updateAvailable) {
      this._el.textContent = 'UPDATE AVAILABLE \u00B7 TAP TO RELOAD';
      this._prompted = true;
    } else {
      const b = CONFIG.build;
      const hash = this._liveHash || b.hash;
      const date = this._liveDate || b.date;
      this._el.textContent = 'V' + b.version + ' \u00B7 ' + hash + ' \u00B7 ' + date;
      this._prompted = false;
    }
    this._el.style.opacity = '1';

    if (this._timerId) clearTimeout(this._timerId);
    this._timerId = setTimeout(() => {
      this._el.style.opacity = '0';
      this._prompted = false;
      this._timerId = null;
    }, 4000);
  }
};

const DisplayModule = {
  _els: {},

  init() {
    this._els = {
      hours: document.querySelector('#time .hours'),
      colon: document.querySelector('#time .colon'),
      minutes: document.querySelector('#time .minutes'),
      ampm: document.querySelector('#time .ampm'),
      dateText: document.querySelector('#date .text'),
      moonDisc: document.getElementById('moon-disc')
    };
  },

  render() {
    const t = AppState.time;
    const d = AppState.date;

    this._els.hours.textContent = String(t.hours);
    this._els.minutes.textContent = String(t.minutes).padStart(2, '0');

    if (t.ampm !== null) {
      this._els.ampm.textContent = t.ampm;
      this._els.ampm.style.display = '';
    } else {
      this._els.ampm.textContent = '';
      this._els.ampm.style.display = 'none';
    }

    // Date line: check for observance override
    const obs = AppState.observance;
    if (obs) {
      this._els.dateText.textContent = obs.dateString;
    } else {
      this._els.dateText.textContent = d.dayOfWeek + ' \u00B7 ' + d.month + ' ' + d.day + ' \u00B7 ' + d.year;
    }

    // Moon disc: re-render only when phase value changes
    if (AppState.moon.phase !== MoonModule._lastRenderedPhase && this._els.moonDisc) {
      MoonModule.renderDisc(this._els.moonDisc);
      MoonModule._lastRenderedPhase = AppState.moon.phase;
    }

    // Phase 16: hand off to the active face. Faces are pure renderers; they
    // read AppState/TWEAKS and write DOM. CalmFace.render() is a no-op
    // (DisplayModule above drives all its DOM writes). Future faces paint
    // their own subtree here.
    ACTIVE_FACE.render(AppState, TWEAKS);
  }
};

// Phase 16: Stage helper. Owns the #stage element, manages the CSS scale token,
// and attaches the resize listener. The stage is a fixed 1180x820 absolutely
// positioned box; CSS transform: scale(...) fits it to the viewport.
const Stage = {
  _el: null,
  _resizeBound: null,

  init() {
    this._el = document.getElementById('stage');
    // index.html declares the #stage wrapper statically in Phase 16; if it is
    // missing, fall back to creating it under #display for safety.
    if (!this._el) {
      const display = document.getElementById('display');
      const s = document.createElement('div');
      s.id = 'stage';
      if (display) display.appendChild(s); else document.body.appendChild(s);
      this._el = s;
    }
    this._recompute();
    // Single resize listener for the lifetime of the page; the iPad target
    // is locked to landscape, so this fires essentially never in production.
    this._resizeBound = () => this._recompute();
    window.addEventListener('resize', this._resizeBound);
    return this._el;
  },

  _recompute() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const s = Math.min(W / CONFIG.stage.width, H / CONFIG.stage.height);
    document.documentElement.style.setProperty('--stage-scale', s.toFixed(4));
  }
};

// Phase 16: Calm face. The shipped V0 visual baseline preserved verbatim;
// migration is layout-engine swap (vw/vh -> fixed-stage), no visual redesign.
// init() adopts the existing time/date/slot/moon DOM nodes (declared in
// index.html and now wrapped in #stage). render() is a thin pass-through to
// DisplayModule's existing render path; faces are pure renderers (no AppState
// mutation, no timers). teardown() is reserved for Phases 17-20 hot-swap.
const CalmFace = {
  init(stage) {
    // The stage already contains #time, #date, #slot, #moon-disc (declared
    // statically in index.html). DisplayModule init queries these IDs and
    // caches handles; CalmFace simply confirms presence. If a future face
    // needs to rebuild the subtree, teardown() will be its hook.
    if (!stage) return;
    // No-op: shipped element IDs are already present.
  },

  render() {
    // Phase 16: DisplayModule.render() drives all DOM writes for Calm.
    // Tweaks are applied at boot via ClockfaceRegistry.applyAccent /
    // applyDriftIntensity, so this method has nothing else to do.
    // Future faces (17-20) will paint their own subtree here using
    // the (state, tweaks) arguments passed by DisplayModule.render().
  },

  teardown() {
    // Reserved for Phase 17-20 hot-swap. Phase 16 face changes go through
    // full reload via the storage event; teardown is never called.
  }
};

// Phase 16: face registry. Phase 16 ships only `calm`; future faces register
// themselves here and use the same init/render/teardown contract.
const ClockfaceRegistry = {
  faces: {
    calm: CalmFace
    // mechanical: MechanicalFace,   // Phase 17
    // departures: DeparturesFace,   // Phase 18
    // editorial:  EditorialFace,    // Phase 19
    // horizon:    HorizonFace       // Phase 20
  },

  resolve(faceId) {
    if (faceId && this.faces[faceId]) return this.faces[faceId];
    if (faceId) console.warn('ClockfaceRegistry: unknown faceId "' + faceId + '"; falling back to calm');
    return this.faces[CONFIG.clockface.defaultFaceId];
  },

  // Returns a fully-populated Tweaks object. Never throws; malformed input
  // is silently replaced with defaults.
  normalizeTweaks(raw) {
    const def = CONFIG.tweakDefaults;
    let parsed = null;
    if (typeof raw === 'string' && raw.length) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    } else if (raw && typeof raw === 'object') {
      parsed = raw;
    }
    if (!parsed || typeof parsed !== 'object') {
      return { accent: def.accent, driftIntensity: def.driftIntensity, byFace: {} };
    }
    const accent = ACCENT_PALETTE[parsed.accent] ? parsed.accent : def.accent;
    const driftIntensity = (DRIFT_INTENSITY_MULT[parsed.driftIntensity] !== undefined)
      ? parsed.driftIntensity
      : def.driftIntensity;
    const byFace = (parsed.byFace && typeof parsed.byFace === 'object') ? parsed.byFace : {};
    return { accent: accent, driftIntensity: driftIntensity, byFace: byFace };
  },

  applyAccent(accentId) {
    const entry = ACCENT_PALETTE[accentId] || ACCENT_PALETTE.gold;
    const root = document.documentElement.style;
    root.setProperty('--type-accent', entry.hex);
    root.setProperty('--type-secondary', entry.secondary);
    // SkyColorModule will continue to mutate --type-secondary on a 60s schedule;
    // this only sets the initial floor.
  },

  applyDriftIntensity(level) {
    const mult = DRIFT_INTENSITY_MULT[level];
    DriftEngine.setIntensity(mult !== undefined ? mult : 1.0);
  }
};

// Phase 16: face dispatch state. Set in boot(); read by DisplayModule.render().
let ACTIVE_FACE = CalmFace;
let TWEAKS = { accent: 'gold', driftIntensity: 'normal', byFace: {} };

(function boot() {
  // Phase 16: read storage and resolve face + tweaks
  const FACE_ID = localStorage.getItem('solari.clockface') || CONFIG.clockface.defaultFaceId;
  TWEAKS = ClockfaceRegistry.normalizeTweaks(
    localStorage.getItem('solari.clockface.tweaks')
  );
  ACTIVE_FACE = ClockfaceRegistry.resolve(FACE_ID);

  // Apply accent and drift intensity tweaks before module starts so the first
  // paint already reflects them. SkyColorModule.update() and DriftEngine.start()
  // will continue from these floor values.
  ClockfaceRegistry.applyAccent(TWEAKS.accent);
  ClockfaceRegistry.applyDriftIntensity(TWEAKS.driftIntensity);

  // Stage scaffolding (creates #stage if missing, attaches resize listener)
  const stage = Stage.init();

  // Initialise the active face (Phase 16: CalmFace adopts the static DOM)
  ACTIVE_FACE.init(stage);

  DisplayModule.init();
  RefresherCycle.init();
  RotatorModule.init();            // wraps slots in char spans
  VersionOverlay.init();           // version overlay on moon tap (long-press also opens picker)
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  SkyColorModule.update();         // initial color from current altitude
  MoonModule.start();
  WeatherModule.start();           // begins 15-min poll; first fetch is immediate
  AirQualityModule.start();        // begins 30-min poll; first fetch is immediate
  TideModule.start();              // begins 6h poll + CORS probe; first fetch is immediate
  AlertModule.start();             // begins 15-min poll + CORS probe; first fetch is immediate
  AlmanacModule.start();           // loads static data, computes moon, hourly refresh
  DriftEngine.start();             // begins rAF loop + pixel-shift timer
  MacroShifter.start();            // macro position shifts for burn-in protection
  RefresherCycle.start();           // 03:00 refresher cycle + soft reload
  LuminanceBreath.start();          // Phase 14: luminance breath
  ObservanceModule.start();        // Phase 15: observances (before RotatorModule.start so data is set for first rotation tick)
  RotatorModule.start();           // begins rotation timers (after data modules)

  // Phase 16: cross-tab Apply. The picker writes the three keys; this listener
  // reloads the display so the new face/tweaks take effect on a clean boot.
  window.addEventListener('storage', (e) => {
    if (
      e.key === 'solari.clockface' ||
      e.key === 'solari.clockface.tweaks' ||
      e.key === 'solari.clockface.applied_at'
    ) {
      location.reload();
    }
  });
})();
