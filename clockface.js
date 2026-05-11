// clockface.js -- Solari face picker. Single-purpose configuration page,
// loaded only when the user long-presses the moon disc (or navigates here
// directly). The always-on display never loads this file.
//
// Phase 16: only Calm renders a real face. The other four entries render
// placeholder cards. Apply is disabled when a placeholder is active.

(function () {
  // Mirrors of the main app's CONFIG.driftClasses entries. Kept in sync
  // by hand; the picker is a separate page and does not import app.js.
  const DRIFT_CLASSES = {
    time: { ampX: 24, ampY: 18, periodSec: 117, phaseX: 0,   phaseY: 100 },
    date: { ampX: 12, ampY: 8,  periodSec: 89,  phaseX: 200, phaseY: 300 },
    slot: { ampX: 12, ampY: 8,  periodSec: 143, phaseX: 400, phaseY: 500 },
    moon: { ampX: 18, ampY: 12, periodSec: 73,  phaseX: 800, phaseY: 900 }
  };

  const DRIFT_INTENSITY_MULT = {
    off: 0.0, subtle: 0.5, normal: 1.0, restless: 1.5
  };

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

  const FACES = [
    { id: 'calm',       name: 'Calm',       blurb: 'type weight 200, slow drift, single slot',     phase: 16, real: true },
    { id: 'mechanical', name: 'Mechanical', blurb: 'second rail, instrument grid, JetBrains Mono', phase: 17, real: false },
    { id: 'departures', name: 'Departures', blurb: 'split-flap board, gold imminent rows',         phase: 18, real: false },
    { id: 'editorial',  name: 'Editorial',  blurb: 'asymmetric two-column, italic time',           phase: 19, real: false },
    { id: 'horizon',    name: 'Horizon',    blurb: 'sun and moon arcs, hour ticks',                phase: 20, real: false }
  ];

  // Deterministic preview state will be added here by Phases 17-20 to seed live
  // face renders in the picker. Phase 16's Calm preview is static HTML.

  function normalizeTweaks(raw) {
    const def = TWEAK_DEFAULTS;
    let parsed = null;
    if (typeof raw === 'string' && raw.length) {
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    } else if (raw && typeof raw === 'object') {
      parsed = raw;
    }
    if (!parsed || typeof parsed !== 'object') {
      return { accent: def.accent, driftIntensity: def.driftIntensity, byFace: {} };
    }
    const accent = ACCENT_PALETTE[parsed.accent] ? parsed.accent : def.accent;
    const driftIntensity = (DRIFT_INTENSITY_MULT[parsed.driftIntensity] !== undefined)
      ? parsed.driftIntensity
      : def.driftIntensity;
    const byFace = (parsed.byFace && typeof parsed.byFace === 'object') ? parsed.byFace : {};
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

    if (face.real && face.id === 'calm') {
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

  // -------- Tweak application + UI sync --------

  function applyTweaksToPreview() {
    const accent = ACCENT_PALETTE[draftTweaks.accent] || ACCENT_PALETTE.gold;
    document.documentElement.style.setProperty('--type-accent', accent.hex);
    document.documentElement.style.setProperty('--type-secondary', accent.secondary);
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

    if (scroll) {
      sectionEls[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // -------- Apply / Cancel --------

  function apply() {
    const face = FACES[activeIndex];
    if (!face.real) return;
    try {
      localStorage.setItem('solari.clockface', face.id);
      localStorage.setItem('solari.clockface.tweaks', JSON.stringify(draftTweaks));
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
