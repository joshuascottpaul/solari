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
  // Per-element-class drift parameters. Periods are pairwise coprime.
  // Reserved (unused until P19-20): sun (P20), horizon (P20).
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
  // Per-face drift channels. DriftEngine.start() reads this instead of a
  // switch statement, so adding Phase 19/20 faces requires only a new row here.
  // departureRow* sub-channels share CONFIG.driftClasses.departureRow config
  // (period 61 s, ampX 6/4) but have independent phase offsets so the five
  // rows drift without correlation.
  faceActiveKeys: {
    calm:       ['time', 'date', 'slot', 'moon'],
    mechanical: ['time', 'date', 'slot', 'tickRail'],
    departures: ['time', 'date', 'tickRail',
                 'departureRow0', 'departureRow1', 'departureRow2',
                 'departureRow3', 'departureRow4']
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
    // Phase 17: per-face time homes. When the active face id has an entry
    // here, MacroShifter cycles through this array in place of the global
    // timeHomes table (and targets the face's own time element id).
    // Phase 18: Departures entries are y-delta pixel pairs ([xDelta, yDelta])
    // applied to #dep-upper via the --dep-upper-shift-y CSS variable, not
    // absolute percent coordinates. See MacroShifter._applyTime() for the
    // dispatch on ACTIVE_FACE_ID === 'departures'.
    timeHomesByFace: {
      mechanical: [[50, 39], [50, 54]],
      departures: [[0, 0], [0, -30]]
    },
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
// DUAL-SOURCE: this block is duplicated in clockface.js (two-file rule, no
// shared module). Keep both copies in sync when adding/editing keys or hexes.
const ACCENT_PALETTE = {
  gold:  { hex: '#F4C56C', secondary: 'rgba(240, 235, 220, 0.62)' },
  sky:   { hex: '#7FA8C9', secondary: 'rgba(220, 232, 245, 0.62)' },
  sage:  { hex: '#A9C29A', secondary: 'rgba(225, 235, 218, 0.62)' },
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
    phaseName: '',       // e.g. 'Waxing Gibbous'
    // Phase 18/20: moonrise and moonset for the current day (24h string or '').
    // alwaysUp/alwaysDown true when the moon doesn't cross the horizon today.
    moonrise: '',
    moonset: '',
    alwaysUp: false,
    alwaysDown: false
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

      // Phase 18/20: moonrise and moonset for the current day.
      // DeparturesFace reads these from AppState rather than calling SunCalc
      // inline; HorizonFace (Phase 20) also depends on them.
      const mt = SunCalc.getMoonTimes(now, CONFIG.location.latitude, CONFIG.location.longitude);
      AppState.moon.moonrise   = (mt.rise && !isNaN(mt.rise.getTime())) ? this._hhmm(mt.rise) : '';
      AppState.moon.moonset    = (mt.set  && !isNaN(mt.set.getTime()))  ? this._hhmm(mt.set)  : '';
      AppState.moon.alwaysUp   = mt.alwaysUp   === true;
      AppState.moon.alwaysDown = mt.alwaysDown === true;

      AppState.meta.lastUpdate.moon = now.getTime();
    } catch (e) {
      // Continues on next interval
    }
  },

  // "HH:MM" from a Date (24h format).
  _hhmm(date) {
    return String(date.getHours()).padStart(2, '0') + ':' +
           String(date.getMinutes()).padStart(2, '0');
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
    root.setProperty('--type-tertiary',
      `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.42)`);
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
  // Phase 18: the five departureRow* sub-channels share
  // CONFIG.driftClasses.departureRow (period 61s, ampX 6, ampY 4) and differ
  // only in phase offset so the rows do not correlate.
  _phaseOffsets: {
    time:          { x: 0,    y: 100  },
    date:          { x: 200,  y: 300  },
    slot:          { x: 400,  y: 500  },
    moon:          { x: 800,  y: 900  },
    tickRail:      { x: 1000, y: 1100 },
    departureRow0: { x: 1200, y: 1300 },
    departureRow1: { x: 1400, y: 1500 },
    departureRow2: { x: 1600, y: 1700 },
    departureRow3: { x: 1800, y: 1900 },
    departureRow4: { x: 2000, y: 2100 }
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

    // Face-aware activation: only the channels the active face paints get
    // rAF writes. Table lives in CONFIG.faceActiveKeys; adding Phase 19/20
    // faces requires only a new entry there, not a code change here.
    const activeKeys = CONFIG.faceActiveKeys[ACTIVE_FACE_ID]
                    || CONFIG.faceActiveKeys.calm;

    for (let i = 0; i < activeKeys.length; i++) {
      const key = activeKeys[i];
      // Resolve the class config: departureRow* sub-channels share the
      // 'departureRow' class config; everything else maps directly by key.
      const classKey = key.indexOf('departureRow') === 0 ? 'departureRow' : key;
      const cfg = dc[classKey];
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
    time:          { hw: 400, hh: 80 },
    date:          { hw: 160, hh: 28 },
    slot:          { hw: 210, hh: 28 },
    moon:          { hw: 71,  hh: 71 },
    tickRail:      { hw: 510, hh: 4  },
    // Phase 18: row half-extents (1020 px wide; ~30 px tall row content)
    departureRow0: { hw: 510, hh: 18 },
    departureRow1: { hw: 510, hh: 18 },
    departureRow2: { hw: 510, hh: 18 },
    departureRow3: { hw: 510, hh: 18 },
    departureRow4: { hw: 510, hh: 18 }
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
    time:          { x: 50, y: 44 },
    date:          { x: 50, y: 66 },
    slot:          { x: 50, y: 84 },
    moon:          { x: 84, y: 12 },
    tickRail:      { x: 50, y: 32 },
    // Phase 18: per-row anchors (board y=340..520, x centred on stage)
    departureRow0: { x: 50, y: 44 },
    departureRow1: { x: 50, y: 49 },
    departureRow2: { x: 50, y: 54 },
    departureRow3: { x: 50, y: 59 },
    departureRow4: { x: 50, y: 63 }
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

  // Phase 17: pick the time-home table per active face. Faces with an
  // entry in CONFIG.macroShift.timeHomesByFace use that array; otherwise
  // the global timeHomes table is used. The chosen array length drives
  // the index modulus, so Mechanical alternates between two homes and
  // Calm continues to cycle through six.
  _timeHomes() {
    var byFace = CONFIG.macroShift.timeHomesByFace;
    if (byFace && byFace[ACTIVE_FACE_ID]) return byFace[ACTIVE_FACE_ID];
    return CONFIG.macroShift.timeHomes;
  },

  // Phase 17: the time element id differs per face. Mechanical paints
  // its own #mech-time inside the stage; Calm uses #time.
  _timeElementId() {
    return ACTIVE_FACE_ID === 'mechanical' ? 'mech-time' : 'time';
  },

  start() {
    if (!CONFIG.macroShift.enabled) return;

    // Deterministic initial index from current hour
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    var timeHomes = this._timeHomes();
    this._timeIndex = Math.floor(h / CONFIG.macroShift.timeIntervalHours) % timeHomes.length;
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
    var homes = this._timeHomes();
    this._timeIndex = (this._timeIndex + 1) % homes.length;
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
    // Phase 18: Departures relocates the upper band as a group via a CSS
    // variable, not absolute position. The timeHomesByFace.departures table
    // is interpreted as [xDelta, yDelta] pixel pairs; xDelta is unused.
    // The 60s ease-in-out transition is carried on #dep-upper (style.css).
    if (ACTIVE_FACE_ID === 'departures') {
      var homes = CONFIG.macroShift.timeHomesByFace.departures || [[0, 0]];
      var depHome = homes[this._timeIndex % homes.length] || homes[0];
      document.documentElement.style.setProperty('--dep-upper-shift-y', depHome[1] + 'px');
      return;
    }
    var home = this._timeHomes()[this._timeIndex];
    this._applyHome(this._timeElementId(), home, CONFIG.macroShift.timeTransitionSec, 'time', withTransition);
  },

  _applyMoon(withTransition) {
    // Mechanical and Departures have no moon disc; skip the moon shift.
    if (ACTIVE_FACE_ID === 'mechanical' || ACTIVE_FACE_ID === 'departures') return;
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

  animate(el, newString, staggerMs) {
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
    const stagger = (staggerMs !== undefined) ? staggerMs : CONFIG.rotation.cascadeStaggerMs;

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

    // Phase 17: Mechanical face has no slot element. RotatorModule continues
    // to compute rotator.text into AppState (for future faces), but skips
    // DOM writes when there is nothing to write to.
    if (!this._slotEl) return;

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
        if (this._slotEl) KineticType.animate(this._slotEl, preempt);
      }
      return;
    }

    // Alert just cleared: resume normal rotation
    this._lastPreempt = null;

    const text = this._nextText();
    if (text === null) return; // all complications null; hold current
    AppState.rotator.text = text;
    if (this._slotEl) KineticType.animate(this._slotEl, text);
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
    // Phase 17: gesture surface differs per face. Calm uses the moon disc;
    // Mechanical has no moon, so the picker entry attaches to the time
    // numerals (#mech-time). Phase 18: Departures attaches to #dep-time.
    let surfaceId;
    if (ACTIVE_FACE_ID === 'mechanical') surfaceId = 'mech-time';
    else if (ACTIVE_FACE_ID === 'departures') surfaceId = 'dep-time';
    else surfaceId = 'moon-disc';
    const surface = document.getElementById(surfaceId);
    if (!surface) return;

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
      surface.addEventListener('touchstart', onPressStart, { passive: true });
      surface.addEventListener('touchend', onPressEnd);
      surface.addEventListener('touchcancel', onPressCancel);
    } else {
      surface.addEventListener('mousedown', onPressStart);
      surface.addEventListener('mouseup', onPressEnd);
      surface.addEventListener('mouseleave', onPressCancel);
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

    // Phase 17: when the active face is not Calm, its DOM has replaced the
    // Calm subtree inside #stage; the cached Calm element handles are null.
    // Skip the Calm-shaped writes and hand off straight to the face.
    if (this._els.hours) {
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
    }

    // Phase 16: hand off to the active face. Faces are pure renderers; they
    // read AppState/TWEAKS and write DOM. CalmFace.render() is a no-op
    // (DisplayModule above drives all its DOM writes). Mechanical and later
    // faces paint their own subtree here.
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

// Phase 17: Mechanical face. First face after Calm. Monospace tabular
// composition: 236px HH:MM time, ISO date strip, minute-arc hairline,
// five-column complications grid. Renders entirely inside #stage from a
// scratch subtree it builds in init(); the Calm-shaped DOM in index.html
// is removed first so DisplayModule.init() does not bind to dead nodes.
// All inner state is local (DOM handles, gating keys); no AppState writes.
const MechanicalFace = {
  _els: null,
  _lastPhaseIndex: null,
  _lastSecond: null,
  _lastMinuteKey: null,   // 'timeFormat|HH:MM|ampm'; gates time/date repaints
  _lastIsoDate: null,
  _columnPhases: [
    ['temp', 'air', 'tide', 'moon', 'sun'],
    ['sun', 'temp', 'air', 'tide', 'moon'],
    ['moon', 'sun', 'temp', 'air', 'tide'],
    ['tide', 'moon', 'sun', 'temp', 'air']
  ],
  _columnLabels: { temp: 'TEMP', air: 'AIR', tide: 'TIDE', moon: 'MOON', sun: 'SUN' },
  _moonAbbrev: {
    'New Moon': 'NEW',
    'Waxing Crescent': 'WAX CRES',
    'First Quarter': 'FIRST Q',
    'Waxing Gibbous': 'WAX GIB',
    'Full Moon': 'FULL',
    'Waning Gibbous': 'WAN GIB',
    'Last Quarter': 'LAST Q',
    'Waning Crescent': 'WAN CRES'
  },

  init(stage) {
    if (!stage) return;

    // Remove the Calm-shaped DOM if present so DisplayModule.init() does not
    // cache handles to nodes Mechanical does not paint. The picker page does
    // not have these nodes; the guard makes init idempotent in both contexts.
    ['time', 'date', 'slot', 'moon-disc'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });
    // Re-init removes any prior #mech-stage to guard against double-init.
    var existing = stage.querySelector('#mech-stage');
    if (existing) existing.remove();

    var cellsHtml = '';
    for (var i = 0; i < 5; i++) {
      cellsHtml +=
        '<div class="mech-cell" data-cell="' + i + '">' +
          '<div class="mech-cell-inner">' +
            '<div class="mech-label"></div>' +
            '<div class="mech-value"></div>' +
          '</div>' +
        '</div>';
    }

    var root = document.createElement('div');
    root.id = 'mech-stage';
    root.innerHTML =
      '<div id="mech-time">' +
        '<span class="mech-hours">--</span>' +
        '<span class="mech-colon">:</span>' +
        '<span class="mech-minutes">--</span>' +
        '<span class="mech-ampm" hidden></span>' +
      '</div>' +
      '<div id="mech-date"></div>' +
      '<svg id="mech-arc" viewBox="0 0 1180 8" preserveAspectRatio="none" aria-hidden="true">' +
        '<line class="mech-arc-track" x1="80" y1="4" x2="1100" y2="4"/>' +
        '<line class="mech-arc-grown" x1="80" y1="4" x2="80" y2="4"/>' +
      '</svg>' +
      '<div id="mech-grid">' + cellsHtml + '</div>';
    stage.appendChild(root);

    this._els = {
      root: root,
      time: root.querySelector('#mech-time'),
      hours: root.querySelector('.mech-hours'),
      colon: root.querySelector('.mech-colon'),
      minutes: root.querySelector('.mech-minutes'),
      ampm: root.querySelector('.mech-ampm'),
      date: root.querySelector('#mech-date'),
      arc: root.querySelector('#mech-arc'),
      arcGrown: root.querySelector('.mech-arc-grown'),
      grid: root.querySelector('#mech-grid'),
      cells: Array.from(root.querySelectorAll('.mech-cell'))
    };
    this._lastPhaseIndex = null;
    this._lastSecond = null;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
  },

  render(state, tweaks) {
    if (!this._els) return;
    var mt = (tweaks && tweaks.byFace && tweaks.byFace.mechanical) || {};
    var timeFormat = mt.timeFormat === '12h' ? '12h' : '24h';
    this._renderTime(state, timeFormat);
    this._renderDate(state);
    this._renderArc(state);
    this._renderGrid(state, timeFormat, mt.previewMode === true);
  },

  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._lastPhaseIndex = null;
    this._lastSecond = null;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
  },

  // ---- Internal helpers ----

  _renderTime(state, timeFormat) {
    var t = state.time;
    var h24 = (typeof t.hours === 'number') ? t.hours : 0;
    // AppState.time.hours follows CONFIG.display.timeFormat. The headline
    // tweak `timeFormat` overrides for Mechanical only.
    if (t.ampm) {
      // AppState already in 12h form (1..12); convert back if face wants 24h.
      // ampm + hours uniquely identify h24: 12 AM = 0, 12 PM = 12, etc.
      if (t.ampm === 'AM') {
        h24 = (t.hours === 12) ? 0 : t.hours;
      } else {
        h24 = (t.hours === 12) ? 12 : t.hours + 12;
      }
    }

    var hh, mm, ampm;
    if (timeFormat === '12h') {
      var h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      hh = String(h12);  // no leading zero in 12h headline
      ampm = h24 < 12 ? 'AM' : 'PM';
    } else {
      hh = String(h24).padStart(2, '0');
      ampm = null;
    }
    mm = String(t.minutes).padStart(2, '0');

    var minuteKey = timeFormat + '|' + hh + ':' + mm + '|' + (ampm || '');
    if (minuteKey === this._lastMinuteKey) return;
    this._lastMinuteKey = minuteKey;

    var els = this._els;
    els.hours.textContent = hh;
    els.minutes.textContent = mm;
    if (ampm) {
      els.ampm.textContent = ampm;
      els.ampm.hidden = false;
    } else {
      els.ampm.textContent = '';
      els.ampm.hidden = true;
    }
  },

  _renderDate(state) {
    // Spec template: `MON · 2026.05.11`. Mechanical inherits observance
    // colour modulation through --type-primary / --type-accent but does not
    // surface the observance dateString in this strip; the date stays
    // factual and uniform-width to preserve the grid rhythm.
    var iso = state.date.isoDate || '';
    if (iso === this._lastIsoDate) return;
    this._lastIsoDate = iso;
    if (!iso) { this._els.date.textContent = ''; return; }
    var day = state.date.dayOfWeek || '';
    var dow = day ? day.slice(0, 3).toUpperCase() : '---';
    var isoDot = iso.replace(/-/g, '.');
    this._els.date.textContent = dow + ' · ' + isoDot;
  },

  _renderArc(state) {
    var sec = state.time.seconds | 0;
    var grown = this._els.arcGrown;
    if (!grown) return;
    // 80 + (sec/60) * 1020 grows from 80 to 1100 over a minute.
    var x2 = 80 + (sec / 60) * 1020;
    grown.setAttribute('x2', x2.toFixed(1));

    // At second 0 (minute boundary), clone the prior grown line and fade
    // it out over 600ms while the live grown line restarts at x=80.
    if (sec === 0 && this._lastSecond === 59) {
      var arc = this._els.arc;
      // Read current state of the line BEFORE we reset it
      var fader = grown.cloneNode(true);
      // Clone reflects the value already written above (x2=80); we want the
      // pre-reset value (x2=1100). Reset target first, then set fader to 1100.
      fader.setAttribute('x2', '1100');
      fader.classList.add('mech-arc-fading');
      arc.appendChild(fader);
      grown.setAttribute('x2', '80');
      // Force layout so the transition triggers on the next style change
      // eslint-disable-next-line no-unused-expressions
      fader.getBoundingClientRect();
      fader.style.strokeOpacity = '0';
      fader.addEventListener('transitionend', function () {
        if (fader.parentNode) fader.parentNode.removeChild(fader);
      }, { once: true });
      // Safety: also remove after 1.5s in case transitionend never fires
      // (off-screen rendering, suspended tab, etc.).
      setTimeout(function () {
        if (fader.parentNode) fader.parentNode.removeChild(fader);
      }, 1500);
    }
    this._lastSecond = sec;
  },

  _renderGrid(state, timeFormat, previewMode) {
    var phaseIdx = this._activePhaseIndex(previewMode);
    var indexChanged = (phaseIdx !== this._lastPhaseIndex);
    var firstPaint = (this._lastPhaseIndex === null);

    if (indexChanged && !firstPaint) {
      this._crossfadeColumns(phaseIdx, state, timeFormat);
    } else {
      // Steady-state paint or first paint: write any cells whose underlying
      // data hash changed since the last tick.
      this._paintCells(phaseIdx, state, timeFormat, false);
    }
    this._lastPhaseIndex = phaseIdx;
  },

  _activePhaseIndex(previewMode) {
    if (previewMode) {
      var sec = Math.floor(performance.now() / 1000);
      return Math.floor(sec / 6) % 4;
    }
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    return Math.floor(h / 6) % 4;
  },

  _paintCells(phaseIdx, state, timeFormat, force) {
    var order = this._columnPhases[phaseIdx];
    for (var i = 0; i < 5; i++) {
      var key = order[i];
      var cell = this._els.cells[i];
      if (!cell) continue;
      var hash = this._cellHash(key, state, timeFormat);
      if (!force && cell._mechHash === hash) continue;
      cell._mechHash = hash;
      var inner = cell.firstElementChild;       // .mech-cell-inner
      if (!inner) continue;
      var labelEl = inner.querySelector('.mech-label');
      var valueEl = inner.querySelector('.mech-value');
      if (labelEl) labelEl.textContent = this._columnLabels[key] || '';
      if (valueEl) valueEl.innerHTML = this._cellHtml(key, state, timeFormat);
    }
  },

  _crossfadeColumns(phaseIdx, state, timeFormat) {
    // Per-column: 300ms fade-out, content swap at opacity 0, 300ms fade-in.
    // Stagger: 60ms between adjacent columns. Each timeout writes only its own
    // cell so earlier columns are not re-written after they've faded back in.
    var self = this;
    var order = this._columnPhases[phaseIdx];
    var cells = this._els.cells;
    for (var i = 0; i < 5; i++) {
      (function (idx) {
        var cell = cells[idx];
        if (!cell) return;
        var inner = cell.firstElementChild;
        if (!inner) return;
        setTimeout(function () {
          inner.classList.add('is-fading');
          setTimeout(function () {
            var key = order[idx];
            var labelEl = inner.querySelector('.mech-label');
            var valueEl = inner.querySelector('.mech-value');
            if (labelEl) labelEl.textContent = self._columnLabels[key] || '';
            if (valueEl) valueEl.innerHTML = self._cellHtml(key, state, timeFormat);
            cell._mechHash = self._cellHash(key, state, timeFormat);
            inner.classList.remove('is-fading');
          }, 300);
        }, idx * 60);
      })(i);
    }
  },

  _cellHash(key, state, timeFormat) {
    if (key === 'temp') return 'temp|' + state.weather.tempC + '|' + state.weather.condition;
    if (key === 'air')  return 'air|' + state.aqi.value + '|' + state.aqi.band;
    if (key === 'tide') return 'tide|' + state.tide.type + '|' + state.tide.heightM + '|' + state.tide.time + '|' + timeFormat;
    if (key === 'moon') return 'moon|' + state.moon.phaseName + '|' + Math.round((state.moon.illumination || 0) * 100);
    if (key === 'sun')  return 'sun|' + state.sun.sunrise + '|' + state.sun.sunset + '|' + timeFormat;
    return '';
  },

  _cellHtml(key, state, timeFormat) {
    if (key === 'temp') return this._tempHtml(state);
    if (key === 'air')  return this._airHtml(state);
    if (key === 'tide') return this._tideHtml(state, timeFormat);
    if (key === 'moon') return this._moonHtml(state);
    if (key === 'sun')  return this._sunHtml(state, timeFormat);
    return '';
  },

  // Phase 17.1: tight abbreviations for multi-word conditions. Full strings
  // (PARTLY CLOUDY, THUNDERSTORM, etc.) overflow the 204 px TEMP column at
  // 22 px JetBrains Mono 300. The .mech-cell overflow:hidden is a safety net;
  // these abbreviations keep the value inside the box without clipping.
  _CONDITION_ABBR: {
    'PARTLY CLOUDY':    'P CLOUDY',
    'MOSTLY CLOUDY':    'M CLOUDY',
    'PARTLY SUNNY':     'P SUNNY',
    'MOSTLY SUNNY':     'M SUNNY',
    'LIGHT RAIN':       'L RAIN',
    'HEAVY RAIN':       'H RAIN',
    'LIGHT SNOW':       'L SNOW',
    'HEAVY SNOW':       'H SNOW',
    'THUNDERSTORM':     'T STORM',
    'FREEZING RAIN':    'F RAIN',
    'FREEZING DRIZZLE': 'F DRIZZLE'
  },

  _tempHtml(state) {
    var t = state.weather.tempC;
    var cond = state.weather.condition;
    if (t === null || t === undefined || cond === null || cond === undefined) {
      return '<span class="mech-tok-tertiary">—</span>';
    }
    var sign = t >= 0 ? '+' : '';
    var condStr = String(cond).replace(/_/g, ' ').toUpperCase();
    if (this._CONDITION_ABBR[condStr]) condStr = this._CONDITION_ABBR[condStr];
    return '<span class="mech-tok-primary">' + sign + t + '°</span> ' +
           '<span class="mech-tok-secondary">' + condStr + '</span>';
  },

  _airHtml(state) {
    var v = state.aqi.value;
    if (v === null || v === undefined) {
      return '<span class="mech-tok-tertiary">—</span>';
    }
    var band = state.aqi.band || '';
    var bandStr = String(band).replace(/_/g, ' ').toUpperCase();
    var vs = String(v).padStart(3, '0');
    return '<span class="mech-tok-primary">' + vs + '</span> ' +
           '<span class="mech-tok-secondary">' + bandStr + '</span>';
  },

  _tideHtml(state, timeFormat) {
    var type = state.tide.type;
    if (!type) {
      // Tide-specific null preserves visual length.
      return '<span class="mech-tok-tertiary">— —M —:—</span>';
    }
    var letter = type === 'high' ? 'H' : 'L';
    var hM = (state.tide.heightM === null || state.tide.heightM === undefined)
      ? '—M'
      : Number(state.tide.heightM).toFixed(1) + 'M';
    var timeStr = state.tide.time || '';
    var timeBits = this._parseTime(timeStr, timeFormat);
    var out =
      '<span class="mech-tok-tertiary">' + letter + '</span> ' +
      '<span class="mech-tok-primary">' + hM + '</span> ' +
      '<span class="mech-tok-tertiary">' + timeBits.digits + '</span>';
    if (timeBits.ampm) {
      out += ' <span class="mech-tok-ampm">' + timeBits.ampm + '</span>';
    }
    return out;
  },

  // Parse a time string into formatted display bits for the requested format.
  // Accepts 'HH:MM', 'H:MM AM', ISO 8601 strings (tide and sun column inputs).
  // Returns { digits: string, ampm: string|null }.
  _parseTime(raw, timeFormat) {
    if (!raw) return { digits: '—:—', ampm: null };
    var m = /(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i.exec(raw);
    if (!m) return { digits: '—:—', ampm: null };
    var hh = parseInt(m[1], 10);
    var mm = m[2];
    var ap = m[3] ? m[3].toUpperCase() : null;
    // If the source string carries an AM/PM tag, reconstruct h24 first so we
    // can re-format for the face's own timeFormat tweak.
    if (ap) {
      hh = (ap === 'AM') ? (hh === 12 ? 0 : hh) : (hh === 12 ? 12 : hh + 12);
    }
    if (timeFormat === '12h') {
      var h12 = hh % 12; if (h12 === 0) h12 = 12;
      return { digits: h12 + ':' + mm, ampm: hh < 12 ? 'AM' : 'PM' };
    }
    return { digits: String(hh).padStart(2, '0') + ':' + mm, ampm: null };
  },

  _moonHtml(state) {
    var name = state.moon.phaseName;
    if (!name) return '<span class="mech-tok-tertiary">—</span>';
    var abbrev = this._moonAbbrev[name];
    if (!abbrev) abbrev = String(name).slice(0, 8).toUpperCase();
    var pct = Math.round((state.moon.illumination || 0) * 100);
    return '<span class="mech-tok-primary">' + abbrev + '</span> ' +
           '<span class="mech-tok-primary">' + pct + '%</span>';
  },

  _sunHtml(state, timeFormat) {
    var rise = state.sun.sunrise;
    var set  = state.sun.sunset;
    if (!rise || !set) return '<span class="mech-tok-tertiary">—</span>';
    var r = this._parseTime(rise, timeFormat);
    var s = this._parseTime(set,  timeFormat);
    // Phase 17.1: drop AM/PM tokens in SUN 12h mode. Sunrise is always AM,
    // sunset always PM; the arrow glyphs already encode rise vs set, so the
    // suffix is redundant and pushes the value over the 204 px column width.
    var out =
      '<span class="mech-tok-accent">↑</span> ' +
      '<span class="mech-tok-primary">' + r.digits + '</span>' +
      ' <span class="mech-tok-accent">↓</span> ' +
      '<span class="mech-tok-primary">' + s.digits + '</span>';
    return out;
  }
};

// Phase 18: Departures face. Third face in V1. Five rows of event candidates
// cycle on a 45 s cadence with a per-character split-flap cascade via
// KineticType. Flap-pair headline time top-left; status block top-right;
// header and footer chrome strips above and below. Builds its own DOM subtree
// inside #stage in init(); removes Calm-shaped nodes first so DisplayModule
// does not bind to dead handles. All inner state is local; no AppState writes.
const DeparturesFace = {
  _els: null,
  _lastRowEpoch: -1,
  _lastRowHashes: ['', '', '', '', ''],
  _lastColumnPermIndex: -1,
  _lastMinuteKey: null,
  _lastIsoDate: null,
  _lastStatusHashes: ['', '', ''],
  _lastFooterHashes: ['', '', ''],
  _rowCandidates: null,        // cached row candidate set (recomputed per epoch)

  // 6 h column-width reflow permutations (Section 13).
  _COLUMN_PERMS: [
    '110px 110px 1fr 200px',
    '120px 100px 1fr 210px',
    '100px 120px 1fr 190px'
  ],

  _MOON_ABBREV: {
    'New Moon': 'NEW',
    'Waxing Crescent': 'WAX CRES',
    'First Quarter': 'FIRST Q',
    'Waxing Gibbous': 'WAX GIB',
    'Full Moon': 'FULL',
    'Waning Gibbous': 'WAN GIB',
    'Last Quarter': 'LAST Q',
    'Waning Crescent': 'WAN CRES'
  },

  // -- Lifecycle --

  init(stage) {
    if (!stage) return;
    // Remove Calm-shaped DOM so DisplayModule.init() does not cache handles
    // to nodes Departures does not paint. Mirrors MechanicalFace's pattern.
    ['time', 'date', 'slot', 'moon-disc'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });
    // Remove any other face subtree, in case of double-init.
    ['mech-stage', 'dep-stage'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });

    var rowsHtml = '';
    for (var i = 0; i < 5; i++) {
      rowsHtml +=
        '<div class="dep-row" data-row="' + i + '">' +
          '<span class="dep-time-cell"></span>' +
          '<span class="dep-event-cell"></span>' +
          '<span class="dep-detail-cell"></span>' +
          '<span class="dep-status-cell"></span>' +
        '</div>';
    }

    var root = document.createElement('div');
    root.id = 'dep-stage';
    root.innerHTML =
      '<div id="dep-upper">' +
        '<div id="dep-header">' +
          '<span class="dep-header-left">SOLARI · DEPARTURE BOARD</span>' +
          '<span class="dep-header-center">VANCOUVER · POINT ATKINSON</span>' +
          '<span class="dep-header-right"></span>' +
        '</div>' +
        '<div id="dep-time">' +
          '<span class="dep-flap-group">' +
            '<span class="dep-flap-char">-</span><span class="dep-flap-char">-</span>' +
          '</span>' +
          '<span class="dep-colon">:</span>' +
          '<span class="dep-flap-group">' +
            '<span class="dep-flap-char">-</span><span class="dep-flap-char">-</span>' +
          '</span>' +
        '</div>' +
        '<div id="dep-status">' +
          '<div class="dep-status-now">NOW · ---</div>' +
          '<div class="dep-status-weather">---</div>' +
          '<div class="dep-status-next">---</div>' +
        '</div>' +
      '</div>' +
      '<div id="dep-board-header">' +
        '<span>TIME</span><span>EVENT</span><span>DETAIL</span><span>STATUS</span>' +
      '</div>' +
      '<div id="dep-board">' + rowsHtml + '</div>' +
      '<div id="dep-footer">' +
        '<span class="dep-footer-weather">---</span>' +
        '<span class="dep-footer-air">---</span>' +
        '<span class="dep-footer-alerts">---</span>' +
      '</div>';
    stage.appendChild(root);

    this._els = {
      root: root,
      upper: root.querySelector('#dep-upper'),
      header: root.querySelector('#dep-header'),
      headerRight: root.querySelector('.dep-header-right'),
      time: root.querySelector('#dep-time'),
      flapChars: Array.from(root.querySelectorAll('.dep-flap-char')),
      statusNow: root.querySelector('.dep-status-now'),
      statusWeather: root.querySelector('.dep-status-weather'),
      statusNext: root.querySelector('.dep-status-next'),
      boardHeader: root.querySelector('#dep-board-header'),
      board: root.querySelector('#dep-board'),
      rows: Array.from(root.querySelectorAll('.dep-row')),
      footerWeather: root.querySelector('.dep-footer-weather'),
      footerAir: root.querySelector('.dep-footer-air'),
      footerAlerts: root.querySelector('.dep-footer-alerts')
    };
    // Initialise per-flap-char span (for per-character cascade) with a single
    // .char child so KineticType.animate has something to drive.
    this._els.flapChars.forEach(function (span) {
      span.innerHTML = '<span class="char">-</span>';
    });
    // Initialise each row cell with a single .char child for KineticType.
    this._els.rows.forEach(function (row) {
      var cells = row.querySelectorAll('span');
      cells.forEach(function (cell) {
        cell.innerHTML = '<span class="char">—</span>';
      });
    });

    this._lastRowEpoch = -1;
    this._lastRowHashes = ['', '', '', '', ''];
    this._lastColumnPermIndex = -1;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
    this._lastStatusHashes = ['', '', ''];
    this._lastFooterHashes = ['', '', ''];
    this._rowCandidates = null;
  },

  render(state, _tweaks) {
    if (!this._els) return;
    this._renderHeader(state);
    this._renderTime(state);
    this._renderStatus(state);
    this._renderBoard(state);
    this._renderFooter(state);
    this._applyMacroShifts(state);
  },

  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._lastRowEpoch = -1;
    this._lastRowHashes = ['', '', '', '', ''];
    this._lastColumnPermIndex = -1;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
    this._lastStatusHashes = ['', '', ''];
    this._lastFooterHashes = ['', '', ''];
    this._rowCandidates = null;
  },

  // -- Helpers: time + date formatting --

  // Convert AppState.time (which may be 12h with ampm) into [h24, mm].
  _resolve24h(state) {
    var t = state.time || {};
    var h = (typeof t.hours === 'number') ? t.hours : 0;
    if (t.ampm) {
      if (t.ampm === 'AM') h = (t.hours === 12) ? 0 : t.hours;
      else h = (t.hours === 12) ? 12 : t.hours + 12;
    }
    return [h, (typeof t.minutes === 'number') ? t.minutes : 0];
  },

  // "HH:MM" 24h from a Date.
  _hhmm(date) {
    return String(date.getHours()).padStart(2, '0') + ':' +
           String(date.getMinutes()).padStart(2, '0');
  },

  // Parse a stored time string ("6:14 AM", "18:14", ISO) anchored to today.
  // Returns a Date or null.
  _parseClockOrIso(raw) {
    if (!raw) return null;
    // ISO 8601 with 'T'
    if (raw.indexOf('T') >= 0) {
      var d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }
    var m = /^\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\s*$/i.exec(raw);
    if (!m) return null;
    var hh = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10);
    if (m[3]) {
      var ap = m[3].toUpperCase();
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
    }
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
  },

  // Status string for a future timestamp; "PAST" if past with > 5 min grace.
  // Returns { status, accent, isPast }.
  _statusFor(ts, now) {
    var delta = ts - now;
    var graceMs = 5 * 60 * 1000;
    if (delta < -graceMs) return { status: 'PAST', accent: false, isPast: true };
    if (delta < 60 * 1000) return { status: 'ARRIVING', accent: true, isPast: false };
    var mins = Math.round(delta / 60000);
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var accent = h === 0;        // < 1 hour away
    return {
      status: 'IN ' + h + 'H ' + String(m).padStart(2, '0') + 'M',
      accent: accent,
      isPast: false
    };
  },

  // -- Repaint gates --

  _renderHeader(state) {
    var iso = state.date && state.date.isoDate || '';
    if (iso === this._lastIsoDate) return;
    this._lastIsoDate = iso;
    var dow = (state.date && state.date.dayOfWeek) ? state.date.dayOfWeek.slice(0, 3).toUpperCase() : '---';
    var isoDot = iso ? iso.replace(/-/g, '.') : '----.--.--';
    this._els.headerRight.textContent = dow + ' ' + isoDot + ' · LOCAL';
  },

  _renderTime(state) {
    var pair = this._resolve24h(state);
    var hh = String(pair[0]).padStart(2, '0');
    var mm = String(pair[1]).padStart(2, '0');
    var key = hh + ':' + mm;
    if (key === this._lastMinuteKey) return;
    this._lastMinuteKey = key;
    var chars = [hh.charAt(0), hh.charAt(1), mm.charAt(0), mm.charAt(1)];
    var spans = this._els.flapChars;
    for (var i = 0; i < 4; i++) {
      this._cascadeCell(spans[i], chars[i]);
    }
  },

  // Formats weather as "PARTLY CLOUDY +12°" or '—' when data is absent.
  // prefix is prepended when provided (e.g. "WEATHER · ").
  _formatWeatherStr(state, prefix) {
    var w = state.weather || {};
    var p = prefix || '';
    if (w.condition == null || w.tempC == null) return p ? p + '—' : '—';
    var cond = String(w.condition).replace(/_/g, ' ').toUpperCase();
    var sign = w.tempC >= 0 ? '+' : '';
    return p + cond + ' ' + sign + w.tempC + '°';
  },

  _renderStatus(state) {
    var now = new Date();
    var dow = (state.date && state.date.dayOfWeek) ? state.date.dayOfWeek.slice(0, 3).toUpperCase() : '---';
    var nowLine = 'NOW · ' + dow;
    var weatherLine = this._formatWeatherStr(state);

    var nextLine = this._nextEventCountdown(state, now);

    var lines = [nowLine, weatherLine, nextLine];
    var els = [this._els.statusNow, this._els.statusWeather, this._els.statusNext];
    for (var i = 0; i < 3; i++) {
      if (lines[i] !== this._lastStatusHashes[i]) {
        this._lastStatusHashes[i] = lines[i];
        els[i].textContent = lines[i];
      }
    }
  },

  _nextEventCountdown(state, now) {
    // Show whichever of the next two sun events (sunrise/sunset) is sooner.
    var sr = this._parseClockOrIso(state.sun && state.sun.sunrise);
    var ss = this._parseClockOrIso(state.sun && state.sun.sunset);
    var target = null;
    var label = null;
    if (sr && sr.getTime() > now.getTime()) { target = sr; label = 'SUNRISE'; }
    if (ss && ss.getTime() > now.getTime() && (!target || ss.getTime() < target.getTime())) {
      target = ss; label = 'SUNSET';
    }
    if (!target) {
      // After today's sunset, show tomorrow's sunrise time.
      if (sr) {
        target = new Date(sr.getTime() + 24 * 60 * 60 * 1000);
        label = 'SUNRISE';
      } else {
        return '—';
      }
    }
    var deltaMin = Math.max(0, Math.round((target - now) / 60000));
    var h = Math.floor(deltaMin / 60);
    var m = deltaMin % 60;
    return label + ' IN ' + h + 'H ' + String(m).padStart(2, '0') + 'M';
  },

  _renderFooter(state) {
    var footerWeather = this._formatWeatherStr(state, 'WEATHER · ');

    var a = state.aqi || {};
    var footerAir;
    if (a.value === null || a.value === undefined) {
      footerAir = 'AIR · —';
    } else {
      var band = (a.band || '').toString().replace(/_/g, ' ').toUpperCase();
      footerAir = 'AIR · ' + band + ' (' + a.value + ')';
    }

    var preempt = state.alertPreempt;
    var footerAlerts = preempt ? '1 ALERT' : 'NO ALERTS';

    var values = [footerWeather, footerAir, footerAlerts];
    var els = [this._els.footerWeather, this._els.footerAir, this._els.footerAlerts];
    for (var i = 0; i < 3; i++) {
      if (values[i] !== this._lastFooterHashes[i]) {
        this._lastFooterHashes[i] = values[i];
        els[i].textContent = values[i];
      }
    }
  },

  _renderBoard(state) {
    var now = new Date();
    var epoch = Math.floor(now.getTime() / 45000);
    if (epoch !== this._lastRowEpoch || this._rowCandidates === null) {
      this._lastRowEpoch = epoch;
      this._rowCandidates = this._buildRows(state, now);
    } else {
      // Within an epoch, recompute status countdowns (which depend on now)
      // on the cached candidate set; other fields are stable.
      this._refreshRowStatuses(now);
    }

    for (var i = 0; i < 5; i++) {
      this._renderRow(i, this._rowCandidates[i]);
    }
  },

  _buildRows(state, now) {
    var candidates = [];

    // Sun: next sun event (sunrise or sunset)
    var sr = this._parseClockOrIso(state.sun && state.sun.sunrise);
    var ss = this._parseClockOrIso(state.sun && state.sun.sunset);
    if (sr) {
      candidates.push(this._sunRow(sr, 'SUNRISE', now));
    }
    if (ss) {
      candidates.push(this._sunRow(ss, 'SUNSET', now));
    }
    // Tomorrow's sunrise (always include so the list never starves)
    if (sr) {
      var tomorrowSr = new Date(sr.getTime() + 24 * 60 * 60 * 1000);
      candidates.push({
        time: this._hhmm(tomorrowSr),
        event: 'SUN',
        detail: 'SUNRISE · CIVIL DAWN',
        status: 'TOMORROW',
        accent: false,
        isPast: false,
        timestamp: tomorrowSr.getTime()
      });
    }

    // Tide
    var tide = state.tide;
    if (tide && tide.type && tide.time) {
      var tideDate = this._parseClockOrIso(tide.time);
      if (tideDate) {
        var label = tide.type === 'high' ? 'HIGH' : 'LOW';
        var heightStr = (tide.heightM !== null && tide.heightM !== undefined)
          ? Number(tide.heightM).toFixed(1) + 'M' : '—M';
        var s = this._statusFor(tideDate.getTime(), now.getTime());
        candidates.push({
          time: this._hhmm(tideDate),
          event: 'TIDE',
          detail: label + ' ' + heightStr + ' · POINT ATKINSON',
          status: s.status,
          accent: s.accent,
          isPast: s.isPast,
          timestamp: tideDate.getTime(),
          detailAccentWord: label
        });
      }
    }

    // Moon rise/set from AppState.moon (populated by MoonModule.update()).
    // MoonModule already calls SunCalc.getMoonTimes on its 6h cadence;
    // reading from state avoids a duplicate SunCalc call every 45s here.
    var moonM = state.moon || {};
    var phaseName = moonM.phaseName || '';
    var abbrev = this._MOON_ABBREV[phaseName] || (phaseName ? phaseName.slice(0, 8).toUpperCase() : '—');
    var pct = Math.round((moonM.illumination || 0) * 100);
    var moonDetail = abbrev + ' · ' + pct + '%';
    if (moonM.moonrise) {
      var riseDate = this._parseClockOrIso(moonM.moonrise);
      if (riseDate) {
        var riseTs = riseDate.getTime();
        var sRise = this._statusFor(riseTs, now.getTime());
        candidates.push({
          time: this._hhmm(riseDate),
          event: 'MOON',
          detail: moonDetail,
          status: sRise.isPast ? 'PAST' : (sRise.accent ? 'RISING' : sRise.status),
          accent: sRise.accent,
          isPast: sRise.isPast,
          timestamp: riseTs
        });
      }
    }
    if (moonM.moonset) {
      var setDate = this._parseClockOrIso(moonM.moonset);
      if (setDate) {
        var setTs = setDate.getTime();
        var sSet = this._statusFor(setTs, now.getTime());
        candidates.push({
          time: this._hhmm(setDate),
          event: 'MOON',
          detail: moonDetail,
          status: sSet.isPast ? 'PAST' : (sSet.accent ? 'SETTING' : sSet.status),
          accent: sSet.accent,
          isPast: sSet.isPast,
          timestamp: setTs
        });
      }
    }

    // Almanac
    var a = state.almanac;
    if (a && a.name && a.date) {
      var almanacDate = new Date(a.date + 'T00:00:00');
      if (!isNaN(almanacDate.getTime())) {
        var status;
        if (a.daysAway === 0) status = 'TONIGHT';
        else if (a.daysAway === 1) status = 'TOMORROW';
        else status = 'IN ' + a.daysAway + 'D';
        // Event kind heuristic: name containing METEOR/SHOWER -> METEOR;
        // FULL/NEW MOON already covered by moonrise/set; eclipse -> ECLIPSE; else ALMANAC.
        var up = a.name.toUpperCase();
        var event = 'ALMANAC';
        if (up.indexOf('METEOR') >= 0 || up.indexOf('SHOWER') >= 0) event = 'METEOR';
        else if (up.indexOf('ECLIPSE') >= 0) event = 'ECLIPSE';
        else if (up.indexOf('FULL MOON') >= 0 || up.indexOf('NEW MOON') >= 0) event = 'MOON';
        candidates.push({
          time: '--:--',
          event: event,
          detail: up + ' · PEAK ' + a.date,
          status: status,
          accent: false,
          isPast: false,
          timestamp: almanacDate.getTime()
        });
      }
    }

    // Sort by timestamp ascending; take first 5 (past rows surface at top).
    candidates.sort(function (a, b) { return a.timestamp - b.timestamp; });
    var rows = candidates.slice(0, 5);

    // Alert preemption: row 0 becomes the alert; shift the rest down.
    if (state.alertPreempt) {
      var alertRow = {
        time: this._hhmm(now),
        event: 'ALERT',
        detail: String(state.alertPreempt),
        status: 'ACTIVE',
        accent: true,
        isPast: false,
        timestamp: now.getTime()
      };
      rows = [alertRow].concat(rows).slice(0, 5);
    }

    // Pad with placeholder rows so the board layout stays stable.
    while (rows.length < 5) {
      rows.push({
        time: '—',
        event: '—',
        detail: '—',
        status: '—',
        accent: false,
        isPast: false,
        timestamp: Number.MAX_SAFE_INTEGER,
        placeholder: true
      });
    }

    return rows;
  },

  _sunRow(date, label, now) {
    var s = this._statusFor(date.getTime(), now.getTime());
    return {
      time: this._hhmm(date),
      event: 'SUN',
      detail: 'GOLDEN HOUR · ' + label,
      status: s.status,
      accent: s.accent,
      isPast: s.isPast,
      timestamp: date.getTime(),
      detailAccentWord: label === 'SUNRISE' ? 'SUNRISE' : 'SUNSET'
    };
  },

  _refreshRowStatuses(now) {
    if (!this._rowCandidates) return;
    var nowMs = now.getTime();
    for (var i = 0; i < this._rowCandidates.length; i++) {
      var row = this._rowCandidates[i];
      if (!row || row.placeholder) continue;
      // Skip rows whose status is a fixed label that doesn't depend on now.
      // 'TOMORROW'/'TONIGHT' are calendar labels; 'IN 3D' is an almanac
      // days-away label. Time-based countdowns ('IN 5H 12M', 'ARRIVING',
      // 'RISING', 'SETTING', 'PAST') must be recomputed each tick.
      if (row.status === 'TOMORROW' || row.status === 'TONIGHT' ||
          (row.status && row.status.startsWith('IN ') && row.status.endsWith('D'))) {
        continue;
      }
      var s = this._statusFor(row.timestamp, nowMs);
      row.status = s.status;
      row.accent = s.accent;
      row.isPast = s.isPast;
    }
  },

  _renderRow(idx, row) {
    var el = this._els.rows[idx];
    if (!el || !row) return;
    var hash = row.time + '|' + row.event + '|' + row.detail + '|' + row.status + '|' + (row.accent ? '1' : '0') + '|' + (row.isPast ? '1' : '0');
    if (hash === this._lastRowHashes[idx]) return;
    this._lastRowHashes[idx] = hash;

    // Class toggles
    el.classList.toggle('is-past', !!row.isPast);
    el.classList.toggle('is-imminent', !!row.accent && !row.isPast);

    var cells = el.children;
    var statusText = row.isPast ? 'PAST' : row.status;
    this._cascadeCell(cells[0], row.time);
    this._cascadeCell(cells[1], row.event);
    this._renderDetailCell(cells[2], row);
    this._cascadeCell(cells[3], statusText);
  },

  _renderDetailCell(cell, row) {
    // Detail strings render as a flat per-character cascade. The leading
    // accent-word emphasis described in the spec (Section 8) is a "may"
    // option and is deferred; the imminent-row accent already lights up
    // the TIME and STATUS columns via .is-imminent rules. KineticType
    // operates on .char spans so injecting a nested .dep-detail-accent
    // span would conflict with the cascade machinery.
    this._cascadeCell(cell, row.detail || '');
  },

  // Per-character split-flap cascade. Departures uses 110ms stagger (spec
  // Section 2) vs the global 70ms used by the rotator slot.
  _STAGGER_MS: 110,

  _cascadeCell(cell, text) {
    if (!cell) return;
    var current = cell.textContent || '';
    if (current === text) return;
    // First paint: seed via create() so KineticType.animate has spans to drive.
    if (!cell.querySelector('.char')) {
      cell.textContent = text;
      KineticType.create(cell);
      return;
    }
    KineticType.animate(cell, text, this._STAGGER_MS);
  },

  // -- Macro shifts --
  // Upper-band 3h y-delta is owned by MacroShifter (runs on a timer with CSS
  // transition, writing --dep-upper-shift-y via _applyTime). This method owns
  // only the 6h column-width reflow, which is content-grid-driven and not
  // an absolute-position shift, so it lives here instead of MacroShifter.

  _applyMacroShifts(state) {
    var t = state.time || {};
    var h24 = this._resolve24h(state)[0];
    var h = h24
          + ((typeof t.minutes === 'number') ? t.minutes : 0) / 60;

    var colIdx = Math.floor(h / 6) % 3;
    if (colIdx !== this._lastColumnPermIndex) {
      var perm = this._COLUMN_PERMS[colIdx];
      this._els.boardHeader.style.gridTemplateColumns = perm;
      for (var i = 0; i < this._els.rows.length; i++) {
        this._els.rows[i].style.gridTemplateColumns = perm;
      }
      this._lastColumnPermIndex = colIdx;
    }
  }
};

// Phase 16: face registry. Phase 17 registers `mechanical`; future faces
// register themselves here and use the same init/render/teardown contract.
const MECHANICAL_TIME_FORMATS = ['24h', '12h'];

// Phase 18: Departures opacity tweak clamp range.
const DEPARTURES_OPACITY_MIN = 0.0;
const DEPARTURES_OPACITY_MAX = 0.4;
const DEPARTURES_OPACITY_DEFAULT = 0.22;

function _clampDeparturesOpacity(v) {
  if (typeof v !== 'number' || !isFinite(v)) return DEPARTURES_OPACITY_DEFAULT;
  if (v < DEPARTURES_OPACITY_MIN) return DEPARTURES_OPACITY_MIN;
  if (v > DEPARTURES_OPACITY_MAX) return DEPARTURES_OPACITY_MAX;
  return v;
}

const ClockfaceRegistry = {
  faces: {
    calm: CalmFace,
    mechanical: MechanicalFace,       // Phase 17
    departures: DeparturesFace        // Phase 18
    // editorial:  EditorialFace,     // Phase 19
    // horizon:    HorizonFace        // Phase 20
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
      return {
        accent: def.accent,
        driftIntensity: def.driftIntensity,
        byFace: {
          mechanical: { timeFormat: '24h', previewMode: false },
          departures: { flapBezelOpacity: DEPARTURES_OPACITY_DEFAULT }
        }
      };
    }
    const accent = ACCENT_PALETTE[parsed.accent] ? parsed.accent : def.accent;
    const driftIntensity = (DRIFT_INTENSITY_MULT[parsed.driftIntensity] !== undefined)
      ? parsed.driftIntensity
      : def.driftIntensity;
    const byFace = (parsed.byFace && typeof parsed.byFace === 'object') ? parsed.byFace : {};

    // Phase 17: normalise mechanical sub-object. previewMode is always
    // coerced to a boolean and is never persisted by the picker on Apply.
    const mech = (byFace.mechanical && typeof byFace.mechanical === 'object')
      ? byFace.mechanical
      : {};
    const tf = MECHANICAL_TIME_FORMATS.indexOf(mech.timeFormat) >= 0 ? mech.timeFormat : '24h';
    const pm = mech.previewMode === true;
    byFace.mechanical = { timeFormat: tf, previewMode: pm };

    // Phase 18: normalise departures sub-object. flapBezelOpacity clamped
    // to [0.0, 0.4]; NaN / non-numeric / missing -> 0.22 default.
    const dep = (byFace.departures && typeof byFace.departures === 'object')
      ? byFace.departures
      : {};
    byFace.departures = {
      flapBezelOpacity: _clampDeparturesOpacity(dep.flapBezelOpacity)
    };

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
  },

  // Phase 18: seed --bezel-accent once at boot from the accent palette.
  // The variable holds the bare RGB triple ("244, 197, 108" for gold) so the
  // CSS can compose rgba() with the live --flap-bezel-opacity tweak.
  // SkyColorModule and ObservanceModule never touch --bezel-accent; this is
  // structural chrome (the chihiro lock).
  applyBezelAccent(accentId) {
    const entry = ACCENT_PALETTE[accentId] || ACCENT_PALETTE.gold;
    const hex = entry.hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty('--bezel-accent', r + ', ' + g + ', ' + b);
  }
};

// Face dispatch state. Set in boot(); read by MacroShifter and VersionOverlay
// before boot() runs would produce stale 'calm' values. Both modules are only
// ever called after boot() has set the real values, so the default here is safe.
// Invariant: do not read ACTIVE_FACE_ID before the boot() IIFE assigns it.
let ACTIVE_FACE = CalmFace;
let ACTIVE_FACE_ID = CONFIG.clockface.defaultFaceId;
let TWEAKS = { accent: 'gold', driftIntensity: 'normal', byFace: {} };

// Phase 17: window-scope exports so clockface.js can drive face renders in
// the picker without duplicating face code. The picker sets
// window.SOLARI_PICKER = true before loading app.js; the boot IIFE returns
// early on that flag, leaving these face objects available for picker use.
window.CalmFace = CalmFace;
window.MechanicalFace = MechanicalFace;
window.DeparturesFace = DeparturesFace;   // Phase 18
window.ClockfaceRegistry = ClockfaceRegistry;

(function boot() {
  // Phase 17: picker boot guard. When app.js loads inside clockface.html, the
  // picker has set window.SOLARI_PICKER = true to suppress fetchers, timers,
  // the render loop, and the storage-event reload. Face class objects above
  // are already exported on window for the picker to drive directly.
  if (window.SOLARI_PICKER) return;

  // Phase 16: read storage and resolve face + tweaks
  ACTIVE_FACE_ID = localStorage.getItem('solari.clockface') || CONFIG.clockface.defaultFaceId;
  TWEAKS = ClockfaceRegistry.normalizeTweaks(
    localStorage.getItem('solari.clockface.tweaks')
  );
  ACTIVE_FACE = ClockfaceRegistry.resolve(ACTIVE_FACE_ID);
  // If resolve() fell back to default, sync the id so per-face branches agree.
  if (!ClockfaceRegistry.faces[ACTIVE_FACE_ID]) {
    ACTIVE_FACE_ID = CONFIG.clockface.defaultFaceId;
  }

  // Apply accent and drift intensity tweaks before module starts so the first
  // paint already reflects them. SkyColorModule.update() and DriftEngine.start()
  // will continue from these floor values.
  ClockfaceRegistry.applyAccent(TWEAKS.accent);
  ClockfaceRegistry.applyDriftIntensity(TWEAKS.driftIntensity);
  // Phase 18: seed --bezel-accent once from the accent palette. SkyColorModule
  // never touches this variable; the bezel is structural chrome.
  ClockfaceRegistry.applyBezelAccent(TWEAKS.accent);
  // Phase 18: apply --flap-bezel-opacity when the Departures face is active.
  if (ACTIVE_FACE_ID === 'departures') {
    const dep = (TWEAKS.byFace && TWEAKS.byFace.departures) || {};
    const op = (typeof dep.flapBezelOpacity === 'number') ? dep.flapBezelOpacity : 0.22;
    document.documentElement.style.setProperty('--flap-bezel-opacity', String(op));
  }

  // Stage scaffolding (creates #stage if missing, attaches resize listener)
  const stage = Stage.init();

  // Initialise the active face. CalmFace adopts the static DOM; MechanicalFace
  // (and later faces) build their own subtree inside #stage and remove Calm's.
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
