# Phase 12: Macro Position Shifts

| Field     | Value                        |
|-----------|------------------------------|
| Phase     | 12 of 15                    |
| Status    | Draft                        |
| Date      | 2026-05-03                   |
| Author    | ariadne                      |
| Impl      | misaka                       |

## Summary

Phase 12 adds MacroShifter, the fourth burn-in protection layer. The time element cycles through 6 home positions every 3 hours, and the moon cycles through 4 corner positions every 6 hours. Both use 60-second CSS transitions. Over 24 hours (8 time shifts, 4 moon shifts), no pixel sees lit content for more than 3 consecutive hours.

## Goals

- MacroShifter relocates the time element to a new home position every 3 hours (6 positions, cycled)
- MacroShifter relocates the moon element to a new corner every 6 hours (4 positions, cycled)
- Both shifts use 60-second smooth CSS transitions via `left`/`top` properties
- Drift continues uninterrupted during shifts (drift writes `transform`, shifts write `left`/`top`)
- Initial position index is deterministic from the current hour, so page reloads resume the correct position
- DriftEngine anchor cache is updated after each shift so viewport clamping remains correct

## Non-Goals

- No daily refresher cycle (Phase 13)
- No luminance breath (Phase 14)
- No changes to drift amplitude or period values

## CONFIG Addition

Add `macroShift` block after `drift`:

```js
macroShift: {
  enabled: true,
  timeIntervalHours: 3,
  timeTransitionSec: 60,
  timeHomes: [
    [50, 47], [35, 42], [65, 42],
    [50, 55], [40, 50], [60, 50]
  ],
  moonIntervalHours: 6,
  moonTransitionSec: 60,
  moonHomes: [
    [87, 17], [13, 17], [87, 78], [13, 78]
  ]
}
```

Home coordinates are `[x%, y%]` relative to the viewport. The moon homes use 87/13 (not the SDD's 91/9) to account for the C1 anchor fix and drift amplitude headroom.

## MacroShifter

Place after DriftEngine, before DisplayModule.

```js
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

  _applyTime(withTransition) {
    var home = CONFIG.macroShift.timeHomes[this._timeIndex];
    var el = document.getElementById('time');
    if (!el) return;
    if (withTransition) {
      var sec = CONFIG.macroShift.timeTransitionSec;
      el.style.transition = 'left ' + sec + 's ease-in-out, top ' + sec + 's ease-in-out';
    } else {
      el.style.transition = 'none';
    }
    el.style.left = home[0] + '%';
    el.style.top = home[1] + '%';
    DriftEngine.updateAnchor('time', home[0], home[1]);
  },

  _applyMoon(withTransition) {
    var home = CONFIG.macroShift.moonHomes[this._moonIndex];
    var el = document.getElementById('moon');
    if (!el) return;
    if (withTransition) {
      var sec = CONFIG.macroShift.moonTransitionSec;
      el.style.transition = 'left ' + sec + 's ease-in-out, top ' + sec + 's ease-in-out';
    } else {
      el.style.transition = 'none';
    }
    el.style.left = home[0] + '%';
    el.style.top = home[1] + '%';
    DriftEngine.updateAnchor('moon', home[0], home[1]);
  }
};
```

### Position cycle over 24 hours

| Hour | Time index | Time position (x%, y%) | Moon index | Moon position (x%, y%) |
|------|-----------|------------------------|-----------|------------------------|
| 0    | 0         | 50, 47                 | 0         | 87, 17                 |
| 3    | 1         | 35, 42                 | 0         | 87, 17                 |
| 6    | 2         | 65, 42                 | 1         | 13, 17                 |
| 9    | 3         | 50, 55                 | 1         | 13, 17                 |
| 12   | 4         | 40, 50                 | 2         | 87, 78                 |
| 15   | 5         | 60, 50                 | 2         | 87, 78                 |
| 18   | 0         | 50, 47                 | 3         | 13, 78                 |
| 21   | 1         | 35, 42                 | 3         | 13, 78                 |

## DriftEngine.updateAnchor()

Add this method to DriftEngine:

```js
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
```

This ensures the DriftEngine viewport clamping bounds are recalculated against the new home position on the next animation frame.

## Why Drift Continues During Shifts

Drift and macro shifts write to independent CSS properties:

- **Drift** writes `--time-dx` / `--time-dy` via `transform: translate(var(--time-dx), var(--time-dy))`
- **MacroShifter** writes `left` / `top` directly on the element

These compose naturally. During the 60-second slide, the element smoothly transitions its `left`/`top` while the `transform` offset continues to update at 60fps from Perlin noise.

## Boot Sequence

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
  AlmanacModule.start();
  DriftEngine.start();
  MacroShifter.start();            // NEW: after DriftEngine so updateAnchor works
  RotatorModule.start();
})();
```

MacroShifter.start() runs after DriftEngine.start() because `_applyTime` and `_applyMoon` call `DriftEngine.updateAnchor()`, which requires `_entries` and `_anchorPercents` to be initialized.

## Acceptance Criteria

1. Time element visibly relocates every 3 hours through all 6 home positions
2. Moon element visibly relocates every 6 hours through all 4 corner positions
3. Both shifts use a 60-second smooth CSS transition (ease-in-out)
4. Drift animation continues without interruption during a macro shift
5. Page reload at any hour resumes the correct position index (deterministic from clock)
6. DriftEngine viewport clamping respects the new anchor after each shift (no clipping at edges)
7. Initial positions are applied without transition (no 60s slide on boot)
8. `CONFIG.macroShift.enabled = false` disables macro shifts entirely
9. All previous phase functionality intact; no console errors

## References

- SDD Sections: 8.1 (MacroShifter interface), 9.2 (Layer 4 spec), 18 (CONFIG.macroShift), 19 (Phase 12)
- Phase 11 spec: `docs/phase-11-almanac.md`
- C1 fix: moon anchor shifted from 91%/14% to 87%/17%
