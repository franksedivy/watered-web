// Shared experiment units, not millilitres or a product hydration goal.
export const CAPACITY = 1200;
export const INITIAL_PARTICLES = 240;
export const DOSE = 60;
export const WIDTH = 720;
export const SPACING = 11.5;
export const DEFAULT_PARTICLE_SCALE = 0.8;
export const PADDING = 12;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function poolPoint(index, width, height, scale = 1) {
  const padding = PADDING * scale;
  const spacing = SPACING * scale;
  const columns = Math.max(1, Math.floor((width - padding * 2) / spacing));
  return {
    x: padding + (index % columns) * spacing,
    y: Math.max(padding, height - padding - Math.floor(index / columns) * spacing),
  };
}

export function addDose(engine, mode, x, y) {
  const before = engine.count;
  const scale = engine.particleScale || 1;
  const amount = Math.min(DOSE, engine.maxParticles - before);
  const spacing = SPACING * scale;
  const margin = 55 * scale;
  for (let i = 0; i < amount; i++) {
    const point = mode === "pool"
      ? poolPoint(before + i, engine.width, engine.height, scale)
      : {
        x: clamp(x, margin, engine.width - margin) + (i % 8 - 3.5) * spacing,
        y: clamp(y, margin, engine.height - margin) + (Math.floor(i / 8) - 3.5) * spacing,
      };
    engine.addParticle(point.x, point.y, 0, mode === "pour" ? 80 : 0);
  }
  if (amount && mode === "pool") {
    const surface = poolPoint(before, engine.width, engine.height, scale).y;
    engine.push(x, surface, 100 * scale, 160);
  }
  return engine.count - before;
}

export function seed(engine, amount = INITIAL_PARTICLES) {
  engine.clear();
  for (let i = 0; i < Math.min(amount, engine.maxParticles); i++) {
    const point = poolPoint(i, engine.width, engine.height, engine.particleScale || 1);
    engine.addParticle(point.x, point.y);
  }
}
