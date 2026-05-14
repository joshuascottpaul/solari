# Face design checklist

A discipline doc for locking a new clockface (or revising an existing one). Consulted by **chihiro** before signing off design decisions; embedded into the **ariadne** spec; verified by **coraline** post-implementation.

This is the cheap, finite-scope alternative to a standing horology-critic agent. The Solari display is closer to *public-information design* (station clocks, museum labels, broadcast supers, magazine cover composition, wayfinding) than to wristwatch horology. References should serve a measurement or an argument — not decorate one.

Origin: ripley's self-critique on the proposed "Violet" clockface review agent (2026-05-13). The lessons that survived the critique are codified here. The Horizon 20.1 measurement miss (685 px rendered vs 220 px assumed) is the canonical example of what this checklist exists to prevent.

---

## 1. Measured rendered widths before layout lock

For every static text element at production font + weight + size, record the **measured** rendered width — not the assumed width. Read the bounding box from a real render at the stage scale.

- Method: render the element at production specs in a browser; read `getBoundingClientRect()` width; divide by `--stage-scale` for stage-pixel coordinates.
- Document the measured value in the spec next to the home coordinate. Example: `#hz-time at left:140, measured width 685 px → right edge 825 px`.
- Re-measure if the format changes (12h ↔ 24h, AM/PM ↔ no AM/PM, locale changes). Note the worst-case width.

**Failure mode this prevents:** Horizon Phase 20 assumed ~220 px and shipped two homes that put the right home at `left:870`. Actual width 685 px caused left-clip at Home A and a 309×130 px stack on the status block at Home B. Fixed in 20.1 by collapsing to one home — a fix that would have been unnecessary if the width had been measured before lock.

## 2. Visual fulcrum

State, in one sentence, **where the eye lands first** on this face. Then state where it lands second, and third. Exactly one fulcrum per face.

- If you cannot state it cleanly, the composition is not yet locked.
- Two competing weight centers on the same horizontal or vertical axis without a balancing third element produce visual tension that reads as a bug.
- Calm fulcrum: time numerals. Mechanical fulcrum: time numerals, with the minute-arc as a fading second hand. Departures fulcrum: flap-pair headline time. Editorial fulcrum: italic time block, mirrored to right-column kicker. Horizon fulcrum: the diagram (arcs + cursor); time numerals are a corner footnote.

**Failure mode this prevents:** Horizon's original two-home time at 685 px wide on the same y-band as a status block at the same y-band — two unbalanced weight centers, no third counterweight.

## 3. Viewing distance stated

Document the assumed viewing distance and lighting condition in the spec header. Solari's canonical condition is **2-6 m in a living room under variable warm lamp + ambient daylight, iPad display brightness 40-60%**.

- Do not borrow wristwatch-at-20-cm-under-300-lux references uncritically. Stroke-mass thresholds for wristwatches do not transfer.
- Closer analogues: a station departure board read from across a platform; a museum object label read while walking past; a TV broadcast super read from a sofa.

## 4. Reference vocabulary (widened)

When citing precedent, prefer **public-information design** references over wristwatch horology references. The display lives in a room, not on a wrist.

- Station clocks: Mondaine (Swiss railway), Helvetica wayfinding, NS (Dutch railways).
- Museum signage and book typography: Bringhurst's "Elements of Typographic Style" weight/size tables for sustained reading vs glance.
- Broadcast supers and chyron design: BBC, NHK, broadcast typography conventions for legibility against varying backgrounds.
- Magazine cover composition: Vogue, Wired, The New Yorker — mirrored-axis composition, kicker treatments (Editorial draws on this).
- Wayfinding: airport signage, MTA, MoMA wall labels.
- Kinetic typography in film: Saul Bass, Kyle Cooper title sequences (Departures' split-flap cascade draws on this).
- Auto Memory Doll / letterpress / typesetting: when the question is "what does this face *say*, and to whom," the relevant tradition is composed correspondence and printed matter, not horology.

When a wristwatch reference *is* on point (e.g. the Departures face's flap-pair bezel directly references Solari departure boards), cite it. When it isn't, don't decorate the argument with one.

## 5. Stroke mass and contrast under realistic light

Verify legibility under the canonical condition (warm lamp + ambient daylight, brightness 40-60%), not under spec-sheet lux.

- Manrope 200 at large sizes reads as a near-hairline outline at low ambient brightness. Acceptable on Calm because the dissolve-into-near-black is intentional. Question every other face that uses 200 weight.
- Test with the display on the actual iPad in the actual room at the actual time of day before locking. Local-dev under bright office light is misleading.

## 6. The Auto Memory Doll question

In one paragraph: **what does this face *say*, and to whom?**

- Calm says "the moment is calm; the time is here when you want it; nothing demands you." To a person who lives with the display.
- Mechanical says "the time is precise and observable; here is the data, sorted." To someone who wants to glance and know the AQI, the tide, the next sun event without reading prose.
- Departures says "departures are tracked; the world is in motion and Solari is its small board." To someone delighted by split-flap industrial design.
- Editorial says "today is a magazine cover; here is its kicker, its date, its standfirst." To someone who reads.
- Horizon says "the sun and moon are tracked; you are a small observer of a big sky." To someone who wants the natural world to be the timepiece.

If you cannot complete this paragraph for a new face, the face does not yet have a voice. Compose the voice before committing to a layout.

---

## Where this fits in the pipeline

| Step | Agent | Checklist responsibility |
|---|---|---|
| Design lock | chihiro | Run through all six items before signing off design decisions. If any item is unresolved, the lock is incomplete. |
| Spec draft | ariadne | Embed the measured widths, the stated fulcrum, the viewing-distance assumption, and the Auto Memory Doll paragraph directly into the spec. |
| Implementation | misaka | If a measured width does not match the spec, stop and flag — do not shrink the element to fit. |
| Visual review | coraline | Verify item 1 (measured widths render as specified) and item 2 (the visual fulcrum is where it was stated to be) at production scale. |

This is a discipline doc, not a gate. The pipeline does not add a checklist-runner agent. The cost of consulting six bullets is small enough that it lives in the heads of chihiro and ariadne, written down so they cannot drift away from it.

**Motoko** is the triggered review agent who reads this checklist's outputs and verifies operational coherence -- that the running system matches the spec claims the checklist was used to produce. Motoko is distinct from coraline (pixel verification) and from the checklist itself (declared-value verification). She is invoked selectively by chihiro when there is uncertainty, a face revision, or a new system primitive; not on every phase.

## Open question deferred to a future cycle

The "Violet" naming proposal (ripley, 2026-05-13) is shelved against a future role where composition-of-meaning is the actual job — a kinetic-type copywriter, an observance-line author, or a paragraph-template editor for Editorial. The Auto Memory Doll framing fits that role better than it fits a clockface critic.
