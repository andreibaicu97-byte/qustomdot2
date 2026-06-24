/* ===========================================================
   QustomDot — interaction layer
   =========================================================== */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp  = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp   = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  const wheel     = document.querySelector('.wheel');
  const wheelGrad = document.querySelector('.wheel__grad');
  const hero      = document.getElementById('top');
  const slides    = Array.from(document.querySelectorAll('.slide'));
  const dots      = Array.from(document.querySelectorAll('[data-dots] span'));
  const progress  = document.querySelector('[data-progress]');
  const gradTexts = Array.from(document.querySelectorAll('.gradient-text'));
  const n         = slides.length;

  slides.forEach((s, i) => { s.style.zIndex = String(n - i); });

  /* ─────────────────────────────────────────────────────────
     ORB GRADIENT ROTATION + HEADLINE SYNC
     ─────────────────────────────────────────────────────────
     Both driven off the same clock (t seconds).
     ORB_ROT_SPEED: one full 360° in ~22 s
     Gradient position 0%  = red dominant (dark)
     Gradient position 50% = cream dominant (light)

     Anti-phase:
       orbRotDeg    → drives .wheel__grad rotation
       headlinePos  = 50 − 50·cos(orbPhase)
         orbPhase=0   → headlinePos=0%   (red text)  while orb enters light phase
         orbPhase=π   → headlinePos=100% (cream text) while orb enters dark phase
  ────────────────────────────────────────────────────────── */
  const ORB_ROT_SPEED = (2 * Math.PI) / 22; // rad/s  (one full turn ≈ 22 s)
  const GRAD_BASE_RAD = 135 * Math.PI / 180; // CSS gradient base: 135°

  // Orb palette endpoints (sampled from Color Wheel.svg)
  const RED_C   = [232, 25, 11];   // #e8190b — dark end of headline gradient
  const CREAM_C = [246, 199, 156]; // #f6c79c — light end

  function mixColor(t) {
    // t = 0 → CREAM, t = 1 → RED
    const u = Math.max(0, Math.min(1, t));
    return `rgb(${Math.round(CREAM_C[0] + (RED_C[0] - CREAM_C[0]) * u)},${
                 Math.round(CREAM_C[1] + (RED_C[1] - CREAM_C[1]) * u)},${
                 Math.round(CREAM_C[2] + (RED_C[2] - CREAM_C[2]) * u)})`;
  }

  function updateGradients(t) {
    const orbPhase  = ORB_ROT_SPEED * t;
    const orbRotDeg = (orbPhase * 180 / Math.PI) % 360;

    // Drive the orb's internal gradient rotation
    if (wheelGrad) wheelGrad.style.transform = `rotate(${orbRotDeg.toFixed(2)}deg)`;

    /* Headline is STRICTLY the inverse of the orb, computed geometrically.
       CSS gradient direction vector x-component = sin(baseAngle + rotation).
         s > 0  →  gradient flows right  →  orb LEFT = RED,   orb RIGHT = CREAM
         s < 0  →  gradient flows left   →  orb LEFT = CREAM, orb RIGHT = RED

       Inversion rule (no red-on-red, no cream-on-cream):
         leftRedness  = (1 − s) / 2   (0=cream when s=+1, 1=red when s=−1)
         rightRedness = (1 + s) / 2   (1=red  when s=+1, 0=cream when s=−1)

       The headline gradient is computed fresh each frame from these two values.      */
    const s          = Math.sin(GRAD_BASE_RAD + orbPhase);
    const leftColor  = mixColor((1 - s) / 2);
    const rightColor = mixColor((1 + s) / 2);
    const gradStr    = `linear-gradient(to right, ${leftColor}, ${rightColor})`;

    gradTexts.forEach(el => {
      el.style.backgroundImage = gradStr;
      el.style.backgroundSize  = '100% 100%';
    });
  }

  /* ─────────────────────────────────────────────────────────
     ORB MOVEMENT — Lissajous orbital system
     ─────────────────────────────────────────────────────────
     Phase 0 (t < STATIC_END): orb sits static, centred behind
     the hero headline, while gradient + text sync runs live.
     Phase 1 (t in [STATIC_END, STATIC_END+RAMP]): orbital
     radii ramp up and zone centre gradually leaves headline.
     Phase 2 (t > STATIC_END+RAMP): full Lissajous drift.

     Hero heading measured: full-width, centred at ≈ y:248 px
     of 880 px viewport  →  cy ≈ 0.28.
  ────────────────────────────────────────────────────────── */
  const HEADLINE_CX    = 0.50;
  const HEADLINE_CY    = 0.28;
  // Release is scroll-based: orb stays static until the hero pin ends,
  // then ramps into the Lissajous orbit over the next ~30vh of scroll.
  function orbScale() {
    const heroRunway = hero ? hero.offsetHeight - window.innerHeight : 0;
    const past = window.scrollY - heroRunway;          // px scrolled past pin end
    const ramp  = window.innerHeight * 0.30;           // 30vh ramp distance
    return smooth(clamp(past / ramp, 0, 1));
  }

  const ZONES = [
    { p: 0.00, cx: 0.76, cy: 0.54, rx: 0.10, ry: 0.06 },
    { p: 0.20, cx: 0.22, cy: 0.60, rx: 0.08, ry: 0.05 },
    { p: 0.40, cx: 0.74, cy: 0.58, rx: 0.09, ry: 0.05 },
    { p: 0.62, cx: 0.78, cy: 0.48, rx: 0.10, ry: 0.07 },
    { p: 0.76, cx: 0.30, cy: 0.52, rx: 0.09, ry: 0.06 },
    { p: 0.88, cx: 0.18, cy: 0.36, rx: 0.08, ry: 0.07 },
    { p: 1.00, cx: 0.38, cy: 0.62, rx: 0.08, ry: 0.05 },
  ];

  function sampleZones(p) {
    if (p <= ZONES[0].p) return ZONES[0];
    const last = ZONES[ZONES.length - 1];
    if (p >= last.p) return last;
    for (let i = 0; i < ZONES.length - 1; i++) {
      const a = ZONES[i], b = ZONES[i + 1];
      if (p >= a.p && p <= b.p) {
        const e = smooth((p - a.p) / (b.p - a.p));
        return {
          cx: lerp(a.cx, b.cx, e), cy: lerp(a.cy, b.cy, e),
          rx: lerp(a.rx, b.rx, e), ry: lerp(a.ry, b.ry, e),
        };
      }
    }
    return last;
  }

  const WX    = 0.28;  const WY    = 0.19;
  const PHASE = Math.PI * 0.35;
  const WW1   = 0.07;  const WW2   = 0.05;

  const scrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  };

  function computeTarget(t) {
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const size = wheel.offsetWidth;
    const sp   = scrollProgress();
    const z    = sampleZones(sp);

    // Motion scale: 0 = static at headline, 1 = full Lissajous
    const scale = orbScale();

    // Blend zone centre from headline toward the scroll-driven zone
    const cx = lerp(HEADLINE_CX, z.cx, scale);
    const cy = lerp(HEADLINE_CY, z.cy, scale);
    const rx  = z.rx * scale;
    const ry  = z.ry * scale;

    // Lissajous + secondary wander
    const ox = rx * Math.cos(WX * t);
    const oy = ry * Math.sin(WY * t + PHASE);
    const wx = rx * 0.30 * Math.sin(WW1 * t + 1.1);
    const wy = ry * 0.30 * Math.cos(WW2 * t + 0.7);

    return {
      x: (cx + ox + wx) * vw - size / 2,
      y: (cy + oy + wy) * vh - size / 2,
    };
  }

  /* ─────────────────────────────────────────────────────────
     Hero pinned woosh slider
  ────────────────────────────────────────────────────────── */
  function updateSlider() {
    if (!hero || !slides.length) return;
    const runway = hero.offsetHeight - window.innerHeight;
    const p = clamp(-hero.getBoundingClientRect().top / runway, 0, 1);
    const seg = 1 / (n - 1);
    slides.forEach((slide, i) => {
      if (i === n - 1) { slide.style.transform = 'none'; return; }
      const out = smooth(clamp((p - i * seg) / seg, 0, 1));
      slide.style.transform = `translateX(${-out * 112}%)`;
    });
    if (progress) progress.style.width = `${p * 100}%`;
    const active = Math.round(p * (n - 1));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === active));
  }

  /* ─────────────────────────────────────────────────────────
     Main rAF loop
  ────────────────────────────────────────────────────────── */
  const t0 = Date.now();
  let curX = null, curY = null;

  function frame() {
    const t      = (Date.now() - t0) / 1000;
    const target = computeTarget(t);

    if (curX === null) { curX = target.x; curY = target.y; }

    // Near-instant snap while static; very gentle during drift
    const ease = orbScale() < 0.01 ? 0.14 : 0.03;
    curX = lerp(curX, target.x, ease);
    curY = lerp(curY, target.y, ease);

    wheel.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`;
    updateGradients(t);

    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', updateSlider, { passive: true });
  window.addEventListener('resize', updateSlider, { passive: true });
  updateSlider();
  if (!reduceMotion) {
    requestAnimationFrame(frame);
  } else {
    // Reduced motion: set static positions once
    updateGradients(0);
    gradTexts.forEach(el => el.classList.add('is-in'));
  }

  /* ─────────────────────────────────────────────────────────
     Scroll reveal
  ────────────────────────────────────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }
})();
