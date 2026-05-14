# Phase 20.1 -- Horizon Lower-Right Overlap Fix

**Owner:** ariadne
**Date:** 2026-05-13
**Status:** Draft
**Scope:** Patch (single face, layout-only)
**Implementer:** misaka

## 1. Summary

Phase 20 shipped `HorizonFace` with a geometric mismatch between the 220 px Manrope 200 big-time block and its declared macro-shift homes. Coraline's audit (`/Users/jpaul/Documents/GitHub/solari/screenshots/horizon-overlap-audit/`) confirms the block renders at roughly 685 px wide, while `CONFIG.macroShift.timeHomesByFace.horizon = [[90, 560], [870, 560]]` was sized for a block of about 220 px. Home A clips the leading character off the left edge near x = -130; Home B stacks the big-time on top of `#hz-status` with a 309 x 130 px overlap.

Chihiro has ruled: collapse to a single home at `left: 140, top: 560` and relocate `#hz-status` from the bottom-right to the top-right, pairing it with the existing header strip. The 6 h macro-shift is retired for Horizon; per-element Perlin drift on the `time` channel remains the primary motion source for layer 4 burn-in coverage.

This incident is the origin of `docs/face-design-checklist.md`. The measurement miss (assumed ~220 px, actual ~685 px) is the canonical failure mode that item 1 of that checklist (measure rendered widths before layout lock) exists to prevent.

## 2. SDD References

- SDD Section 9 (burn-in protection, eight layers)
- SDD Section 22 (acceptance criteria)
- `docs/phase-20-horizon-face.md` (parent spec)

## 3. Problem Statement

Per coraline:

- `#hz-time` rendered width: ~685 px (measured on iPad Air M4 Safari 18, stage scale 1.0).
- Home A (`left: 90, top: 560`): leading "1" clipped at approximately x = -130 after drift + character metrics. Left edge of glyph escapes the stage box.
- Home B (`left: 870, top: 560`): right edge of block extends past the stage at ~1555 px; simultaneously overlaps `#hz-status` (anchored `right: 90, top: 580`, ~309 px wide x 130 px tall) by the full status footprint.

The implementing code already accounts for size mismatches in one place (`DriftEngine._elementSizesByFace.horizon.time = { hw: 260, hh: 110 }`), but the macro-shift homes table was authored against an earlier, narrower block estimate. The half-extent of 260 px is also short of the measured half-width (~342 px); the clamp computed for drift is not tight, but it does not cause the visible clip -- the clip is the macro-shift home position itself.

## 4. Design Ruling (Option D)

| Element       | Position                  | Notes                                                                 |
|---------------|---------------------------|-----------------------------------------------------------------------|
| `#hz-time`    | `left: 140, top: 560`     | Single fixed home. 220 px Manrope 200. Right edge ~825 px.            |
| `#hz-status`  | `top: 140, right: 60`     | Moved from bottom-right to top-right. Pairs with the header strip.    |
| `#hz-header`  | `top: 50, left/right: 80` | Unchanged. ~16 px line height; effective bottom ~66 px.               |

Status block now sits at top: 140. Header strip ends at approximately top: 66 px (50 px top + 16 px line-height). Gap between header bottom and status top is therefore ~74 px. Chihiro's "50 px gap" target is satisfied with margin.

## 5. CONFIG Diffs

```js
// app.js, CONFIG.macroShift block.

// Before:
timeHomesByFace: {
  ...
  horizon: [[90, 560], [870, 560]]
},
timeIntervalHoursByFace: {
  editorial: 6,
  horizon: 6
},
timeTransitionStyleByFace: {
  horizon: 'fade'
}

// After:
timeHomesByFace: {
  ...
  // Phase 20.1: collapsed to a single home after measured-width audit.
  // Home A (left=90) clipped the leading character; Home B (left=870)
  // overlapped #hz-status. left=140 centers the ~685 px block in the
  // lower band with both edges inside the stage and clear of the
  // relocated status block (now top-right).
  horizon: [[140, 560]]
},
timeIntervalHoursByFace: {
  editorial: 6,
  // Phase 20.1: 0 disables the macro-shift timer for Horizon.
  // Layer-4 burn-in coverage shifts entirely to per-element Perlin
  // drift on the `time` channel (117 s, 24/18 px amplitude).
  horizon: 0
},
timeTransitionStyleByFace: {
  // Phase 20.1: kept as a reserved hook for a future Horizon variant.
  // No longer fires because the homes array has length 1 and the
  // interval is 0; MacroShifter never schedules a shift for Horizon.
  horizon: 'fade'
}
```

`rightBlockHomesByFace` is not touched (no Horizon entry exists and none is added).

## 6. MacroShifter Guard

`MacroShifter.start()` reads `_timeIntervalHours()` and schedules `setInterval(this.shiftTime, intervalH * 60 * 60 * 1000)`. With `intervalH = 0`, the resulting interval is `0` ms. `setInterval` with `0` will fire as fast as the event loop allows -- a defect.

Add a single early-exit guard at the top of `MacroShifter.start()`, just after the `if (!CONFIG.macroShift.enabled) return;` line:

```js
start() {
  if (!CONFIG.macroShift.enabled) return;

  // Phase 20.1: per-face opt-out. A face with intervalH === 0 or a
  // single-entry homes array is treated as "no macro shift for time".
  // Initial _applyTime still runs so the boot home is placed; the
  // recurring setInterval is skipped. _applyMoon and the moon timer
  // are unaffected (Horizon has no moon disc anyway).
  var intervalH = this._timeIntervalHours();
  var timeHomes = this._timeHomes();
  var skipTimeShift = (intervalH <= 0) || (timeHomes.length <= 1);
  ...
}
```

Then gate the existing initial-index and `setInterval` blocks:

- Always run `_applyTime(false)` so the boot paint lands at the single home.
- Always run `_applyMoon(false)` and the moon `setInterval`.
- When `skipTimeShift` is true, do not compute `_timeIndex` from clock hour (set to 0 instead) and do not register `_timeTimerId`.

`shiftTime()` is unreachable for Horizon under this guard, so no further change is required there. `_applyTime()` continues to handle the initial paint correctly: `home = timeHomes[0]` resolves to `[140, 560]`, the pixel path runs via `_applyHome` with `unit = 'px'`, and the `time` drift anchor is updated for `DriftEngine`'s clamp.

## 7. HorizonFace Render-Path Changes

The status block is positioned entirely in CSS today (`#hz-status` rule in `style.css`). `HorizonFace._renderStatus()` writes only text content to child spans -- it does not set inline position styles. No JavaScript change is required inside `HorizonFace` for the status relocation; the CSS rule edit alone moves the block.

The big-time block similarly receives its position from CSS (`#hz-time { left: 90px; top: 560px }`) at boot, and from `MacroShifter._applyHome()` writing inline styles thereafter. Update the CSS default to match Home A so the first paint (before MacroShifter runs) lands at the correct position with no flash.

No other touchpoints in `HorizonFace.init`, `HorizonFace.render`, or sub-renderers.

## 8. CSS Diffs

```css
/* style.css, #hz-time rule. */
/* Before */
#hz-time {
  position: absolute;
  left: 90px;
  top: 560px;
  ...
}

/* After */
#hz-time {
  position: absolute;
  /* Phase 20.1: single home at left=140 (was 90; the prior value
     pre-dated a measured-width audit of the 220 px Manrope 200 block). */
  left: 140px;
  top: 560px;
  ...
}
```

```css
/* style.css, #hz-status rule. */
/* Before */
#hz-status {
  position: absolute;
  right: 90px;
  top: 580px;
  text-align: right;
  ...
}

/* After */
#hz-status {
  position: absolute;
  /* Phase 20.1: relocated from bottom-right to top-right to clear the
     220 px big-time block in the lower band. Pairs with #hz-header
     (top: 50) with a ~74 px gap. */
  right: 60px;
  top: 140px;
  text-align: right;
  ...
}
```

Cross-fade classes (`#hz-time.is-fade-out`, `#hz-time.is-fade-in`) remain in place untouched. They are reachable only via `MacroShifter._applyTimeFade()`, which is no longer invoked for Horizon under the guard above.

## 9. Burn-In Analysis

Phase 20 declared eight burn-in protection layers (SDD Section 9, `docs/phase-20-horizon-face.md` Section 12). This patch affects exactly one:

| Layer | Mechanism                                | Status after 20.1                                            |
|-------|------------------------------------------|--------------------------------------------------------------|
| 1     | Per-element Perlin drift                 | Unchanged. `time` channel 117 s, 24 x 18 px amplitude.       |
| 2     | Pixel-shift safety net (+/- 4 px / 6 min)| Unchanged.                                                   |
| 3     | Kinetic slot churn                       | Unchanged (Horizon does not paint the rotator slot).         |
| 4     | Macro position shifts                    | Degraded. Time element no longer relocates every 6 h.        |
| 5     | Sky-color modulation                     | Unchanged. `accentSkyTrack: false` preserved.                |
| 6     | Luminance breath                         | Unchanged.                                                   |
| 7     | Daily refresher at 03:00                 | Unchanged.                                                   |
| 8     | Rendering hygiene                        | Unchanged.                                                   |

Layer-4 coverage for the time element on Horizon is now zero. The remaining coverage comes from layer 1 (Perlin drift, +/- 24 x 18 px envelope around a fixed anchor at left=140, top=560) plus layer 2 (global 4 px shift on a 6 min cadence) plus layer 6 (luminance breath on the same pixels). At 220 px Manrope 200 weight, character stroke widths are ~3-4 px; the drift envelope shifts each lit pixel by roughly six stroke-widths in each axis over the 117 s cycle, with the 6 min global shift offsetting the centre by another 4 px. This is materially less protection than the 880 px home-to-home translation removed here, but it remains within the same order of magnitude as the per-element coverage that protected `#time` on Calm for V0 phases 1-15, which ran on the same iPad without burn-in over multi-day endurance tests.

No new drift sub-channel is introduced. If sentry's first endurance pass surfaces a hot pixel signature, the follow-up is to widen the `time` channel amplitude (e.g. ampX: 36, ampY: 27) rather than reintroduce a macro shift -- that decision is deferred and explicitly out of scope here.

## 10. Picker Preview Parity

`clockface.js` mounts the live Horizon preview via `window.HorizonFace.init(stage)` and then `window.HorizonFace.render(PREVIEW_STATE, tweaks)` (lines 234-243). The picker reuses the shipped face object, so:

- The CSS rule edits to `#hz-time` and `#hz-status` apply identically to the picker preview.
- The `MacroShifter` guard is not exercised in the picker (the picker does not start `MacroShifter`; it stages a static composition).
- Long-press target remains `#hz-time` -- unchanged ID, only the rendered position changed.

No `clockface.js` edits are required.

## 11. AppState and localStorage

`MacroShifter` does not persist `_timeIndex` to `localStorage` or `AppState`. No migration is required. Existing keys (`solari.clockface`, `solari.clockface.tweaks`, `solari.clockface.applied_at`) are untouched. The boot-time storage-event listener that reloads on clockface mutation continues to work without modification.

## 12. Alternatives Considered (rejected)

- **Shrink the big-time font from 220 px to ~140 px so the existing two-home layout fits.** Rejected: chihiro's Phase 20 spec locked 220 px Manrope 200 as the face signature; a 36% reduction redefines the face.
- **Translate the time block at the CSS level (e.g. `transform: translate(-50%, 0)` for centre-anchoring) so the existing homes resolve correctly.** Rejected: would require auditing every `MacroShifter._applyHome` consumer that assumes top-left pixel anchoring, plus updating `DriftEngine._elementSizesByFace.horizon.time` half-extents and the anchor-percent seeding in `DriftEngine.start()`. Higher blast radius for the same visual outcome.
- **Keep both homes; move Home B leftward to clear status.** Rejected: with a 685 px block, the only Home B that fits with status at bottom-right is one indistinguishable from Home A (centre x within ~50 px). The macro-shift loses its burn-in value when the two homes nearly overlap.

## 13. Reliability and Failure Modes

- **Initial paint at boot.** `_applyTime(false)` runs once in `MacroShifter.start()` regardless of the new guard, writing `left: 140px; top: 560px` inline. The CSS default now matches, so a worst-case race where `MacroShifter.start()` is delayed still paints at the correct position.
- **Face switch into Horizon.** `MacroShifter.start()` is called once at boot; face switches go via `location.reload()` (storage-event listener). No partial-state risk.
- **`setInterval(0)` regression.** Prevented by the guard. Adding a test in misaka's implementation pass (manual console check: `MacroShifter._timeTimerId === null` while Horizon is active) is sufficient.
- **DriftEngine clamp accuracy.** `_elementSizesByFace.horizon.time = { hw: 260, hh: 110 }` still understates the true half-width (~342 x 110). The clamp will allow drift past the right stage edge by up to ~82 px. Within the 24 px X amplitude this is comfortably inside the stage (140 + 685 + 24 = 849 < 1180). Not fixed in this patch; flagged in Open Questions.

## 14. Acceptance Criteria

All criteria are testable on iPad Air M4 Safari 18 against a fresh master build.

1. With Horizon active, `#hz-time` renders with its left edge at stage-pixel x = 140 (+/- 2 px allowance for sub-pixel rounding) and its full character set visible inside the stage box.
2. `#hz-status` renders top-right with its top edge at stage-pixel y = 140 and its right edge at stage-pixel x = 1120 (stage width 1180 minus 60 px right inset).
3. The header strip (`#hz-header`) is unmodified; its top edge is still at y = 50.
4. No DOM elements overlap. Specifically, the bounding box of `#hz-time` (x: 140-825, y: 560-680) does not intersect the bounding box of `#hz-status` (x: ~811-1120, y: 140-270).
5. The console log shows no `setInterval` registered for time macro-shift while Horizon is active (`MacroShifter._timeTimerId` is `null`).
6. The picker page (`clockface.html`) Horizon card renders the big-time at left=140 and the status block at top-right with the same geometry as the main display, scaled by the card's preview transform.
7. Long-press on `#hz-time` (600 ms) opens the picker; single tap opens VersionOverlay. Both interactions unchanged.
8. Coraline's screenshot suite re-run produces no `time-overlap-status` or `time-clip-left` flags.
9. After a 24 h endurance run on the branch, sentry reports no new hot-pixel signature around the `#hz-time` bounding box compared to the Phase 20 baseline.

Acceptance criteria 9 is informational; it is not a merge gate but should be tracked in the phase-20.1 verification log.

## 15. Out of Scope

Explicit non-goals for this patch:

- **Font size change.** 220 px Manrope 200 is preserved.
- **New drift channels or sub-channels.** The `time` channel runs at its existing 117 s period and 24 x 18 px amplitude.
- **Cross-fade vocabulary removal.** `timeTransitionStyleByFace.horizon = 'fade'` and the `is-fade-out` / `is-fade-in` CSS classes remain as a reserved hook for a future Horizon variant. They are unreachable in 20.1 because `MacroShifter` never schedules a shift for Horizon.
- **Tightening `DriftEngine._elementSizesByFace.horizon.time` half-extents.** The existing 260 x 110 understates the measured width but does not cause a visible defect; deferred to a future tuning pass.
- **Reordering status block contents.** Headline, golden hour, moon, tide, AQI line up in the same order as Phase 20; only the block's anchor changed.
- **`#hz-status` typography (font, size, line-height, letter-spacing).** Unchanged.
- **Burn-in compensation for layer-4 loss beyond what existing drift provides.** A widened drift amplitude is the documented future move if endurance flags a problem; not pre-emptively applied here.

## 16. Open Questions

1. **DriftEngine clamp half-extent.** `_elementSizesByFace.horizon.time.hw = 260` is short of the measured ~342 px half-width. Should we update it to 343 in the same patch, or leave it for a separate tuning pass? Recommendation: leave it; the current understatement is harmless at the new single-home position.
2. **Status block top inset.** Chihiro called out `top: 140`. The header bottom sits near y = 66, so the gap is ~74 px rather than the stated ~50 px. Should we tighten the status to `top: 116` to land the 50 px gap precisely, or keep 140 for visual breathing room? Recommendation: keep 140; the larger gap improves the magazine-cover pairing with the header strip and there is no cost in stage real estate.

## 17. Phase Dependencies

- **Requires:** Phase 20 (`HorizonFace`, `MacroShifter` cross-fade path, `CONFIG.macroShift.timeTransitionStyleByFace`) merged at `phase-20` tag.
- **Unblocks:** No downstream phase depends on 20.1. V1 face shipping is complete after this patch.

## 18. Rollout

Standard pipeline: phase branch `phase-20.1-horizon-overlap-fix`, misaka implements, mikasa simplifies, hermione reviews, shizuku updates `CLAUDE.md` (note that horizon time macro-shift is now disabled and explain the per-face skip path in MacroShifter), coraline re-runs screenshot audit, sentry endurance pass optional, leia merges to master with `--no-ff` and tags `phase-20.1`.

## 19. References

- `docs/phase-20-horizon-face.md` -- parent spec.
- `app.js` lines 127-154 -- `CONFIG.macroShift` block.
- `app.js` lines 1631-1862 -- `MacroShifter` module.
- `app.js` lines 3985-4218 -- `HorizonFace` definition.
- `style.css` lines 744-911 -- Horizon CSS rules.
- `clockface.js` lines 234-243, 470-471 -- picker live preview for Horizon.
- Coraline screenshots: `screenshots/horizon-overlap-audit/01-initial-state.png`, `screenshots/horizon-overlap-audit/02-home-A-bottom-left.png`.
- SDD v0.5 Section 9 (burn-in protection); Section 22 (acceptance criteria).

## 20. Post-V1 housekeeping (2026-05-14)

After this spec shipped, Motoko's first retrospective audit (2026-05-14) identified the reserved cross-fade vocabulary as named drift -- a face-local transition primitive declared in three files with no runtime that exercised it. Ripley triaged the finding as a delete-now cleanup. The following were removed from the codebase on 2026-05-14:

- `CONFIG.macroShift.timeTransitionStyleByFace` (`app.js`)
- `MacroShifter._timeTransitionStyle()` (`app.js`)
- `MacroShifter._applyTimeFade()` and the `_fadeStep1Id` / `_fadeStep2Id` guards (`app.js`)
- The `if (... === 'fade')` branch inside `MacroShifter._applyTime()` (`app.js`)
- `#hz-time.is-fade-out` and `#hz-time.is-fade-in` CSS rules (`style.css`)

Bundle delta: -2,979 bytes (`app.js` -2,697, `style.css` -282). The translate transition path is unchanged. Section 4.3 above and the Section 15 "Cross-fade vocabulary removal" out-of-scope item record what the 20.1 patch shipped; this section records what was removed shortly after. If a future Horizon variant needs a cross-fade big-time transition, the vocabulary should be reintroduced fresh against that face's spec rather than carried forward as dead code.
