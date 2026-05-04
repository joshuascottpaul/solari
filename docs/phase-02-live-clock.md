# Phase 2: Live Clock and Date

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 2 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 2 replaces the hardcoded time and date with a live clock that updates every second. The clock uses a self-correcting setTimeout (not setInterval) to prevent cumulative drift over months of continuous operation. The date text updates at midnight.

## Goals

- Time display updates every second, driven by ClockModule
- Date display updates when the calendar day changes
- Self-correcting tick prevents drift over long-running sessions
- CONFIG and AppState structures established for all future phases
- All DOM writes go through DisplayModule.render()

## Non-Goals

- No other modules (weather, AQI, tides, sun, moon)
- No animation, transitions, or drift
- No fetch calls or data.js
- No ResilienceManager or localStorage
- No error recovery beyond try/catch in the tick loop

## Changes to index.html

Add one script tag before the closing `</body>`:

```html
  <script src="app.js"></script>
</body>
```

No other HTML changes. The existing DOM elements (`#time .hours`, `#time .colon`, `#time .minutes`, `#time .ampm`, `#date .text`) are the render targets.

## app.js Implementation

The file contains exactly four top-level declarations in this order: `CONFIG`, `AppState`, `ClockModule`, `DisplayModule`, followed by the boot sequence.

### CONFIG

```js
const CONFIG = {
  display: {
    timeFormat: '12h',   // '12h' | '24h'
    showSeconds: false,
    dateFormat: 'long'   // 'long' = "Wednesday · May 3"
  }
};
```

### AppState

```js
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
  meta: {
    bootedAt: null,
    lastUpdate: {}
  }
};
```

### ClockModule

```js
const ClockModule = {
  _expected: 0,

  init() {},

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
```

**Self-correcting tick algorithm.** Each tick computes `1000 - now.getMilliseconds()` to schedule the next tick at the start of the next whole second. If the current tick fires at T=1000.050 (50ms late), `getMilliseconds()` returns 50, so the next timeout is 950ms, which targets T=2000.000. This anchors every tick to the system clock's second boundary. No drift accumulates because each timeout is calculated from the current wall-clock time, not from the previous tick's expected time.

Why not setInterval: setInterval queues callbacks at fixed intervals from the first call. If a callback is delayed (GC pause, tab throttling), subsequent callbacks bunch up or skip. setTimeout recalculates each time.

### DisplayModule

```js
const DisplayModule = {
  _els: {},

  init() {
    this._els = {
      hours: document.querySelector('#time .hours'),
      colon: document.querySelector('#time .colon'),
      minutes: document.querySelector('#time .minutes'),
      ampm: document.querySelector('#time .ampm'),
      dateText: document.querySelector('#date .text')
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

    // Date format "long": "Wednesday · May 3"
    this._els.dateText.textContent = d.dayOfWeek + ' \u00B7 ' + d.month + ' ' + d.day;
  }
};
```

Render details:
- Hours are unpadded in 12h mode (e.g., `2`, not `02`). In 24h mode, also unpadded (e.g., `9`, not `09`).
- Minutes are always zero-padded to 2 digits.
- The colon is static text, never toggled. No blink.
- The middot separator (`\u00B7`) matches the Phase 1 `&middot;` entity.
- Seconds are not displayed (`CONFIG.display.showSeconds` is false). No seconds element exists in the DOM and no logic references it in render.

### Boot Sequence

```js
(function boot() {
  DisplayModule.init();
  ClockModule.init();
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
})();
```

Order matters: DisplayModule.init() caches DOM references before ClockModule.start() triggers the first render. The boot IIFE runs on script load. No DOMContentLoaded listener is needed because the `<script>` tag is at the end of `<body>`, so the DOM is already parsed.

## Files Changed

| File       | Change                                |
|------------|---------------------------------------|
| app.js     | Replace placeholder comment with full implementation |
| index.html | Add `<script src="app.js"></script>` before `</body>` |

No changes to style.css, manifest.json, or any other file.

## Acceptance Criteria

1. Open `localhost:8000`; the time matches the system clock within 1 second
2. Wait 60 seconds; the minute digit increments correctly
3. The date line reads the current day (e.g., "Saturday · May 3")
4. In DevTools console, `AppState.time` reflects the current time; `AppState.date.isoDate` matches today
5. Set system clock to 11:59:58 PM; observe the date text update at midnight
6. Set `CONFIG.display.timeFormat = '24h'` in source; reload; hours display 0-23, AM/PM indicator is hidden
7. No console errors after 5 minutes of continuous operation
8. Slots A and B still show their Phase 1 hardcoded values (unchanged)
9. `performance.now()` check: `DisplayModule.render()` completes in under 1ms

## References

- SDD Sections: 4 (FR-1), 8.1 (ClockModule, DisplayModule), 16 (AppState), 18 (CONFIG), 19 (Phase 2)
- Phase 1 spec: `docs/phase-01-static-layout.md`
