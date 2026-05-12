// clockface.js -- Solari face picker. Single-purpose configuration page,
// loaded only when the user long-presses the moon disc (or navigates here
// directly). The always-on display never loads this file.
//
// Phase 17: Calm and Mechanical render real faces. The picker loads app.js
// with window.SOLARI_PICKER = true so the boot IIFE returns early; only the
// face class objects are exported (window.MechanicalFace etc). Departures,
// Editorial, and Horizon remain placeholder cards.

(function () {
  // Mirrors of the main app's CONFIG.driftClasses entries. Kept in sync
  // by hand; the picker is a separate page. tickRail mirrors the entry
  // Phase 17 activates on the runtime side. Phase 18 adds five
  // departureRow* sub-channels (period 61 s, ampX 6, ampY 4) that share
  // the 'departureRow' class config with independent phase offsets.
  const DRIFT_CLASSES = {
    time:          { ampX: 24, ampY: 18, periodSec: 117, phaseX: 0,    phaseY: 100  },
    date:          { ampX: 12, ampY: 8,  periodSec: 89,  phaseX: 200,  phaseY: 300  },
    slot:          { ampX: 12, ampY: 8,  periodSec: 143, phaseX: 400,  phaseY: 500  },
    moon:          { ampX: 18, ampY: 12, periodSec: 73,  phaseX: 800,  phaseY: 900  },
    tickRail:      { ampX: 4,  ampY: 3,  periodSec: 79,  phaseX: 1000, phaseY: 1100 },
    departureRow0: { ampX: 6,  ampY: 4,  periodSec: 61,  phaseX: 1200, phaseY: 1300 },
    departureRow1: { ampX: 6,  ampY: 4,  periodSec: 61,  phaseX: 1400, phaseY: 1500 },
    departureRow2: { ampX: 6,  ampY: 4,  periodSec: 61,  phaseX: 1600, phaseY: 1700 },
    departureRow3: { ampX: 6,  ampY: 4,  periodSec: 61,  phaseX: 1800, phaseY: 1900 },
    departureRow4: { ampX: 6,  ampY: 4,  periodSec: 61,  phaseX: 2000, phaseY: 2100 }
  };

  const DRIFT_INTENSITY_MULT = {
    off: 0.0, subtle: 0.5, normal: 1.0, restless: 1.5
  };

  // DUAL-SOURCE: this block is duplicated in app.js ACCENT_PALETTE (two-file
  // rule, no shared module). Keep both copies in sync when editing keys or hexes.
  const ACCENT_PALETTE = {
    gold:  { hex: '#F4C56C', secondary: 'rgba(240, 235, 220, 0.62)' },
    sky:   { hex: '#7FA8C9', secondary: 'rgba(220, 232, 245, 0.62)' },
    sage:  { hex: '#A9C29A', secondary: 'rgba(225, 235, 218, 0.62)' },
    paper: { hex: '#E8E0D0', secondary: 'rgba(240, 235, 220, 0.62)' }
  };

  const TWEAK_DEFAULTS = {
    accent: 'gold',
    driftIntensity: 'normal',
    byFace: {}
  };

  // Mechanical and Editorial share the same time-format option set.
  const FACE_TIME_FORMATS = ['24h', '12h'];

  // Phase 18: Departures opacity tweak clamp. Mirrors app.js's normaliser.
  const DEPARTURES_OPACITY_MIN = 0.0;
  const DEPARTURES_OPACITY_MAX = 0.4;
  const DEPARTURES_OPACITY_DEFAULT = 0.22;

  // Phase 19: per-face macro shift tables for the picker preview.
  // DUAL-SOURCE: these values mirror app.js's
  //   CONFIG.macroShift.timeHomesByFace.editorial
  //   CONFIG.macroShift.rightBlockHomesByFace.editorial
  // Both copies must stay in sync; the picker cannot read CONFIG because the
  // boot guard skips app.js initialization on clockface.html. Same pattern as
  // ACCENT_PALETTE. previewMode compresses 6 h -> 6 s so reviewers see the
  // composition swap inside a normal preview session.
  const EDITORIAL_TIME_HOMES = [[100, 200], [560, 200]];
  const EDITORIAL_RIGHT_HOMES = [[850, 220], [290, 220]];
  function clampDeparturesOpacity(v) {
    if (typeof v !== 'number' || !isFinite(v)) return DEPARTURES_OPACITY_DEFAULT;
    if (v < DEPARTURES_OPACITY_MIN) return DEPARTURES_OPACITY_MIN;
    if (v > DEPARTURES_OPACITY_MAX) return DEPARTURES_OPACITY_MAX;
    return v;
  }

  const FACES = [
    { id: 'calm',       name: 'Calm',       blurb: 'type weight 200, slow drift, single slot',     phase: 16, real: true,  liveRender: false },
    { id: 'mechanical', name: 'Mechanical', blurb: 'monospace grid, minute-arc, JetBrains Mono',   phase: 17, real: true,  liveRender: true  },
    { id: 'departures', name: 'Departures', blurb: 'split-flap board, gold imminent rows',         phase: 18, real: true,  liveRender: true  },
    { id: 'editorial',  name: 'Editorial',  blurb: 'magazine italic, rotating almanac paragraph',  phase: 19, real: true,  liveRender: true  },
    { id: 'horizon',    name: 'Horizon',    blurb: 'sun and moon arcs, hour ticks',                phase: 20, real: false, liveRender: false }
  ];

  // Phase 17: deterministic preview state shared across live face renders.
  // The picker advances PREVIEW_STATE.time once per second so live faces
  // animate plausibly without touching network or real-time state.
  const PREVIEW_STATE = {
    time: { hours: 14, minutes: 32, seconds: 0, ampm: null },
    date: { dayOfWeek: 'Monday', day: 11, month: 'May', year: 2026, isoDate: '2026-05-11' },
    sun:  { sunrise: '05:22', sunset: '20:47', dayLengthMin: 925, altitude: 12, azimuth: 220 },
    moon: { phase: 0.18, illumination: 0.18, phaseName: 'Waxing Crescent', terminatorAngle: 0, moonrise: '20:14', moonset: '06:38', alwaysUp: false, alwaysDown: false },
    // Phase 19: visibilityKm read by Editorial's fog-day template placeholder.
    weather: { tempC: 12, condition: 'PARTLY_CLOUDY', code: 2, visibilityKm: 18 },
    aqi:  { value: 24, pm25: 6, band: 'good' },
    tide: { type: 'high', heightM: 4.3, time: '17:14' },
    alert: null,
    alertPreempt: null,
    almanac: { name: 'ETA AQUARIIDS', date: '2026-05-13', daysAway: 2 },
    rotator: { text: '', index: 0 },
    // Phase 19: observance.name_long drives EditorialFace dropline when
    // treatment is 'light'. Toggle this to a sample object during preview to
    // exercise the dropline path. Persisted as null for shipped preview.
    observance: null,
    meta: { bootedAt: Date.now(), lastUpdate: {} }
  };

  function normalizeTweaks(raw) {
    const def = TWEAK_DEFAULTS;
    let parsed = null;
    if (typeof raw === 'string' && raw.length) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    } else if (raw && typeof raw === 'object') {
      parsed = raw;
    }
    if (!parsed || typeof parsed !== 'object') {
      return {
        accent: def.accent,
        driftIntensity: def.driftIntensity,
        byFace: {
          mechanical: { timeFormat: '24h', previewMode: false },
          departures: { flapBezelOpacity: DEPARTURES_OPACITY_DEFAULT },
          editorial:  { timeFormat: '24h', previewMode: false }
        }
      };
    }
    const accent = ACCENT_PALETTE[parsed.accent] ? parsed.accent : def.accent;
    const driftIntensity = (DRIFT_INTENSITY_MULT[parsed.driftIntensity] !== undefined)
      ? parsed.driftIntensity
      : def.driftIntensity;
    const byFace = (parsed.byFace && typeof parsed.byFace === 'object') ? parsed.byFace : {};

    // Phase 17: normalise mechanical sub-object. Mirrors app.js's
    // ClockfaceRegistry.normalizeTweaks (duplicate-by-design: clockface.html
    // and index.html share no module system).
    const mech = (byFace.mechanical && typeof byFace.mechanical === 'object')
      ? byFace.mechanical
      : {};
    const tf = FACE_TIME_FORMATS.indexOf(mech.timeFormat) >= 0 ? mech.timeFormat : '24h';
    const pm = mech.previewMode === true;
    byFace.mechanical = { timeFormat: tf, previewMode: pm };

    // Phase 18: normalise departures sub-object. Same shape and clamp as
    // app.js's normaliser; flapBezelOpacity in [0.0, 0.4], default 0.22.
    const dep = (byFace.departures && typeof byFace.departures === 'object')
      ? byFace.departures
      : {};
    byFace.departures = {
      flapBezelOpacity: clampDeparturesOpacity(dep.flapBezelOpacity)
    };

    // Phase 19: normalise editorial sub-object. Mirrors app.js. previewMode
    // is picker-only edge state and is stripped from persisted tweaks on Apply.
    const ed = (byFace.editorial && typeof byFace.editorial === 'object')
      ? byFace.editorial
      : {};
    const edTf = FACE_TIME_FORMATS.indexOf(ed.timeFormat) >= 0 ? ed.timeFormat : '24h';
    const edPm = ed.previewMode === true;
    byFace.editorial = { timeFormat: edTf, previewMode: edPm };

    return { accent: accent, driftIntensity: driftIntensity, byFace: byFace };
  }

  // Boot state
  const persistedFaceId = localStorage.getItem('solari.clockface') || 'calm';
  const persistedTweaks = normalizeTweaks(localStorage.getItem('solari.clockface.tweaks'));
  // The "draft" is the live picker state; edits apply immediately to preview.
  // No Cancel button exists in Phase 16; the back link returns to the display
  // without persisting. If a Cancel button is added, snapshot the persisted
  // tweaks before edits begin and restore from that snapshot.
  let draftTweaks = JSON.parse(JSON.stringify(persistedTweaks));
  let activeIndex = Math.max(0, FACES.findIndex(f => f.id === persistedFaceId));

  // -------- DOM construction --------

  const picker = document.getElementById('picker');
  const dotsEl = document.getElementById('dots');
  const tweaksEl = document.getElementById('tweaks');
  const swatchesEl = document.getElementById('swatches');
  const segDrift = document.getElementById('seg-drift');
  const segMechFormat = document.getElementById('seg-mech-format');
  const rowMechFormat = document.getElementById('row-mech-format');
  const rowDepBezel = document.getElementById('row-dep-bezel');
  const depBezelSlider = document.getElementById('dep-bezel-opacity');
  const depBezelValEl = document.getElementById('dep-bezel-opacity-val');
  const segEdFormat = document.getElementById('seg-ed-format');
  const rowEdFormat = document.getElementById('row-ed-format');
  const btnTweaks = document.getElementById('btn-tweaks');
  const btnApply = document.getElementById('btn-apply');
  const toolbarName = document.getElementById('toolbar-name');
  const toolbarBlurb = document.getElementById('toolbar-blurb');
  const toolbarIndex = document.getElementById('toolbar-index');
  const toast = document.getElementById('toast');

  // Build face sections
  const sectionEls = [];
  const stageEls = [];
  FACES.forEach((face) => {
    const section = document.createElement('section');
    section.className = 'face-section';
    section.dataset.faceId = face.id;

    const stage = document.createElement('div');
    stage.className = 'preview-stage';
    stage.dataset.faceId = face.id;

    if (face.id === 'calm') {
      stage.innerHTML =
        '<svg class="pv-moon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<circle cx="50" cy="50" r="48" fill="var(--type-primary)" opacity="0.06"/>' +
          '<path d="M 50 2 A 48 48 0 0 1 50 98 A 28 48 0 0 0 50 2" fill="var(--type-primary)" opacity="0.3"/>' +
        '</svg>' +
        '<div class="pv-time">' +
          '<span>8</span><span>:</span><span>14</span>' +
          '<span style="font-size: 38px; vertical-align: top; margin-left: 0.1em;">PM</span>' +
        '</div>' +
        '<div class="pv-date">WEDNESDAY &middot; MAY 7</div>' +
        '<div class="pv-slot">SUNSET 8:47 PM</div>';
    } else if (face.liveRender && face.id === 'mechanical' && window.MechanicalFace) {
      // Phase 17: live preview via window.MechanicalFace exported by app.js.
      // The face needs an element with id="stage" to mount its subtree; the
      // preview-stage div serves that role inside the picker card.
      stage.id = 'stage-' + face.id;
      window.MechanicalFace.init(stage);
      // First paint at init so the card is not blank before the 1 Hz loop fires.
      try {
        window.MechanicalFace.render(PREVIEW_STATE, {
          accent: draftTweaks.accent,
          driftIntensity: draftTweaks.driftIntensity,
          byFace: { mechanical: { timeFormat: '24h', previewMode: true } }
        });
      } catch (e) { /* swallow first-paint errors */ }
    } else if (face.liveRender && face.id === 'departures' && window.DeparturesFace) {
      // Phase 18: live preview via window.DeparturesFace exported by app.js.
      stage.id = 'stage-' + face.id;
      window.DeparturesFace.init(stage);
      try {
        window.DeparturesFace.render(PREVIEW_STATE, {
          accent: draftTweaks.accent,
          driftIntensity: draftTweaks.driftIntensity,
          byFace: {
            departures: (draftTweaks.byFace && draftTweaks.byFace.departures) ||
                        { flapBezelOpacity: DEPARTURES_OPACITY_DEFAULT }
          }
        });
      } catch (e) { /* swallow first-paint errors */ }
    } else if (face.liveRender && face.id === 'editorial' && window.EditorialFace) {
      // Phase 19: live preview via window.EditorialFace exported by app.js.
      stage.id = 'stage-' + face.id;
      window.EditorialFace.init(stage);
      try {
        const edDraft = (draftTweaks.byFace && draftTweaks.byFace.editorial) || { timeFormat: '24h' };
        window.EditorialFace.render(PREVIEW_STATE, {
          accent: draftTweaks.accent,
          driftIntensity: draftTweaks.driftIntensity,
          byFace: { editorial: Object.assign({}, edDraft, { previewMode: true }) }
        });
      } catch (e) { /* swallow first-paint errors */ }
    } else {
      const ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.innerHTML =
        '<div class="placeholder-name">' + face.name + '</div>' +
        '<div class="placeholder-meta">COMING SOON &middot; PHASE ' + face.phase + '</div>';
      stage.appendChild(ph);
    }

    section.appendChild(stage);
    picker.appendChild(section);
    sectionEls.push(section);
    stageEls.push(stage);
  });

  // Build dots
  FACES.forEach((face, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.title = face.name;
    dot.addEventListener('click', () => setActive(i, true));
    dotsEl.appendChild(dot);
  });

  // Build accent swatches
  Object.keys(ACCENT_PALETTE).forEach(id => {
    const sw = document.createElement('button');
    sw.className = 'swatch';
    sw.dataset.accent = id;
    sw.style.background = ACCENT_PALETTE[id].hex;
    sw.addEventListener('click', () => {
      draftTweaks.accent = id;
      applyTweaksToPreview();
      renderTweaksUI();
    });
    swatchesEl.appendChild(sw);
  });

  // Wire segmented drift control
  segDrift.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      draftTweaks.driftIntensity = btn.dataset.val;
      renderTweaksUI();
    });
  });

  // Phase 17: segmented Mechanical time format control. Only meaningful when
  // Mechanical is the active face; the row is hidden otherwise.
  segMechFormat.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      draftTweaks.byFace = draftTweaks.byFace || {};
      const mech = draftTweaks.byFace.mechanical || { timeFormat: '24h', previewMode: false };
      mech.timeFormat = btn.dataset.val;
      draftTweaks.byFace.mechanical = mech;
      renderTweaksUI();
    });
  });

  // Phase 18: Departures bezel-opacity slider. Range [0.0, 0.4], step 0.02.
  // Only meaningful when Departures is the active face; row hidden otherwise.
  if (depBezelSlider) {
    depBezelSlider.addEventListener('input', () => {
      draftTweaks.byFace = draftTweaks.byFace || {};
      const dep = draftTweaks.byFace.departures || { flapBezelOpacity: DEPARTURES_OPACITY_DEFAULT };
      dep.flapBezelOpacity = clampDeparturesOpacity(parseFloat(depBezelSlider.value));
      draftTweaks.byFace.departures = dep;
      renderTweaksUI();
    });
  }

  // Phase 19: Editorial time format segmented control. Only meaningful when
  // Editorial is the active face; row hidden otherwise. Mirrors the Mechanical
  // 24h/12h pattern; previewMode is added at render time and never persisted.
  if (segEdFormat) {
    segEdFormat.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        draftTweaks.byFace = draftTweaks.byFace || {};
        const ed = draftTweaks.byFace.editorial || { timeFormat: '24h', previewMode: false };
        ed.timeFormat = btn.dataset.val;
        draftTweaks.byFace.editorial = ed;
        renderTweaksUI();
      });
    });
  }

  // Wire tweaks toggle
  btnTweaks.addEventListener('click', () => {
    tweaksEl.classList.toggle('open');
  });

  // Wire apply
  btnApply.addEventListener('click', apply);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tweaksEl.classList.remove('open');
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') {
      e.preventDefault();
      setActive(Math.min(FACES.length - 1, activeIndex + 1), true);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') {
      e.preventDefault();
      setActive(Math.max(0, activeIndex - 1), true);
    } else if (e.key === 'Enter' && document.activeElement === btnApply) {
      apply();
    }
  });

  // Scroll detection -- update activeIndex from scroll position so dot/toolbar
  // stay in sync when the user scrolls naturally.
  let scrollTimer = null;
  picker.addEventListener('scroll', () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const idx = Math.round(picker.scrollTop / window.innerHeight);
      if (idx >= 0 && idx < FACES.length && idx !== activeIndex) {
        setActive(idx, false);
      }
    }, 80);
  });

  // -------- IntersectionObserver: pause off-screen card previews --------

  const visibleStages = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        visibleStages.add(entry.target);
      } else {
        visibleStages.delete(entry.target);
      }
    });
  }, { threshold: [0, 0.3, 0.6, 1] });
  stageEls.forEach(s => io.observe(s));
  window.addEventListener('pagehide', () => io.disconnect());

  // -------- Stage scaling per card --------

  function recomputeCardScale() {
    // Each card is full-viewport height/width; scale the 1180x820 stage to fit.
    const W = window.innerWidth * 0.78;   // leave space for chrome + dots
    const H = window.innerHeight * 0.72;  // leave space for top + bottom bars
    const s = Math.min(W / 1180, H / 820, 0.85);
    stageEls.forEach(stage => {
      stage.style.transform = 'scale(' + s.toFixed(4) + ')';
    });
  }
  recomputeCardScale();
  window.addEventListener('resize', recomputeCardScale);

  // -------- Drift loop (single rAF) --------

  const startTime = performance.now() / 1000;
  let driftMult = DRIFT_INTENSITY_MULT[draftTweaks.driftIntensity];

  function driftLoop() {
    const t = performance.now() / 1000 - startTime;
    // Only update CSS variables for visible stages. Off-screen stages keep
    // their last-set drift offsets, which avoids per-frame DOM writes for
    // cards the user can't see.
    visibleStages.forEach(stage => {
      Object.keys(DRIFT_CLASSES).forEach(key => {
        const c = DRIFT_CLASSES[key];
        const sx = t / c.periodSec + c.phaseX;
        const sy = t / c.periodSec + c.phaseY;
        const dx = c.ampX * driftMult * perlin1d(sx);
        const dy = c.ampY * driftMult * perlin1d(sy);
        stage.style.setProperty('--' + key + '-dx', dx.toFixed(1) + 'px');
        stage.style.setProperty('--' + key + '-dy', dy.toFixed(1) + 'px');
      });
    });
    requestAnimationFrame(driftLoop);
  }
  requestAnimationFrame(driftLoop);

  // Phase 17: drive live face renders on a 1 Hz interval. The interval
  // advances PREVIEW_STATE.time once per second so the minute-arc grows
  // visibly; the day-of-week and date strings stay frozen at seeded values.
  // previewTweaks() forces previewMode=true for the mechanical sub-object
  // so the 6h column rotation compresses to a 6s cycle in the picker.
  function previewTweaks() {
    const byFace = (draftTweaks.byFace && typeof draftTweaks.byFace === 'object')
      ? draftTweaks.byFace : {};
    const mech = (byFace.mechanical && typeof byFace.mechanical === 'object')
      ? byFace.mechanical : { timeFormat: '24h' };
    // Phase 19: editorial previewMode compresses 6h paragraph rotation to 6s
    // and signals the picker to run its accelerated macro-shift.
    const ed = (byFace.editorial && typeof byFace.editorial === 'object')
      ? byFace.editorial : { timeFormat: '24h' };
    return {
      accent: draftTweaks.accent,
      driftIntensity: draftTweaks.driftIntensity,
      byFace: Object.assign({}, byFace, {
        mechanical: Object.assign({}, mech, { previewMode: true }),
        editorial:  Object.assign({}, ed,   { previewMode: true })
      })
    };
  }

  const liveFaces = FACES.filter(f => f.liveRender);
  let previewClockId = null;
  if (liveFaces.length) {
    previewClockId = setInterval(() => {
      PREVIEW_STATE.time.seconds = (PREVIEW_STATE.time.seconds + 1) % 60;
      if (PREVIEW_STATE.time.seconds === 0) {
        PREVIEW_STATE.time.minutes = (PREVIEW_STATE.time.minutes + 1) % 60;
      }
      // Only render if the card is in view; off-screen cards retain their
      // last-painted state until the user scrolls them back into view.
      const tweaks = previewTweaks();
      liveFaces.forEach(face => {
        const idx = FACES.indexOf(face);
        const stage = stageEls[idx];
        if (!visibleStages.has(stage)) return;
        if (face.id === 'mechanical' && window.MechanicalFace) {
          try { window.MechanicalFace.render(PREVIEW_STATE, tweaks); }
          catch (e) { /* swallow render errors so the loop keeps ticking */ }
        } else if (face.id === 'departures' && window.DeparturesFace) {
          try { window.DeparturesFace.render(PREVIEW_STATE, tweaks); }
          catch (e) { /* swallow render errors so the loop keeps ticking */ }
        } else if (face.id === 'editorial' && window.EditorialFace) {
          try { window.EditorialFace.render(PREVIEW_STATE, tweaks); }
          catch (e) { /* swallow render errors so the loop keeps ticking */ }
          // Phase 19: accelerated macro shift on the Editorial card. Drives
          // the time + right-block paired flip on a 6 s cadence so reviewers
          // see the composition swap within a normal preview session.
          editorialPreviewMacroShift(stage);
        }
      });
    }, 1000);
    window.addEventListener('pagehide', () => {
      if (previewClockId !== null) clearInterval(previewClockId);
      previewClockId = null;
    });
  }

  // -------- Phase 19: Editorial preview macro-shift --------

  // Accelerated 6 h -> 6 s macro shift cadence for the Editorial card. Reads
  // EDITORIAL_TIME_HOMES / EDITORIAL_RIGHT_HOMES and writes left/top on
  // #ed-time and #ed-right inside the supplied stage. The 1s transition is
  // proportional to the 60 s production transition. Idempotent per-second
  // (skips when the index has not changed).
  let lastEdMacroIdx = -1;
  function editorialPreviewMacroShift(stage) {
    if (!stage) return;
    const idx = Math.floor(performance.now() / 6000) % EDITORIAL_TIME_HOMES.length;
    if (idx === lastEdMacroIdx) return;
    lastEdMacroIdx = idx;
    const timeEl = stage.querySelector('#ed-time');
    const rightEl = stage.querySelector('#ed-right');
    const trans = 'left 1s ease-in-out, top 1s ease-in-out';
    if (timeEl) {
      timeEl.style.transition = trans;
      timeEl.style.left = EDITORIAL_TIME_HOMES[idx][0] + 'px';
      timeEl.style.top  = EDITORIAL_TIME_HOMES[idx][1] + 'px';
    }
    if (rightEl) {
      rightEl.style.transition = trans;
      rightEl.style.left = EDITORIAL_RIGHT_HOMES[idx][0] + 'px';
      rightEl.style.top  = EDITORIAL_RIGHT_HOMES[idx][1] + 'px';
    }
  }

  // -------- Tweak application + UI sync --------

  function applyTweaksToPreview() {
    const accent = ACCENT_PALETTE[draftTweaks.accent] || ACCENT_PALETTE.gold;
    document.documentElement.style.setProperty('--type-accent', accent.hex);
    document.documentElement.style.setProperty('--type-secondary', accent.secondary);
    // Phase 18: seed --bezel-accent (frozen chrome) and --flap-bezel-opacity
    // so the Departures preview card shows the correct bezel.
    const hex = accent.hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty('--bezel-accent', r + ', ' + g + ', ' + b);
    const dep = (draftTweaks.byFace && draftTweaks.byFace.departures) || {};
    const op = (typeof dep.flapBezelOpacity === 'number') ? dep.flapBezelOpacity : DEPARTURES_OPACITY_DEFAULT;
    document.documentElement.style.setProperty('--flap-bezel-opacity', String(op));
    driftMult = DRIFT_INTENSITY_MULT[draftTweaks.driftIntensity];
  }

  function renderTweaksUI() {
    // Accent swatches
    swatchesEl.querySelectorAll('.swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.accent === draftTweaks.accent);
    });
    // Drift segmented
    segDrift.querySelectorAll('.seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === draftTweaks.driftIntensity);
    });
    // Phase 17: mechanical time format segmented
    const mechTf = (draftTweaks.byFace && draftTweaks.byFace.mechanical && draftTweaks.byFace.mechanical.timeFormat) || '24h';
    segMechFormat.querySelectorAll('.seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === mechTf);
    });
    // Phase 19: editorial time format segmented
    const edTf = (draftTweaks.byFace && draftTweaks.byFace.editorial && draftTweaks.byFace.editorial.timeFormat) || '24h';
    if (segEdFormat) {
      segEdFormat.querySelectorAll('.seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === edTf);
      });
    }
    // Phase 18: departures bezel-opacity slider value sync
    const depOp = (draftTweaks.byFace && draftTweaks.byFace.departures && typeof draftTweaks.byFace.departures.flapBezelOpacity === 'number')
      ? draftTweaks.byFace.departures.flapBezelOpacity
      : DEPARTURES_OPACITY_DEFAULT;
    if (depBezelSlider && depBezelSlider.value !== String(depOp)) {
      depBezelSlider.value = String(depOp);
    }
    if (depBezelValEl) depBezelValEl.textContent = depOp.toFixed(2);
    applyTweaksToPreview();
  }

  // -------- Active face state --------

  function setActive(i, scroll) {
    activeIndex = i;
    const face = FACES[i];

    // Dots
    dotsEl.querySelectorAll('.dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === i);
    });

    // Toolbar
    toolbarName.textContent = face.name.toUpperCase();
    toolbarBlurb.textContent = face.blurb;
    toolbarIndex.textContent =
      String(i + 1).padStart(2, '0') + ' / ' + String(FACES.length).padStart(2, '0');

    // Apply button enabled only on real faces
    btnApply.disabled = !face.real;

    // Phase 17: show mechanical-specific tweak row only when Mechanical is active.
    if (rowMechFormat) rowMechFormat.hidden = (face.id !== 'mechanical');
    // Phase 18: show departures bezel-opacity slider only when Departures is active.
    if (rowDepBezel) rowDepBezel.hidden = (face.id !== 'departures');
    // Phase 19: show editorial time format segmented only when Editorial is active.
    if (rowEdFormat) rowEdFormat.hidden = (face.id !== 'editorial');

    if (scroll) {
      sectionEls[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // -------- Apply / Cancel --------

  function apply() {
    const face = FACES[activeIndex];
    if (!face.real) return;
    // Phase 17/19: previewMode is picker-only edge state; strip it before
    // persist so the main display never sees previewMode=true.
    const persistable = JSON.parse(JSON.stringify(draftTweaks));
    if (persistable.byFace && persistable.byFace.mechanical) {
      delete persistable.byFace.mechanical.previewMode;
    }
    if (persistable.byFace && persistable.byFace.editorial) {
      delete persistable.byFace.editorial.previewMode;
    }
    try {
      localStorage.setItem('solari.clockface', face.id);
      localStorage.setItem('solari.clockface.tweaks', JSON.stringify(persistable));
      localStorage.setItem('solari.clockface.applied_at', new Date().toISOString());
    } catch (e) {
      console.warn('clockface: localStorage write failed', e);
      return;
    }
    toast.textContent = face.name.toUpperCase() + ' APPLIED';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // -------- Initial paint --------

  renderTweaksUI();
  setActive(activeIndex, true);
})();
