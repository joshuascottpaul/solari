# Solari TODO

Active work tracker. CLAUDE.md is for stable reference; this file is for in-flight items.

## Active V1 work

- [ ] **Phase 17: Mechanical face** -- spec written at `docs/phase-17-mechanical-face.md` (chihiro design decisions locked, ariadne spec at 954 lines). Implementation pending on branch `phase-17-mechanical`. Next: misaka -> mikasa -> hermione -> shizuku -> leia; optional clarice/coraline/sentry verification before merge to master.
- [ ] **Phase 18: Departures face** -- split-flap row layout, gold-border bezels. Open question: bezels are filled rectangles, needs explicit burn-in ruling -> ripley for burn-in compliance call before chihiro/ariadne.
- [ ] **Phase 19: Editorial face** -- Cormorant Garamond italic time, almanac voice paragraph. New font in budget -> chihiro for typography decisions, then ariadne.
- [ ] **Phase 20: Horizon face** -- sun and moon arc diagram with hour ticks. New layout primitive (arc) -> chihiro, then ariadne.

## Phase 17 follow-ups (deferred during spec)

- [ ] **Layer 3 burn-in ruling** -- Mechanical has no 28-36 s slot churn; spec section 11 argues composite coverage (drift + arc + data churn + macro shift). Hermione to rule during review; if rejected, add manual churn mechanism before ship.
- [ ] **JetBrains Mono FOUT on first boot** -- accepted as default with `font-display: swap`. Re-evaluate if visible swap is jarring on iPad after first load.
- [ ] **11 px tertiary label legibility at 2 m** -- specified at 11 px / 0.28em letter-spacing; fallback 12 px / 0.24em. Verify on real iPad Air M4 during implementation, update spec post-hoc.
- [ ] **Live `timeFormat` toggle in picker preview** -- if picker tweaks panel allows live toggle, TIDE column width jumps. CSS Grid `1fr` handles cleanly; non-blocking. Defer to misaka discretion.
- [ ] **Picker Calm card conversion to live render** -- Phase 16 Calm preview is hand-built mock. Phase 17 introduces SOLARI_PICKER boot guard; Calm can convert opportunistically once Mechanical lands.

## Phase 16 follow-ups (status check)

Phase 16.1 patch (`6832629`) closed: colon accent fix, sage hex aligned to `#A9C29A`, suncalc.js doc size, Development section refresh, `todo.md` pointer added.

Remaining from Phase 16 verification:
- [ ] **Long-press affordance discoverability** -- coraline flagged moon disc has dual function (short tap = VersionOverlay, long press 600 ms = picker) with no visible indication. If deployment model is single-user setup, accept as hidden gesture. If guests/family need to discover, add subtle ring or first-boot hint -> deferred until usage signal.

## Tech debt / doc cleanups

- [ ] **Bundle accounting refresh** -- with Phase 17 adding JetBrains Mono 300 (~16-20 KB woff2), re-audit total bundle vs 250 KB target. Currently runtime ~110 KB + picker ~21 KB. Phase 19 will add Cormorant Garamond -> ripley to re-check before Phase 19 lands.
- [ ] **`data.js` placeholder** -- still in repo, still not loaded (CLAUDE.md line 18). Either delete or document intent. Low priority -> misaka, defer until next housekeeping pass.
- [ ] **Picker accent doesn't render on Calm preview colon** -- `clockface.js:108` emits plain `<span>:</span>` without `.colon` class, so picker previews of Calm don't show colon-accent feedback. Folds in with the Phase 17 Calm-card-conversion follow-up above.

## Reserved / future

- [ ] **Departures bezel burn-in ruling** -- handoff justifies `#16140f` filled bezels behind flap chars as small enough not to violate "no solid blocks" (layer 8). Needs explicit ripley sign-off before Phase 18 -> ripley before Phase 18 spec.
- [ ] **Per-face accent surfaces** -- Calm uses colon; Mechanical adds minute-arc; Departures will add imminent-row tint; Editorial/Horizon TBD. As faces accumulate, consider a per-face `accentTargets` declaration in CONFIG to make the surface explicit. Not needed until Phase 18 or Phase 19.
- [ ] **Hot-swap face change (avoid full reload on Apply)** -- Phase 16 chose `location.reload()` on storage event. `teardown()` shape exists on the face contract but is never called. If face changes become more frequent (e.g. scheduled time-of-day switching), revisit -> low priority.
