# Phase 9: Rotator + Kinetic Split-Flap Transitions

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 9 of 15                     |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 9 adds the signature Solari interaction: two independent rotator slots that cycle through data sources with character-by-character split-flap cascade transitions. KineticType wraps slot content in per-character spans and animates transitions with staggered random-glyph substitution cascades. RotatorModule manages independent timers (28s/36s) and source rotation for each slot.

## Goals

- KineticType.create(el) wraps element text in individual `<span class="char">` elements
- KineticType.animate(el, newString) runs a left-to-right staggered cascade transition per SDD 11.1 timing
- Slot A cycles: SUNRISE, SUNSET, DAYLIGHT, time-until-next-event (28s hold)
- Slot B cycles: WEATHER, AQI, TIDE (36s hold)
- Null/unavailable sources are skipped silently
- DisplayModule no longer writes to slots; RotatorModule owns slot content entirely
- All animation uses setTimeout chains (no rAF, to avoid interfering with DriftEngine)

## Non-Goals

- No EC alert preemption (Phase 10)
- No almanac entries (Phase 11)
- No holiday/observance entries (Phase 15)
- No additional Slot B sources beyond weather, AQI, tide

## app.js Changes

### CONFIG Addition

Add after `drift`:

```js
rotation: {
  slotAHoldSec: 28,
  slotBHoldSec: 36,
  transitionMs: 1500,
  cascadeStaggerMs: 70
}
```

### AppState Addition

Add after `meta`:

```js
rotator: {
  slotA: { text: '', index: 0 },
  slotB: { text: '', index: 0 }
}
```

### KineticType

Place after DriftEngine, before DisplayModule.

```js
const KineticType = {
  _GLYPHS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·°+-',

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
    // SDD 11.1 timing:
    // 0-150ms:      hold previous character
    // 150-300ms:    first random substitution (flip begins)
    // 300-1000ms:   5-9 rapid subs at ~80ms each
    // 1000-1400ms:  substitutions slow (120ms each)
    // 1400-1600ms:  lock target + accent flash

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
```

**Cascade timing example for position 0 (delay=0):**

| Time (ms) | Action                              |
|-----------|--------------------------------------|
| 0-150     | Hold previous character              |
| 150       | First random glyph                   |
| ~230      | Second random glyph                  |
| ~310      | Third random glyph                   |
| ...       | 5-9 total at 70-90ms intervals       |
| ~850      | First slow substitution (100-140ms)  |
| ~980      | Second slow substitution             |
| ~1100     | Lock target, add `char--flash` class |
| ~1300     | Remove `char--flash` class           |

Position 1 starts at delay=70ms. Position 10 starts at delay=700ms. A 20-character string completes its full cascade in roughly 70*19 + 1300 = 2630ms.

### RotatorModule

Place after KineticType.

```js
const RotatorModule = {
  _slotAEl: null,
  _slotBEl: null,
  _timerA: null,
  _timerB: null,

  _sourcesA: [
    function() {
      const sr = AppState.sun.sunrise;
      return sr ? 'SUNRISE ' + sr : null;
    },
    function() {
      const ss = AppState.sun.sunset;
      return ss ? 'SUNSET ' + ss : null;
    },
    function() {
      const mins = AppState.sun.dayLengthMin;
      if (!mins) return null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return 'DAYLIGHT ' + h + 'H ' + String(m).padStart(2, '0') + 'M';
    },
    function() {
      // Time until next sun event
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
        // Use today's sunrise + 24h as approximation.
        target = new Date(todaySr.getTime() + 24 * 60 * 60 * 1000);
        label = 'SUNRISE IN';
      }

      const diffMin = Math.max(0, Math.round((target - now) / 60000));
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return label + ' ' + h + 'H ' + String(m).padStart(2, '0') + 'M';
    }
  ],

  _sourcesB: [
    function() {
      const w = AppState.weather;
      if (w.condition === null || w.tempC === null) return null;
      // Map internal condition names to display labels
      const labels = {
        CLEAR: 'CLEAR', PARTLY_CLOUDY: 'PARTLY CLOUDY',
        FOG: 'FOG', RAIN: 'RAIN', SNOW: 'SNOW', STORM: 'STORM'
      };
      return (labels[w.condition] || w.condition) + ' ' + w.tempC + '\u00B0';
    },
    function() {
      const a = AppState.aqi;
      if (a.value === null) return null;
      const bandLabels = {
        good: 'GOOD', moderate: 'MODERATE', unhealthy: 'UNHEALTHY',
        very_unhealthy: 'V UNHEALTHY', hazardous: 'HAZARDOUS'
      };
      return 'AQI ' + a.value + ' ' + (bandLabels[a.band] || '');
    },
    function() {
      const t = AppState.tide;
      if (t.type === null) return null;
      const label = t.type === 'high' ? 'HIGH TIDE' : 'LOW TIDE';
      const h = t.heightM !== null ? t.heightM.toFixed(1) + 'M' : '';
      let timeStr = '';
      if (t.time) {
        const d = new Date(t.time);
        if (CONFIG.display.timeFormat === '12h') {
          const hr = d.getHours() % 12 || 12;
          const mn = String(d.getMinutes()).padStart(2, '0');
          const ap = d.getHours() < 12 ? 'AM' : 'PM';
          timeStr = hr + ':' + mn + ' ' + ap;
        } else {
          timeStr = String(d.getHours()).padStart(2, '0') + ':' +
                    String(d.getMinutes()).padStart(2, '0');
        }
      }
      return label + ' ' + h + ' ' + timeStr;
    }
  ],

  init() {
    this._slotAEl = document.getElementById('slot-a');
    this._slotBEl = document.getElementById('slot-b');

    // Set initial content from first available source
    const initA = this._nextText('A');
    const initB = this._nextText('B');
    this._slotAEl.textContent = initA || '';
    this._slotBEl.textContent = initB || '';
    KineticType.create(this._slotAEl);
    KineticType.create(this._slotBEl);
  },

  start() {
    this._timerA = setInterval(
      () => this._rotate('A'),
      CONFIG.rotation.slotAHoldSec * 1000
    );
    this._timerB = setInterval(
      () => this._rotate('B'),
      CONFIG.rotation.slotBHoldSec * 1000
    );
  },

  _rotate(slot) {
    const text = this._nextText(slot);
    if (text === null) return; // all sources null; hold current
    const el = slot === 'A' ? this._slotAEl : this._slotBEl;
    const stateKey = slot === 'A' ? 'slotA' : 'slotB';
    AppState.rotator[stateKey].text = text;
    KineticType.animate(el, text);
  },

  _nextText(slot) {
    const sources = slot === 'A' ? this._sourcesA : this._sourcesB;
    const stateKey = slot === 'A' ? 'slotA' : 'slotB';
    const state = AppState.rotator[stateKey];
    const len = sources.length;

    // Try each source starting from next index; skip nulls
    for (let attempt = 0; attempt < len; attempt++) {
      state.index = (state.index + 1) % len;
      const text = sources[state.index]();
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

  transition(slot, newValue) {
    const el = slot === 'A' ? this._slotAEl : this._slotBEl;
    const stateKey = slot === 'A' ? 'slotA' : 'slotB';
    AppState.rotator[stateKey].text = newValue;
    KineticType.animate(el, newValue);
  }
};
```

### DisplayModule Changes

Remove slot rendering from DisplayModule. The `init()` method no longer caches slot elements. The `render()` method only updates time, date, and moon.

Remove from `DisplayModule.init()`:
- No references to `#slot-a` or `#slot-b` elements

Remove from `DisplayModule.render()`:
- No writes to slot `.label` or `.value` spans

The existing `DisplayModule.init()` and `render()` already do not write to slots (slots were showing static hardcoded content from HTML), so no code needs to be removed. This note is for future reference: slots are owned by RotatorModule.

### Boot Sequence

```js
(function boot() {
  DisplayModule.init();
  ClockModule.init();
  SunModule.init();
  MoonModule.init();
  RotatorModule.init();          // NEW: wraps slots in char spans
  AppState.meta.bootedAt = Date.now();
  ClockModule.start();
  SunModule.start();
  SkyColorModule.update();
  MoonModule.start();
  WeatherModule.start();
  AirQualityModule.start();
  TideModule.start();
  DriftEngine.start();
  RotatorModule.start();         // NEW: begins rotation timers
})();
```

RotatorModule.init() runs early (sets up DOM). RotatorModule.start() runs last so data modules have fired their first fetches before the first rotation tick.

## index.html Changes

Replace the slot inner structure. The `.label`/`.value` spans are removed; KineticType.create() builds the character spans at runtime.

```html
<div id="slot-a" class="slot">SUNSET 8:32 PM</div>
<div id="slot-b" class="slot">CLEAR 18°</div>
```

The hardcoded text is placeholder; RotatorModule.init() will overwrite it with the first available source and wrap in `.char` spans.

## style.css Changes

Remove the `.slot .label` and `.slot .value` rules. Add character span styles.

Remove:

```css
.slot .label {
  display: block; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--type-secondary);
}
.slot .value { display: block; color: var(--type-primary); }
```

Also remove the font-size rules for `.slot .label` and `.slot .value`:

```css
.slot .label { font-size: 1.6vw; }
.slot .value { font-size: 2.4vw; }
```

Add:

```css
.slot {
  font-size: 2.0vw;
  color: var(--type-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.char {
  display: inline-block;
  min-width: 0.6em;    /* fixed width during animation for monospace feel */
  text-align: center;
}

.char--flash {
  color: var(--type-accent);
  transition: color 0.2s ease-out;
}

/* Revert to secondary after flash */
.char {
  transition: color 0.15s ease-out;
}
```

The `min-width: 0.6em` prevents layout jitter during the random-glyph cascade. Characters stay in place even when cycling through wide (M, W) and narrow (I, 1) glyphs.

## Cascade Algorithm Detail

For a transition from `"SUNSET 8:32 PM"` to `"AQI 23 GOOD"`:

1. Old string: 14 characters. New string: 12 characters.
2. KineticType.animate removes 2 trailing spans, leaving 12.
3. Character comparison:

| Pos | Old | New | Action     |
|-----|-----|-----|------------|
| 0   | S   | A   | Cascade    |
| 1   | U   | Q   | Cascade    |
| 2   | N   | I   | Cascade    |
| 3   | S   | (space) | Cascade |
| 4   | E   | 2   | Cascade    |
| 5   | T   | 3   | Cascade    |
| 6   | (space) | (space) | Skip |
| 7   | 8   | G   | Cascade    |
| 8   | :   | O   | Cascade    |
| 9   | 3   | O   | Cascade    |
| 10  | 2   | D   | Cascade    |
| 11  | (space) | (space) | Skip -- but was 'P' before trim |

4. Position 0 starts cascade at t=0. Position 1 at t=70ms. Position 10 at t=700ms.
5. Each cascade runs ~1100-1300ms internally. Full transition completes at ~700 + 1300 = 2000ms.
6. During the cascade, the slot visually "flutters" left to right, evoking a mechanical departure board.

## Timing Budget

- Slot A hold: 28s. Transition: ~2s. Effective display time: ~26s per source.
- Slot B hold: 36s. Transition: ~2s. Effective display time: ~34s per source.
- Slot A full cycle (4 sources): ~112s (under 2 minutes).
- Slot B full cycle (3 sources): ~108s (under 2 minutes).
- The two slots are on coprime-ish intervals (28 and 36). They will occasionally transition simultaneously, which is fine and visually interesting.

## Acceptance Criteria

1. On boot, both slots display content from their first available source, wrapped in `.char` spans
2. Slot A transitions every 28 seconds to the next source in order: sunrise, sunset, daylight, time-until-next
3. Slot B transitions every 36 seconds: weather, AQI, tide
4. During transition, characters visibly cascade left-to-right with random glyphs before settling
5. Each character position that changes shows 7-12 random substitutions before locking
6. The stagger between adjacent positions is visually perceptible (~70ms)
7. On lock, the target character briefly flashes in `--type-accent` color
8. Characters that are identical between old and new strings do not animate
9. If a source returns null (e.g., tide data not loaded), it is skipped; the slot advances to the next non-null source
10. If all sources return null, the slot holds its current content
11. Time-until-next shows "SUNSET IN" before sunset and "SUNRISE IN" after sunset
12. No rAF calls in KineticType; all timing uses setTimeout
13. DriftEngine continues to move slots smoothly during transitions
14. No `.label` or `.value` spans remain in the DOM; slots are flat character-span structures
15. No console errors; all previous phase functionality intact

## References

- SDD Sections: 8.1 (module interfaces), 11.1 (per-character animation timing), 11.2 (slot configuration), 11.3 (content templates), 19 (Phase 9)
- Phase 8 spec: `docs/phase-08-aqi-tides.md`
