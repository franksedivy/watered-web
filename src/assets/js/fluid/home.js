import { PADDING, seed } from "./model.js";
import { HOME_UNITS_PER_PIXEL, homeCapacity, homeStartingCount, addHomeDrop } from "./home-model.js";
import { PhoneTilt, screenAngle } from "./tilt.js";
import { reshapePool } from "./pool-frame.js";

// Advance a little faster while retaining the solver's fixed, stable steps.
const SIMULATION_SPEED = 1.2;
const MAX_FRAME_STEPS = 4;

const canvas = document.querySelector("[data-home-water]");
const page = document.documentElement;
// If startup timed out before this module arrived, retain the chosen CSS water.
if (canvas && !page.classList.contains("water-css")) {
  const fallback = document.querySelector(".home-water");
  const icon = document.querySelector(".home-icon");
  const credit = document.querySelector(".home-credit > p");
  let creditBackdrop;
  const controls = document.querySelector("[data-water-controls]");
  const waterButton = document.querySelector("[data-water-toggle]");
  const waterPrompt = document.querySelector(".home-water-prompt");
  let waterEnabled = true;
  const tiltButton = document.querySelector("[data-water-tilt]");
  const tiltStatus = document.querySelector("[data-water-tilt-status]");
  const touch = matchMedia("(any-pointer: coarse)");
  const compact = matchMedia("(width < 60rem)");
  const tilt = new PhoneTilt({ onChange: updateTiltControl });
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
  let lastAngle = screenAngle();
  let resizeTimer = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  const canRun = () => waterEnabled && engine && !failed && !motion.matches && !away && inView && !document.hidden;

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = previous = accumulator = 0;
  }

  function selectWater(mode) {
    page.classList.remove("no-js", "water-pending", "water-css", "water-js");
    page.classList.add(`water-${mode}`);
    page.dispatchEvent(new Event("water-selected"));
    updateWaterControl();
  }

  function showFallback() {
    canvas.removeAttribute("data-ready");
    selectWater("css");
  }

  function fail(error) {
    failed = true;
    stop();
    showFallback();
    tilt.disable();
    updateTiltControl();
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
    const angle = screenAngle();
    const changed = bounds.width !== lastWidth || bounds.height !== lastHeight || angle !== lastAngle;
    if (changed) {
      const first = !lastWidth;
      const pool = fallback.getBoundingClientRect();
      const bottomBleed = Math.max(0, bounds.bottom - pool.bottom);
      // Put the physical walls at the visible glass, not in the hidden bleed.
      // Otherwise a shallow pool disappears below the clip after rotation.
      engine.boundaryPadding = Math.max(PADDING * engine.particleScale, bottomBleed * HOME_UNITS_PER_PIXEL);
      if (first) {
        engine.resize(bounds.width * HOME_UNITS_PER_PIXEL, bounds.height * HOME_UNITS_PER_PIXEL);
        seed(engine, homeStartingCount(bounds.width, pool.height));
      } else {
        reshapePool(engine, bounds.width * HOME_UNITS_PER_PIXEL, bounds.height * HOME_UNITS_PER_PIXEL, angle - lastAngle);
      }
      renderer.resize(bounds.width, bounds.height);
      lastAngle = angle;
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
      accumulator += dt * SIMULATION_SPEED;
      let steps = 0;
      const gravity = tilt.gravity();
      if (gravity) engine.setGravityDirection(gravity.x, gravity.y);
      else engine.resetGravity();
      while (accumulator >= 1 / 60 && steps < MAX_FRAME_STEPS) {
        engine.step(1 / 60);
        accumulator -= 1 / 60;
        steps++;
      }
      if (steps === MAX_FRAME_STEPS) accumulator = 0;
      renderer.advance(steps / 60, engine);
      settleTime += steps / 60;
      // Keep both treatments hidden until the starting grid has settled.
      if (settleTime >= 0.5) {
        renderer.render(engine);
        if (!canvas.hasAttribute("data-ready")) {
          canvas.setAttribute("data-ready", "");
          selectWater("js");
          updateTiltControl();
        }
      }
      frameId = requestAnimationFrame(frame);
    } catch (error) { fail(error); }
  }

  function refresh() {
    stop();
    if (motion.matches) { showFallback(); tilt.disable(); }
    tilt.setRunning(canRun());
    updateWaterControl();
    updateTiltControl();
    if (canRun()) frameId = requestAnimationFrame(frame);
    else if (waterEnabled && !engine && !loading && !failed && !motion.matches && !away && !document.hidden) start();
  }

  async function start() {
    loading = true;
    try {
      // No solver or renderer download until animation is appropriate.
      const [{ createEngine }, { FluidRenderer }, { createCreditBackdrop }] = await Promise.all([
        import("./sph.js"), import("./renderer.js"), import("./credit-backdrop.js"),
      ]);
      if (failed) return;
      [creditBackdrop] = await Promise.all([createCreditBackdrop(credit), icon.decode().catch(() => {})]);
      if (failed) return;
      const bounds = canvas.getBoundingClientRect();
      engine = await createEngine({ width: bounds.width * HOME_UNITS_PER_PIXEL,
        height: bounds.height * HOME_UNITS_PER_PIXEL,
        maxParticles: homeCapacity(bounds.width, fallback.getBoundingClientRect().height) });
      engine.motionGravityStrength = engine.gravityStrength;
      engine.gravityResponse = 9;
      renderer = new FluidRenderer(canvas, engine.capacity, icon);
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
    if (event.target.closest("[data-water-controls], a, button, input, select, textarea, summary, label, [contenteditable]")) return;
    if (!getSelection()?.isCollapsed) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * engine.width;
    const y = (event.clientY - bounds.top) / bounds.height * engine.height;
    const amount = addHomeDrop(engine, x, y);
    // At the bounded capacity, keep taps playful without replacing old water.
    if (!amount && engine.count) {
      let nearest = 0;
      let distance = Infinity;
      for (let i = 0; i < engine.count; i++) {
        const d = (engine.x[i] - x) ** 2 + (engine.y[i] - y) ** 2;
        if (d < distance) { distance = d; nearest = i; }
      }
      engine.push(engine.x[nearest], engine.y[nearest], 100 * engine.particleScale, 160);
    }
  });

  function scheduleResize() {
    if (!engine || failed) return;
    clearTimeout(resizeTimer);
    // Let the browser publish its screen angle before reshaping a rotated tank.
    // Browser-bar height changes and desktop resizes need no rotation delay.
    const bounds = canvas.getBoundingClientRect();
    const changedAspect = (bounds.width > bounds.height) !== (lastWidth > lastHeight);
    const angle = screenAngle();
    const quarterTurn = Math.abs(angle - lastAngle) % 180 === 90;
    const waitForAngle = touch.matches && ((changedAspect && angle === lastAngle)
      || (!changedAspect && quarterTurn));
    resizeTimer = setTimeout(() => {
      try { resize(); } catch (error) { fail(error); }
    }, waitForAngle ? 100 : 0);
  }

  function updateWaterControl() {
    controls.hidden = !page.classList.contains("water-css") && !canvas.hasAttribute("data-ready");
    page.classList.toggle("water-off", !waterEnabled);
    waterButton.setAttribute("aria-pressed", String(waterEnabled));
    const label = waterEnabled ? "Turn water off" : "Turn water on";
    waterButton.setAttribute("aria-label", label);
    waterButton.title = label;
    waterPrompt.textContent = waterEnabled ? "Stop!" : "Go on, try it!";
  }

  function updateTiltControl() {
    if (!tiltButton) return;
    const mobile = compact.matches && (touch.matches || navigator.maxTouchPoints > 0);
    tiltButton.hidden = !mobile;
    if (!mobile) {
      if (tilt.enabled || tilt.state === "requesting") tilt.disable();
      tiltStatus.textContent = "";
      return;
    }
    const available = mobile && !failed && !motion.matches && canvas.hasAttribute("data-ready");
    tiltButton.disabled = !available || !waterEnabled || !tilt.supported || tilt.state === "requesting";
    tiltButton.setAttribute("aria-pressed", String(tilt.enabled));
    const labels = { off: "Enable tilt", requesting: "Enabling tilt…", waiting: "Disable tilt",
      on: "Disable tilt", denied: "Tilt not allowed", unavailable: "Retry tilt" };
    const messages = { off: "Let the water follow your phone.", requesting: "Allow motion access to enable tilt.",
      waiting: "Waiting for your phone. Tilt it gently.", on: "Tilt your phone to move the water. Tap again to turn tilt off.",
      denied: "Motion access was not allowed. You can still tap to add water.",
      unavailable: "Your phone isn't sending tilt readings. You can still tap to add water." };
    const label = !waterEnabled ? "Enable water to use tilt"
      : !available ? "Tilt unavailable"
      : !window.isSecureContext ? "Tilt needs HTTPS"
      : !tilt.supported ? "Tilt unavailable" : labels[tilt.state];
    const message = !waterEnabled ? "Turn water on to enable phone tilt."
      : !available ? "Tilt is available on supported phones while animated water is running."
      : !window.isSecureContext
      ? "Open the HTTPS preview to enable phone tilt. You can still tap to add water here."
      : !tilt.supported ? "This browser does not provide phone tilt readings. You can still tap to add water."
        : messages[tilt.state];
    tiltButton.setAttribute("aria-label", label);
    tiltButton.setAttribute("aria-busy", String(tilt.state === "requesting"));
    tiltButton.title = message;
    if (tiltStatus.textContent !== message) tiltStatus.textContent = message;
  }

  waterButton.addEventListener("click", () => {
    waterEnabled = !waterEnabled;
    if (!waterEnabled) { tilt.disable(); engine?.resetGravity(); }
    refresh();
  });

  tiltButton.addEventListener("click", () => {
    if (tilt.enabled) { tilt.disable(); engine?.resetGravity(); }
    else if (canRun()) tilt.enable();
  });
  touch.addEventListener("change", updateTiltControl);
  compact.addEventListener("change", updateTiltControl);
  new ResizeObserver(scheduleResize).observe(canvas);
  screen.orientation?.addEventListener("change", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);
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
  window.addEventListener("pagehide", () => { away = true; clearTimeout(resizeTimer); tilt.setRunning(false); stop(); });
  window.addEventListener("pageshow", () => { away = false; refresh(); });
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    fail(new Error("Water graphics context lost."));
  });
  page.addEventListener("water-fallback", () => {
    if (!failed) fail(new Error("Water startup did not complete; using CSS water."));
  }, { once: true });
  refresh();
}
