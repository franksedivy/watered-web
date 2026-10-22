import { CAPACITY, INITIAL_PARTICLES, WIDTH, SPACING, DEFAULT_PARTICLE_SCALE, addDose, seed } from "./model.js";
import { FluidRenderer } from "./renderer.js";

const study = document.querySelector("[data-fluid-study]");
if (study) {
  const find = selector => study.querySelector(selector);
  const start = find("[data-start]");
  const add = find("[data-add]");
  const pause = find("[data-pause]");
  const reset = find("[data-reset]");
  const animate = find("[data-animate]");
  const particles = find("[data-particles]");
  const surface = find("[data-surface]");
  const foam = find("[data-foam]");
  const refraction = find("[data-refraction]");
  const interactionRadius = find("[data-interaction-radius]");
  const radiusControl = find("[data-radius-control]");
  const particleHelp = find("[data-particle-help]");
  const particleSize = find("[data-particle-size]");
  const sizeValue = find("[data-size-value]");
  const applySize = find("[data-apply-size]");
  const canvas = find("canvas");
  const referenceIcon = find("[data-reference-icon]");
  const calm = find("[data-calm]");
  const fallback = find("[data-fallback]");
  const status = find("[data-status]");
  const metrics = find("[data-metrics]");
  const count = find("[data-count]");
  const mode = () => find("input[name=interaction]:checked").value;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  particleSize.value = String(DEFAULT_PARTICLE_SCALE);
  sizeValue.textContent = `${DEFAULT_PARTICLE_SCALE.toFixed(1)}×`;
  animate.checked = !motionPreference.matches;
  start.disabled = false;

  let engine;
  let renderer;
  let frameId = 0;
  let previous = 0;
  let lastPaint = 0;
  let accumulator = 0;
  let paused = false;
  let inView = true;
  let frames = 0;
  let sampleStart = 0;
  let simulationTime = 0;
  let frameTimes = [];

  const dimensions = () => {
    const bounds = canvas.parentElement.getBoundingClientRect();
    return { width: WIDTH, height: WIDTH * bounds.height / Math.max(1, bounds.width) };
  };
  const canRun = () => engine && animate.checked && !paused && inView && !document.hidden;

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = previous = lastPaint = accumulator = 0;
    frames = simulationTime = sampleStart = 0;
    frameTimes = [];
  }

  function draw() {
    if (!engine) return;
    count.textContent = `${engine.count} / ${engine.maxParticles} particles`;
    // Anchor to the starting amount, never the current amount. Keep reference
    // size independent of the selected particle scale for optical comparisons.
    const startingDepth = Math.min(engine.height * 0.9,
      INITIAL_PARTICLES * (SPACING * engine.particleScale) ** 2 / engine.width);
    const depthPixels = startingDepth * canvas.parentElement.clientHeight / engine.height;
    referenceIcon.style.setProperty("--reference-depth", `${depthPixels}px`);
    const referenceDepth = Math.min(engine.height * 0.9,
      INITIAL_PARTICLES * (SPACING * DEFAULT_PARTICLE_SCALE) ** 2 / engine.width);
    const referencePixels = referenceDepth * canvas.parentElement.clientHeight / engine.height;
    const iconSize = Math.min(96, referencePixels * 1.6) * 1.5;
    referenceIcon.style.setProperty("--reference-size", `${iconSize}px`);
    const tank = canvas.parentElement;
    renderer.referenceRect = [0.5 - iconSize / tank.clientWidth / 2,
      (depthPixels - iconSize / 2) / tank.clientHeight,
      iconSize / tank.clientWidth, iconSize / tank.clientHeight];
    const isCalm = !animate.checked;
    const showParticles = Boolean(particles?.checked);
    renderer.particleView = showParticles;
    renderer.surfaceStyle = surface.value;
    renderer.showFoam = foam.checked;
    renderer.showRefraction = refraction.checked;
    renderer.showInteractionRadius = Boolean(interactionRadius?.checked);
    canvas.hidden = isCalm && !showParticles;
    calm.hidden = !isCalm || showParticles;
    particleHelp.hidden = !showParticles;
    if (showParticles) {
      particleHelp.textContent = `SPHjs: dots mark sample positions (${(3 * (engine.particleScale || 1)).toFixed(1)}-unit display radius, not rigid collision shapes). The optional rings show the ${engine.smoothingRadius}-unit smoothing radius used to find neighbours. Sizes scale with the tank.`;
    }
    if (radiusControl) radiusControl.hidden = !showParticles;
    if (interactionRadius) interactionRadius.disabled = !showParticles;
    // Calm mode represents accumulated amount without running the solver.
    calm.style.setProperty("--pool-level", `${Math.min(90,
      engine.count * (SPACING * (engine.particleScale || 1)) ** 2 / engine.width / engine.height * 100)}%`);
    if (!isCalm || showParticles) renderer.render(engine);
    add.disabled = engine.count >= engine.maxParticles;
    if (applySize) applySize.disabled = Number(particleSize.value) === engine.particleScale;
  }

  function fail(error) {
    stop();
    console.error("Water specimen unavailable:", error);
    renderer?.dispose?.();
    engine?.dispose?.();
    engine = null;
    canvas.hidden = calm.hidden = true;
    fallback.hidden = false;
    referenceIcon.style.removeProperty("--reference-depth");
    referenceIcon.style.removeProperty("--reference-size");
    study.dataset.state = "unavailable";
    study.querySelectorAll("[data-controls] input, [data-controls] button, [data-controls] select").forEach(control => {
      control.disabled = true;
    });
    status.textContent = "The simulation is unavailable in this browser. The still water remains; reload to try again.";
    metrics.textContent = "Static fallback";
  }

  function frame(now) {
    frameId = 0;
    if (!canRun()) return;
    try {
      const elapsed = previous ? (now - previous) / 1000 : 1 / 60;
      previous = now;
      accumulator += Math.min(0.05, elapsed);
      const before = performance.now();
      let steps = 0;
      while (accumulator >= 1 / 60 && steps < 3) {
        engine.step(1 / 60);
        accumulator -= 1 / 60;
        steps++;
      }
      if (steps === 3) accumulator = 0; // Never catch up a suspended tab.
      simulationTime += performance.now() - before;
      // The fixed-step state is identical between physics updates.
      if (steps) {
        renderer.advance(steps / 60, engine);
        renderer.render(engine);
        frames++;
        frameTimes.push(lastPaint ? now - lastPaint : elapsed * 1000);
        lastPaint = now;
      }
      sampleStart ||= now - elapsed * 1000;
      if (now - sampleStart >= 1000) {
        frameTimes.sort((a, b) => a - b);
        const p95 = frameTimes[Math.floor((frameTimes.length - 1) * 0.95)];
        metrics.textContent = `${engine.backend} · ${renderer.backend} · ${Math.round(frames * 1000 / (now - sampleStart))} fps · frame p95 ${p95.toFixed(1)} ms · physics ${(simulationTime / frames).toFixed(1)} ms/frame`;
        frames = simulationTime = sampleStart = 0;
        frameTimes = [];
      }
      frameId = requestAnimationFrame(frame);
    } catch (error) {
      fail(error);
    }
  }

  function updateRunState() {
    stop();
    if (!engine) return;
    pause.disabled = !animate.checked;
    pause.textContent = paused ? "Resume" : "Pause";
    pause.setAttribute("aria-pressed", String(paused));
    study.dataset.state = !animate.checked ? "calm" : paused ? "paused"
      : !inView || document.hidden ? "suspended" : "running";
    metrics.textContent = !animate.checked ? "Calm mode · physics and animation stopped"
      : paused ? "Paused" : !canRun() ? "Paused while hidden or offscreen" : "Measuring…";
    draw();
    if (canRun()) frameId = requestAnimationFrame(frame);
  }

  function addWater(x = WIDTH / 2, y = 65) {
    if (!engine) return;
    const amount = addDose(engine, animate.checked ? mode() : "pool", x, y);
    draw();
    status.textContent = amount
      ? `Added ${amount} particles. ${engine.count} of ${engine.maxParticles}.${paused ? " Resume to settle." : ""}`
      : "The tank is full. Reset to start again.";
  }

  start.addEventListener("click", async () => {
    start.disabled = true;
    status.textContent = "Loading the simulation…";
    try {
      const { createEngine } = await import("./sph.js");
      engine = await createEngine({ ...dimensions(), maxParticles: CAPACITY });
      // Decode the same responsive asset already used by the DOM reference.
      // If it is unavailable, the existing unwarped rendering still works.
      await referenceIcon.decode().catch(() => {});
      renderer = new FluidRenderer(canvas, CAPACITY, referenceIcon);
      const bounds = canvas.parentElement.getBoundingClientRect();
      renderer.resize(bounds.width, bounds.height);
      seed(engine);
      renderer.clearFoam();
      fallback.hidden = true;
      start.hidden = true;
      study.querySelectorAll("[data-controls] input, [data-controls] button, [data-controls] select").forEach(control => {
        control.disabled = false;
      });
      status.textContent = "Ready. Tap the tank or use Add water. Each action adds up to 60 particles.";
      updateRunState();
    } catch (error) {
      fail(error);
    }
  });

  add.addEventListener("click", () => addWater());
  canvas.parentElement.addEventListener("click", event => {
    if (!engine) return;
    const bounds = canvas.parentElement.getBoundingClientRect();
    const point = { x: (event.clientX - bounds.left) / bounds.width * engine.width,
        y: (event.clientY - bounds.top) / bounds.height * engine.height };
    addWater(point.x, point.y);
  });
  pause.addEventListener("click", () => {
    paused = !paused;
    updateRunState();
  });
  reset.addEventListener("click", () => {
    seed(engine);
    renderer.clearFoam();
    status.textContent = "Reset to the initial 240-particle pool.";
    updateRunState();
  });
  particleSize?.addEventListener("input", () => {
    sizeValue.textContent = `${Number(particleSize.value).toFixed(1)}×`;
    applySize.disabled = !engine || Number(particleSize.value) === engine.particleScale;
  });
  applySize?.addEventListener("click", () => {
    if (!engine) return;
    stop();
    engine.configureParticleScale(Number(particleSize.value));
    seed(engine);
    renderer.clearFoam();
    status.textContent = `Particle scale set to ${engine.particleScale.toFixed(1)}×. Reset to 240 particles; limit ${engine.maxParticles}.`;
    updateRunState();
  });
  surface.addEventListener("change", draw);
  foam.addEventListener("change", draw);
  refraction.addEventListener("change", draw);
  particles?.addEventListener("change", draw);
  interactionRadius?.addEventListener("change", draw);
  animate.addEventListener("change", updateRunState);
  motionPreference.addEventListener("change", event => {
    animate.checked = !event.matches;
    updateRunState();
  });
  document.addEventListener("visibilitychange", updateRunState);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", () => { if (engine) updateRunState(); });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateRunState();
  }, { threshold: 0.05 }).observe(canvas.parentElement);
  new ResizeObserver(() => {
    if (!engine) return;
    try {
      const { width, height } = dimensions();
      engine.resize(width, height);
      const bounds = canvas.parentElement.getBoundingClientRect();
      renderer.resize(bounds.width, bounds.height);
      updateRunState();
    } catch (error) { fail(error); }
  }).observe(canvas.parentElement);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    fail(new Error("Graphics context lost."));
  });
}
