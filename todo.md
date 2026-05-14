# Solari TODO

Active work tracker. CLAUDE.md is for stable reference; this file is for in-flight items.

## V1 complete

4 clockfaces shipped. Phases 16-20 complete as of 2026-05-12. Phase 20.1 patch (Horizon overlap fix) shipped 2026-05-13. Editorial code merged but user-facing surfaces deferred to V2.

- [x] **Phase 17: Mechanical face** -- shipped 2026-05-11. Spec at `docs/phase-17-mechanical-face.md`. Hermione approved with minor follow-ups resolved inline (ACCENT_PALETTE dual-source comment, `--type-tertiary` 60s transition fix).
- [x] **Phase 18: Departures face** -- shipped 2026-05-12. Spec at `docs/phase-18-departures-face.md`. Five data rows, per-character KineticType cascade (110 ms stagger), gold bezel borders, face-aware DriftEngine activeKeys, MoonModule moonrise/moonset extensions.
- [~] **Phase 19: Editorial face** -- partial. Code shipped 2026-05-12; webfont and picker live-render rolled back per user direction. Falls back to Georgia. Spec at `docs/phase-19-editorial-face.md`. V2 restore items in "Editorial -- coming soon" section below.
- [x] **Phase 20: Horizon face** -- shipped 2026-05-12. Spec at `docs/phase-20-horizon-face.md`. Full-stage SVG diagram, sun and moon arcs, 25 hour ticks, phase-correct crescent, 1 px gold hairline cursor, 220 px Manrope 200 big-time, accentSkyTrack opt-out.
- [x] **Phase 20.1: Horizon overlap fix** -- shipped 2026-05-13. Spec at `docs/phase-20.1-horizon-overlap-fix.md`. Status block relocated to top-right; big-time collapsed to single home at `left: 140`; `MacroShifter` time-shift disabled for Horizon (`intervalH = 0` guard).

## Editorial -- coming soon (V2 restore checklist)

Editorial is user-facing "coming soon" until the two items below are restored. The face code is present and loads; it renders with a Georgia fallback until V2.

- [ ] **Cormorant Garamond font link removed** -- `index.html` and `clockface.html` font links for Cormorant Garamond were removed in a user-directed rollback; Editorial face falls back to Georgia on both the main display and picker. Restore the `<link>` tags and re-verify FOUT behavior when Editorial is revisited. Intentional rollback per user; deferred to V2.
- [ ] **Editorial picker card `real: false`** -- `clockface.js` `FACES` array has Editorial marked `real: false` (picker renders a placeholder, not a live preview). Deferred to V2 -- restore to `real: true` and wire up `EditorialFace.init(card)` + `render()` following the Horizon/Mechanical/Departures pattern.

## Phase 20.1 follow-ups

Phase 20.1 (2026-05-13) closed the Horizon overlap issue: status block relocated to top-right, big-time collapsed to a single home at `left: 140`. Standard pipeline complete.

- [ ] **DriftEngine clamp half-extent for Horizon time.** `_elementSizesByFace.horizon.time.hw = 260` understates the measured ~342 px half-width. Harmless at the current single-home position (drift envelope stays inside the stage), but should be tightened in a V2 tuning pass.

## Phase 18 follow-ups

- [ ] **`detailAccentWord` dead code** -- `DepartureRow.detailAccentWord` is set in the row-builder but never read by `_renderRow`. No use case emerged during Phases 19 or 20. Cleanup candidate; remove the field and its assignments in a V2 housekeeping pass.
- [ ] **`#dep-board-header` brightness filter exemption** -- `filter: brightness(var(--lum-mod))` applies to the board including the column header. Phase 19 did not add overlapping tall elements. Revisit if Phase 20 (Horizon arc) overlaps the header zone.

## Phase 19 follow-ups

- [ ] **Paragraph copy refinement** -- 8 starter templates are seed copy. chihiro and user can refine prose post-merge via PRs against `PARAGRAPH_TEMPLATES`; schema and gate structure are frozen.
- [ ] **Cormorant Garamond FOUT on first boot** -- `font-display: swap` shipped. If the 360 px swap is visually jarring on a real device, revisit `<link rel="preload">` or self-hosting.
- [ ] **Dropline burn-in on light-observance days** -- dropline holds for 24 h and is currently unbound to a drift channel. If a light observance produces visible stress, bind to the `date` channel (one-line change).

## Phase 17 follow-ups

- [x] **Layer 3 burn-in ruling** -- hermione accepted composite coverage argument (drift + minute-arc growth + data churn + macro rotation) as equivalent to 28-36 s slot churn. No manual churn mechanism needed.
- [x] **JetBrains Mono FOUT on first boot** -- accepted. `font-display: swap` shipped; visible swap on first boot is acceptable for an always-on ambient display.
- [ ] **11 px tertiary label legibility at 2 m** -- hardware verification pending. misaka to check on real iPad Air M4; fallback is 12 px / 0.24em tracking. Open for iPad testing by misaka.
- [ ] **Live `timeFormat` toggle in picker preview** -- CSS Grid `1fr` handles the width jump cleanly; non-blocking. Low priority observation; no action required.
- [ ] **Picker Calm card conversion to live render** -- Calm preview remains hand-built mock. Deferred per spec; SOLARI_PICKER boot guard is in place for when this is revisited.

## Phase 16 follow-ups (status check)

Phase 16.1 patch (`6832629`) closed: colon accent fix, sage hex aligned to `#A9C29A`, suncalc.js doc size, Development section refresh, `todo.md` pointer added.

Remaining from Phase 16 verification:
- [ ] **Long-press affordance discoverability** -- coraline flagged moon disc has dual function (short tap = VersionOverlay, long press 600 ms = picker) with no visible indication. Product/design decision, not a doc gap. Bring to chihiro: is a subtle visual hint (ring pulse, first-boot tooltip, label) consistent with the "no dashboard" principle, or is hidden gesture the correct ambient-display answer? Deferred until chihiro weighs in.

## Face design discipline

`docs/face-design-checklist.md` is the internal discipline doc for face-level work. Six items: measured rendered widths, visual fulcrum, viewing distance, reference vocabulary, stroke mass under realistic light, and the Auto Memory Doll question. chihiro consults it at design lock; ariadne embeds the outputs in the spec; coraline verifies items 1 and 2 at visual review. Not a standing agent -- a finite checklist.

Built 2026-05-13 in lieu of the proposed "Violet" clockface-review agent. ripley proposed Violet as a standing horology-critic role; the self-critique reversed it. A standing agent would add process overhead without adding insight the six bullets don't already cover. The "Violet" name is shelved for a future role where composition-of-meaning is the actual job: a kinetic-type copywriter, an observance-line author, or a paragraph-template editor for Editorial prose. The Auto Memory Doll framing fits that role better than it fits a clockface critic.

Origin incident: Horizon Phase 20 assumed ~220 px rendered width for a 220 px Manrope 200 big-time block; measured width at render time was ~685 px. The two-home macro-shift layout shipped with left-clip and overlap defects and required the Phase 20.1 patch to fix. Item 1 of the checklist (measure rendered widths before layout lock) exists to prevent a recurrence.

- [ ] **V2 checklist tuning pass** -- when the next clockface is designed, run it through `docs/face-design-checklist.md` and note any bullets that prove unhelpful or missing. Tune then, not now.

## Tech debt / doc cleanups

- [x] **Paper accent hex correction** -- `ACCENT_PALETTE.paper.hex` was `#F0EBDC` in the Phase 16 spec (would render identical to `--type-primary` and make the accent invisible). Corrected to `#E8E0D0` in `docs/phase-16-clockface-foundation.md` 2026-05-12. Shipped code (`app.js:126`, `clockface.js:32`) was already correct; spec only needed fixing.
- [ ] **Bundle accounting refresh** -- V1 shipped at 255,607 bytes uncompressed (all 5 faces). Cormorant Garamond font link was rolled back so the CDN load is absent for now. V2 planning: re-audit headroom before adding new webfonts or faces.
- [ ] **ACCENT_PALETTE three-way sync** -- `ACCENT_PALETTE` in `app.js` is referenced in at least two places (main display and picker preview path); `clockface.js` carries an explicit dual-source comment. Consider extraction to a shared constant or config entry in a V2 housekeeping pass. Low priority.
- [ ] **`data.js` placeholder** -- still in repo, still not loaded (CLAUDE.md line 18). Either delete or document intent. Low priority -> misaka, defer until next housekeeping pass.
- [ ] **Picker accent doesn't render on Calm preview colon** -- `clockface.js:108` emits plain `<span>:</span>` without `.colon` class, so picker previews of Calm don't show colon-accent feedback. Folds in with the Phase 17 Calm-card-conversion follow-up above.

## Reserved / future

- [x] **Departures bezel burn-in ruling** -- resolved in Phase 18 spec: transparent center, 1 px gold-22% border only (filled `#16140f` rectangles rejected by chihiro). No solid blocks; layer 8 satisfied.
- [ ] **Per-face accent surfaces** -- Calm uses colon; Mechanical adds minute-arc; Departures adds imminent-row tint and flap-pair headline; Editorial adds colon only; Horizon uses gold hairline and colon (accentSkyTrack=false keeps them fixed). Consider a per-face `accentTargets` declaration in CONFIG to make surfaces explicit. V2 housekeeping candidate.
- [ ] **Hot-swap face change (avoid full reload on Apply)** -- Phase 16 chose `location.reload()` on storage event. `teardown()` shape exists on the face contract but is never called. If face changes become more frequent (e.g. scheduled time-of-day switching), revisit -> low priority.
