# Agent Team Adaptation Guide for Solari

**Status:** Draft
**Date:** 2026-05-03
**Purpose:** Practical reference for adapting the 11-agent Claude Code team from the build_tfidf project to the Solari ambient display project.

---

## 1. Principles

### This project is not typical software

Solari is closer to a kinetic art installation than a web application. The display runs unattended for months. There is no user interaction, no forms, no navigation, no error messages shown to humans. The "user" is a person glancing at an iPad on a shelf while walking past.

This means:

- **Correctness is necessary but insufficient.** Code that works but looks wrong has failed. A fetch timeout that displays a stale value gracefully is better than one that shows a loading spinner. Agents doing visual work must internalize Section 2.3: "If it feels like a dashboard, it has failed."
- **Stability is the primary non-functional requirement.** A memory leak that crashes Safari after 4 days is a showstopper. A subtle color calculation bug is tolerable for one release. Agents must weight long-running stability over feature completeness.
- **The aesthetic bar is unusually high.** The SDD specifies exact animation curves, font weights, color math, and spatial relationships. Agents cannot improvise visual decisions. If the SDD does not specify something, the agent should ask rather than guess.

### The SDD is the spec

The file `2026 04 27 10 15 PM - SDD - Ambient Display V0.5.docx` in the repo root is the frozen specification. Every agent that makes design or implementation decisions must treat it as authoritative. When the SDD and an agent's general knowledge conflict, the SDD wins.

How to reference it in agent prompts: include the instruction "Read the SDD (.docx in repo root) for any design question. Section numbers are stable. Cite them in your output (e.g., 'per SDD Section 8.1')." Agents cannot read .docx files natively, so the CLAUDE.md file and seeded memories serve as the working extract. For deeper questions, the human operator reads the SDD and relays the relevant section.

### Phase discipline

The SDD specifies 15 sequential build phases (Section 19). Each phase is independently deployable and testable. Agents must not implement features from a future phase. If a module in Phase 9 would benefit from infrastructure defined in Phase 12, the Phase 9 implementation stubs the dependency with a safe default and moves on.

Every agent prompt should include: "Check CLAUDE.md for the current phase. Do not implement features from later phases."

### The five design rules

Every agent that touches visible output (chihiro, misaka, coraline, and misaka when refactoring display code) must have these rules in its prompt verbatim:

1. No more than 5 visible elements at any time.
2. No icons, widgets, panels, or boxes.
3. All motion slower than a slow exhale. Anything faster is a bug.
4. Background is always near-black (#0a0a0a, never #000).
5. Type weight 200 (Manrope extra-light). Color lives in the type, not in blocks.

---

## 2. Agent-by-Agent Adaptation Notes

### 01 ripley-tech-lead (opus)

**What changes:** The entire domain model. Ripley currently thinks in terms of a Python pipeline (ingest, clean, chunk, embed, index, query, fuse). Solari has no pipeline. The architecture is a single render loop reading a shared AppState object mutated by independent modules on independent timers.

**Domain knowledge to inject:**

- Architecture: single AppState object, direct mutation, single render loop. No pub-sub, no event bus, no message passing. This is deliberate (SDD Section 6).
- Module boundaries: each module owns a slice of AppState and a timer. Modules do not call each other. The render loop reads all state and writes the DOM.
- The two-file split: `app.js` holds all modules and the render loop; `data.js` holds fetch wrappers and astronomical math. No other JS files except vendored libs.
- Constraint: no build step, no npm, no bundler. Source = deployed. This eliminates entire categories of tooling suggestions.
- 250 KB total bundle target (SDD Section 4.2). Ripley should flag any suggestion that risks this budget.
- Phase gating: ripley should enforce that implementation stays within the current phase.
- Burn-in protection invariants (SDD Section 9): eight independent layers, all mandatory. Any architectural change must preserve all eight.

**Key SDD sections:** 2.3 (design philosophy), 4 (constraints), 6 (architecture), 8.1 (module APIs), 9 (burn-in), 19 (phases).

**Model:** Keep opus. Architectural judgment calls benefit from the stronger model.

**New capabilities:** None needed, but update the description/examples to reference Solari concepts (AppState, modules, phases) instead of Python pipeline concepts.

---

### 02 ariadne-design-docs (opus)

**What changes:** Minimal structural changes. Ariadne is already fairly generic. The main adaptation is injecting Solari-specific context so design docs reference the correct architecture and constraints.

**Domain knowledge to inject:**

- The SDD exists and is frozen. Ariadne's design docs supplement the SDD (e.g., "Phase 9 implementation plan") rather than replace it.
- Document scope: most Solari design docs will be phase-level implementation plans, not system-level architecture docs (the SDD already covers that).
- Constraints to include in every doc: no build step, 250 KB budget, iPad Safari target, 7+ day continuous runtime.
- When writing alternatives sections, "use a framework" or "add a build step" are not valid alternatives for Solari.

**Key SDD sections:** All (ariadne may need to reference any part of the SDD).

**Model:** Keep opus. Design documents benefit from the stronger model.

---

### 03 chihiro-ui-designer (sonnet)

**What changes:** Significant. Chihiro currently thinks in generic web UI terms: layouts, buttons, forms, interactive elements, WCAG compliance, responsive breakpoints. Solari has none of those things. There is one viewport (iPad landscape), no interactive elements, no forms, no buttons. The "UI" is kinetic typography on a near-black background.

**Domain knowledge to inject:**

- The display has exactly one viewport: iPad Air M4 Safari landscape (1180x820 logical pixels at 11"; 1366x1024 at 13"). No responsive breakpoints. No portrait mode.
- There are no interactive elements. No hover states, no click targets, no focus rings, no keyboard navigation. Standard accessibility checklist items (WCAG touch targets, focus indicators, screen readers) do not apply.
- Visual design is defined entirely by: typeface (Manrope 200), color (computed from sun altitude + weather + observance palette), spatial position (6 time positions, 4 moon positions, 2 rotator slots), and motion (Perlin drift, split-flap transitions).
- Color is the primary design tool. The SkyColorModule computes CSS custom properties from sun altitude (SDD Section 10). Weather conditions modulate saturation. Observance palettes override the base colors for holidays.
- Typography families (SDD Section 8.3): calm (Manrope 200), editorial, mechanical, almanac. Calm is the default. Chihiro should evaluate type choices against these families.
- The five-element maximum is a hard constraint, not a guideline.
- Motion design rules: drift uses Perlin noise with coprime periods (117s, 89s, 143s, 101s, 73s). Split-flap transitions take ~800ms per character cascade. All motion is slow.

**Replace the accessibility checklist** with burn-in protection review:
- Are all elements drifting? (Perlin periods assigned and coprime?)
- Is anything static for more than 6 minutes?
- Do any elements use solid color blocks? (Forbidden.)
- Does any animation exceed "slow exhale" speed?

**Key SDD sections:** 2.3 (philosophy), 7 (layout), 8.3 (typography families), 9 (burn-in), 10 (sky color), 14 (kinetic type).

**Model:** Consider upgrading to opus. Visual design judgment for an art-installation-grade display is a harder task than generic UI review. Sonnet may default to standard web UI heuristics that do not apply here. If budget is a concern, keep sonnet but add very explicit guardrails in the prompt about what not to suggest (no panels, no widgets, no interactive elements).

---

### 04 misaka-coder (opus)

**What changes:** The entire technology context. Misaka currently writes generic code with no language-specific guidance. For Solari, every line is vanilla JavaScript (ES2020+) running in iPad Safari with no build step.

**Domain knowledge to inject:**

- **Language:** Vanilla JavaScript, ES2020+. No TypeScript, no JSX, no modules (no import/export; all code in two files loaded via script tags). Use `const`/`let`, arrow functions, async/await, optional chaining, nullish coalescing.
- **AppState pattern:** There is a single `const state = {}` object. Modules mutate it directly. The render loop reads it. No getters, no setters, no proxies, no immutability. This is specified in SDD Section 6.
- **Module API signature** (SDD Section 8.1): Each module is an object with `init()`, `start()`, and optionally `stop()`. Modules register their own timers in `start()`. Modules do not import each other; they communicate only through AppState.
- **CONFIG structure:** A frozen object at the top of app.js. Contains coordinates (Vancouver: 49.2827, -123.1207), polling intervals, typography family selection, color palette definitions, burn-in parameters, and feature flags for phase gating.
- **No build step.** No minification, no tree-shaking, no module bundling. Misaka must never suggest `npm install`, `import`, webpack, vite, esbuild, or any toolchain. Source files are served directly.
- **Two vendored libs only:** `suncalc.js` (sun/moon position math) and `perlin.js` (noise generation). Both loaded via script tags. No other third-party code.
- **Safari constraints:** No APIs unavailable in Safari 18+. Check MDN compatibility before using any Web API.
- **Memory hygiene:** No closures that capture growing arrays. No unbounded caches. No event listeners added without removal paths. Use `performance.memory` (where available) to validate. The app must survive 7+ days.
- **DOM writes:** Only `DisplayModule.render()` writes to the DOM. Other modules write to AppState. This prevents layout thrashing and makes the render path predictable.
- **Animation:** A single `requestAnimationFrame` loop drives DriftEngine. Do not create additional rAF loops. Drift offsets are computed from Perlin noise; CSS transforms apply them.
- **Fetch pattern:** ResilienceManager wraps all fetches with retry (3x exponential backoff), timeout (10s), and localStorage caching. All new fetchers must use it.

**Key SDD sections:** 4 (constraints), 6 (architecture), 8.1 (module API), 8.2 (AppState schema), 8.3 (CONFIG), 11 (data fetchers), 14 (kinetic type algorithm).

**Model:** Keep opus. Implementation decisions in a constrained environment (no framework, no build step, memory-safe for weeks) require strong judgment.

---

### 05 mikasa-simplifier (sonnet)

**What changes:** Language context and simplification constraints.

**Domain knowledge to inject:**

- Language is vanilla JS. Simplification must stay within ES2020+ and Safari compatibility. Do not refactor toward module imports, classes with private fields (#), or other patterns unavailable or unnecessary in this context.
- The two-file structure (app.js + data.js) is deliberate. Do not suggest splitting into per-module files (no build step means more script tags means more load-order complexity).
- AppState direct mutation is intentional. Do not refactor toward immutable state, Redux patterns, or event systems. The simplicity is the point.
- NFR-9 (SDD Section 4.2): any module should be understandable in under 5 minutes. This is the benchmark for "simple enough."
- When simplifying animation or color code, preserve the exact mathematical behavior. A "simpler" easing function that looks different is a regression.
- Burn-in protection has eight layers. Do not simplify away any of them, even if they appear redundant. Redundancy is the design.

**Key SDD sections:** 4.2 (NFR-9), 6 (architecture), 9 (burn-in).

**Model:** Keep sonnet. Simplification is well-scoped, does not require deep architectural judgment.

---

### 06 hermione-reviewer (sonnet, read-only)

**What changes:** Review criteria shift from Python/API patterns to browser runtime, memory safety, and SDD compliance.

**Domain knowledge to inject:**

Replace the Python-oriented review checklist with:

- **Correctness:** Does the code match the SDD specification for this phase? Are color calculations, timing intervals, and animation parameters exactly as specified?
- **Memory safety:** Does this code leak? Look for: growing arrays without bounds, closures capturing mutable state, event listeners added in loops, setInterval without clearInterval paths, DOM nodes created without removal paths.
- **Burn-in compliance:** Do all visible elements drift? Are Perlin periods coprime? Is anything static for >6 minutes? Are there any solid color blocks?
- **Safari compatibility:** Any Web APIs used must work in Safari 18+. Check for: ResizeObserver (supported), IntersectionObserver (supported), Web Animations API (partially supported, prefer CSS transitions).
- **Bundle size:** Does this change add significant bytes? Is there dead code? Could a 50-line function be 20 lines?
- **AppState discipline:** Does the code mutate AppState only in the correct module? Does it avoid reading AppState outside the render loop (except for other modules' init checks)?
- **Phase compliance:** Does this change introduce features from a future phase?
- **Error handling:** Do fetchers use ResilienceManager? Is localStorage access wrapped in try/catch? Do timer callbacks handle errors without crashing the render loop?
- **No build-step assumptions:** Does the code assume bundling, minification, tree-shaking, or module resolution?

Remove: version/dependency alignment checks (pyproject.toml, __init__.py), Python-specific checks (type hints, fixtures), embedding provider checks.

**Key SDD sections:** 4 (constraints), 6 (architecture), 8.1 (module API), 9 (burn-in), 19 (phases).

**Model:** Keep sonnet. Review is a well-structured task with clear criteria.

---

### 07 kaylee-test-ci (sonnet)

**What changes:** Complete overhaul. There is no pytest, no Python, no test framework. Testing a vanilla JS static site that runs on an iPad requires a fundamentally different approach.

**Domain knowledge to inject:**

- **No test framework exists yet.** There is no `tests/` directory, no jest, no mocha, no vitest. The project has no build step, so adding a Node.js test runner requires careful justification (it would be dev-only, never deployed).
- **What to test and how:**
  - **Unit tests for data.js:** Pure functions (astronomical math, color calculations, data parsing) can be tested with a lightweight runner. Options: a simple HTML test harness that loads data.js and runs assertions, or a Node.js script that evaluates the functions. Prefer the HTML harness approach since it matches the runtime environment (browser JS).
  - **Integration tests for fetchers:** Hit the real APIs (Open-Meteo, DFO IWLS) from a test script and validate response shapes. These are smoke tests, not mocked unit tests.
  - **Visual regression:** Screenshot comparison of the display at known AppState values. Use Chrome DevTools MCP or Playwright to capture screenshots, compare against baselines.
  - **Memory leak detection:** Run the page for N hours in a headless browser, sample `performance.memory.usedJSHeapSize` every minute, assert no upward trend.
  - **Burn-in audit:** A script that reads the DOM every 60 seconds for an hour and asserts that all element positions have changed.
- **CI on GitHub Actions:** The project uses GitHub Pages for deployment. CI can:
  - Serve the site with `python3 -m http.server` and run Playwright/Puppeteer checks.
  - Validate that total file size is under 250 KB.
  - Lint JS with a lightweight linter (eslint with flat config, no build step).
  - Run the HTML test harness in a headless browser.
- **No npm in production.** Dev dependencies (test runner, linter) may use npm but must be in devDependencies only and never deployed.

**Key SDD sections:** 4 (constraints), 11 (API contracts for response validation), 19 (phase acceptance criteria).

**Model:** Keep sonnet. Test engineering does not require opus-level judgment.

**New capabilities:** Kaylee needs access to Chrome DevTools MCP tools for visual regression and memory profiling.

---

### 08 clarice-debugger (sonnet, read-only)

**What changes:** Debugging shifts from pytest output to browser developer tools.

**Domain knowledge to inject:**

- **No pytest.** Debugging means: opening the page in a browser, checking the console for errors, inspecting network requests for failed fetches, and reading the DOM to verify render output.
- **Primary debugging tools:**
  - Chrome DevTools MCP: console messages, network requests, DOM inspection, performance profiling.
  - `console.log` in the source (temporary, for diagnosis only).
  - `localStorage` inspection (ResilienceManager caches data there).
  - `performance.memory` sampling for leak detection.
- **Common failure modes to know about:**
  - CORS failures on DFO IWLS or EC weather.gc.ca (SDD Section 11.4, Plan B).
  - stale localStorage cache causing the display to show old data after an API schema change.
  - Timer drift: setInterval callbacks piling up if the tab is backgrounded (Safari throttles background tabs).
  - Memory growth from Perlin noise history or DOM node accumulation.
  - Safari-specific CSS rendering differences (especially CSS custom properties in animations).
- **What "tests pass" means for Solari:** The page loads without console errors, all visible elements render, fetchers return data (or gracefully fall back to cache), and the display does not crash after 1 hour in a headless browser.

Replace `pytest` commands with browser-based debugging commands using Chrome DevTools MCP.

**Key SDD sections:** 6 (architecture, to trace state flow), 11 (fetcher contracts), 9 (burn-in, to verify drift is active).

**Model:** Keep sonnet. Diagnosis is well-scoped.

**New capabilities:** Clarice needs Chrome DevTools MCP access. Add the MCP tools to its allowed tools (currently it only disallows Edit, Write, NotebookEdit).

---

### 09 coraline-ux-reviewer (sonnet)

**What changes:** Coraline is the agent best positioned for Solari, but its review methodology needs rewriting for a single-viewport, non-interactive display.

**Domain knowledge to inject:**

- **Single viewport:** iPad Air M4 Safari, landscape. Set the Chrome DevTools viewport to 1180x820 (11" model) and 1366x1024 (13" model). No other breakpoints.
- **No interaction testing.** There are no buttons, forms, links, or interactive elements. Remove the entire "Interaction Testing" section from the review methodology.
- **Replace accessibility audit with SDD compliance audit:**
  - Element count: are there more than 5 visible elements? (Violation of Section 2.3.)
  - Motion speed: take screenshots 2 seconds apart; measure element displacement. Flag anything moving more than ~2px/sec.
  - Color: is the background #0a0a0a? Are there any solid color blocks? Is all color in the typography?
  - Typography: is the weight 200? Is the typeface from the approved families?
- **Burn-in review (critical for Solari):**
  - Take screenshots at T=0 and T=10 minutes. Overlay them. Every visible element should have shifted position.
  - Verify Perlin drift is active by checking CSS transform values on elements over time.
  - Check that macro position shifts occur (time every 3h, moon every 6h; for testing, temporarily shorten the interval or advance the clock).
- **Ambient quality review (new section):**
  - Does the display feel calm? Is anything drawing attention aggressively?
  - Does the typography breathe? (Luminance modulation should be perceptible but subtle.)
  - Are transitions smooth? Split-flap animations should cascade left-to-right at ~800ms total.
  - At night (sun altitude < -6 degrees), are colors appropriately muted?
  - During a holiday/observance, does the palette shift feel natural?
- **Long-running stability review:**
  - Load the page, leave it running for 1 hour. Take memory snapshots at 0, 30, and 60 minutes. Flag any growth.
  - Check console for accumulated errors.
  - Verify all data modules are still fetching on schedule (check network requests).

**Key SDD sections:** 2.3 (philosophy), 7 (layout), 9 (burn-in), 10 (sky color), 14 (kinetic type).

**Model:** Consider upgrading to opus. Evaluating whether a display "feels calm" or whether a color transition is "natural" requires aesthetic judgment that benefits from the stronger model. If keeping sonnet, add very specific pass/fail criteria for every subjective quality (e.g., "drift displacement per minute should be between 1px and 8px").

**New capabilities:** Coraline already has Chrome DevTools MCP. It needs explicit instructions to use `emulate` for iPad viewport and to use `take_memory_snapshot` for leak detection.

---

### 10 shizuku-docs (sonnet)

**What changes:** Moderate. The documentation needs are smaller and different.

**Domain knowledge to inject:**

- Solari has minimal end-user documentation needs. There is no CLI, no API, no installation process. The "user" either looks at the iPad or deploys via GitHub Pages.
- **Documentation that Solari does need:**
  - README.md: project overview, screenshot, "how to deploy" (push to main, GitHub Pages serves it), "how to develop locally" (`python3 -m http.server 8000`).
  - CLAUDE.md: kept up to date as the source of truth for all agents. Shizuku should know how to update it when phases are completed or architecture changes.
  - Phase completion notes: brief summary of what each phase delivered, stored in docs/.
  - API documentation: document the external API contracts (request URLs, response shapes, polling intervals) for developer reference.
- Remove CLI reference, quickstart guide, and changelog templates from the prompt. Replace with the above.
- **Style:** No em dash. Brief, factual, calm. This matches the existing prompt.

**Key SDD sections:** 4 (constraints for README), 11 (API contracts for API docs), 19 (phases for completion notes).

**Model:** Keep sonnet. Documentation is well-scoped.

---

### 11 leia-github-ops (haiku)

**What changes:** Minor. Git operations are git operations. The main adaptation is Solari-specific commit scoping.

**Domain knowledge to inject:**

- Commits should reference the phase number: `feat(phase-9): implement rotator slot cycling`.
- The branch strategy is simple: main is deployed via GitHub Pages. Feature branches per phase or per significant change.
- Only 6 files are ever committed: `index.html`, `style.css`, `app.js`, `data.js`, `manifest.json`, and files in `data/` or `docs/`. Vendored libs in `lib/` change rarely.
- Never commit the SDD .docx (it is already in the repo and frozen).
- Total committed JS should stay under 250 KB. Leia should check file sizes before committing and warn if the budget is at risk.

**Key SDD sections:** None directly (leia does not make design decisions).

**Model:** Keep haiku. Git operations are mechanical and well-defined.

---

## 3. New Agents to Consider

### sentry-endurance (sonnet) -- Long-running stability monitor

**Role:** Runs the display in a headless browser for extended periods (1h, 8h, 24h) and monitors for degradation.

**What it does:**
- Launches the page via Chrome DevTools MCP.
- Samples `performance.memory.usedJSHeapSize` every 60 seconds. Flags upward trends.
- Counts console errors. Flags if error count grows.
- Checks that all data modules are still fetching by monitoring network requests.
- Takes a screenshot every 15 minutes and checks that elements have moved (burn-in verification).
- After the test period, produces a stability report: memory trend, error count, fetch health, drift verification.

**Why this role is not covered:** Coraline does UX review (point-in-time), Clarice does debugging (reactive). Neither does proactive, long-duration endurance testing. For a display that must run for months, this is the most important QA function.

**Model:** Sonnet is sufficient. The task is measurement and reporting, not judgment.

### ada-sdd-compliance (sonnet, read-only) -- SDD specification checker

**Role:** Given a code change, verifies that it conforms to the SDD specification for the relevant phase.

**What it does:**
- Reads the code diff.
- Cross-references against SDD requirements for the current phase (extracted into a structured checklist in memory or CLAUDE.md).
- Checks: correct polling intervals, correct API endpoints, correct color math formulas, correct animation timing, correct element count, correct Perlin periods.
- Produces a compliance report: pass/fail per SDD requirement, with section references.

**Why this role is not covered:** Hermione reviews code quality. Ada reviews spec compliance. These are different concerns. Hermione might approve clean, well-structured code that uses the wrong polling interval. Ada catches that.

**Model:** Sonnet. The task is checklist verification against known criteria.

**Implementation note:** Ada needs the SDD requirements extracted into a machine-readable format. The CLAUDE.md file is a start, but a structured JSON or markdown checklist per phase would be more reliable.

### Not recommended

- **iPad/Safari-specific testing agent:** Coraline with the right viewport emulation covers this. A separate agent adds coordination overhead without adding capability.
- **Animation/motion design review agent:** Chihiro with Solari-specific motion rules covers this. The motion vocabulary in Solari is small (Perlin drift, split-flap cascades, macro shifts, luminance breath). It does not warrant a dedicated agent.
- **API integration testing agent:** Kaylee can handle this with the right test harness instructions. The APIs are simple GET requests with no authentication.

---

## 4. Workflow: Phase 9 (Rotator + Kinetic Typography)

Phase 9 implements two independent content slots ("rotators") that cycle through secondary information (weather details, AQI, tides, moon phase, next astronomical event) with split-flap character transitions. This phase touches UI, animation, data, and the SDD spec heavily.

### Step 1: Phase plan (ariadne)

Ariadne writes a phase implementation document covering:
- Which AppState fields Phase 9 adds (SDD Section 8.2).
- The RotatorModule API: `init()`, `start()`, `stop()`, cycling interval (28s slot A, 36s slot B per SDD Section 14.1).
- The KineticType algorithm: character-by-character cascade, random intermediate characters, settling to target, total cascade duration ~800ms (SDD Section 14.2).
- DOM structure: two `<span>` elements, absolutely positioned per layout spec (SDD Section 7).
- Which data sources feed the rotator slots and in what priority order.
- Dependencies on prior phases (Phase 8 must be complete: AQI + tides data available in AppState).
- What is explicitly out of scope (Phase 15 observance palette overrides, Phase 12 macro position shifts for rotator elements).

Ripley reviews the plan for architectural fit: does it respect AppState discipline, does it avoid coupling to future phases, does it preserve burn-in invariants?

### Step 2: Implementation (misaka)

Misaka implements the RotatorModule and KineticType in app.js:
- Adds `state.rotator = { slotA: { text: '', index: 0 }, slotB: { text: '', index: 0 } }` to AppState.
- Implements RotatorModule with `init()` and `start()` per the module API pattern.
- Implements the split-flap algorithm: for each character position, cycle through N random characters over ~800ms total, settling left-to-right.
- Registers Perlin drift for both rotator elements (new coprime periods, distinct from existing elements).
- Updates DisplayModule.render() to read `state.rotator` and write the two slot DOM elements.
- Adds feature flag `CONFIG.features.rotator = true` gated to Phase 9.

Misaka does NOT: add new files, use requestAnimationFrame for the character cycling (use setTimeout chains instead, to avoid interfering with DriftEngine's rAF), add npm dependencies, or implement any Phase 10+ features.

### Step 3: Code review (hermione)

Hermione reviews the implementation for:
- Memory safety: does the setTimeout chain clean up? Can it leak if `stop()` is called mid-cascade?
- Burn-in: are both rotator elements registered with DriftEngine for Perlin drift? Are the periods coprime with all existing periods?
- AppState discipline: does RotatorModule only write to `state.rotator`? Does it only read other state in `init()` for data source setup?
- Safari compatibility: does the split-flap animation use any APIs unavailable in Safari 18+?
- Bundle size: how many bytes did this add?

### Step 4: Visual review (chihiro + coraline)

Chihiro evaluates the design:
- Does the split-flap animation feel like a slow exhale? Or is it too fast/jerky?
- Are the rotator slots positioned correctly per SDD Section 7?
- Does the typography match the active family (Manrope 200 for calm)?
- With the rotators visible, are there more than 5 elements on screen? (If so, the rotator must replace something, not add to it.)

Coraline runs the page via Chrome DevTools MCP on an iPad-sized viewport:
- Takes screenshots at T=0 and T=60s. Confirms rotator content has cycled.
- Records a split-flap transition (rapid screenshots or video). Confirms cascade direction is left-to-right, duration is ~800ms.
- Checks that rotator elements drift over 10 minutes (burn-in).
- Runs for 1 hour; checks memory stability.

### Step 5: Spec compliance (hermione or ada)

Verify against SDD Section 14:
- Slot A cycles every 28s. Slot B cycles every 36s.
- Character cascade uses random intermediate characters from the display charset.
- Total cascade duration ~800ms.
- Content priority order matches SDD Section 14.3.

### Step 6: Commit (leia)

Leia commits with: `feat(phase-9): add rotator slots with split-flap kinetic transitions`

Body includes: "Implements RotatorModule and KineticType per SDD Section 14. Two independent slots cycle secondary content (weather, AQI, tides, moon, almanac) with character-cascade transitions. Registered with DriftEngine for burn-in protection."

---

## 5. Shared Context

The following project-specific context should be available to all agents. The primary vehicle is CLAUDE.md (already in the repo root and loaded automatically). Supplement with seeded agent memories for context that does not belong in CLAUDE.md.

### What CLAUDE.md should contain (and already largely does)

- Project summary (what Solari is, what the SDD is, where it lives).
- Technology constraints (vanilla JS, no build step, 250 KB, iPad Safari, no API keys).
- Architecture overview (AppState, module pattern, two-file split, vendored libs).
- Build phases list with current status (which phases are complete, which is in progress).
- Design rules (the five rules from Section 2.3).
- Burn-in protection layers (all eight, with parameters).
- External API endpoints and polling intervals.
- Repository file structure.
- Style notes (no em dash, no emoji, brief/factual/calm).

CLAUDE.md should be updated as each phase completes. Add a "Phase Status" section:

```
## Phase Status
- [x] Phase 1: Static layout
- [x] Phase 2: Live clock and date
- [ ] Phase 3: Sun and moon math (in progress)
- [ ] Phase 4-15: Not started
```

### What should be in seeded memories (not CLAUDE.md)

Agent memories are for context that helps a specific agent do its job better but would clutter CLAUDE.md. Seed these at adaptation time:

**All agents (project memory):**
- "The SDD .docx in the repo root is the authoritative spec. Section numbers are stable. When in doubt, ask the operator to check the SDD." (This is a process note, not a code fact.)

**Agents that write code (misaka, mikasa, kaylee):**
- "Safari 18+ is the only target browser. Before using any Web API, verify Safari support on MDN. Known gaps: Web Bluetooth, Web USB, SharedArrayBuffer (without COOP/COEP headers), some Web Animations API features."

**Agents that review visuals (chihiro, coraline):**
- "The display is viewed from 2-3 meters away in a living room. Small text, thin lines, and subtle animations that look fine on a laptop screen may be invisible on the iPad at viewing distance. Minimum effective type size is ~14px at 1180px viewport width."

---

## 6. Memory System Adaptation

### Path changes

Every agent's memory path currently points to `/Users/jpaul/Documents/GitHub/build_tfidf/.claude/agent-memory/{agent-name}/`. These must all change to `/Users/jpaul/Documents/GitHub/solari/.claude/agent-memory/{agent-name}/`.

The memory paths appear in each agent's `.md` file in the "Persistent Agent Memory" section. A find-and-replace of `build_tfidf` with `solari` in all 11 files handles this.

### Directory creation

Create the memory directories for all agents:

```
.claude/agent-memory/
  ripley/MEMORY.md
  ariadne/MEMORY.md
  chihiro/MEMORY.md
  misaka/MEMORY.md
  mikasa/MEMORY.md
  hermione/MEMORY.md
  kaylee/MEMORY.md
  clarice/MEMORY.md
  coraline/MEMORY.md
  shizuku/MEMORY.md
  leia/MEMORY.md
```

Each `MEMORY.md` starts empty.

### Shared vs. isolated memory

All agents currently use `memory: project` scope, meaning they share memory within the project. This is correct for Solari. Keep it.

The shared project memory means that when ripley records an architectural decision, hermione can see it during review. When coraline records a visual issue, chihiro can reference it when proposing a fix. This cross-agent visibility is valuable.

No agent needs isolated memory for Solari. The project is small enough that all agents benefit from seeing the full picture.

### Initial memories to seed

Seed the following memories at adaptation time. These encode context that is not in CLAUDE.md and not derivable from code:

**ripley** (project memory):
- "SDD v0.5 is frozen for implementation. Design changes require a new SDD version. Implementation choices within the SDD's latitude are allowed; contradictions are not."

**misaka** (project memory):
- "All DOM writes go through DisplayModule.render(). If you need to update the DOM from a module, update AppState and let the render loop handle it. Direct DOM manipulation outside render() is a bug."

**chihiro** (project memory):
- "The display is viewed from 2-3 meters in ambient lighting. Design for glanceability, not readability. Information should be absorbed peripherally, not studied."

**coraline** (project memory):
- "iPad Air M4 viewport: 1180x820 at 11-inch, 1366x1024 at 13-inch. Always test both. The display runs in Safari with guided access (kiosk mode); there is no browser chrome."

**kaylee** (project memory):
- "There is no test framework yet. The first task is to set one up. Prefer a browser-based test harness (HTML file that loads the source and runs assertions) over a Node.js runner, so tests run in the same environment as production."

**hermione** (project memory):
- "The eight burn-in protection layers are all mandatory and must never be simplified away. If code review finds one missing or broken, that is a Critical issue, not a Suggestion."

### Clearing old memories

If any agent memory directories contain memories from the build_tfidf project, delete them before starting Solari work. Stale memories from a different project will confuse agents. The simplest approach: delete the contents of each agent's memory directory (but keep the directory and an empty MEMORY.md).

---

## Summary of changes by effort level

**Find-and-replace (mechanical, do first):**
- Memory paths: `build_tfidf` to `solari` in all 11 agent .md files.
- Description/examples: update to reference Solari concepts instead of Python/CLI concepts.

**Prompt rewrite (moderate, domain-specific):**
- ripley: replace pipeline architecture with AppState/module architecture.
- misaka: replace generic coding prompt with vanilla JS constraints and Solari patterns.
- hermione: replace Python review checklist with browser/burn-in/Safari checklist.
- kaylee: replace pytest/GitHub Actions orientation with browser test harness approach.
- clarice: replace pytest debugging with Chrome DevTools debugging.
- chihiro: replace generic UI design with kinetic typography and ambient display design.
- coraline: replace generic UX review with iPad viewport, burn-in, and ambient quality review.

**Light edits (minimal changes needed):**
- ariadne: add SDD context, otherwise keep.
- mikasa: add JS/Safari constraints, keep core simplification principles.
- shizuku: adjust documentation types, keep style.
- leia: add phase-number commit convention, keep everything else.

**New agents to create:**
- sentry-endurance: long-running stability monitor.
- ada-sdd-compliance: specification conformance checker (optional, can be folded into hermione).

**Model changes to consider:**
- chihiro: sonnet to opus (aesthetic judgment for art-installation display).
- coraline: sonnet to opus (same reasoning).
- All others: keep current models.
