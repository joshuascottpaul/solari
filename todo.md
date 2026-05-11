# Solari TODO

Active work tracker. CLAUDE.md is for stable reference; this file is for in-flight items.

## Active V1 work

- [ ] **Phase 17: Mechanical face** -- tabular Manrope/JetBrains Mono, minute-arc replaces second rail (`docs/phase-17-*.md` not yet written) -- next: chihiro for design decisions (new visual language), then ariadne for spec.
- [ ] **Phase 18: Departures face** -- split-flap row layout, gold-border bezels. Open question: bezels are filled rectangles, needs explicit burn-in ruling -> ripley for burn-in compliance call before chihiro/ariadne.
- [ ] **Phase 19: Editorial face** -- Cormorant Garamond italic time, almanac voice paragraph. New font in budget -> chihiro for typography decisions, then ariadne.
- [ ] **Phase 20: Horizon face** -- sun and moon arc diagram with hour ticks. New layout primitive (arc) -> chihiro, then ariadne.

## Phase 16 follow-ups (from clarice/coraline/sentry)

- [ ] **Colon does not consume `--type-accent`** -- `style.css` has no `#time .colon { color: var(--type-accent); }` rule (only `.char--flash` at style.css:152). Changing accent gold/sky/sage/paper has no visible effect on the resting display. One-line fix. Caveat: ObservanceModule will re-tint colon on holidays once wired -> ripley to rule on whether holidays should override accent, then misaka one-liner.
- [ ] **Sage hex mismatch** -- shipped `#9CB48A` at `app.js:117` and `clockface.js:25`; SDD section 8 specifies `#A9C29A`. Coraline reads shipped value as muddy/forest; chihiro flagged the same risk earlier -> chihiro for final hex call (align to spec vs. iterate), then misaka.
- [ ] **Picker preview is hand-built mock, not live CalmFace** -- `clockface.js:43-44` comments acknowledge static HTML. Acceptable for Phase 16; should be converted to live face instance during Phase 17 when face render contract is exercised for a second face -> ariadne to fold into Phase 17 spec.

## Tech debt / doc cleanups

- [ ] **`suncalc.js` size doc** -- CLAUDE.md line 19 says `~3 KB`; actual file is 9116 bytes (~9 KB). Pre-Phase-16 stale doc -> misaka (trivial edit).
- [ ] **Development section mentions vw/vh only** -- CLAUDE.md line 109 says "Layout uses vw/vh units for 1180x820 and 1366x1024 logical viewports." Phase 16 moved the main display to a fixed 1180x820 stage with CSS transform scaling (style.css:29-82); vw/vh now only applies to version-overlay -> misaka (edit to reflect stage primitive + scale-to-viewport).
- [ ] **Bundle accounting refresh** -- with Phase 16 additions, runtime is now `app.js + style.css + suncalc + perlin + index.html + sw.js + manifest.json` plus `clockface.{html,js}` for picker. Total runtime ~110 KB; picker adds ~21 KB. Under 250 KB budget but should be re-audited once Phase 19 adds Cormorant Garamond and Phase 17 adds JetBrains Mono (memory note flags 30-50 KB per woff2) -> ripley to re-check before Phase 19 lands.

## Reserved / future

- [ ] **Per-face drift amplitude policy** -- design handoff prototypes used 1-4 px drift; current Solari uses 16-60 px. Memory note `project_v1_face_picker.md` flags this needs a decision before any face beyond Calm ships. CalmFace currently inherits global drift; per-face overrides via TWEAKS not yet specified -> chihiro/ripley joint call when Phase 17 spec opens.
- [ ] **Departures bezel burn-in ruling** -- handoff justifies `#16140f` filled bezels behind flap chars as small enough not to violate "no solid blocks" (layer 8). Needs explicit ripley sign-off before Phase 18 -> ripley before Phase 18 spec.
- [ ] **New font budget** -- JetBrains Mono (Phase 17) and Cormorant Garamond / Instrument Serif (Phase 19) each ~30-50 KB woff2. Subset to needed glyphs only; lazy-load per-face -> ariadne to design font-loading strategy in Phase 17 spec.
- [ ] **`data.js` placeholder** -- still in repo, still not loaded (CLAUDE.md line 18). Either delete or document intent. Low priority -> misaka, defer until next housekeeping pass.
