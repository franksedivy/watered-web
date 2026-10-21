import { WIDTH, addDose, poolPoint, seed } from "./model.js";
import { HOME_CAPACITY, homeStartingCount, homeTotalCount } from "./home-model.js";

const canvas = document.querySelector("[data-home-water]");
if (canvas) {
  const fallback = document.querySelector(".home-water");
  const icon = document.querySelector(".home-icon");
  const credit = document.querySelector(".home-credit > p");
  let creditBackdrop;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let engine;
  let renderer;
  let loading = false;
  let failed = false;
  let away = false;
  let inView = true;
  let frameId = 0;
  let previous = 0;
  let accumulator = 0;
  let settleTime = 0;
  let baseline = 0;
  let added = 0;
  let orientation;
  let lastWidth = 0;
  let lastHeight = 0;

  const canRun = () => engine && !failed && !motion.matches && !away && inView && !document.hidden;

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = previous = accumulator = 0;
  }

  function showFallback() {
    canvas.removeAttribute("data-ready");
    fallback.removeAttribute("data-inactive");
  }

  function fail(error) {
    failed = true;
    stop();
    showFallback();
    renderer?.dispose?.();
    renderer = engine = null;
    console.warn("Water animation unavailable; retaining CSS water.", error);
  }

  function updateBackdrop(bounds) {
    const image = icon.getBoundingClientRect();
    renderer.referenceRect = [(image.left - bounds.left) / bounds.width,
      (bounds.bottom - image.bottom) / bounds.height,
      image.width / bounds.width, image.height / bounds.height];
    const pool = fallback.getBoundingClientRect();
    const bleed = Math.max(0, bounds.bottom - pool.bottom);
    const glassHeight = bounds.height - bleed * 2;
    renderer.backdropTop = [135 / 255, 199 / 255, 234 / 255];
    renderer.backdropBottom = [220 / 255, 239 / 255, 248 / 255];
    // Match the glass gradient, excluding the surrounding white page and the
    // hidden simulation bleed. The same mapping applies after rotation.
    renderer.backdropTransform = [bounds.height / glassHeight, -bleed / glassHeight];
    if (creditBackdrop) renderer.setCreditBackdrop(creditBackdrop(bounds));
  }

  function resize() {
    if (!engine || failed) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const nextOrientation = bounds.width > bounds.height;
    const pool = fallback.getBoundingClientRect();
    // The simulation extends beyond the visible glass. Include only that hidden
    // bottom portion when matching the designed starting water depth.
    const bottomBleed = Math.max(0, bounds.bottom - pool.bottom);
    const nextBaseline = homeStartingCount(bounds.width, pool.height + bottomBleed);
    const changed = bounds.width !== lastWidth || bounds.height !== lastHeight;
    if (changed) {
      engine.resize(WIDTH, WIDTH * bounds.height / bounds.width);
      renderer.resize(bounds.width, bounds.height);
      // Rotation reflows the designed starting amount while retaining additions.
      // Small browser-bar changes preserve the current particle state.
      if (!baseline || nextOrientation !== orientation) {
        baseline = nextBaseline;
        seed(engine, homeTotalCount(baseline, added));
        renderer.clearFoam();
        settleTime = 0;
        showFallback();
      }
      orientation = nextOrientation;
      lastWidth = bounds.width;
      lastHeight = bounds.height;
    }
    updateBackdrop(bounds);
    renderer.render(engine);
  }

  function frame(now) {
    frameId = 0;
    if (!canRun()) return;
    try {
      const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 1 / 60;
      previous = now;
      accumulator += dt;
      let steps = 0;
      while (accumulator >= 1 / 60 && steps < 3) {
        engine.step(1 / 60);
        accumulator -= 1 / 60;
        steps++;
      }
      if (steps === 3) accumulator = 0;
      renderer.advance(steps / 60, engine);
      settleTime += steps / 60;
      // Keep the finished CSS treatment visible while the starting grid settles.
      if (settleTime >= 0.5) {
        renderer.render(engine);
        canvas.setAttribute("data-ready", "");
        fallback.setAttribute("data-inactive", "");
      }
      frameId = requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }

  function refresh() {
    stop();
    if (motion.matches) showFallback();
    if (canRun()) frameId = requestAnimationFrame(frame);
    else if (!engine && !loading && !failed && !motion.matches && !away && !document.hidden) start();
  }

  async function start() {
    loading = true;
    try {
      // No solver or renderer download until animation is appropriate.
      const [{ createEngine }, { FluidRenderer }, { createCreditBackdrop }] = await Promise.all([
        import("./sph.js"), import("./renderer.js"), import("./credit-backdrop.js"),
      ]);
      [creditBackdrop] = await Promise.all([createCreditBackdrop(credit), icon.decode().catch(() => {})]);
      const bounds = canvas.getBoundingClientRect();
      engine = await createEngine({ width: WIDTH,
        height: WIDTH * bounds.height / Math.max(1, bounds.width), maxParticles: HOME_CAPACITY });
      renderer = new FluidRenderer(canvas, HOME_CAPACITY, icon);
      if (!renderer.gl) throw new Error("WebGL2 surface rendering unavailable.");
      renderer.surfaceStyle = "realistic";
      renderer.showRefraction = true;
      renderer.showFoam = true;
      resize();
      loading = false;
      refresh();
    } catch (error) {
      loading = false;
      fail(error);
    }
  }

  document.body.addEventListener("click", event => {
    if (!canRun() || !canvas.hasAttribute("data-ready") || event.button !== 0) return;
    if (event.target.closest("a, button, input, select, textarea, summary, label, [contenteditable]")) return;
    if (!getSelection()?.isCollapsed) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * engine.width;
    const y = (event.clientY - bounds.top) / bounds.height * engine.height;
    const amount = addDose(engine, "pour", x, y);
    added += amount;
    // At the bounded capacity, keep taps playful without replacing old water.
    if (!amount) engine.push(x, poolPoint(engine.count - 1, engine.width,
      engine.height, engine.particleScale).y, 100 * engine.particleScale, 160);
  });

  new ResizeObserver(() => {
    if (!engine || failed) return;
    try { resize(); } catch (error) { fail(error); }
  }).observe(canvas);
  const backdropObserver = new ResizeObserver(() => {
    if (!engine || failed) return;
    try { updateBackdrop(canvas.getBoundingClientRect()); } catch (error) { fail(error); }
  });
  backdropObserver.observe(document.querySelector(".home-intro"));
  backdropObserver.observe(credit);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    refresh();
  }).observe(canvas);
  motion.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pagehide", () => { away = true; stop(); });
  window.addEventListener("pageshow", () => { away = false; refresh(); });
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    fail(new Error("Water graphics context lost."));
  });
  refresh();
}
