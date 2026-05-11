# Solari TODO

Active work tracker. CLAUDE.md is for stable reference; this file is for in-flight items.

## Active V1 work

- [x] **Phase 17: Mechanical face** -- shipped 2026-05-11. Spec at `docs/phase-17-mechanical-face.md`. Hermione approved with minor follow-ups resolved inline (ACCENT_PALETTE dual-source comment, `--type-tertiary` 60s transition fix).
- [ ] **Phase 18: Departures face** -- split-flap row layout, gold-border bezels. Open question: bezels are filled rectangles, needs explicit burn-in ruling -> ripley before chihiro/ariadne. Departures bezel burn-in ruling still gated before chihiro/ariadne spec work begins.
- [ ] **Phase 19: Editorial face** -- Cormorant Garamond italic time, almanac voice paragraph. New font in budget -> chihiro for typography decisions, then ariadne.
- [ ] **Phase 20: Horizon face** -- sun and moon arc diagram with hour ticks. New layout primitive (arc) -> chihiro, then ariadne.

## Phase 17 follow-ups

- [x] **Layer 3 burn-in ruling** -- hermione accepted composite coverage argument (drift + minute-arc growth + data churn + macro rotation) as equivalent to 28-36 s slot churn. No manual churn mechanism needed.
- [x] **JetBrains Mono FOUT on first boot** -- accepted. `font-display: swap` shipped; visible swap on first boot is acceptable for an always-on ambient display.
- [ ] **11 px tertiary label legibility at 2 m** -- hardware verification pending. misaka to check on real iPad Air M4; fallback is 12 px / 0.24em tracking. Open for iPad testing by misaka.
- [ ] **Live `timeFormat` toggle in picker preview** -- CSS Grid `1fr` handles the width jump cleanly; non-blocking. Low priority observation; no action required.
- [ ] **Picker Calm card conversion to live render** -- Calm preview remains hand-built mock. Deferred per spec; SOLARI_PICKER boot guard is in place for when this is revisited.

## Phase 16 follow-ups (status check)

Phase 16.1 patch (`6832629`) closed: colon accent fix, sage hex aligned to `#A9C29A`, suncalc.js doc size, Development section refresh, `todo.md` pointer added.

Remaining from Phase 16 verification:
- [ ] **Long-press affordance discoverability** -- coraline flagged moon disc has dual function (short tap = VersionOverlay, long press 600 ms = picker) with no visible indication. If deployment model is single-user setup, accept as hidden gesture. If guests/family need to discover, add subtle ring or first-boot hint -> deferred until usage signal.

## Tech debt / doc cleanups

- [x] **Bundle accounting refresh** -- Phase 17 audit complete: ~145-149 KB cold-cache (including JetBrains Mono 300); ~124 KB headroom against 250 KB target. Phase 19 will add Cormorant Garamond -> ripley to re-check before Phase 19 lands.
- [ ] **ACCENT_PALETTE three-way sync** -- `ACCENT_PALETTE` in `app.js` is referenced in at least two places (main display and picker preview path). As faces accumulate, the sync surface grows. Consider extraction to a shared constant or config entry by Phase 19. Low priority.
- [ ] **`data.js` placeholder** -- still in repo, still not loaded (CLAUDE.md line 18). Either delete or document intent. Low priority -> misaka, defer until next housekeeping pass.
- [ ] **Picker accent doesn't render on Calm preview colon** -- `clockface.js:108` emits plain `<span>:</span>` without `.colon` class, so picker previews of Calm don't show colon-accent feedback. Folds in with the Phase 17 Calm-card-conversion follow-up above.

## Reserved / future

- [ ] **Departures bezel burn-in ruling** -- handoff justifies `#16140f` filled bezels behind flap chars as small enough not to violate "no solid blocks" (layer 8). Needs explicit ripley sign-off before Phase 18 -> ripley before Phase 18 spec.
- [ ] **Per-face accent surfaces** -- Calm uses colon; Mechanical adds minute-arc; Departures will add imminent-row tint; Editorial/Horizon TBD. As faces accumulate, consider a per-face `accentTargets` declaration in CONFIG to make the surface explicit. Not needed until Phase 18 or Phase 19.
- [ ] **Hot-swap face change (avoid full reload on Apply)** -- Phase 16 chose `location.reload()` on storage event. `teardown()` shape exists on the face contract but is never called. If face changes become more frequent (e.g. scheduled time-of-day switching), revisit -> low priority.
