# Phase 14: Luminance Breath

Status: Draft | 2026-05-03

## Summary

Phase 14 adds `LuminanceBreath` (burn-in protection Layer 6). The CSS custom property `--lum-mod` oscillates between 0.85 and 1.15 on a 30-minute sine wave, modulating type brightness so no pixel is held at the same intensity for more than approximately 15 minutes. The oscillation is too slow to be perceived as flicker.

## Goals

- Implement `LuminanceBreath.start()` per SDD Section 8.1.
- Add `CONFIG.luminanceBreath` per SDD Section 18.
- Apply `--lum-mod` to text elements only (time, date, slots), not background or moon disc.

## Non-Goals

- Modifying `SkyColorModule` color computation (see Alternatives Considered).
- Holiday/observance system (Phase 15).

## Proposed Design

### CONFIG addition

Add after `CONFIG.macroShift`:

```js
luminanceBreath: {
  enabled: true,
  periodMin: 30,
  amplitude: 0.15
}
```

### CSS change

Add a `filter` rule to text elements in `style.css`. The `--lum-mod` custom property is already declared on `:root` with initial value `1`.

```css
#time, #date, .slot {
  filter: brightness(var(--lum-mod));
}
```

This targets only the four text elements (time, date, slot-a, slot-b). The moon disc and `#display` background are unaffected.

### LuminanceBreath module

Add before `DisplayModule` in `app.js`:

```js
const LuminanceBreath = {
  _intervalId: null,

  start() {
    if (!CONFIG.luminanceBreath.enabled) return;
    this._update();
    this._intervalId = setInterval(() => this._update(), 1000);
  },

  _update() {
    const periodSec = CONFIG.luminanceBreath.periodMin * 60;
    const amp = CONFIG.luminanceBreath.amplitude;
    const t = Date.now() / 1000;
    const mod = 1 + amp * Math.sin(2 * Math.PI * t / periodSec);
    document.documentElement.style.setProperty('--lum-mod', mod.toFixed(4));
  }
};
```

The formula `1 + 0.15 * sin(2 * PI * t / 1800)` produces values in the range [0.85, 1.15]. Using `Date.now()` as the time source means the phase is deterministic across page reloads (it depends on wall-clock time, not uptime). The 1-second update interval is sufficient because adjacent values differ by at most 0.0005 (imperceptible).

### Boot sequence update

Add to the `boot()` IIFE, after `RefresherCycle.start()` and before `RotatorModule.start()`:

```js
LuminanceBreath.start();
```

Full boot tail becomes:

```js
MacroShifter.start();
RefresherCycle.start();
LuminanceBreath.start();          // Phase 14: luminance breath
RotatorModule.start();
```

### Oscillation timeline

```
t=0m    --lum-mod = 1.000   (midpoint, rising)
t=7.5m  --lum-mod = 1.150   (peak brightness)
t=15m   --lum-mod = 1.000   (midpoint, falling)
t=22.5m --lum-mod = 0.850   (trough brightness)
t=30m   --lum-mod = 1.000   (full cycle complete)
```

At peak, type lightness is 15% brighter than the base sky-color value. At trough, 15% dimmer. The +-15% range is below the threshold of conscious perception when the period is 30 minutes.

### Files changed

| File | Change |
|---|---|
| `app.js` | Add `CONFIG.luminanceBreath`, add `LuminanceBreath` module, add `LuminanceBreath.start()` to boot |
| `style.css` | Add `filter: brightness(var(--lum-mod))` rule for `#time, #date, .slot` |

Total: approximately 20 lines of JS, 3 lines of CSS.

## Alternatives Considered

### A: JS integration in SkyColorModule

SDD Section 10.3 step 4 specifies "multiply lightness by --lum-mod" inside the color computation pipeline. This would mean `SkyColorModule.update()` reads `--lum-mod` and applies it in HSL space before writing `--type-primary` and `--type-secondary`.

**Problem:** `SkyColorModule.update()` runs every 5 minutes (triggered by `SunModule`). `LuminanceBreath` updates every 1 second. To get smooth breath, either LuminanceBreath must call `SkyColorModule.update()` every second (60x more frequent than designed, wasteful), or LuminanceBreath must duplicate the HSL-to-RGB pipeline to modify the CSS vars directly (logic duplication, fragile coupling).

**Why rejected:** The CSS `filter: brightness()` approach achieves the identical visual result (type brightness modulated by --lum-mod) without coupling the two modules or increasing computation. The burn-in protection effectiveness is identical.

### B: CSS filter on #display container

Apply `filter: brightness(var(--lum-mod))` to `#display` instead of individual text elements.

**Problem:** This also modulates the moon disc (which should remain at its current opacity levels) and could interact with the near-black background, causing it to drift away from #0a0a0a.

**Why rejected:** Targeting `#time, #date, .slot` is only marginally more CSS and precisely scopes the effect to type elements.

## Open Questions

None. This phase is small and fully specified.
