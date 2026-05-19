# Phase 24 -- Discovery Polish (Meteor Whisper, Face Shuffle, Calm Pulse)

**Date:** 2026-05-18
**Status:** Shipped 2026-05-19
**Scope:** Three small-effort polish features, bundled for one design pass and one pipeline run
**Branch:** `phase-24-discovery-polish`

## 1. Summary

Phase 24 ships three independent micro-features that share a single design lock and a single delivery cycle.

The first is a **meteor-shower whisper**. On the nights of a tracked meteor peak, Editorial's italic dropline reads "<Shower> meteor shower, peak tonight." between 22:00 and 04:00 local Vancouver time. The whisper reuses Editorial's existing light-observance render path; no new dropline variant is introduced. Observance treatments retain precedence: when a same-day observance is active, the whisper is suppressed.

The second is **boot-time face shuffle**. A new localStorage key, `solari.shuffle`, can be set to `weekday` or `random` (default `off`). On cold boot or 03:00 soft reload, the boot IIFE resolves the active face from the shuffle mode and writes the result to `solari.clockface` before `ClockfaceRegistry` reads it. Weekday mode maps day-of-week to face; random mode picks uniformly from `{calm, mechanical, departures, horizon}` excluding the last pick. A picker Apply within the prior six hours overrides the next shuffle so deliberate user choices survive same-day reloads.

The third is a **first-boot Calm pulse**. The first time Calm is the active face after a cold boot on a given install, `#moon-disc` dims to 0.55 opacity and returns to 1.0 over 1600 ms. The pulse fires once per install (gated by `solari.firstBoot.calmPulseShown`) and is suppressed under the picker boot guard.

## 2. Motivation

These three items were sitting at the top of the post-V1 polish list. Each is small enough that splitting them across three phases would carry more ceremony than implementation. Bundling them into one design lock keeps the three feature boundaries well-defined (observance precedence, shuffle persistence, pulse gating) and lets a single visual review cover all three surfaces in one sitting.

The shared bundle is also a defensive choice. The three features touch three different parts of the boot path -- `ObservanceModule`, the boot IIFE, and `CalmFace.init` -- and a single change list keeps the cross-cutting interaction matrix (Section 7) coherent. Splitting them would invite drift in those interactions.

## 3. Locked Decisions

All design decisions are locked. Chihiro did not save a Phase 24 design-language memory file; the locks below are the source of truth for this phase.

### 3.1 Meteor-shower whisper

| Lock | Value |
|---|---|
| String template | `"<Shower name> meteor shower, peak tonight."` |
| Time window | 22:00 → 04:00 local Vancouver time |
| Window identity | the night is identified by the date at 22:00 |
| Multi-night handling | per-entry `peakStart` / `peakEnd` in `data/almanac.json` (ISO date, inclusive) |
| Default window when fields absent | `peakStart = peakEnd = date` (single-night) |
| Default windows | Perseids 3, Geminids 3, Quadrantids 1, Lyrids 2, Eta Aquariids 3, Orionids 3 |
| Observance precedence | observance always wins; whisper suppressed when `AppState.observance !== null` |
| AppState field | `AppState.meteorWhisper` (new) |
| Whisper shape | `{ treatment: 'light', name_long: '<string>' }` |
| Render branch reuse | Editorial reads `AppState.observance || AppState.meteorWhisper`; no new dropline branch |
| Face scope | Editorial-only; other faces render no dropline |
| Cadence | written on each `ObservanceModule.update()` tick (existing daily-at-midnight + on-boot cadence) |

### 3.2 Boot-time face shuffle

| Lock | Value |
|---|---|
| Storage key | `solari.shuffle` |
| URL override | `?shuffle=<mode>` query parameter |
| Valid modes | `off` (default), `weekday`, `random` |
| Invalid mode handling | fall back to `off`, emit `console.warn` |
| Weekday map | Mon=mechanical, Tue=departures, Wed=horizon, Thu=mechanical, Fri=departures, Sat=calm, Sun=calm |
| Random pool | `{calm, mechanical, departures, horizon} \ {lastPicked}` |
| Last-pick key | `solari.shuffle.lastPicked` |
| Last-pick fallback | if unset or invalid, pick uniformly from the full four |
| Editorial inclusion | excluded from both pools in V1 (revisit when Editorial is promoted in V2) |
| Resolve point | inside the existing boot IIFE, before `ClockfaceRegistry.resolve()` |
| Write targets at resolve | `solari.clockface` (always), `solari.shuffle.lastPicked` (random only) |
| Reload safety | same-tab `setItem` does not fire the cross-tab storage listener; no reload loop |
| User-override key | `solari.shuffle.overrideUntilNextBoot` |
| Override write | picker Apply writes `Date.now()` as ISO string when persisting `solari.clockface` |
| Override interpretation | shuffle skipped on the next boot if override timestamp is within 6 hours; otherwise cleared and shuffle proceeds |
| Default-face fallback | `ClockfaceRegistry.resolve()` already falls back to `calm` on invalid input; relied on, not re-implemented |
| Persistence model | resolved once per cold boot or 03:00 soft reload |

The 6-hour grace window is the explicit disambiguation of "next boot." Manual picks survive the rest of the day; the morning 03:00 reload (which sits >6 h after most evening picks) re-shuffles. This is documented behaviour, not a bug.

### 3.3 First-boot Calm pulse

| Lock | Value |
|---|---|
| Target element | `#moon-disc` |
| Visual treatment | opacity flicker only -- no ring, no halo, no expansion, no colour change |
| Opacity path | 1.0 → 0.55 → 1.0 |
| Total duration | 1600 ms (800 ms down + 800 ms up) |
| Timing function | `cubic-bezier(0.4, 0, 0.2, 1)` on a `transition: opacity 800ms` |
| CSS class | `.is-first-pulse` |
| JS sequence | two RAFs: first flips opacity to 0.55; second (after `transitionend`) flips back to 1.0; class removed on the second `transitionend` |
| Gate key | `solari.firstBoot.calmPulseShown` -- set to `'1'` on `requestAnimationFrame` after Calm's first paint, before the pulse begins |
| Re-fire policy | never; clear localStorage manually to replay |
| Face scope | Calm only; no other face fires the pulse |
| Picker behaviour | suppressed under `SOLARI_PICKER` (boot IIFE returns early; `CalmFace.init` not invoked in picker context) |
| Drift interaction | drift continues unchanged through the pulse window |
| Refresher interaction | the 03:00 soft reload is a fresh page load; if key is `'1'`, pulse does not fire |

### 3.4 Cross-cutting

- Observance > meteor whisper, always.
- Golden-hour and meteor-whisper windows do not overlap. The whisper window (22:00-04:00) sits well outside the `[-6°, +6°]` altitude band at Vancouver latitudes.
- Shuffle is boot-time only; pulse is opacity-only. Neither competes with golden-hour accent modulation (different property surface).
- Refresher cycle (03:00) interaction:
  - Whisper: unaffected. The 30 s mid-gray hold fades the whole stage; the whisper fades with it.
  - Shuffle: re-resolves at 03:00 soft reload. This is the intended rollover mechanism for weekday mode.
  - Pulse: 03:00 soft reload is a fresh page load. If `solari.firstBoot.calmPulseShown === '1'`, the pulse does not fire.

## 4. Architecture and Module Changes

### 4.1 Meteor whisper -- `ObservanceModule` extension

The whisper lives inside `ObservanceModule` rather than a new top-level module. The almanac entries it consults are already loaded by `ObservanceModule.init()`; no second loader is justified.

New private helper:

- `_meteorWhisperFor(now)` -- returns `{ treatment: 'light', name_long: '<string>' } | null`. Reads the cached almanac entries, identifies the "night" by the date at 22:00 local (rolling 04:00 back to the previous date), filters entries to those with a shower keyword in `name`, and checks `peakStart <= night <= peakEnd`.

  Signature: `_meteorWhisperFor: function(Date) -> object | null`

- `_isShowerEntry(entry)` -- returns true for entries whose `name` matches the case-insensitive pattern `/(QUADRANTID|LYRID|ETA AQUARIID|PERSEID|ORIONID|GEMINID)\s+PEAK/`. Eclipses are excluded.

  Signature: `_isShowerEntry: function(object) -> boolean`

- `_nightDate(now)` -- returns the YYYY-MM-DD string identifying the night that `now` belongs to. Between 04:00 and 21:59 inclusive, the night has not yet started; the helper returns the current date but the whisper is gated on the 22:00-04:00 window separately. Between 22:00 and 23:59, returns today. Between 00:00 and 03:59, returns yesterday.

  Signature: `_nightDate: function(Date) -> string`

Update path in `ObservanceModule.update()`:

1. Compute observance as today (existing logic). Write to `AppState.observance`.
2. After step 1, if `AppState.observance === null`, evaluate `_meteorWhisperFor(now)` and assign to `AppState.meteorWhisper`. Otherwise assign `null`.

The Editorial render branch is updated to read `AppState.observance || AppState.meteorWhisper`. The branch is otherwise unchanged: both objects have the same shape (`treatment: 'light'`, `name_long: '<string>'`).

`name_long` mapping (resolved at almanac load):

| Almanac `name` | Whisper `name_long` |
|---|---|
| `QUADRANTID PEAK` | `"Quadrantid meteor shower, peak tonight."` |
| `LYRID PEAK` | `"Lyrid meteor shower, peak tonight."` |
| `ETA AQUARIID PEAK` | `"Eta Aquariid meteor shower, peak tonight."` |
| `PERSEID PEAK` | `"Perseid meteor shower, peak tonight."` |
| `ORIONID PEAK` | `"Orionid meteor shower, peak tonight."` |
| `GEMINID PEAK` | `"Geminid meteor shower, peak tonight."` |

The mapping is hardcoded in `ObservanceModule._meteorWhisperFor` rather than added to the JSON, to keep the JSON shape minimal and to avoid duplicating the string across years.

### 4.2 Face shuffle -- boot IIFE inline

No new module class. The resolution is approximately 30 lines added to the boot IIFE, immediately above the `ClockfaceRegistry.resolve()` call.

Resolution order:

1. Read `solari.shuffle.overrideUntilNextBoot`. Parse as a date. If parse succeeds and `Date.now() - parsed < 6 * 60 * 60 * 1000`, skip shuffle entirely and proceed to `ClockfaceRegistry.resolve()` with the existing `solari.clockface` value. Otherwise remove the override key.
2. Read `solari.shuffle` and `?shuffle=` query parameter. URL takes precedence; URL value is also written to `solari.shuffle` for consistency on subsequent boots.
3. If mode is `off` or invalid, log on invalid and return without writing `solari.clockface`.
4. If mode is `weekday`, look up day-of-week (local Vancouver time) in the weekday map and write the result to `solari.clockface`.
5. If mode is `random`, read `solari.shuffle.lastPicked`. Build the candidate set `{calm, mechanical, departures, horizon}` minus the last pick (if valid). Pick uniformly. Write to `solari.clockface` and `solari.shuffle.lastPicked`.

Picker (`clockface.js`) addition:

- On Apply (the existing handler that writes `solari.clockface` and `solari.clockface.tweaks`), also write `solari.shuffle.overrideUntilNextBoot = new Date().toISOString()`. Single new line, adjacent to the existing storage writes.

### 4.3 Calm pulse -- `CalmFace.init` extension

The pulse is implemented inside `CalmFace.init` as a small inline routine. No new module is justified for a 1600 ms one-shot.

New private helper on `CalmFace`:

- `_maybeFirstPulse()` -- checks `solari.firstBoot.calmPulseShown`. If unset, schedules the pulse on `requestAnimationFrame` after Calm's first paint. Sets the key to `'1'` immediately before the first opacity write, so a crash mid-pulse does not re-fire on the next boot.

  Signature: `_maybeFirstPulse: function() -> void`

- `_runPulse(el)` -- adds the `.is-first-pulse` class to `el`, flips `el.style.opacity` to `'0.55'`, listens once for `transitionend`, flips to `'1.0'`, listens once more for `transitionend`, removes the class and cleans up the inline style.

  Signature: `_runPulse: function(HTMLElement) -> void`

Call site: `CalmFace.init` ends with `_maybeFirstPulse()` after the existing DOM setup. The picker path never invokes `CalmFace.init` because the boot IIFE returns early under `SOLARI_PICKER`, so the gate is structurally enforced and does not require a runtime check.

**MacroShifter cascade interaction (resolved pre-merge).** `MacroShifter` writes `transition: none` as an inline style on the time block each time it repositions an element. Inline styles win the CSS cascade, so a CSS class rule like `#moon-disc.is-first-pulse { transition: opacity 800ms ... }` is silently blocked when any inline `transition` was previously set on the element. The original implementation relied on the CSS class rule alone and the pulse stuck permanently at 0.55 opacity.

The fix: `_runPulse` writes `style.transition = 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)'` directly as an inline style before the first opacity write, overriding whatever `MacroShifter` left behind. Two `requestAnimationFrame` calls are used in sequence -- the first RAF lets the inline `transition` declaration settle into the style engine; the second RAF writes `style.opacity = '0.55'` so the engine sees the transition already declared when the property changes. Without the two-RAF sequencing, the engine may treat the transition and opacity change as simultaneous and skip the animation. The CSS class rule in `style.css` is retained for clarity but is not the active mechanism in practice.

## 5. Data Shape Changes

### 5.1 `data/almanac.json` shower entries

Three new optional fields per shower entry: `peakStart`, `peakEnd`, `name_long`. All three are optional; absent fields default as documented in Section 3.1.

Example -- Perseid 2026 entry, before and after:

```json
// before
{ "name": "PERSEID PEAK", "date": "2026-08-12", "recurs": false }

// after
{
  "name": "PERSEID PEAK",
  "date": "2026-08-12",
  "peakStart": "2026-08-11",
  "peakEnd": "2026-08-13",
  "recurs": false
}
```

The `name_long` field is reserved for the JSON but not consumed in V1 -- the long form is resolved from the `name` mapping table in Section 4.1. Listing the field as reserved keeps the JSON schema forward-compatible for a future V2 author who may want to override per-year wording.

### 5.2 AppState additions

```
AppState.meteorWhisper: null | { treatment: 'light', name_long: string }
```

Written by `ObservanceModule.update()`. Read by Editorial's render path.

### 5.3 localStorage keys

Five new keys, all string-typed:

| Key | Writer | Reader | Lifetime |
|---|---|---|---|
| `solari.shuffle` | user (manual or URL param) | boot IIFE | persistent until cleared |
| `solari.shuffle.lastPicked` | boot IIFE (random mode only) | boot IIFE | persistent; updated per random boot |
| `solari.shuffle.overrideUntilNextBoot` | picker Apply | boot IIFE | cleared on read when older than 6 h |
| `solari.firstBoot.calmPulseShown` | `CalmFace._maybeFirstPulse` | `CalmFace._maybeFirstPulse` | persistent; clear manually to replay |

The keys are namespaced consistently with existing Solari keys (`solari.clockface`, `solari.clockface.tweaks`, `solari.errorLog`).

Storage listener: the boot IIFE writes to `solari.clockface` from the same tab; the existing same-tab-suppressed storage listener does not fire on these writes. No reload loop is introduced. (The `storage` event only fires in *other* tabs of the same origin, per the DOM spec.)

## 6. CSS and Token Model

One new rule in `style.css`:

```css
#moon-disc.is-first-pulse {
  transition: opacity 800ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

No new custom properties. No new tokens. The whisper renders through Editorial's existing dropline styles (no change). The shuffle is selection logic and has no CSS surface.

## 7. Cadence and Interaction Matrix

| Phase 24 feature | ObservanceModule | RotatorModule | MacroShifter | DriftEngine | RefresherCycle | ClockfaceRegistry | SkyColorModule |
|---|---|---|---|---|---|---|---|
| Meteor whisper | extends (writes `AppState.meteorWhisper` after observance write, gated on null observance) | no interaction | no interaction | no interaction (text lives in dropline zone, already drift-protected) | fades with the stage like any visible text | no interaction | no interaction |
| Face shuffle | no interaction | no interaction (selected face determines whether rotator runs) | no interaction (selected face determines macro home table) | no interaction (selected face determines drift channel set) | re-resolves at 03:00 soft reload | runs before `resolve()`; writes `solari.clockface` | no interaction |
| Calm pulse | no interaction | no interaction (Calm has no rotator slot in V1) | no interaction (the pulse targets `#moon-disc`, not the time block) | no interaction (drift continues through the pulse window) | suppressed if key is already `'1'` at next boot | invoked from inside `CalmFace.init` (Calm path only) | no interaction (opacity vs token) |

All three features write at most once per relevant tick, and none of the three writes overlap.

## 8. Burn-In Posture

The eight SDD Section 9 layers are evaluated against each Phase 24 feature.

| Layer | Mechanism | Whisper | Shuffle | Pulse |
|---|---|---|---|---|
| 1 | Per-element Perlin drift | unchanged (whisper text lives in existing dropline element, already drift-channelled) | unchanged | unchanged (drift continues through 1600 ms) |
| 2 | Pixel-shift safety net | unchanged | unchanged | unchanged |
| 3 | Kinetic slot churn | unchanged | unchanged | unchanged |
| 4 | Macro position shifts | unchanged | unchanged (selected face governs its own macro table) | unchanged |
| 5 | Sky-color modulation | unchanged | unchanged | unchanged |
| 6 | Luminance breath | unchanged | unchanged | unchanged |
| 7 | Daily refresher at 03:00 | unchanged | re-resolves shuffle (intended rollover) | gate persists across the reload |
| 8 | Rendering hygiene | unchanged (text is weight 200 italic, no solid block) | unchanged | one-shot 1600 ms; no fixed-pixel hold |

None of the eight layers regresses. The pulse is short and one-shot; the whisper is text in an already-protected zone; the shuffle is selection logic with no rendering footprint.

## 9. Acceptance Criteria

All testable on iPad Air M4 Safari 18 with the indicated face and clock condition.

1. On a Perseid peak night (2026-08-12 22:30 local Vancouver) with Editorial active, the dropline reads `Perseid meteor shower, peak tonight.`
2. On 2026-08-12 21:00 local with Editorial active and no same-day observance, the dropline is empty (the whisper window has not opened).
3. On 2026-08-15 22:30 local with Editorial active, the dropline is empty (out of `peakStart`/`peakEnd`).
4. With Calm, Mechanical, Departures, or Horizon active during a Perseid peak window, no dropline appears on any face other than Editorial.
5. On a date that carries a same-day observance and a meteor peak, the observance takes precedence and the whisper is suppressed. Note: the 2026-08-12 Total Solar Eclipse is an almanac entry, not a Solari observance -- `AppState.observance` is null on that date in V1, so the Perseid whisper fires normally. Adding the eclipse as a custom observance (so it suppresses the whisper) is a V2 follow-up; see Section 11.
6. With `solari.shuffle === 'weekday'` on a Wednesday cold boot, `solari.clockface` is written to `horizon` before `ClockfaceRegistry.resolve()` reads it, and Horizon is the active face.
7. With `solari.shuffle === 'random'` and `solari.shuffle.lastPicked === 'calm'`, the boot resolution picks a face from `{mechanical, departures, horizon}`.
8. With `solari.shuffle === 'random'` and `solari.shuffle.lastPicked` unset, the resolution picks from the full four `{calm, mechanical, departures, horizon}`.
9. With `solari.shuffle === 'foo'`, the boot logs `console.warn` and proceeds as `off`. `solari.clockface` is not overwritten by shuffle.
10. With `?shuffle=weekday` in the URL, the value is written to `solari.shuffle` and the weekday resolution proceeds.
11. After the picker writes `solari.clockface` from a user Apply, `solari.shuffle.overrideUntilNextBoot` is set to the current ISO timestamp.
12. With `solari.shuffle === 'weekday'` and `solari.shuffle.overrideUntilNextBoot` set to 2 hours ago, the boot does not shuffle and `solari.clockface` retains the user's prior pick.
13. With `solari.shuffle === 'weekday'` and `solari.shuffle.overrideUntilNextBoot` set to 7 hours ago, the boot clears the override key and shuffle proceeds normally.
14. On first cold boot with `solari.firstBoot.calmPulseShown` unset and Calm active, `#moon-disc` opacity transitions 1.0 → 0.55 → 1.0 within ~1600 ms of first paint. After the pulse, `solari.firstBoot.calmPulseShown === '1'`.
15. On a second cold boot with the key set, no pulse fires; `#moon-disc` holds opacity 1.0 from first paint.
16. With Mechanical, Departures, or Horizon the first face shown (e.g. shuffle resolved away from Calm), no pulse fires on those faces. If the user later switches to Calm via the picker, the pulse fires at that point (Calm-first paint, key still unset).
17. Picker preview never fires the pulse, regardless of key state.
18. Bundle size (`wc -c app.js style.css data/almanac.json lib/*.js`) is within +10 KB of the pre-phase value. Actual delta: 231,986 → 240,360 bytes (+8.2 KB across three features).
19. No new console errors or unhandled rejections appear during a 30-minute idle run on iPad Safari.

## 10. Visual Review Notes

Six risk areas to capture and verify.

1. **Whisper voice drift.** Editorial dropline width on a Perseid night (`Perseid meteor shower, peak tonight.` ≈ 32 chars) vs the typical observance dropline (e.g. an equinox observance ≈ 18 chars). Confirm no wrap or right-edge overflow at the dropline's home position. This is checklist item 1 (measured rendered width) applied to the whisper.
2. **Whisper appearing on the wrong face.** Capture Calm, Mechanical, Departures, and Horizon during a confirmed peak window. Confirm no dropline appears on any of them.
3. **Shuffle silently overriding a deliberate pick.** Verify the 6-hour grace window: pick a face at 19:00, reload at 20:00 -- should remain the picked face. Pick at 19:00, wait until 03:00 soft reload -- should re-shuffle. Document any case where a user-meaningful pick is lost.
4. **Calm pulse competing with the time fulcrum.** At the canonical 2-6 m viewing distance, confirm the pulse reads as a soft moon-breath, not a flash. If the moon disc reads as flashing, raise the opacity floor (0.55 → 0.7) or extend the duration (1600 → 2000 ms). This is checklist item 2 (fulcrum) applied to Calm: the time numerals must remain the first thing the eye lands on.
5. **Calm pulse firing when it should not.** Verify: second cold boot does not fire; picker preview does not fire; Calm-via-shuffle on a weekday Saturday (where Calm is the shuffled face) does fire if the key is still unset.
6. **Same-tab storage write reload loop.** Confirm the shuffle's boot-time write to `solari.clockface` does not trigger the cross-tab storage listener and does not reload the page.

## 11. Out of Scope

- **No shuffle picker UI.** Shuffle is set via localStorage or URL parameter. The picker does not gain a shuffle control in V1.
- **No whisper on non-Editorial faces.** Other faces do not render a dropline today and Phase 24 does not change that.
- **No pulse on non-Calm faces.** Each face is responsible for its own first-paint discovery affordance, if any. V1 ships one (Calm).
- **No "disable shuffle on any manual pick" mode.** The 6-hour grace is the disambiguation; a permanent disable mode is V2 if requested.
- **No telemetry.** The pulse, the shuffle resolution, and the whisper activation are not logged anywhere.
- **No "show pulse again" affordance.** To replay, clear `solari.firstBoot.calmPulseShown` from DevTools.
- **No Editorial promotion into the shuffle pools.** Editorial is excluded from both `weekday` and `random` pools in V1. V2 revisits.
- **No per-shower override of the whisper string.** The mapping table in Section 4.1 is the V1 voice.
- **Eclipse-as-observance (V2 follow-up).** Adding 2026-08-12 Total Solar Eclipse (and other almanac eclipses) to `ObservanceModule._builtIn` would make the eclipse suppress the Perseid whisper via the normal observance-precedence path. The implementation cost is small (~6 entries from almanac.json), but the design call on treatment level (major vs light) is deferred to V2. Acceptance criterion 5 documents the current V1 behavior.

## 12. Phase Dependencies

| Required | Phase | Reason |
|---|---|---|
| Observance system + dropline render | 15, 19 | Whisper reuses the light-observance + `name_long` render branch in Editorial. |
| Face registry + storage contract | 16 | Shuffle writes `solari.clockface` and relies on `ClockfaceRegistry.resolve()` for invalid-id fallback. |
| Almanac loader | 11 | Meteor whisper consumes the existing almanac entries; no second loader. |
| Picker boot guard | 17 | Calm pulse relies on the `SOLARI_PICKER` early-return to suppress under preview. |

All four dependencies have shipped.

## 13. Rollout

Standard pipeline:

1. misaka -- implement against this spec
2. mikasa -- simplification pass (dead code, premature abstractions)
3. hermione -- code review (burn-in, spec adherence, bundle audit)
4. coraline -- visual review (three visible surfaces; the six risk areas in Section 10)
5. shizuku -- update CLAUDE.md (`AppState.meteorWhisper`, new localStorage keys, `_meteorWhisperFor` helper, `_maybeFirstPulse` helper)
6. leia -- merge to master with `git merge --no-ff`, tag `phase-24`, push

Direct-to-master is the established project workflow. Master auto-deploys to GitHub Pages; a bad merge is visible within minutes.

## 14. Open Questions

None. All three feature locks are explicit. The 6-hour shuffle grace is documented as the chosen disambiguation of "next boot."

## 15. References

- `docs/face-design-checklist.md` -- items 1 (measured width) and 2 (fulcrum) apply to coraline's review of whisper width and pulse-vs-time legibility.
- `docs/phase-15-observances.md` -- observance treatment system the whisper reuses.
- `docs/phase-16-clockface-foundation.md` -- face registry, storage contract, `solari.clockface` semantics.
- `docs/phase-19-editorial-face.md` -- dropline render path and `name_long` consumption.
- `docs/phase-11-almanac.md` -- almanac loader and entry shape.
- SDD Section 9 -- burn-in protection layers.
- SDD Section 22 -- acceptance test methodology.
