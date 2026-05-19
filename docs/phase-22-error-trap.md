# Phase 22 -- Global Error Trap and Ring Buffer

**Date:** 2026-05-18
**Status:** Shipped
**Scope:** Observability (no visual design changes; no chihiro/coraline in pipeline)
**Branch:** `phase-22-error-trap`

## 1. Summary

A 24/7 ambient display has no developer console open and no way to surface silent JavaScript failures after deployment. Errors that occur during a long-running session on an iPad -- uncaught exceptions, unhandled promise rejections -- disappear without a trace. Phase 22 adds a global error trap that captures these events into a localStorage ring buffer, and surfaces the buffer through a hidden viewer on the existing VersionOverlay chip.

No remote logging, no analytics, no user-facing indicator. The trap is purely a diagnostic aid for the developer.

## 2. What Landed

### `ErrorLog` module (`app.js`)

A new module, `ErrorLog`, is installed at the top of `app.js`, before the `SOLARI_PICKER` boot guard and before the `AppState` declaration. It captures `window.error` and `window.unhandledrejection` events.

Storage contract:
- **Key:** `solari.errorLog`
- **Format:** JSON array of entry objects, newest last.
- **Cap:** 50 entries. When the buffer exceeds 50, the oldest entry is dropped.
- **Quota handling:** on localStorage `QuotaExceededError`, `ErrorLog._persist()` drops the oldest in-memory entry and retries once. If the retry also fails, it logs a console warning and continues -- no exception surfaces to the page.
- **Storage listener:** `solari.errorLog` is intentionally excluded from the storage-event listener that triggers `location.reload()`. Writes to the error log must not reload the display.

Each captured entry includes:

| Field | Type | Content |
|---|---|---|
| `ts` | string | ISO 8601 timestamp |
| `kind` | `'error'` or `'rejection'` | Event type |
| `msg` | string (max 240 chars) | Error message |
| `src` | string (max 120 chars) | Source filename (from `ErrorEvent.filename`; empty for rejections) |
| `line` | number or null | Line number |
| `col` | number or null | Column number |
| `stack` | string (max 480 chars) | First 3 stack frames, joined by ` \| ` |

The `capture()` method is wrapped in a top-level try/catch. A bug inside the trap cannot crash the page.

### Boot-order rationale

`ErrorLog.install()` is called immediately after the module declaration, before the `SOLARI_PICKER` boot guard. This means both `index.html` (the main display) and `clockface.html` (the picker) capture errors into the same buffer under the same key. The picker's `SOLARI_PICKER` guard causes the boot IIFE to return early, skipping fetchers and the render loop, but it does not skip `ErrorLog` because `ErrorLog` is installed above the guard.

`window.ErrorLog` is exported so `clockface.js` or the DevTools console can call `ErrorLog.read()` directly.

### `VersionOverlay` extensions

The existing VersionOverlay chip (shown by a single tap on the moon disc or time numerals, auto-dismissed after 4 seconds) gains a second interaction: a 600 ms long-press on the chip itself opens the error-log viewer.

New methods:
- `_attachChipLongPress()` -- wired once when the chip element is first created; handles touch and mouse events; 600 ms threshold matches the existing picker long-press.
- `_openViewer()` -- sets `_viewerMode = true`, cancels the auto-dismiss timer, expands the chip, renders the entry list, and attaches a tap-outside-to-dismiss listener (deferred one tick to avoid the long-press release triggering an immediate close).
- `_renderViewer()` -- reads `ErrorLog.read()` and builds the entry list DOM; entries are shown newest-first; each row shows timestamp, kind, message, optional location, and optional stack fragment.
- `_closeViewer()` -- resets `_viewerMode`, removes the dismiss listener, collapses the chip.

A `_viewerMode` flag gates `_show()`: if the viewer is open and the face surface receives a tap that would normally show the chip, the tap is ignored. This prevents `_show()` from rebuilding the chip DOM while the viewer is open -- the critical bug caught during code review (see Section 5).

The auto-dismiss timer also checks `_viewerMode` before hiding the chip: if the viewer is open, the timer no-ops when it fires.

### CSS additions (`style.css`, +53 lines)

- `.version-overlay.is-visible` and `.version-overlay.is-expanded` -- `pointer-events: auto`. When the chip's opacity is 0 (default hidden state) it now has `pointer-events: none`, preventing touches from being swallowed by the invisible element. Phase 22 adds `.is-visible` and `.is-expanded` class toggles to the chip's show/hide path to restore touch capture only when the chip is actually visible.
- `.version-overlay.is-expanded` -- positions the expanded viewer: `bottom: 6vh`, `width: 64vw`, `max-height: 70vh`, scrollable, semi-transparent dark background, 1 px low-opacity border.
- `.errorlog-*` rules -- typography for entry rows (head, msg, loc, stack); loc and stack use JetBrains Mono to match the source context.

## 3. Burn-In Considerations

The error-log viewer is transient: it appears only when explicitly summoned (long-press on a visible chip) and collapses on any tap outside it. It does not persist on screen, does not introduce a new DOM element that remains between sessions, and does not hold any pixel in a fixed position for extended periods. No drift channel is needed; the viewer is not a burn-in risk.

The `.is-expanded` state uses `position: fixed` (inherited from the existing `.version-overlay` rule) and vw/vh units. It is the only remaining vw/vh consumer other than the VersionOverlay; the Stage and all face elements continue to use px within the 1180x820 canvas.

## 4. Critical Bug Caught in Code Review

Code review identified a critical defect before merge: `VersionOverlay._show()` destroys and rebuilds the chip's DOM on every call. On a face that produces a tap event (e.g. the face surface under the viewer after a scroll gesture), `_show()` would be called while `_viewerMode` was true, blanking the viewer's entry list and collapsing it to the single-line chip state without closing properly.

Fix: one line added at the top of `_show()`:

```js
if (this._viewerMode) return;
```

This early return is the complete fix. When the viewer is open, `_show()` is a no-op, so no tap on the face surface can disturb the viewer DOM. The fix was applied before the implementation was considered complete; no separate patch is required.

## 5. Bundle Size

Phase 22 added approximately 8.3 KB uncompressed (`app.js` +206 lines, `style.css` +53 lines). The total bundle is now approximately 262.5 KB uncompressed. The 250 KB cap has been exceeded since Phase 20 (the full-stage SVG in `HorizonFace` pushed the total past 255 KB). Phase 22 widened the gap by another 8.3 KB. This is tracked as a standing item in `todo.md`. It is not a merge blocker; the cap is a target, not a hard constraint.

## 6. Out of Scope

- **Remote logging.** All captured data stays in localStorage on the device. No network call, no external service.
- **Clear UI.** There is no "clear log" button. The buffer rolls over automatically at 50 entries; to clear it manually, call `localStorage.removeItem('solari.errorLog')` from the DevTools console.
- **Filtering.** All error kinds are captured equally. No severity levels, no per-module filters.
- **Alerts or indicators.** No badge, no sound, no visual signal that errors have been captured. The viewer is hidden until explicitly summoned.
- **`clockface.js` changes.** The picker page benefits from `ErrorLog` capture because the module is installed above the boot guard, but `clockface.js` required no edits.

## 7. Acceptance Criteria

1. After a fresh load of `index.html`, `localStorage.getItem('solari.errorLog')` returns `null` or a valid JSON array.
2. A manually thrown `new Error('test')` from the DevTools console is captured and appears in the buffer within one event loop tick.
3. A rejected promise (`Promise.reject(new Error('test'))`) is captured with `kind: 'rejection'`.
4. The buffer never exceeds 50 entries when tested with more than 50 consecutive errors.
5. A long-press (600 ms) on the VersionOverlay chip opens the scrollable viewer. A tap outside the viewer closes it. A short tap on the chip does not open the viewer.
6. With the viewer open, tapping the face surface behind the viewer does not collapse or re-render the chip.
7. A tap on the moon disc (or face surface) while the viewer is open does not trigger the face-surface gesture handler's version-overlay logic (the `_show()` early return fires).
8. No new console errors appear during a 30-minute idle run on iPad Safari.
9. `window.ErrorLog.read()` returns the same array as the contents of `localStorage.getItem('solari.errorLog')` parsed as JSON.

## 8. References

- `app.js` -- `ErrorLog` module (above the `AppState` declaration); `VersionOverlay._attachChipLongPress`, `_openViewer`, `_renderViewer`, `_closeViewer`, `_viewerMode` flag.
- `style.css` -- `.version-overlay.is-visible`, `.version-overlay.is-expanded`, `.errorlog-*` rules.
- `todo.md` -- bundle size tracking item.
