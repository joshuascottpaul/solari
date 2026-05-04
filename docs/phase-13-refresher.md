# Phase 13: Daily Refresher Cycle

Status: Draft | 2026-05-03

## Summary

Phase 13 adds `RefresherCycle` (burn-in protection Layer 7) and a daily soft reload. At 03:00 local the `#refresher-overlay` fades to full opacity over 3 seconds, holds for 30 seconds of uniform mid-gray (#404040), then fades back over 3 seconds. After the 36-second cycle completes, the page reloads if uptime exceeds 24 hours.

## Goals

- Implement the 03:00 refresher cycle per SDD Section 9.2.
- Add `CONFIG.refresher` per SDD Section 18.
- Add `ResilienceManager.softReload()` per SDD Section 8.1.

## Non-Goals

- Luminance breath (Phase 14).
- Holiday/observance system (Phase 15).

## Proposed Design

### CONFIG addition

```js
refresher: {
  enabled: true,
  triggerHour: 3,      // 03:00 local
  holdSec: 30,
  fadeSec: 3,
  color: '#404040'
}
```

### CSS change

Add a transition rule to `#refresher-overlay` in `style.css`:

```css
#refresher-overlay {
  position: fixed; inset: 0;
  background: #404040; opacity: 0;
  pointer-events: none; z-index: 100;
  transition: opacity 3s linear;
}
```

The `3s` value matches `CONFIG.refresher.fadeSec`. The transition is always present but inert because nothing changes opacity until `RefresherCycle.run()` fires.

### RefresherCycle module

```js
const RefresherCycle = {
  _timerId: null,
  _overlay: null,

  start() {
    if (!CONFIG.refresher.enabled) return;
    this._overlay = document.getElementById('refresher-overlay');
    this._schedule();
  },

  _schedule() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(CONFIG.refresher.triggerHour, 0, 0, 0);

    // If target is in the past (or within the 36s cycle window), push to tomorrow.
    const cycleDurationMs = (CONFIG.refresher.fadeSec * 2 + CONFIG.refresher.holdSec) * 1000;
    if (target.getTime() <= now.getTime() + cycleDurationMs) {
      target.setDate(target.getDate() + 1);
    }

    const delayMs = target.getTime() - now.getTime();
    this._timerId = setTimeout(() => this.run(), delayMs);
  },

  run() {
    const fade = CONFIG.refresher.fadeSec * 1000;
    const hold = CONFIG.refresher.holdSec * 1000;
    const el = this._overlay;

    // Step 1: fade to opaque (CSS transition handles the 3s ramp)
    el.style.opacity = '1';

    // Step 2: after fade completes, hold for 30s, then fade back
    setTimeout(() => {
      el.style.opacity = '0';

      // Step 3: after fade-out completes, schedule next cycle + soft reload
      setTimeout(() => {
        this._schedule();
        ResilienceManager.softReload();
      }, fade);
    }, fade + hold);
  }
};
```

### Timer scheduling algorithm

1. Compute a `Date` for today at `triggerHour:00:00.000`.
2. If that time is in the past or within 36 seconds from now (the cycle window), add one day.
3. `setTimeout(run, target - now)`. Single shot, not `setInterval`.
4. After each cycle completes, `_schedule()` is called again to set the next day's timer.

This means: if the page loads at 02:59:50, the cycle fires 10 seconds later. If the page loads at 03:00:10 (mid-window), it skips today and fires tomorrow at 03:00.

### Soft reload

Add to `ResilienceManager`:

```js
softReload() {
  const uptime = Date.now() - AppState.meta.bootedAt;
  if (uptime > 24 * 60 * 60 * 1000) {
    location.reload();
  }
}
```

Called after the refresher fade-out completes. If uptime is under 24 hours, the call is a no-op. The reload clears any long-term memory accumulation. Because it fires at 03:00:36, users will never see it.

### Boot sequence update

Add to the `boot()` IIFE, after `MacroShifter.start()` and before `RotatorModule.start()`:

```js
RefresherCycle.start();
```

### Fade sequence timeline

```
03:00:00.000  overlay.opacity = 1   (CSS transition begins 0 -> 1)
03:00:03.000  overlay fully opaque  (display is uniform #404040)
03:00:33.000  overlay.opacity = 0   (CSS transition begins 1 -> 0)
03:00:36.000  overlay fully transparent; cycle complete
              _schedule() sets timer for tomorrow 03:00
              softReload() fires location.reload() if uptime > 24h
```

## Open Questions

1. Should `CONFIG.refresher.fadeSec` drive the CSS transition duration dynamically via JS (`el.style.transition = 'opacity ' + fadeSec + 's linear'`), or is the hardcoded `3s` in CSS acceptable given the config default matches? Hardcoded is simpler; dynamic is more correct if the config is ever changed.
2. Should the soft reload be gated behind its own config flag (`resilience.softReloadEnabled`), or is coupling it to the refresher cycle sufficient?
