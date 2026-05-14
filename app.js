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
    // Phase 20: bumped 101 -> 109. Horizon activates `sun` and `horizon`
    // on the same face; 101/101 would lock-step. 109 is the next prime,
    // pairwise coprime with 61/73/79/89/101/117/143.
    horizon:      { ampX: 18, ampY: 12, periodSec: 109 },
    departureRow: { ampX: 6,  ampY: 4,  periodSec: 61  },
    tickRail:     { ampX: 4,  ampY: 3,  periodSec: 79  },
    // Phase 19: per-face amplitude override for the `time` channel.
    // Period is shared (117 s); only ampX/ampY differ. DriftEngine reads
    // CONFIG.driftClasses.timeByFace[FACE_ID] and falls back to `time` when
    // no entry exists. Editorial's 360 px italic numerals warrant a higher
    // amplitude to compensate for the largest static type in the project.
    timeByFace: {
      editorial: { ampX: 30, ampY: 22 }
    }
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
                 'departureRow3', 'departureRow4'],
    editorial:  ['time', 'date', 'slot', 'tickRail'],
    horizon:    ['time', 'date', 'slot', 'moon', 'sun', 'horizon']
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
      departures: [[0, 0], [0, -30]],
      // Phase 19: Editorial uses pixel coords (top-left anchor) rather
      // than percent. MacroShifter auto-detects pixel vs percent by entry
      // value range (any value > 100 -> pixels). Two homes alternated on
      // a 6 h interval (see timeIntervalHoursByFace).
      editorial: [[100, 200], [560, 200]],
      // Phase 20.1: collapsed to a single home after measured-width audit.
      // Home A (left=90) clipped the leading character; Home B (left=870)
      // overlapped #hz-status. left=140 centers the ~685 px block in the
      // lower band with both edges inside the stage and clear of the
      // relocated status block (now top-right).
      horizon: [[140, 560]]
    },
    // Phase 19: per-face interval override. Editorial and Horizon shift
    // every 6 h; faces without an entry use the global timeIntervalHours
    // (3 h). MacroShifter reads this when scheduling its time interval.
    timeIntervalHoursByFace: {
      editorial: 6,
      // Phase 20.1: 0 disables the macro-shift timer for Horizon.
      // Layer-4 burn-in coverage shifts entirely to per-element Perlin
      // drift on the `time` channel (117 s, 24/18 px amplitude).
      horizon: 0
    },
    // Phase 20: per-face transition style. 'translate' (default) tweens
    // left/top with a CSS transition; 'fade' cross-fades opacity, swaps
    // home at the midpoint, and fades back in. Horizon uses 'fade' so the
    // 220 px big-time block does not read as obvious sliding motion.
    // Phase 19: paired right-column block homes. When set, MacroShifter
    // mirrors a second element (#ed-right) on the same interval so the
    // top-half composition swaps as a unit. Pixel coords (top-left anchor).
    rightBlockHomesByFace: {
      editorial: [[850, 220], [290, 220]]
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
        console.warn('TideModule: DFO CORS blocked; falling back to data/tides.json');
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
    const data = await ResilienceManager.fetch('data/tides.json');
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
        console.warn('AlertModule: EC CORS blocked; falling back to data/alerts.json');
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
    const data = await ResilienceManager.fetch('data/alerts.json');
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
    const data = await ResilienceManager.fetch('data/almanac.json');
    if (Array.isArray(data)) {
      this._events = data;
    } else {
      this._events = [];
      console.warn('AlmanacModule: failed to load data/almanac.json');
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
  // Phase 19: `name_long` is the editorial dropline phrase, rendered by
  // EditorialFace when the active observance has `treatment === 'light'`.
  // Other faces ignore the field. Major treatments may also carry it
  // (Editorial reserves the dropline for light treatments per chihiro's lock).
  _builtIn: [
    { name: 'CHRISTMAS DAY',    name_long: 'Christmas Day, December 25.',
      date: '12-25', glyph: '\u2744', treatment: 'major',
      palette: { mode: 'override', primary: '#F4C56C' }, slotEntry: 'CHRISTMAS DAY' },
    { name: "NEW YEAR'S DAY",   name_long: "New Year's Day, January 1.",
      date: '01-01', glyph: '\u2726', treatment: 'major',
      palette: { mode: 'override', primary: '#C8D4E8' }, slotEntry: "NEW YEAR'S DAY" },
    { name: 'SPRING EQUINOX',   name_long: 'Equinox, March 20.',
      date: 'equinox-spring', glyph: '\u273F', treatment: 'light',
      palette: { mode: 'tint', hueShift: 30, satShift: 0 } },
    { name: 'SUMMER SOLSTICE',  name_long: 'Solstice, June 21.',
      date: 'solstice-summer', glyph: '\u2609', treatment: 'light',
      palette: { mode: 'tint', hueShift: 10, satShift: 10 } },
    { name: 'FALL EQUINOX',     name_long: 'Equinox, September 22.',
      date: 'equinox-fall', glyph: '\u2766', treatment: 'light',
      palette: { mode: 'tint', hueShift: 20, satShift: 5 } },
    { name: 'WINTER SOLSTICE',  name_long: 'Solstice, December 21.',
      date: 'solstice-winter', glyph: '\u263E', treatment: 'light',
      palette: { mode: 'tint', hueShift: -25, satShift: 0 } },
    { name: 'HALLOWEEN',        name_long: "Hallowe'en, October 31.",
      date: '10-31', glyph: '\u25D0', treatment: 'light',
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
        // Phase 19: editorial dropline phrase. Null when authors omit it.
        // EditorialFace renders the dropline only when this is non-null AND
        // treatment === 'light'.
        name_long: winner.name_long || null,
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

    // Phase 20: --type-accent opt-out contract. V1 has no sky-altitude
    // modulation of --type-accent (accent is set once at boot by
    // ClockfaceRegistry.applyAccent). When V2 adds modulation, check
    // `ACTIVE_FACE.accentSkyTrack === false` here and skip the write for
    // faces that opt out (HorizonFace declares `accentSkyTrack: false` so
    // its gold cursor / colon / DAY headline stay fixed across all sky bands).
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
    departureRow4: { x: 2000, y: 2100 },
    // Phase 20: Horizon channels. Offsets just need to differ from every
    // other entry so sample positions are decorrelated on a fresh boot.
    sun:           { x: 1300, y: 1400 },
    horizon:       { x: 1500, y: 1600 }
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

    // Phase 19: seed `time` anchor from per-face home A when the active face
    // uses pixel-coord homes (top-left anchored). Without this, the first
    // rAF frame clamps against the default center anchor (590, 361) while
    // the actual element center may be elsewhere (e.g. Editorial home A
    // centers at 340, 362). MacroShifter.start() corrects this on its first
    // _applyTime, but seeding here avoids the first-frame artifact.
    const homes = CONFIG.macroShift.timeHomesByFace[ACTIVE_FACE_ID];
    const sizes = this._elementSizesByFace
                && this._elementSizesByFace[ACTIVE_FACE_ID]
                && this._elementSizesByFace[ACTIVE_FACE_ID].time;
    if (homes && sizes && homes[0][0] > 100) {
      const cx = homes[0][0] + sizes.hw;
      const cy = homes[0][1] + sizes.hh;
      this._anchorPercents.time = {
        x: (cx / CONFIG.stage.width) * 100,
        y: (cy / CONFIG.stage.height) * 100
      };
    }

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
      // Phase 19: per-face amplitude overrides for the `time` channel.
      // CONFIG.driftClasses.timeByFace[ACTIVE_FACE_ID] supplies ampX/ampY
      // (period stays the same so coprime spacing is preserved). Other
      // channels are unchanged. Future faces follow the same hook.
      let ampX = cfg.ampX;
      let ampY = cfg.ampY;
      if (key === 'time' && dc.timeByFace && dc.timeByFace[ACTIVE_FACE_ID]) {
        const ov = dc.timeByFace[ACTIVE_FACE_ID];
        if (typeof ov.ampX === 'number') ampX = ov.ampX;
        if (typeof ov.ampY === 'number') ampY = ov.ampY;
      }
      const phase = this._phaseOffsets[key];
      this._entries.push({
        cssPrefix: key,
        ampX: ampX,
        ampY: ampY,
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
  // Phase 19: time amends per active face -- Editorial's 360 px italic
  // numerals occupy a larger box than Calm/Mechanical, so the clamp uses
  // a wider half-extent when ACTIVE_FACE_ID === 'editorial'.
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
    departureRow4: { hw: 510, hh: 18 },
    // Phase 20: Horizon glyph + diagram half-extents.
    sun:           { hw: 60,  hh: 60  },   // halo r=60
    horizon:       { hw: 510, hh: 410 }    // full 1180x820 diagram (half-extents)
  },
  // Phase 19: per-face element-size overrides. When the active face has an
  // entry here, the clamp uses these half-extents instead of the base table.
  // Editorial's HH:MM at 360 px italic is ~480 px wide x ~324 px tall;
  // half-extents 240/162 keep the clamp accurate without over-clamping drift.
  _elementSizesByFace: {
    editorial: {
      time: { hw: 240, hh: 162 }
    },
    // Phase 20: Horizon's #hz-time is Manrope 200, 220 px, anchored top-left
    // via pixel-coord home (90,560 or 870,560). Half-extents 260 x 110 hold
    // the H:MM block + optional 42 px AM/PM suffix.
    horizon: {
      time: { hw: 260, hh: 110 }
    }
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
      // Phase 19: per-face override (Editorial's 360 px time numerals).
      let size = this._elementSizes[e.cssPrefix];
      const byFace = this._elementSizesByFace[ACTIVE_FACE_ID];
      if (byFace && byFace[e.cssPrefix]) size = byFace[e.cssPrefix];
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
    departureRow4: { x: 50, y: 63 },
    // Phase 20: sun glyph follows its computed (x, y) on the arc; the
    // anchor is a coarse stage-centre default for clamp math (the disc
    // moves continuously; clamping to centre keeps it from drifting off
    // the visible stage edges). horizon = diagram interior centroid.
    sun:           { x: 50, y: 50 },
    horizon:       { x: 50, y: 50 }
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

  // Phase 19: per-face interval override. Editorial and Horizon shift on
  // a 6 h cadence; faces without an entry fall back to the global 3 h.
  _timeIntervalHours() {
    var byFace = CONFIG.macroShift.timeIntervalHoursByFace;
    if (byFace && typeof byFace[ACTIVE_FACE_ID] === 'number') {
      return byFace[ACTIVE_FACE_ID];
    }
    return CONFIG.macroShift.timeIntervalHours;
  },

  // Phase 19: paired-block table. When present, _applyTime mirrors a second
  // element on the same interval/transition so the composition swaps as one.
  // Editorial uses this for #ed-right; other faces have no entry.
  _rightBlockHomes() {
    var byFace = CONFIG.macroShift.rightBlockHomesByFace;
    if (byFace && byFace[ACTIVE_FACE_ID]) return byFace[ACTIVE_FACE_ID];
    return null;
  },

  // Phase 17/19/20: the time element id differs per face. Mechanical paints
  // its own #mech-time inside the stage; Editorial uses #ed-time; Horizon
  // uses #hz-time; Calm uses #time.
  _timeElementId() {
    if (ACTIVE_FACE_ID === 'mechanical') return 'mech-time';
    if (ACTIVE_FACE_ID === 'editorial')  return 'ed-time';
    if (ACTIVE_FACE_ID === 'horizon')    return 'hz-time';
    return 'time';
  },

  // Phase 19: detect pixel vs percent home format. Calm and Mechanical use
  // percent (0..100); Editorial uses top-left pixel coords (any value > 100).
  // Mixed-format tables within one face are not supported (spec Section 7).
  _homesArePixels(homes) {
    if (!homes || !homes.length) return false;
    for (var i = 0; i < homes.length; i++) {
      var h = homes[i];
      if (h && (h[0] > 100 || h[1] > 100)) return true;
    }
    return false;
  },

  start() {
    if (!CONFIG.macroShift.enabled) return;

    // Phase 20.1: per-face opt-out. A face with intervalH === 0 or a
    // single-entry homes array is treated as "no macro shift for time".
    // Initial _applyTime still runs so the boot home is placed; the
    // recurring setInterval is skipped. _applyMoon and the moon timer
    // are unaffected (Horizon has no moon disc anyway). Without this
    // guard, intervalH === 0 would yield setInterval(fn, 0), firing
    // as fast as the event loop allows.
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    var intervalH = this._timeIntervalHours();
    var timeHomes = this._timeHomes();
    var skipTimeShift = (intervalH <= 0) || (timeHomes.length <= 1);

    // Deterministic initial index from current hour, using the per-face interval.
    this._timeIndex = skipTimeShift
      ? 0
      : Math.floor(h / intervalH) % timeHomes.length;
    this._moonIndex = Math.floor(h / CONFIG.macroShift.moonIntervalHours) % CONFIG.macroShift.moonHomes.length;

    // Apply initial positions (no transition on first set)
    this._applyTime(false);
    this._applyMoon(false);

    // Schedule recurring shifts. Editorial/Horizon read per-face interval.
    // Phase 20.1: skip the time shift timer for faces with a single home or
    // a non-positive interval (Horizon).
    if (!skipTimeShift) {
      this._timeTimerId = setInterval(
        () => this.shiftTime(),
        intervalH * 60 * 60 * 1000
      );
    }
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

  // Phase 19: _applyHome now accepts a `unit` parameter ('%' or 'px') so the
  // same path serves Calm/Mechanical (percent) and Editorial (pixels). The
  // anchorKey is updated only when the home is in percent; pixel anchors
  // (Editorial) use the stage-pixel coords as-is for clamping.
  _applyHome(elementId, home, transitionSec, anchorKey, withTransition, unit) {
    var el = document.getElementById(elementId);
    if (!el) return;
    if (withTransition) {
      el.style.transition = 'left ' + transitionSec + 's ease-in-out, top ' + transitionSec + 's ease-in-out';
    } else {
      el.style.transition = 'none';
    }
    var u = unit || '%';
    el.style.left = home[0] + u;
    el.style.top = home[1] + u;
    if (anchorKey) {
      // For percent homes, write directly. For pixel homes (Editorial),
      // convert the top-left pixel home into the element's centre in percent
      // so DriftEngine's clamp resolves a sensible anchor (the clamp math
      // assumes centre-anchored elements via translate(-50%, -50%)).
      // Editorial's #ed-time is anchored top-left, so we add the element's
      // half-extents from DriftEngine._elementSizes before converting.
      if (u === '%') {
        DriftEngine.updateAnchor(anchorKey, home[0], home[1]);
      } else {
        var w = CONFIG.stage.width, hgt = CONFIG.stage.height;
        var size = DriftEngine._elementSizes[anchorKey];
        var byFaceSize = DriftEngine._elementSizesByFace[ACTIVE_FACE_ID];
        if (byFaceSize && byFaceSize[anchorKey]) size = byFaceSize[anchorKey];
        var cx = home[0] + (size ? size.hw : 0);
        var cy = home[1] + (size ? size.hh : 0);
        DriftEngine.updateAnchor(anchorKey, (cx / w) * 100, (cy / hgt) * 100);
      }
    }
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
    var timeHomes = this._timeHomes();
    var home = timeHomes[this._timeIndex];
    var unit = this._homesArePixels(timeHomes) ? 'px' : '%';

    this._applyHome(this._timeElementId(), home, CONFIG.macroShift.timeTransitionSec, 'time', withTransition, unit);

    // Phase 19: paired-block mirror. Editorial swaps #ed-right alongside
    // #ed-time on the same 6 h cadence, so the magazine composition flips
    // as one. Other faces have no rightBlockHomesByFace entry and skip this.
    var rightHomes = this._rightBlockHomes();
    if (rightHomes && rightHomes.length) {
      var rightHome = rightHomes[this._timeIndex % rightHomes.length];
      var rightUnit = this._homesArePixels(rightHomes) ? 'px' : '%';
      // anchorKey is null: #ed-right drifts via the `date` channel; its
      // clamp anchor stays at the channel default. Macro shift writes
      // left/top directly without disturbing DriftEngine's clamp origin.
      this._applyHome('ed-right', rightHome, CONFIG.macroShift.timeTransitionSec, null, withTransition, rightUnit);
    }
  },

  _applyMoon(withTransition) {
    // Mechanical, Departures, Editorial, and Horizon have no moon disc.
    if (ACTIVE_FACE_ID === 'mechanical' ||
        ACTIVE_FACE_ID === 'departures' ||
        ACTIVE_FACE_ID === 'editorial' ||
        ACTIVE_FACE_ID === 'horizon') return;
    var home = CONFIG.macroShift.moonHomes[this._moonIndex];
    this._applyHome('moon-disc', home, CONFIG.macroShift.moonTransitionSec, 'moon', withTransition, '%');
  },

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
    // Phase 19: Editorial attaches to #ed-time (no moon disc).
    // Phase 20: Horizon attaches to #hz-time (largest stable element).
    let surfaceId;
    if (ACTIVE_FACE_ID === 'mechanical') surfaceId = 'mech-time';
    else if (ACTIVE_FACE_ID === 'departures') surfaceId = 'dep-time';
    else if (ACTIVE_FACE_ID === 'editorial') surfaceId = 'ed-time';
    else if (ACTIVE_FACE_ID === 'horizon') surfaceId = 'hz-time';
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

// Phase 19: Editorial face. Magazine-cover italic time (Cormorant Garamond
// 300 italic, 360 px), paired right-column block (kicker + weekday + month-
// day), rotating literary almanac paragraph cross-faded every 32 s with
// 1200 ms transition, observance dropline for light treatments, 4-column
// footer of facts. First face with a per-face drift amplitude override
// (time: 30/22) and per-face macro shift interval (6 h vs global 3 h).
// Builds its own DOM subtree inside #stage in init(); removes Calm-shaped
// nodes first so DisplayModule does not bind to dead handles. All inner
// state is local; no AppState writes.
const EditorialFace = {
  _els: null,
  _lastMinuteKey: null,         // 'timeFormat|HH:MM|ampm'; gates time + kicker repaint
  _lastIsoDate: null,           // gates weekday/month-day repaint
  _lastTemplateId: null,        // gates paragraph cross-fade
  _lastObservanceName: null,    // gates dropline repaint
  _lastFooterHashes: ['', '', '', ''],  // per-cell DOM-write gating
  _lastWindowIdx: -1,           // 32 s rotation window index (live or accelerated)
  _fadeTimerId: null,           // setTimeout handle for cross-fade content swap
  _previewMode: false,

  // Phase 19: paragraph templates. Selection is gated by (period, weather,
  // moon); ungated fields match any value. The hash distributes among the
  // candidate set so the same tuple maps deterministically to one template
  // within a 32 s window.
  _PARAGRAPH_TEMPLATES: [
    { id: 'morning-clear',
      gate: { period: ['morning'], weather: ['clear'] },
      copy: 'Light comes early this morning. The harbour holds still.' },
    { id: 'evening-clear',
      gate: { period: ['evening'], weather: ['clear'] },
      copy: 'The sky cools toward the inlet. Sunset at <em>{sunset}</em>.' },
    { id: 'fog-day',
      gate: { period: ['morning', 'afternoon', 'evening'], weather: ['fog'] },
      copy: 'Fog folds across the city. Visibility holds at <em>{visibility}</em>.' },
    { id: 'rain-day',
      gate: { period: ['morning', 'afternoon', 'evening'], weather: ['rain'] },
      copy: 'Steady rain across the strait, <em>{tempC}°</em>.' },
    { id: 'night-clear-moon',
      gate: { period: ['night'], weather: ['clear'], moon: ['waxing', 'full', 'waning'] },
      copy: 'The moon, <em>{phase}</em> at <em>{illum} percent</em>, rides high above the mountains.' },
    { id: 'night-clear-new',
      gate: { period: ['night'], weather: ['clear'], moon: ['new'] },
      copy: 'A new moon sits over Vancouver. Tide turning at <em>{tideTime}</em>.' },
    { id: 'snow',
      gate: { weather: ['snow'] },
      copy: 'Snow on the slopes. <em>{tempC}°</em> in the city.' },
    { id: 'generic',
      gate: {},
      copy: '<em>{condition}</em>, <em>{tempC}°</em>. <em>{phase}</em> moon at <em>{illum}%</em>.' }
  ],

  init(stage) {
    if (!stage) return;

    // Remove other face DOM if present so DisplayModule.init() and other
    // faces' previously-cached handles do not interfere. The picker page
    // builds preview cards that do not contain these nodes; the guard
    // makes init idempotent in both contexts.
    ['time', 'date', 'slot', 'moon-disc'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });
    ['mech-stage', 'dep-stage', 'ed-stage'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });

    var root = document.createElement('div');
    root.id = 'ed-stage';
    root.innerHTML =
      '<div id="ed-dropline" style="display:none"></div>' +
      '<div id="ed-time">' +
        '<span class="ed-hours">--</span>' +
        '<span class="ed-colon">:</span>' +
        '<span class="ed-minutes">--</span>' +
        '<span class="ed-ampm" hidden></span>' +
      '</div>' +
      '<div id="ed-right">' +
        '<div class="ed-kicker"></div>' +
        '<div class="ed-weekday"></div>' +
        '<div class="ed-monthday"></div>' +
      '</div>' +
      '<div id="ed-paragraph"><div id="ed-paragraph-inner"></div></div>' +
      '<div id="ed-footer">' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Tide</div><div class="ed-foot-value"></div></div>' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Air</div><div class="ed-foot-value"></div></div>' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Sun</div><div class="ed-foot-value"></div></div>' +
        '<div class="ed-foot-cell"><div class="ed-foot-label">Almanac</div><div class="ed-foot-value"></div></div>' +
      '</div>';
    stage.appendChild(root);

    this._els = {
      root: root,
      dropline: root.querySelector('#ed-dropline'),
      time: root.querySelector('#ed-time'),
      hours: root.querySelector('.ed-hours'),
      colon: root.querySelector('.ed-colon'),
      minutes: root.querySelector('.ed-minutes'),
      ampm: root.querySelector('.ed-ampm'),
      right: root.querySelector('#ed-right'),
      kicker: root.querySelector('.ed-kicker'),
      weekday: root.querySelector('.ed-weekday'),
      monthday: root.querySelector('.ed-monthday'),
      paragraph: root.querySelector('#ed-paragraph'),
      paragraphInner: root.querySelector('#ed-paragraph-inner'),
      footer: root.querySelector('#ed-footer'),
      footValues: Array.from(root.querySelectorAll('.ed-foot-value'))
    };
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
    this._lastTemplateId = null;
    this._lastObservanceName = null;
    this._lastFooterHashes = ['', '', '', ''];
    this._lastWindowIdx = -1;
    if (this._fadeTimerId !== null) { clearTimeout(this._fadeTimerId); this._fadeTimerId = null; }
  },

  render(state, tweaks) {
    if (!this._els) return;
    var et = (tweaks && tweaks.byFace && tweaks.byFace.editorial) || {};
    var timeFormat = et.timeFormat === '12h' ? '12h' : '24h';
    this._previewMode = et.previewMode === true;

    this._renderDropline(state);
    this._renderTime(state, timeFormat);
    this._renderRight(state);
    this._renderFooter(state, timeFormat);
    this._maybeRotateParagraph(state, timeFormat);
  },

  teardown() {
    if (this._fadeTimerId !== null) { clearTimeout(this._fadeTimerId); this._fadeTimerId = null; }
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._lastMinuteKey = null;
    this._lastIsoDate = null;
    this._lastTemplateId = null;
    this._lastObservanceName = null;
    this._lastFooterHashes = ['', '', '', ''];
    this._lastWindowIdx = -1;
  },

  // ---- Time helpers (shared with other faces' patterns) ----

  _resolve24h(state) {
    var t = state.time || {};
    var h = (typeof t.hours === 'number') ? t.hours : 0;
    if (t.ampm) {
      if (t.ampm === 'AM') h = (t.hours === 12) ? 0 : t.hours;
      else h = (t.hours === 12) ? 12 : t.hours + 12;
    }
    return [h, (typeof t.minutes === 'number') ? t.minutes : 0];
  },

  // Render a "HH:MM" or "H:MM AM" pair from an h24 + mm pair.
  _formatHourMinute(h24, mm, timeFormat) {
    var hh, ampm;
    if (timeFormat === '12h') {
      var h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      hh = String(h12);
      ampm = h24 < 12 ? 'AM' : 'PM';
    } else {
      hh = String(h24).padStart(2, '0');
      ampm = null;
    }
    return { hh: hh, mm: String(mm).padStart(2, '0'), ampm: ampm };
  },

  // Parse a stored time string ("6:14 AM", "18:14", ISO) to a Date.
  _parseClockOrIso(raw) {
    if (!raw) return null;
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

  // Format an arbitrary time string into the requested face timeFormat.
  // Returns '—' when the input cannot be parsed.
  _fmtTime(raw, timeFormat) {
    if (!raw) return '—';
    var d = this._parseClockOrIso(raw);
    if (!d) {
      // Some sources already supply formatted strings ("17:14") that the
      // parser handles; if it fell through, return raw rather than '—'.
      return raw;
    }
    var pair = this._formatHourMinute(d.getHours(), d.getMinutes(), timeFormat);
    return pair.ampm ? (pair.hh + ':' + pair.mm + ' ' + pair.ampm) : (pair.hh + ':' + pair.mm);
  },

  // ---- Per-sub-render helpers ----

  _renderDropline(state) {
    var obs = state.observance;
    var key;
    if (obs && obs.treatment === 'light' && obs.name_long) {
      key = obs.name + '|' + obs.name_long;
      if (key === this._lastObservanceName) return;
      this._lastObservanceName = key;
      this._els.dropline.textContent = obs.name_long;
      this._els.dropline.style.display = '';
    } else {
      if (this._lastObservanceName === null) return;
      this._lastObservanceName = null;
      this._els.dropline.style.display = 'none';
    }
  },

  _renderTime(state, timeFormat) {
    var pair = this._resolve24h(state);
    var fm = this._formatHourMinute(pair[0], pair[1], timeFormat);
    var minuteKey = timeFormat + '|' + fm.hh + ':' + fm.mm + '|' + (fm.ampm || '');
    if (minuteKey === this._lastMinuteKey) return;
    this._lastMinuteKey = minuteKey;

    var els = this._els;
    els.hours.textContent = fm.hh;
    els.minutes.textContent = fm.mm;
    if (fm.ampm) {
      els.ampm.textContent = fm.ampm;
      els.ampm.hidden = false;
    } else {
      els.ampm.textContent = '';
      els.ampm.hidden = true;
    }
  },

  _renderRight(state) {
    // Kicker: recomputed every tick (cheap, changes only at altitude crossings).
    // Weekday + month-day: gated on isoDate change (once per local midnight).
    var kicker = this._editorialKicker(state);
    if (this._els.kicker.textContent !== kicker) {
      this._els.kicker.textContent = kicker;
    }
    var iso = (state.date && state.date.isoDate) || '';
    if (iso !== this._lastIsoDate) {
      this._lastIsoDate = iso;
      var weekday = (state.date && state.date.dayOfWeek) ? state.date.dayOfWeek + ',' : '';
      var monthday = (state.date && state.date.month && state.date.day)
        ? state.date.month + ' ' + state.date.day + '.'
        : '';
      this._els.weekday.textContent = weekday;
      this._els.monthday.textContent = monthday;
    }
  },

  _editorialKicker(state) {
    // AppState.time.hours may be 12h-format; resolve to 24h before comparing.
    var h = this._resolve24h(state)[0];
    var altitude = (state.sun && typeof state.sun.altitude === 'number') ? state.sun.altitude : 0;
    if (h < 5 || (h >= 21 && altitude < 0)) return 'TONIGHT';
    if (h < 12) return 'THIS MORNING';
    if (h < 17) return 'THIS AFTERNOON';
    return 'THIS EVENING';
  },

  _renderFooter(state, timeFormat) {
    var vals = this._els.footValues;
    // TIDE
    var tide = state.tide || {};
    var tideHtml;
    var tideHash;
    if (!tide.type) {
      tideHtml = '<span class="ed-foot-empty">—</span>';
      tideHash = 'tide|empty';
    } else {
      var t = String(tide.type);
      var typeLabel = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      var hM = (tide.heightM === null || tide.heightM === undefined)
        ? '—m'
        : Number(tide.heightM).toFixed(1) + 'm';
      var tideTime = this._fmtTime(tide.time, timeFormat);
      tideHtml = typeLabel + ' ' + hM + ', ' + tideTime;
      tideHash = 'tide|' + typeLabel + '|' + hM + '|' + tideTime;
    }
    // AIR
    var a = state.aqi || {};
    var airHtml;
    var airHash;
    if (a.value === null || a.value === undefined) {
      airHtml = '<span class="ed-foot-empty">—</span>';
      airHash = 'air|empty';
    } else {
      var band = a.band ? String(a.band).replace(/_/g, ' ') : '';
      // title-case to match the editorial register ("Good" not "GOOD")
      var bandTitle = band ? band.charAt(0).toUpperCase() + band.slice(1).toLowerCase() : '';
      airHtml = 'AQI ' + a.value + (bandTitle ? ', ' + bandTitle : '');
      airHash = 'air|' + a.value + '|' + bandTitle;
    }
    // SUN
    var s = state.sun || {};
    var sunHtml;
    var sunHash;
    if (!s.sunrise || !s.sunset) {
      sunHtml = '<span class="ed-foot-empty">—</span>';
      sunHash = 'sun|empty';
    } else {
      var rise = this._fmtTime(s.sunrise, timeFormat);
      var set = this._fmtTime(s.sunset, timeFormat);
      sunHtml = '<span class="ed-foot-glyph">↑</span> ' + rise +
                '  <span class="ed-foot-glyph">↓</span> ' + set;
      sunHash = 'sun|' + rise + '|' + set;
    }
    // ALMANAC
    var alm = state.almanac;
    var almHtml;
    var almHash;
    if (!alm || !alm.name) {
      almHtml = '<span class="ed-foot-empty">—</span>';
      almHash = 'alm|empty';
    } else {
      var nameTitle = String(alm.name);
      // title-case approximate ("Eta Aquariids")
      nameTitle = nameTitle.toLowerCase().replace(/(^|\s)\w/g, function (c) { return c.toUpperCase(); });
      var when;
      if (alm.daysAway === 0) when = 'Tonight';
      else if (alm.daysAway === 1) when = 'Tomorrow';
      else when = 'In ' + alm.daysAway + 'd';
      almHtml = nameTitle + ', ' + when;
      almHash = 'alm|' + nameTitle + '|' + when;
    }

    var hashes = [tideHash, airHash, sunHash, almHash];
    var htmls = [tideHtml, airHtml, sunHtml, almHtml];
    for (var i = 0; i < 4; i++) {
      if (hashes[i] !== this._lastFooterHashes[i]) {
        this._lastFooterHashes[i] = hashes[i];
        vals[i].innerHTML = htmls[i];
      }
    }
  },

  // ---- Paragraph rotation (32 s window, 1200 ms cross-fade) ----

  _paragraphWindowIdx() {
    // Live cadence: floor(performance.now() / 32000). Preview mode keeps the
    // same epoch but compresses the cadence to 6 s (test convenience).
    if (this._previewMode) {
      return Math.floor(performance.now() / 6000);
    }
    return Math.floor(performance.now() / 32000);
  },

  _maybeRotateParagraph(state, timeFormat) {
    var idx = this._paragraphWindowIdx();
    if (idx === this._lastWindowIdx) return;
    var firstPaint = (this._lastWindowIdx === -1);
    this._lastWindowIdx = idx;

    var active = this._activeTemplate(state);
    var inner = this._els.paragraphInner;
    var html = this._renderTemplate(active.copy, state, timeFormat);

    // First paint: write immediately, no cross-fade.
    if (firstPaint || this._lastTemplateId === null) {
      inner.innerHTML = html;
      this._lastTemplateId = active.id;
      return;
    }
    // Same template selected again: refresh placeholder values without fade
    // (a fade with identical-looking text reads as a flicker).
    if (active.id === this._lastTemplateId) {
      if (inner.innerHTML !== html) inner.innerHTML = html;
      return;
    }
    // Different template: cross-fade.
    this._lastTemplateId = active.id;
    if (this._fadeTimerId !== null) {
      clearTimeout(this._fadeTimerId);
      this._fadeTimerId = null;
    }
    inner.classList.add('is-fading-out');
    var self = this;
    this._fadeTimerId = setTimeout(function () {
      if (!self._els || self._els.paragraphInner !== inner) return;
      inner.innerHTML = html;
      inner.classList.remove('is-fading-out');
      self._fadeTimerId = null;
    }, 1200);
  },

  _period(state) {
    var pair = this._resolve24h(state);
    var h = pair[0];
    var altitude = (state.sun && typeof state.sun.altitude === 'number') ? state.sun.altitude : 0;
    if (altitude < -6) return 'night';      // astronomical twilight or darker
    if (altitude < 0) return 'twilight';    // civil twilight band
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  },

  _weatherState(state) {
    var c = state.weather && state.weather.condition;
    if (c === 'CLEAR' || c === 'PARTLY_CLOUDY') return 'clear';
    if (c === 'FOG') return 'fog';
    if (c === 'RAIN' || c === 'STORM') return 'rain';
    if (c === 'SNOW') return 'snow';
    return 'cloudy';
  },

  _moonState(state) {
    var p = (state.moon && state.moon.phaseName) || '';
    if (p.indexOf('New') >= 0) return 'new';
    if (p.indexOf('Full') >= 0) return 'full';
    if (p.indexOf('Waxing') >= 0) return 'waxing';
    if (p.indexOf('Waning') >= 0) return 'waning';
    return 'waxing';
  },

  _matches(template, period, weather, moon) {
    var g = template.gate || {};
    if (g.period && g.period.indexOf(period) < 0) return false;
    if (g.weather && g.weather.indexOf(weather) < 0) return false;
    if (g.moon && g.moon.indexOf(moon) < 0) return false;
    return true;
  },

  // Simple deterministic string hash. djb2-style; 32-bit signed truncation
  // is acceptable here -- the hash only chooses a candidate index.
  _hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  },

  _activeTemplate(state) {
    var period = this._period(state);
    var weather = this._weatherState(state);
    var moon = this._moonState(state);
    var templates = this._PARAGRAPH_TEMPLATES;
    var candidates = [];
    for (var i = 0; i < templates.length; i++) {
      if (this._matches(templates[i], period, weather, moon)) candidates.push(templates[i]);
    }
    if (candidates.length === 0) return templates[templates.length - 1];
    var key = period + '|' + weather + '|' + moon;
    var idx = this._hash(key) % candidates.length;
    return candidates[idx];
  },

  _renderTemplate(template, state, timeFormat) {
    var self = this;
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      switch (key) {
        case 'tempC':
          return (state.weather && state.weather.tempC !== null && state.weather.tempC !== undefined)
            ? String(state.weather.tempC) : '—';
        case 'condition':
          var c = state.weather && state.weather.condition;
          if (!c) return 'overcast';
          // Title-case readable form.
          return String(c).replace(/_/g, ' ').toLowerCase();
        case 'sunset':
          return self._fmtTime(state.sun && state.sun.sunset, timeFormat);
        case 'sunrise':
          return self._fmtTime(state.sun && state.sun.sunrise, timeFormat);
        case 'phase':
          var p = (state.moon && state.moon.phaseName) || 'waxing';
          return p.toLowerCase();
        case 'illum':
          var ill = (state.moon && typeof state.moon.illumination === 'number') ? state.moon.illumination : 0;
          return String(Math.round(ill * 100));
        case 'tideTime':
          return self._fmtTime(state.tide && state.tide.time, timeFormat);
        case 'visibility':
          var v = state.weather && state.weather.visibilityKm;
          return (v === null || v === undefined) ? '—' : (v + ' km');
        default:
          return '';
      }
    });
  }
};

// Phase 20: Horizon face. Astronomical-truth diagram: full-stage SVG with
// horizon line, sun + moon arcs, hour ticks, sunrise/sunset/moonrise/moonset
// notches, hairline cursor at nowF, big-time HH:MM at bottom-left or
// bottom-right (6 h cross-fade between homes), four-line status block at
// bottom-right. accentSkyTrack: false suspends sky-modulation of
// --type-accent so the gold cursor / colon / DAY headline stay fixed.
const HorizonFace = {
  // Phase 20: opt out of sky-altitude modulation for --type-accent.
  // SkyColorModule reads this on every update() call.
  accentSkyTrack: false,

  // Diagram constants (1180 x 820 viewBox).
  _DAY_LEFT:   80,
  _DAY_RIGHT:  1100,
  _HORIZON_Y:  440,
  _ARC_H:      240,
  _MOON_ARC_H: 240 * 0.62,
  _PEAK_FAC:   1.6,
  _SUN_R:      18,
  _MOON_R:     13,

  _els: null,
  _staticBuilt: false,
  _lastMinuteKey: null,
  _lastHeaderKey: null,      // iso|sunriseF|sunsetF tuple (gates _renderHeader)
  _lastStatusKey: null,      // compound key gating _renderStatus (per-minute + content)
  _lastDiagramKey: null,     // sunriseF|sunsetF|moonriseF|moonsetF|alwaysUp|alwaysDown
  _lastMoonGlyphKey: null,   // illum*1000|waxing (gates crescent path rebuild)

  init(stage) {
    if (!stage) return;

    // Remove every prior face's DOM so DisplayModule.init() and other faces'
    // previously-cached handles do not interfere. Same purge pattern as
    // Editorial / Departures / Mechanical inits.
    ['time', 'date', 'slot', 'moon-disc'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });
    ['mech-stage', 'dep-stage', 'ed-stage', 'hz-stage'].forEach(function (id) {
      var el = stage.querySelector('#' + id);
      if (el) el.remove();
    });

    var root = document.createElement('div');
    root.id = 'hz-stage';

    // Static SVG. <defs> for gradients + clipPath; six layered groups:
    // sky-drift (interior - horizon line, ticks, arcs, notches, cursor),
    // sun-glyph, moon-glyph. Hour labels and arc-terminal labels are HTML
    // divs absolutely-positioned (their drift rides --date-* / --slot-*).
    var DAY_LEFT = this._DAY_LEFT;
    var DAY_RIGHT = this._DAY_RIGHT;
    var HORIZON_Y = this._HORIZON_Y;

    // Build static ticks markup once.
    var ticksSvg = '';
    var dayWidth = DAY_RIGHT - DAY_LEFT;
    for (var h = 0; h <= 24; h++) {
      var tx = DAY_LEFT + (h / 24) * dayWidth;
      var major = (h % 6 === 0);
      var len = major ? 14 : 6;
      var sw  = major ? 1.2 : 0.8;
      var cls = major ? 'hz-tick-major' : 'hz-tick';
      ticksSvg += '<line class="' + cls + '" x1="' + tx.toFixed(2) +
                  '" y1="' + HORIZON_Y + '" x2="' + tx.toFixed(2) +
                  '" y2="' + (HORIZON_Y + len) + '" stroke="rgba(255,255,255,0.20)" stroke-width="' + sw + '"/>';
    }

    // Hour labels (HTML divs, drift on --date-*).
    var hourLabelsHtml = '';
    [0, 6, 12, 18, 24].forEach(function (h) {
      var lx = DAY_LEFT + (h / 24) * dayWidth;
      hourLabelsHtml += '<div class="hz-hour-label" style="left:' + lx.toFixed(2) +
                        'px">' + String(h % 24).padStart(2, '0') + ':00</div>';
    });

    root.innerHTML =
      '<div id="hz-header">' +
        '<span class="hz-header-loc">HORIZON · 49.32°N 123.13°W</span>' +
        '<span class="hz-header-mid"></span>' +
        '<span class="hz-header-daylight"></span>' +
      '</div>' +
      '<svg id="hz-sky" viewBox="0 0 1180 820" aria-hidden="true">' +
        '<defs>' +
          '<radialGradient id="hzSunGlow" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#F4C56C" stop-opacity="0.28"/>' +
            '<stop offset="60%" stop-color="#F4C56C" stop-opacity="0.06"/>' +
            '<stop offset="100%" stop-color="#F4C56C" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<radialGradient id="hzMoonGlow" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#A8C7FF" stop-opacity="0.18"/>' +
            '<stop offset="100%" stop-color="#A8C7FF" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<clipPath id="hzDiscClip"><rect x="0" y="0" width="1180" height="441"/></clipPath>' +
        '</defs>' +
        '<g class="hz-sky-drift">' +
          // Arcs (paths rebuilt on minute change when diagram key changes).
          '<path class="hz-sun-arc" d="" stroke="rgba(244,197,108,0.22)" stroke-dasharray="2 7" stroke-width="1" fill="none"/>' +
          '<path class="hz-moon-arc" d="" stroke="rgba(168,199,255,0.18)" stroke-dasharray="1 6" stroke-width="1" fill="none"/>' +
          // Horizon line.
          '<line class="hz-horizon-line" x1="' + (DAY_LEFT - 10) + '" y1="' + HORIZON_Y +
            '" x2="' + DAY_RIGHT + '" y2="' + HORIZON_Y +
            '" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>' +
          // Hour ticks (static for the life of the face).
          ticksSvg +
          // Sunrise / sunset notches.
          '<line class="hz-sr-notch" x1="0" y1="' + (HORIZON_Y - 8) + '" x2="0" y2="' + (HORIZON_Y + 8) +
            '" stroke="rgba(244,197,108,0.55)" stroke-width="1"/>' +
          '<line class="hz-ss-notch" x1="0" y1="' + (HORIZON_Y - 8) + '" x2="0" y2="' + (HORIZON_Y + 8) +
            '" stroke="rgba(244,197,108,0.55)" stroke-width="1"/>' +
          // Moonrise / moonset notches.
          '<line class="hz-mr-notch" x1="0" y1="' + (HORIZON_Y - 6) + '" x2="0" y2="' + (HORIZON_Y + 6) +
            '" stroke="rgba(168,199,255,0.45)" stroke-width="1"/>' +
          '<line class="hz-ms-notch" x1="0" y1="' + (HORIZON_Y - 6) + '" x2="0" y2="' + (HORIZON_Y + 6) +
            '" stroke="rgba(168,199,255,0.45)" stroke-width="1"/>' +
          // Now-hairline cursor (only continuously moving primitive).
          '<line class="hz-cursor" x1="0" y1="120" x2="0" y2="' + (HORIZON_Y + 28) +
            '" stroke="rgba(244,197,108,0.45)" stroke-width="1"/>' +
        '</g>' +
        // Sun glyph (its own drift group, clipped at horizon).
        '<g class="hz-sun-glyph" clip-path="url(#hzDiscClip)">' +
          '<circle class="hz-sun-halo" cx="0" cy="0" r="60" fill="url(#hzSunGlow)"/>' +
          '<circle class="hz-sun-disc" cx="0" cy="0" r="' + this._SUN_R + '" fill="#F4C56C"/>' +
          '<line class="hz-sun-drop" x1="0" y1="0" x2="0" y2="' + HORIZON_Y +
            '" stroke="rgba(244,197,108,0.35)" stroke-width="1" stroke-dasharray="2 4"/>' +
        '</g>' +
        // Moon glyph (its own drift group, clipped at horizon).
        '<g class="hz-moon-glyph" clip-path="url(#hzDiscClip)">' +
          '<circle class="hz-moon-halo" cx="0" cy="0" r="34" fill="url(#hzMoonGlow)"/>' +
          '<circle class="hz-moon-disc-outline" cx="0" cy="0" r="' + this._MOON_R +
            '" fill="rgba(168,199,255,0.10)" stroke="rgba(168,199,255,0.28)" stroke-width="0.6"/>' +
          '<path class="hz-moon-crescent" d="" fill="rgba(228,236,250,0.92)"/>' +
        '</g>' +
      '</svg>' +
      '<div id="hz-hour-labels">' + hourLabelsHtml + '</div>' +
      '<div id="hz-arc-labels">' +
        '<div class="hz-sr-label"></div>' +
        '<div class="hz-ss-label"></div>' +
        '<div class="hz-mr-label"></div>' +
        '<div class="hz-ms-label"></div>' +
      '</div>' +
      '<div id="hz-time">' +
        '<span class="hz-hh">--</span>' +
        '<span class="hz-colon">:</span>' +
        '<span class="hz-mm">--</span>' +
        '<span class="hz-ampm" hidden></span>' +
      '</div>' +
      '<div id="hz-status">' +
        '<div class="hz-status-headline"></div>' +
        '<div class="hz-status-golden"></div>' +
        '<div class="hz-status-moon"></div>' +
        '<div class="hz-status-tide"></div>' +
        '<div class="hz-status-air"></div>' +
      '</div>';
    stage.appendChild(root);

    // Cache element handles. Per-tick code reads from this map; nothing else
    // queries the DOM after init() completes.
    this._els = {
      root: root,
      header: root.querySelector('#hz-header'),
      headerLoc: root.querySelector('.hz-header-loc'),
      headerMid: root.querySelector('.hz-header-mid'),
      headerDaylight: root.querySelector('.hz-header-daylight'),
      sky: root.querySelector('#hz-sky'),
      skyDriftGroup: root.querySelector('.hz-sky-drift'),
      sunGlyph: root.querySelector('.hz-sun-glyph'),
      moonGlyph: root.querySelector('.hz-moon-glyph'),
      sunArc: root.querySelector('.hz-sun-arc'),
      moonArc: root.querySelector('.hz-moon-arc'),
      srNotch: root.querySelector('.hz-sr-notch'),
      ssNotch: root.querySelector('.hz-ss-notch'),
      mrNotch: root.querySelector('.hz-mr-notch'),
      msNotch: root.querySelector('.hz-ms-notch'),
      sunHalo: root.querySelector('.hz-sun-halo'),
      sunDisc: root.querySelector('.hz-sun-disc'),
      sunDrop: root.querySelector('.hz-sun-drop'),
      moonHalo: root.querySelector('.hz-moon-halo'),
      moonOutline: root.querySelector('.hz-moon-disc-outline'),
      moonCrescent: root.querySelector('.hz-moon-crescent'),
      cursor: root.querySelector('.hz-cursor'),
      srLabel: root.querySelector('.hz-sr-label'),
      ssLabel: root.querySelector('.hz-ss-label'),
      mrLabel: root.querySelector('.hz-mr-label'),
      msLabel: root.querySelector('.hz-ms-label'),
      time: root.querySelector('#hz-time'),
      hh: root.querySelector('.hz-hh'),
      colon: root.querySelector('.hz-colon'),
      mm: root.querySelector('.hz-mm'),
      ampm: root.querySelector('.hz-ampm'),
      statusHeadline: root.querySelector('.hz-status-headline'),
      statusGolden: root.querySelector('.hz-status-golden'),
      statusMoon: root.querySelector('.hz-status-moon'),
      statusTide: root.querySelector('.hz-status-tide'),
      statusAir: root.querySelector('.hz-status-air')
    };
    this._staticBuilt = true;
    this._lastMinuteKey = null;
    this._lastHeaderKey = null;
    this._lastStatusKey = null;
    this._lastDiagramKey = null;
    this._lastMoonGlyphKey = null;
  },

  render(state, tweaks) {
    if (!this._els) return;
    var ht = (tweaks && tweaks.byFace && tweaks.byFace.horizon) || {};
    var timeFormat = ht.timeFormat === '24h' ? '24h' : '12h';

    var sunriseF = this._parseHM(state.sun && state.sun.sunrise);
    var sunsetF  = this._parseHM(state.sun && state.sun.sunset);
    var moonriseF = this._parseHM(state.moon && state.moon.moonrise);
    var moonsetF  = this._parseHM(state.moon && state.moon.moonset);
    var nowF = this._nowFrac(state.time);
    var moonAU = !!(state.moon && state.moon.alwaysUp);
    var moonAD = !!(state.moon && state.moon.alwaysDown);
    var moonHasTimes = !!(state.moon && state.moon.moonrise && state.moon.moonset);

    this._renderDiagram(state, nowF, sunriseF, sunsetF, moonriseF, moonsetF, moonAU, moonAD, moonHasTimes, timeFormat);
    this._renderTime(state, timeFormat);
    this._renderHeader(state, sunriseF, sunsetF);
    this._renderStatus(state, nowF, sunriseF, sunsetF, timeFormat);
  },

  teardown() {
    if (this._els && this._els.root) this._els.root.remove();
    this._els = null;
    this._staticBuilt = false;
    this._lastMinuteKey = null;
    this._lastHeaderKey = null;
    this._lastStatusKey = null;
    this._lastDiagramKey = null;
    this._lastMoonGlyphKey = null;
  },

  // ---- helpers ----

  // "HH:MM" or "H:MM AM/PM" -> fractional day [0, 1]. Returns 0 on parse fail.
  _parseHM(s) {
    if (!s) return 0;
    var m = String(s).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!m) return 0;
    var h = parseInt(m[1], 10);
    var mm = parseInt(m[2], 10);
    var ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return (h + mm / 60) / 24;
  },

  // AppState.time.{hours,minutes,seconds,ampm} -> fractional day.
  _nowFrac(t) {
    if (!t) return 0;
    var h = (typeof t.hours === 'number') ? t.hours : 0;
    if (t.ampm) {
      if (t.ampm === 'AM') h = (t.hours === 12) ? 0 : t.hours;
      else h = (t.hours === 12) ? 12 : t.hours + 12;
    }
    var m = (typeof t.minutes === 'number') ? t.minutes : 0;
    var s = (typeof t.seconds === 'number') ? t.seconds : 0;
    return (h * 3600 + m * 60 + s) / 86400;
  },

  // 24h h + mm -> { hh, mm, ampm } per timeFormat (12h/24h).
  _formatHourMinute(h24, mm, timeFormat) {
    var hh, ampm;
    if (timeFormat === '12h') {
      var h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      hh = String(h12);
      ampm = h24 < 12 ? 'AM' : 'PM';
    } else {
      hh = String(h24).padStart(2, '0');
      ampm = null;
    }
    return { hh: hh, mm: String(mm).padStart(2, '0'), ampm: ampm };
  },

  _resolve24h(state) {
    var t = state.time || {};
    var h = (typeof t.hours === 'number') ? t.hours : 0;
    if (t.ampm) {
      if (t.ampm === 'AM') h = (t.hours === 12) ? 0 : t.hours;
      else h = (t.hours === 12) ? 12 : t.hours + 12;
    }
    return [h, (typeof t.minutes === 'number') ? t.minutes : 0];
  },

  // "HH:MM" or "H:MM AM/PM" or ISO 8601 -> face's current timeFormat.
  _fmtTimeStr(raw, timeFormat) {
    if (!raw) return '—';
    var h24 = 0, mm = 0;
    var s = String(raw);
    // ISO 8601: contains 'T' between date and time. Parse via Date so the
    // local-time offset is respected.
    if (s.indexOf('T') >= 0) {
      var d = new Date(s);
      if (isNaN(d.getTime())) return s;
      h24 = d.getHours();
      mm = d.getMinutes();
    } else {
      var m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!m) return s;
      h24 = parseInt(m[1], 10);
      mm = parseInt(m[2], 10);
      var ap = (m[3] || '').toUpperCase();
      if (ap === 'PM' && h24 < 12) h24 += 12;
      if (ap === 'AM' && h24 === 12) h24 = 0;
    }
    var pair = this._formatHourMinute(h24, mm, timeFormat);
    return pair.ampm ? (pair.hh + ':' + pair.mm + ' ' + pair.ampm) : (pair.hh + ':' + pair.mm);
  },

  // Phase-correct crescent path (port of chihiro's prototype helper).
  _moonPhasePath(cx, cy, r, illumFrac, waxing) {
    var w = Math.abs(1 - 2 * illumFrac);
    var lit = waxing ? 1 : 0;
    if (illumFrac <= 0.5) {
      return 'M ' + cx + ' ' + (cy - r) +
             ' A ' + r + ' ' + r + ' 0 0 ' + lit + ' ' + cx + ' ' + (cy + r) +
             ' A ' + (r * w).toFixed(3) + ' ' + r + ' 0 0 ' + (1 - lit) + ' ' + cx + ' ' + (cy - r) + ' Z';
    }
    return 'M ' + cx + ' ' + (cy - r) +
           ' A ' + r + ' ' + r + ' 0 1 ' + lit + ' ' + cx + ' ' + (cy + r) +
           ' A ' + (r * w).toFixed(3) + ' ' + r + ' 0 0 ' + lit + ' ' + cx + ' ' + (cy - r) + ' Z';
  },

  // ---- sub-renders ----

  _xAt(frac) {
    return this._DAY_LEFT + frac * (this._DAY_RIGHT - this._DAY_LEFT);
  },

  _renderDiagram(state, nowF, sunriseF, sunsetF, moonriseF, moonsetF, moonAU, moonAD, moonHasTimes, timeFormat) {
    var els = this._els;
    var HORIZON_Y = this._HORIZON_Y;
    var ARC_H = this._ARC_H;
    var MOON_ARC_H = this._MOON_ARC_H;
    var PEAK_FAC = this._PEAK_FAC;
    var SUN_R = this._SUN_R;
    var MOON_R = this._MOON_R;

    // Per-tick: cursor x.
    var cx = this._xAt(nowF);
    var cxStr = cx.toFixed(2);
    els.cursor.setAttribute('x1', cxStr);
    els.cursor.setAttribute('x2', cxStr);

    // Sun disc traverses sine over the arc (when up).
    var isDay = sunsetF > sunriseF && nowF >= sunriseF && nowF <= sunsetF;
    if (isDay) {
      var p = (nowF - sunriseF) / (sunsetF - sunriseF);
      var srX = this._xAt(sunriseF);
      var ssX = this._xAt(sunsetF);
      var sx = srX + p * (ssX - srX);
      var sy = HORIZON_Y - Math.sin(p * Math.PI) * ARC_H;
      var sxStr = sx.toFixed(2);
      var syStr = sy.toFixed(2);
      els.sunHalo.setAttribute('cx', sxStr);
      els.sunHalo.setAttribute('cy', syStr);
      els.sunDisc.setAttribute('cx', sxStr);
      els.sunDisc.setAttribute('cy', syStr);
      els.sunDrop.setAttribute('x1', sxStr);
      els.sunDrop.setAttribute('x2', sxStr);
      els.sunDrop.setAttribute('y1', (sy + SUN_R).toFixed(2));
      els.sunGlyph.removeAttribute('display');
    } else {
      els.sunGlyph.setAttribute('display', 'none');
    }

    // Moon disc traverses sine over the moon arc (when up).
    var moonUp = false;
    var mrX = 0, msX = 0;
    if (!moonAD && moonHasTimes) {
      mrX = this._xAt(moonriseF);
      msX = (moonsetF > moonriseF) ? this._xAt(moonsetF) : this._xAt(1);
      if (moonAU) {
        moonUp = true;
      } else if (moonsetF > moonriseF) {
        moonUp = nowF >= moonriseF && nowF <= moonsetF;
      } else {
        moonUp = nowF >= moonriseF || nowF <= moonsetF;
      }
    }
    if (moonAU && !moonHasTimes) {
      // Treat as moonUp at arc apex (rare at Vancouver lat).
      moonUp = true;
    }
    if (moonUp) {
      var mx, my;
      if (moonAU) {
        // alwaysUp: render disc near arc apex.
        mx = this._xAt(0.5);
        my = HORIZON_Y - MOON_ARC_H;
      } else {
        var lenF = (moonsetF > moonriseF) ? (moonsetF - moonriseF) : ((1 - moonriseF) + moonsetF);
        var elapsedF = (nowF >= moonriseF) ? (nowF - moonriseF) : ((1 - moonriseF) + nowF);
        var pm = lenF > 0 ? elapsedF / lenF : 0;
        mx = mrX + pm * (msX - mrX);
        my = HORIZON_Y - Math.sin(pm * Math.PI) * MOON_ARC_H;
      }
      var mxStr = mx.toFixed(2);
      var myStr = my.toFixed(2);
      els.moonHalo.setAttribute('cx', mxStr);
      els.moonHalo.setAttribute('cy', myStr);
      els.moonOutline.setAttribute('cx', mxStr);
      els.moonOutline.setAttribute('cy', myStr);

      // Phase-correct crescent path. Gated on illum + waxing (changes
      // smoothly across the lunar month; per-tick rebuild is cheap but
      // gating saves a string allocation per second).
      var illum = (state.moon && typeof state.moon.illumination === 'number') ? state.moon.illumination : 0;
      var phaseV = (state.moon && typeof state.moon.phase === 'number') ? state.moon.phase : 0;
      var waxing = phaseV < 0.5;
      var illumClamped = Math.max(0.02, Math.min(0.98, illum));
      var glyphKey = Math.round(illumClamped * 1000) + '|' + (waxing ? 'w' : 'n');
      // Crescent must rebuild on cx/cy change too. Combine glyphKey with mx/my.
      var fullGlyphKey = glyphKey + '|' + mxStr + '|' + myStr;
      if (fullGlyphKey !== this._lastMoonGlyphKey) {
        this._lastMoonGlyphKey = fullGlyphKey;
        els.moonCrescent.setAttribute('d', this._moonPhasePath(mx, my, MOON_R, illumClamped, waxing));
      }
      els.moonGlyph.removeAttribute('display');
    } else {
      els.moonGlyph.setAttribute('display', 'none');
      this._lastMoonGlyphKey = null;
    }

    // Diagram-level rebuilds gated on sunrise/sunset/moonrise/moonset/flag
    // tuple. Arcs, notches, arc-terminal labels all swap together.
    var diagramKey = sunriseF.toFixed(5) + '|' + sunsetF.toFixed(5) + '|' +
                     moonriseF.toFixed(5) + '|' + moonsetF.toFixed(5) + '|' +
                     (moonAU ? '1' : '0') + (moonAD ? '1' : '0') + (moonHasTimes ? '1' : '0') +
                     '|' + timeFormat;
    if (diagramKey === this._lastDiagramKey) return;
    this._lastDiagramKey = diagramKey;

    // Sun arc (path + sunrise/sunset notches + arc-terminal labels).
    if (sunsetF > sunriseF && sunsetF > 0) {
      var srX = this._xAt(sunriseF);
      var ssX = this._xAt(sunsetF);
      var sunMidX = (srX + ssX) / 2;
      var sunPath = 'M ' + srX.toFixed(2) + ' ' + HORIZON_Y +
                    ' Q ' + sunMidX.toFixed(2) + ' ' + (HORIZON_Y - ARC_H * PEAK_FAC).toFixed(2) +
                    ' ' + ssX.toFixed(2) + ' ' + HORIZON_Y;
      els.sunArc.setAttribute('d', sunPath);
      els.sunArc.removeAttribute('display');
      els.srNotch.setAttribute('x1', srX.toFixed(2));
      els.srNotch.setAttribute('x2', srX.toFixed(2));
      els.srNotch.removeAttribute('display');
      els.ssNotch.setAttribute('x1', ssX.toFixed(2));
      els.ssNotch.setAttribute('x2', ssX.toFixed(2));
      els.ssNotch.removeAttribute('display');
      els.srLabel.style.left = srX.toFixed(2) + 'px';
      els.ssLabel.style.left = ssX.toFixed(2) + 'px';
      els.srLabel.textContent = '☀ ↑ ' + (state.sun && state.sun.sunrise ? this._fmtTimeStr(state.sun.sunrise, timeFormat) : '—');
      els.ssLabel.textContent = '☀ ↓ ' + (state.sun && state.sun.sunset  ? this._fmtTimeStr(state.sun.sunset,  timeFormat) : '—');
    } else {
      els.sunArc.setAttribute('display', 'none');
      els.srNotch.setAttribute('display', 'none');
      els.ssNotch.setAttribute('display', 'none');
      els.srLabel.textContent = '☀ ↑ —';
      els.ssLabel.textContent = '☀ ↓ —';
    }

    // Moon arc + moonrise/moonset notches + arc-terminal labels.
    if (moonHasTimes && !moonAU && !moonAD) {
      var mrX2 = this._xAt(moonriseF);
      var msX2 = (moonsetF > moonriseF) ? this._xAt(moonsetF) : this._xAt(1);
      var moonMidX = (mrX2 + msX2) / 2;
      var moonPath = 'M ' + mrX2.toFixed(2) + ' ' + HORIZON_Y +
                     ' Q ' + moonMidX.toFixed(2) + ' ' + (HORIZON_Y - MOON_ARC_H * PEAK_FAC).toFixed(2) +
                     ' ' + msX2.toFixed(2) + ' ' + HORIZON_Y;
      els.moonArc.setAttribute('d', moonPath);
      els.moonArc.removeAttribute('display');
      els.mrNotch.setAttribute('x1', mrX2.toFixed(2));
      els.mrNotch.setAttribute('x2', mrX2.toFixed(2));
      els.mrNotch.removeAttribute('display');
      els.msNotch.setAttribute('x1', msX2.toFixed(2));
      els.msNotch.setAttribute('x2', msX2.toFixed(2));
      els.msNotch.removeAttribute('display');
      els.mrLabel.style.left = mrX2.toFixed(2) + 'px';
      els.msLabel.style.left = msX2.toFixed(2) + 'px';
      els.mrLabel.textContent = '☾ ↑ ' + this._fmtTimeStr(state.moon.moonrise, timeFormat);
      els.msLabel.textContent = '☾ ↓ ' + this._fmtTimeStr(state.moon.moonset, timeFormat);
    } else {
      // alwaysUp / alwaysDown / missing: hide arc + notches, show dashes.
      els.moonArc.setAttribute('display', 'none');
      els.mrNotch.setAttribute('display', 'none');
      els.msNotch.setAttribute('display', 'none');
      els.mrLabel.textContent = '☾ ↑ —';
      els.msLabel.textContent = '☾ ↓ —';
    }
  },

  _renderTime(state, timeFormat) {
    var pair = this._resolve24h(state);
    var fm = this._formatHourMinute(pair[0], pair[1], timeFormat);
    var key = timeFormat + '|' + fm.hh + ':' + fm.mm + '|' + (fm.ampm || '');
    if (key === this._lastMinuteKey) return;
    this._lastMinuteKey = key;
    var els = this._els;
    els.hh.textContent = fm.hh;
    els.mm.textContent = fm.mm;
    if (fm.ampm) {
      els.ampm.textContent = fm.ampm;
      els.ampm.hidden = false;
    } else {
      els.ampm.textContent = '';
      els.ampm.hidden = true;
    }
  },

  _renderHeader(state, sunriseF, sunsetF) {
    // Gate on (iso + sunriseF + sunsetF) tuple so daylight refreshes when
    // sun data arrives after the first iso-date render. Both are stable for
    // the day so this is at most one repaint per midnight + one per Sun
    // poll (every 5 min).
    var iso = (state.date && state.date.isoDate) || '';
    var key = iso + '|' + sunriseF.toFixed(5) + '|' + sunsetF.toFixed(5);
    if (key === this._lastHeaderKey) return;
    this._lastHeaderKey = key;
    var els = this._els;
    var day3 = (state.date && state.date.dayOfWeek)
      ? state.date.dayOfWeek.slice(0, 3).toUpperCase() : '';
    var dotChar = '·';
    var dateStr = iso ? iso.replace(/-/g, '.') : '';
    els.headerMid.textContent = day3 + (day3 && dateStr ? ' ' + dotChar + ' ' : '') + dateStr;
    var dayMin = (sunsetF > 0 && sunriseF > 0)
      ? Math.round((sunsetF - sunriseF) * 24 * 60) : 0;
    if (dayMin < 0 || !isFinite(dayMin)) dayMin = 0;
    var dh = Math.floor(dayMin / 60);
    var dm = dayMin % 60;
    els.headerDaylight.textContent = 'DAYLIGHT ' + dh + 'H ' + String(dm).padStart(2, '0') + 'M';
  },

  _renderStatus(state, nowF, sunriseF, sunsetF, timeFormat) {
    // Gate on minute-level key. Status content changes at most once per
    // minute (isDay flips, or a weather/tide/aqi poll resolves). Building
    // 5 strings + 5 DOM comparisons per tick is wasteful; one key check is
    // enough. The key covers every field that can change the rendered text.
    var w = state.weather || {};
    var m = state.moon || {};
    var ti = state.tide || {};
    var a = state.aqi || {};
    var minuteOfDay = Math.floor(nowF * 1440);
    var isDay = sunsetF > sunriseF && nowF >= sunriseF && nowF <= sunsetF;
    var statusKey = minuteOfDay + '|' + (isDay ? 1 : 0) + '|' + sunsetF.toFixed(5) +
                    '|' + (w.condition || '') + '|' + w.tempC +
                    '|' + (m.phaseName || '') + '|' + m.illumination +
                    '|' + (ti.type || '') + '|' + ti.heightM + '|' + (ti.time || '') +
                    '|' + a.value + '|' + (a.band || '') + '|' + timeFormat;
    if (statusKey === this._lastStatusKey) return;
    this._lastStatusKey = statusKey;

    var els = this._els;

    // Headline.
    var cond = w.condition ? String(w.condition).replace(/_/g, ' ') : '—';
    var temp = (w.tempC !== null && w.tempC !== undefined) ? (w.tempC + '°') : '—';
    els.statusHeadline.textContent = (isDay ? '☀ DAY' : '☾ NIGHT') + ' · ' + cond + ' ' + temp;
    els.statusHeadline.classList.toggle('is-day', !!isDay);
    els.statusHeadline.classList.toggle('is-night', !isDay);

    // Golden hour. Simplified per spec section 6: always show evening
    // golden hour (sunset - 1h). If sunsetF is invalid, fall back to dash.
    var golden = '—';
    if (sunsetF > 0 && sunsetF <= 1) {
      var goldenF = sunsetF - (1 / 24);
      if (goldenF < 0) goldenF += 1;
      var totalMin = Math.round(goldenF * 24 * 60);
      var gh24 = Math.floor(totalMin / 60) % 24;
      var gmm = totalMin % 60;
      var gpair = this._formatHourMinute(gh24, gmm, timeFormat);
      golden = gpair.ampm ? (gpair.hh + ':' + gpair.mm + ' ' + gpair.ampm) : (gpair.hh + ':' + gpair.mm);
    }
    els.statusGolden.textContent = 'GOLDEN HOUR · ' + golden;

    // Moon.
    var phaseLabel = m.phaseName ? String(m.phaseName).toUpperCase() : '—';
    var illumPct = (typeof m.illumination === 'number') ? Math.round(m.illumination * 100) : null;
    els.statusMoon.textContent = 'MOON · ' + (m.phaseName ? (phaseLabel + ' ' + (illumPct !== null ? illumPct + '%' : '—')) : '—');

    // Tide.
    var tideText = 'TIDE · —';
    if (ti.type) {
      var typeLabel = String(ti.type).toUpperCase();
      var th = (ti.heightM === null || ti.heightM === undefined) ? '—m' : (Number(ti.heightM).toFixed(1) + 'm');
      var tt = this._fmtTimeStr(ti.time, timeFormat);
      tideText = 'TIDE · ' + typeLabel + ' ' + th + ' AT ' + tt;
    }
    els.statusTide.textContent = tideText;

    // Air.
    var airText = 'AIR · AQI — —';
    if (a.value !== null && a.value !== undefined) {
      var band = a.band ? String(a.band).replace(/_/g, ' ').toUpperCase() : '';
      var padded = String(a.value).padStart(3, '0');
      airText = 'AIR · AQI ' + padded + (band ? ' ' + band : '');
    }
    els.statusAir.textContent = airText;
  }
};

// Phase 16: face registry. Phase 17 registers `mechanical`; future faces
// register themselves here and use the same init/render/teardown contract.
// Mechanical and Editorial share the same time-format option set.
const FACE_TIME_FORMATS = ['24h', '12h'];

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
    departures: DeparturesFace,       // Phase 18
    editorial:  EditorialFace,        // Phase 19
    horizon:    HorizonFace           // Phase 20
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
          departures: { flapBezelOpacity: DEPARTURES_OPACITY_DEFAULT },
          editorial:  { timeFormat: '24h', previewMode: false },
          horizon:    { timeFormat: '12h', starField: false }
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
    const tf = FACE_TIME_FORMATS.indexOf(mech.timeFormat) >= 0 ? mech.timeFormat : '24h';
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

    // Phase 19: normalise editorial sub-object. timeFormat falls back to
    // '24h' for unknown values; previewMode is always coerced to boolean
    // and is never persisted by the picker on Apply.
    const ed = (byFace.editorial && typeof byFace.editorial === 'object')
      ? byFace.editorial
      : {};
    const edTf = FACE_TIME_FORMATS.indexOf(ed.timeFormat) >= 0 ? ed.timeFormat : '24h';
    const edPm = ed.previewMode === true;
    byFace.editorial = { timeFormat: edTf, previewMode: edPm };

    // Phase 20: normalise horizon sub-object. Default timeFormat is '12h'
    // (chihiro's brief). starField is reserved and accepts only literal
    // true; everything else coerces to false.
    const hz = (byFace.horizon && typeof byFace.horizon === 'object')
      ? byFace.horizon
      : {};
    const hzTf = FACE_TIME_FORMATS.indexOf(hz.timeFormat) >= 0 ? hz.timeFormat : '12h';
    const hzSf = hz.starField === true;
    byFace.horizon = { timeFormat: hzTf, starField: hzSf };

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
window.EditorialFace = EditorialFace;     // Phase 19
window.HorizonFace = HorizonFace;         // Phase 20
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
