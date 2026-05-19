# Phase 25 -- Horizon Arc Trails

**Date:** 2026-05-19
**Status:** Complete
**Scope:** Single face (Horizon only). No new modules, no new drift channels, no new CSS animation primitives.
**Branch:** `phase-25-horizon-arc-trails`

## 1. Goal

Phase 25 enriches the Horizon face by drawing the elapsed travel of the sun and moon. Each body's dashed arc gains a solid, fading trail that begins at the rise point on the horizon line and ends at the body's current disc position. The trail grows naturally with the disc and dissolves toward the rise end. The face reads as a record of the day's travel, not a forecast.

Coraline's Phase 20 visual review and Joshua's day-of-use observation both surfaced the same gap: Horizon's arcs read as ambient scenery, with no immediate visual reference to where the sun and moon already are on their daily paths. The arc tells you the shape of the day; it does not tell you how much of it has already passed. The trail closes that gap by giving each body a recent past.

## 2. Background

Horizon (Phase 20, refined in Phase 20.1) is the V1 astronomy-truth face. It renders a fixed 1180x820 SVG diagram with:

- A 1 px solid horizon line at `y = 440`.
- 25 dashed hour ticks below the horizon line.
- Two dashed quadratic Bezier arcs (sun, moon) traversing from rise point through peak altitude to set point.
- Live discs on the arcs, positioned by the same `p` parameter that traces the Bezier.
- A 1 px gold hairline cursor marking the current minute.
- A 220 px Manrope 200 big-time block at the single home `left:140, top:560` (Phase 20.1 collapse).
- A status block in the top-right (Phase 20.1 relocation).

What is missing today: the live discs convey position, and the arcs convey path, but the eye has no way to tell at a glance how much of the path each body has already covered. The fulcrum (the diagram) does its job; the trail extends it.

Phase 25 introduces a recessive emphasis primitive scoped to celestial bodies. The trail rides Horizon's existing infrastructure: same SVG group, same drift channel, same per-tick render path. Scope is contained to `HorizonFace` in `app.js` and a small CSS rule set in `style.css` if any.

## 3. The Change

Each body's arc gains a second path: solid, 1.5 px wide, drawn from the rise point on the horizon line to the body's current disc position. The trail follows the same quadratic Bezier shape as the arc, truncated at parameter `p` (the same `p` the existing renderer uses to position the disc). It is rendered under the arc, the ticks, and the cursor; the dashed arc paints over it.

The trail's opacity is linear-gradient along the path: `0.10` at the rise endpoint and `0.32` at the disc endpoint. Sun colour is fixed at `#F4C56C`; moon colour is fixed at `#A8C7FF`. Colours live as `stop-color` inside SVG `<linearGradient>` definitions, not as CSS variables. The trail does not respond to `--type-accent`, golden-hour modulation, observance palette, or any sky token. This extends Horizon's existing `accentSkyTrack: false` invariant from the cursor to the trails.

At rise, the trail begins zero-length and grows naturally with the disc; no animate-in primitive is introduced. At set, the trail persists at full arc length while the disc clips below the horizon line via the existing `clipPath` at `y >= horizonY`; trail and disc fade in lockstep through the same clip. On `alwaysUp` or `alwaysDown` days the trail is not rendered, matching how the existing renderer handles those edge cases.

The trail introduces a new sub-primitive: **gradient-opacity along an SVG path**. Horizon's prior primitives are solid and dashed (each at a fixed opacity). The trail is a new instance of the solid primitive, with a per-path opacity gradient added. The sub-primitive is intentionally **face-local**, scoped to celestial-body trails by construction. No other face uses it today, and Phase 25 does not promote it to a shared vocabulary. Future face authors should know it exists in `HorizonFace` and that it is intentionally scoped there.

## 4. Design Lock

All design decisions are locked. The source of truth is `.claude/agent-memory/chihiro-ui-designer/phase25_design_language.md` (chihiro, 2026-05-19). Joshua confirmed the **Trail** orientation (elapsed segment, rise to current) via AskUserQuestion. Motoko reviewed the lock and returned "coherent with named drift"; the three named items are addressed in Sections 4.1, 4.2, and 4.3 of this spec.

### 4.1 Locked numeric values

| Lock | Value |
|---|---|
| Form | solid (no `stroke-dasharray`) |
| Stroke width | 1.5 px |
| Sun colour | `#F4C56C` (fixed SVG hex, not a CSS variable) |
| Moon colour | `#A8C7FF` (fixed SVG hex, not a CSS variable) |
| Opacity at rise endpoint | `0.10` |
| Opacity at disc endpoint | `0.32` |
| Gradient interpolation | linear, `gradientUnits="userSpaceOnUse"` |
| Extent | full elapsed segment from rise → current disc position |
| Sun-moon parity | identical stroke and opacity treatment; only colour differs |
| Group placement | first children of existing `<g class="hz-sky-drift">`, painted under arcs, notches, and cursor |
| Drift channel | existing `horizon` channel (109 s), no new channel |

### 4.2 Coherence with named drift (motoko)

Motoko's review surfaced three items that this spec acknowledges explicitly.

**Item 1: New sub-primitive is face-local by design.** Gradient-opacity along an SVG path is genuinely new to Horizon. It is intentionally scoped to celestial-body trails inside `HorizonFace`. Future face authors should know the sub-primitive exists, that it lives in Horizon, and that promoting it to a shared vocabulary is a separate design call. Section 3 and Section 7 (face-design checklist, item 4) state this explicitly.

**Item 2: Solid, not dashed.** Chihiro's saved lock is authoritative. The trail is **solid 1.5 px**. An earlier brief described it as dashed; that description was wrong and motoko flagged the contradiction. This spec locks solid.

**Item 3: Voice extension uses chihiro's saved phrasing.** The Auto Memory Doll paragraph extension (Section 7, item 6) is the exact phrasing chihiro wrote: *"the day's traveled arc is drawn behind each body, fading toward where it began."* Past-tense rewordings are rejected.

### 4.3 Locked behavioural rules

- **Rise edge.** Trail begins zero-length at rise. No animate-in primitive; growth is implicit in the disc's existing motion.
- **Set edge.** Trail persists at full arc length while the disc clips below the horizon line. The existing `clipPath` at `y >= horizonY` clips disc and trail together as the body sets.
- **`alwaysUp`.** Trail not rendered. There is no rise reference point on an `alwaysUp` day. The disc's existing `alwaysUp` rendering path runs unchanged.
- **`alwaysDown`.** Trail not rendered. The disc is not rendered either. Trail and disc share the same suppression.
- **Sky modulation.** Trail colours are fixed SVG `stop-color` hex, not CSS variables. Trails opt out of sky modulation by construction, matching Horizon's existing `accentSkyTrack: false` posture for the gold cursor.
- **Drift.** Trails ride the existing `hz-sky-drift` group on the `horizon` channel (109 s). No new drift locus, no new amplitude, no new geometry clamp.
- **Hierarchy.** The arc-opacity asymmetry (sun 0.22, moon 0.18) is unchanged. Both trails carry identical opacity stops; the sun-moon hierarchy is inherited implicitly because each trail sits on top of its own arc.

## 5. Implementation

### 5.1 SVG structure

Two new `<path>` elements are inserted as **first children** of the existing `<g class="hz-sky-drift">` group, before `hz-sun-arc` and `hz-moon-arc`:

```
<path class="hz-sun-trail"  d=""  stroke="url(#hzSunTrailGrad)"  stroke-width="1.5" fill="none" />
<path class="hz-moon-trail" d=""  stroke="url(#hzMoonTrailGrad)" stroke-width="1.5" fill="none" />
```

Two new `<linearGradient>` defs are added alongside the existing `hzSunGlow` and `hzMoonGlow`:

```
<linearGradient id="hzSunTrailGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">
  <stop offset="0" stop-color="#F4C56C" stop-opacity="0.10" />
  <stop offset="1" stop-color="#F4C56C" stop-opacity="0.32" />
</linearGradient>

<linearGradient id="hzMoonTrailGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">
  <stop offset="0" stop-color="#A8C7FF" stop-opacity="0.10" />
  <stop offset="1" stop-color="#A8C7FF" stop-opacity="0.32" />
</linearGradient>
```

`gradientUnits="userSpaceOnUse"` is critical: it makes `x1`/`y1`/`x2`/`y2` SVG-absolute coordinates inside the 1180x820 viewBox, not bounding-box-relative. The per-tick updates write absolute pixel coordinates of the rise point and the current disc.

### 5.2 Per-tick logic

Inside `HorizonFace._renderDiagram`, where the existing renderer updates each body's disc position from the parameter `p`, four additional writes occur per body:

1. Compute the truncated quadratic Bezier via de Casteljau split at `p`. The trail is its own quadratic, independent of the dashed arc's PEAK_FAC=1.6 envelope. Its control point is set to `HORIZON_Y − ARC_H * 2`, which places the Bezier peak at the disc's apex y (~200 px for the sun channel). The truncated trail from rise to the current disc position is:

```
trailD = 'M ' + srX + ' ' + HORIZON_Y +
         ' Q ' + (srX + p * (cx - srX)) + ' ' + (HORIZON_Y + p * (cy - HORIZON_Y)) +
         ' '   + (srX + p * (sX  - srX)) + ' ' + (HORIZON_Y + p * (sY  - HORIZON_Y));
```

Where `cx = (srX + ssX) / 2` (horizontal midpoint) and `cy = HORIZON_Y - ARC_H * 2` (trail's own control point). The endpoint `(srX + p*(sX-srX), HORIZON_Y + p*(sY-HORIZON_Y))` is the de Casteljau evaluation of the **trail's** quadratic at `p`, and it coincides with the disc's current position `(sx, sy)` by construction.

**Curve math note.** The disc rides a sinusoid (`sy = HORIZON_Y - sin(p*π)*ARC_H`); the trail is a quadratic Bezier. The two curves are coincident at the endpoints (rise and current disc) and at the apex (both reach `HORIZON_Y - ARC_H` at `p = 0.5`). Interior residual between the sinusoid and the quadratic is bounded at ~4% of `ARC_H` (~10 px for the sun channel), which is below visual threshold at 2 m viewing distance. The `* 2` multiplier is the Bezier peak formula: for a symmetric quadratic whose endpoints are on the horizontal baseline, the control point y must be `2 * desired_peak_y - baseline_y`; here that evaluates to `2*(HORIZON_Y - ARC_H) - HORIZON_Y = HORIZON_Y - 2*ARC_H`. The dashed arc uses `PEAK_FAC = 1.6` for a larger stylized envelope; the trail does not match it and is not meant to.

2. Write `trailD` to the `<path>` `d` attribute.

3. Update the gradient's `x1`/`y1` to the rise point `(srX, HORIZON_Y)`.

4. Update the gradient's `x2`/`y2` to the current disc position `(sx, sy)`.

Per-tick cost: four DOM string sets per body, eight total. Negligible against the existing per-tick renderer load.

### 5.3 Edge-case gating

The renderer already handles `alwaysUp` and `alwaysDown` for each body. Phase 25 adds two short branches inside the same conditional:

- On `alwaysUp` for a body: skip both the trail `d` write and the gradient endpoint updates. The trail `<path>`'s `d` attribute is set to `''` once, which renders nothing.
- On `alwaysDown` for a body: same as `alwaysUp`. The trail is skipped along with the disc.

The trail does not need a separate gating switch; it follows the same daily branches as the disc.

### 5.4 File-by-file deltas

**`app.js`:**

- Inside `HorizonFace.init`, add the two trail `<path>` elements as the first children of `<g class="hz-sky-drift">` and the two `<linearGradient>` defs alongside `hzSunGlow` / `hzMoonGlow`. Approximately +12 lines (template literal additions).
- Inside `HorizonFace._renderDiagram`, add the four writes per body (8 writes total, with the de Casteljau path construction and the gradient endpoint updates). Approximately +20 lines (including the alwaysUp/alwaysDown branches).
- No new helper methods are required. The de Casteljau formula is inlined at the call site.

Shipped total: **+~50 LOC** in `app.js` (includes the SVG structure additions, the de Casteljau path construction with the corrected control point, gradient endpoint updates, and alwaysUp/alwaysDown branches). Bundle delta: +2.8 KB on `app.js`, 0 on `style.css`; total bundle ~228 KB.

**`style.css`:**

- Optional: `hz-sun-trail` and `hz-moon-trail` selectors may receive `pointer-events: none` and `vector-effect: non-scaling-stroke` to match the rest of the diagram's SVG hygiene. If the existing `hz-sky-drift` group rule already covers these via inheritance, no CSS rules are required.

Shipped total: **0 LOC** in `style.css` (existing `hz-sky-drift` group rule covers `pointer-events` and `vector-effect` inheritance; no new selectors required).

### 5.5 Picker live preview

`clockface.js` mounts the live Horizon card via `window.HorizonFace.init(stage)` and `window.HorizonFace.render(PREVIEW_STATE, tweaks)`. The trail renders identically in the picker preview because both the SVG structure and the per-tick logic live inside `HorizonFace`. No `clockface.js` edits are required.

## 6. Acceptance Criteria

All testable on iPad Air M4 Safari 18 against a fresh branch build, with Horizon active.

1. Each trail `<path>` renders as a child of `<g class="hz-sky-drift">`, drawn **before** `hz-sun-arc` and `hz-moon-arc` so the arcs paint on top.
2. Trail stroke is **solid** (no `stroke-dasharray`), `stroke-width="1.5"`, `fill="none"`.
3. Sun trail gradient stops are `#F4C56C` at `stop-opacity="0.10"` and `stop-opacity="0.32"`; moon trail uses `#A8C7FF` with the same opacity stops.
4. Each gradient's `x1`/`y1`/`x2`/`y2` update on every render tick. `x1`/`y1` equal the body's rise point (`srX`, `HORIZON_Y`); `x2`/`y2` equal the body's current disc position. `gradientUnits="userSpaceOnUse"` is set.
5. Each trail's `d` attribute is a truncated quadratic Bezier ending at the disc's current position. The trail has its own control point at `HORIZON_Y − 2*ARC_H` (so the Bezier peaks at the disc apex y, not the dashed-arc PEAK_FAC=1.6 envelope apex). The truncation is computed via de Casteljau split at the same `p` parameter the existing renderer uses for the disc position.
6. On `alwaysUp` or `alwaysDown` days, the affected body's trail `<path>` `d` attribute is empty and no gradient endpoint update fires for that body. The other body's trail (if applicable) renders unchanged.
7. At noon Vancouver on a clear day, the sun trail's left endpoint sits at the sun's rise point on the horizon line and fades to invisibility; the right endpoint sits at the disc and reads as the brightest segment.
8. Bundle delta is **+2.8 KB on `app.js`** and **0 KB on `style.css`**. Total bundle is ~228 KB, well under the 250 KB cap.
9. No new console errors or unhandled rejections from `HorizonFace._renderDiagram` during a 30-minute idle run on iPad Safari.
10. Picker live preview of Horizon renders the trails identically to the main display.

## 7. Face-Design Checklist (Embedded)

Phase 25 is face-level work on Horizon. The six items from `docs/face-design-checklist.md` are embedded with locked values.

### 7.1 Measured widths

Not applicable in the text-rendered-width sense; the trail is SVG path geometry, not text. The width check is reformulated as a geometry check:

- Trail x-extent: from `srX` (rise point on horizon) to `sx` (current disc), bounded by the diagram's horizontal extent inside the 1180x820 viewBox.
- Trail y-extent: from `HORIZON_Y = 440` to the disc's current `sy`. At peak altitude, `sy` ≈ `HORIZON_Y - ARC_H * PEAK_FAC` ≈ 56 px from the top of the viewBox.
- Time block bounding rect: `#hz-time` lives at `left:140-825, top:560-680` per the Phase 20.1 measured-width audit.
- Gap: trail y-extent is 56-440; time block top is 560. Clearance is 120 px above the time block at the disc's highest possible position. Trail and time block do not overlap at any time of day for Vancouver latitudes.

Motoko confirmed the geometric clearance. Coraline re-verifies visually at production scale.

### 7.2 Stated fulcrum

The Horizon fulcrum is unchanged: the **diagram (arcs + ticks + cursor)** is the fulcrum; the time block is paired but subordinate. The trail reinforces the diagram by enriching the arcs; it does not introduce a new weight centre. Eye lands first on the diagram, second on the time numerals, third on the status block.

### 7.3 Viewing-distance assumption

Canonical condition: **2 m living-room viewing, iPad brightness 40-60%, warm lamp + ambient daylight**. The opacity stops (`0.10` floor, `0.32` crest) are tuned for this condition.

- If the `0.10` floor reads invisible on hardware, raise to `0.12`.
- If the `0.32` crest reads as competing with the arc, drop to `0.28`.

Tuning is a coraline/yuki call after visual review and endurance run. Not a re-lock; the design call (a fading record of recent travel) is unchanged within either tuning.

### 7.4 Reference vocabulary

Horizon's existing primitives:

- **Dashed primitive:** `hz-sun-arc`, `hz-moon-arc`, `hz-sun-drop`. Soft, ambient, low-attention.
- **Solid primitive:** `hz-horizon-line`, `hz-cursor`, hour ticks at full opacity. Crisp, structural, high-attention.

The trail is a **new instance of the solid primitive**: solid line, slightly thicker than the arc (1.5 px vs 1 px), recessive emphasis. No new visual style is introduced at the primitive level.

The **gradient-opacity along a path** is a new sub-primitive **local to Horizon**, scoped to celestial-body trails by construction. The sub-primitive is acknowledged here so future face authors know it exists in `HorizonFace` and is intentionally face-local. Promoting it to a shared vocabulary is a separate design call, not a side effect of this phase.

### 7.5 Light verification

Trail colours are fixed hex inside SVG `<stop>` elements:
- Sun: `#F4C56C`
- Moon: `#A8C7FF`

These are not CSS variables. They do not modulate with sky, golden-hour accent, observance palette, or any other token. This extends Horizon's existing `accentSkyTrack: false` invariant from the gold hairline cursor to the trails. The trail is a celestial-body affordance and its colour is celestial-body-stable.

### 7.6 The Auto Memory Doll question

Voice extension (chihiro's saved phrasing, used verbatim):

> *"the day's traveled arc is drawn behind each body, fading toward where it began."*

Horizon already says "the sun and moon are tracked; you are a small observer of a big sky." The trail adds: the body's path is not only ahead of it, it is also behind it; you can see how far it has come.

## 8. Out of Scope

Explicit non-goals:

- **No animation of the trail as a separate motion layer.** The trail animates implicitly as the disc moves; no `<animate>`, no JS-driven tween, no separate timer.
- **No moon-only or sun-only variant.** Both bodies receive the same treatment.
- **No changes to the arc itself.** Stroke width, dash pattern, opacity, and colour of `hz-sun-arc` / `hz-moon-arc` are unchanged.
- **No changes to hour ticks, horizon line, hairline cursor, time block, status block, or header strip.**
- **No non-Horizon face change.** Calm, Mechanical, Departures, and Editorial are untouched.
- **No new CSS animation primitive.** No `@keyframes`, no `transition` declaration introduced for the trail.
- **No interpolation-space change for the trail gradient.** The linear gradient is SVG-native and runs in the same colour space as every other SVG paint server on the face.
- **No promotion of gradient-opacity-along-a-path to a shared vocabulary.** It stays face-local in V1; future cross-face use is a separate design call.
- **No tuning of the opacity values inside this phase.** If hardware verification recommends `0.12`/`0.28`, that tuning is a coraline/yuki follow-up, not a re-lock.
- **No telemetry, no logging, no diagnostic surface for trail rendering.** The Phase 22 error trap captures rendering failures generically; nothing trail-specific is added.

## 9. Risk and Coherence

### 9.1 The new sub-primitive

Gradient-opacity along a path is the only genuinely new vocabulary introduced. Motoko flagged it; this spec acknowledges it explicitly. The scoping argument:

- It exists because the trail is a single visual idea (a path that fades along its length) that needs gradient-opacity to express. Substituting any other primitive (uniform-opacity trail, stepped-opacity segments, dashed-but-fading trail) compromises the idea.
- It is local to Horizon because no other face has celestial bodies. Other faces have time numerals, complications, and dropline text — none of which need a fading path.
- Future face authors who see "gradient-opacity along a path" in `HorizonFace` should treat it as a face-local affordance, the same way `HorizonFace._moonPhasePath` is face-local. Reusing it on another face requires a separate design call.

### 9.2 Astronomy-truth interpretation

Both chihiro and motoko reasoned through whether the trail respects the "astronomy is the truth" voice that defines Horizon. The conclusion:

- The trail represents elapsed travel — a verifiable physical fact (where the sun has been today). It is not a forecast, not a prediction, not a stylistic flourish.
- Showing only the elapsed segment (Trail) rather than the remaining segment (Lead) was Joshua's direction call. Joshua picked Trail because Horizon's voice ("the sky is the timepiece") fits a record of travel better than a forecast.
- The gold hairline cursor (current minute) remains the only "this is now" marker. The trail is "this is what has been"; the arc beyond the disc is "this is what will be." The three elements are visually distinct and semantically distinct.

### 9.3 Fallback if hardware tuning is needed

If iPad verification shows the trail reads either invisible (`0.10` floor too low) or competing (`0.32` crest too high), the tuning path is:

- Raise the floor to `0.12` and/or drop the crest to `0.28`.
- The change is two `stop-opacity` values in the SVG defs. No structural change.
- This is a coraline/yuki follow-up note, not a re-lock; the design call (a fading record of recent travel) is unchanged within either tuning.

### 9.4 Burn-in

Trail pixels are a sub-path of the existing arc. The arc itself is already a permanent SVG element protected by:

- Layer 1: Perlin drift on the `horizon` channel (109 s, 18/12 px).
- Layer 2: Pixel-shift safety net (+/- 4 px every 6 min).
- Layer 8: Rendering hygiene (low opacity, near-black background, weight 200 numerals nearby but no solid block under the arc).

The trail rides the same group (`hz-sky-drift`), so it inherits the same drift envelope. No new drift locus, no new amplitude, no new burn-in audit. The trail does not introduce new high-opacity pixels at any single fixed position; its highest opacity (`0.32`) is below the arc's `0.22 / 0.18` only at the disc endpoint, which is itself moving continuously along the arc.

The eight SDD Section 9 layers are evaluated:

| Layer | Mechanism | Trail effect |
|---|---|---|
| 1 | Per-element Perlin drift | unchanged (rides `horizon` channel) |
| 2 | Pixel-shift safety net | unchanged |
| 3 | Kinetic slot churn | unchanged (Horizon does not paint the rotator slot) |
| 4 | Macro position shifts | unchanged (Horizon's time block has no macro shift; trail has no anchor to shift) |
| 5 | Sky-color modulation | unchanged (trail opts out via fixed hex) |
| 6 | Luminance breath | unchanged |
| 7 | Daily refresher at 03:00 | unchanged (trail fades with the stage like every other element) |
| 8 | Rendering hygiene | unchanged |

No layer regresses. Layer 1 coverage is strengthened slightly because the trail extends the existing drift-protected primitive with new sub-pixels under the same drift envelope.

## 10. Phase Dependencies

- **Requires:** Phase 20 (`HorizonFace` SVG diagram, `_renderDiagram`, the existing arc/disc/cursor rendering, the `accentSkyTrack` declaration). Phase 20.1 (single-home time block, status relocation — both unchanged by Phase 25 but their geometry is the reference for the no-overlap claim in Section 7.1).
- **Unblocks:** Nothing downstream depends on Phase 25.

## 11. Rollout

Standard pipeline:

1. misaka — implement against this spec.
2. mikasa — simplification pass.
3. hermione — code review (burn-in, spec adherence, bundle audit).
4. motoko — operational coherence re-check (face-level work; this phase introduced a new sub-primitive).
5. coraline — visual review at production scale on iPad Air M4 Safari 18. Verify checklist items 1 (geometric clearance) and 2 (fulcrum unchanged). Capture screenshots across rise, mid-day, sunset, and `alwaysUp`/`alwaysDown` edge cases.
6. yuki — optional endurance run on the branch (24 h minimum) to confirm no heap growth or hot-pixel signature from the new SVG elements.
7. shizuku — update `CLAUDE.md` (add trail paths and gradient defs to the `HorizonFace` description; note gradient-opacity sub-primitive as face-local).
8. leia — merge to master with `git merge --no-ff`, tag `phase-25`, push.

Direct-to-master is the established workflow. Master auto-deploys to GitHub Pages.

## 12. References

- `.claude/agent-memory/chihiro-ui-designer/phase25_design_language.md` — source-of-truth design lock.
- `docs/phase-20-horizon-face.md` — parent face spec; arc/disc/cursor renderer and `accentSkyTrack: false` rationale.
- `docs/phase-20.1-horizon-overlap-fix.md` — single-home time block, status relocation; reference geometry for the no-overlap claim.
- `docs/phase-23-golden-hour-stale-data.md` — `accentSkyTrack` promotion from reserved hook to actively-read; precedent for celestial-body opt-out from sky modulation.
- `docs/face-design-checklist.md` — the six items embedded in Section 7.
- `app.js` — `HorizonFace.init`, `HorizonFace._renderDiagram`, `<g class="hz-sky-drift">` group, `hzSunGlow` / `hzMoonGlow` defs.
- SDD v0.5 Section 9 (burn-in protection); Section 22 (acceptance criteria).
- MDN: [SVG `<linearGradient>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/linearGradient), [`gradientUnits`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/gradientUnits), [De Casteljau's algorithm (general reference)](https://en.wikipedia.org/wiki/De_Casteljau%27s_algorithm).
