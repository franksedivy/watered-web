import { DEFAULT_PARTICLE_SCALE, DOSE, SPACING, clamp } from "./model.js";

// A 0.8× density sprite stays 20 CSS pixels wide on every viewport and DPR.
// The specimen keeps its independent 720-unit experiment space.
export const HOME_UNITS_PER_PIXEL = 32 * DEFAULT_PARTICLE_SCALE / 20;
export const HOME_CAPACITY = 10000;
export const HOME_DROP = 7;
const MIN_CAPACITY = 1800;
const ADDITION_HEADROOM = DOSE * 6;

function requestedCount(viewWidth, waterHeight) {
  const width = viewWidth * HOME_UNITS_PER_PIXEL;
  const depth = waterHeight * 0.94 * HOME_UNITS_PER_PIXEL;
  // Approximate settled packing for the deeper, fixed-pixel desktop pool.
  const area = (SPACING * DEFAULT_PARTICLE_SCALE) ** 2 * 0.6;
  return Math.round(depth * width / area);
}

// Allocate for the initial pool plus additions, keeping phone allocations small.
// The visit retains this budget through resizing and orientation changes.
export function homeCapacity(viewWidth, waterHeight) {
  return clamp(requestedCount(viewWidth, waterHeight) + ADDITION_HEADROOM,
    MIN_CAPACITY, HOME_CAPACITY);
}

export function homeStartingCount(viewWidth, waterHeight) {
  return clamp(requestedCount(viewWidth, waterHeight), DOSE,
    homeCapacity(viewWidth, waterHeight) - ADDITION_HEADROOM);
}

// A fuller base and two trailing particles give the falling water a tapered tip.
const DROP_SHAPE = [[0, 0.4], [-0.65, 0.4], [0.65, 0.4],
  [-0.4, 1.05], [0.4, 1.05], [0, -0.7], [0, -1.9]];

export function addHomeDrop(engine, x, y) {
  const amount = Math.min(HOME_DROP, engine.maxParticles - engine.count);
  const spacing = SPACING * (engine.particleScale || DEFAULT_PARTICLE_SCALE);
  const margin = engine.boundaryPadding + spacing * 2;
  const centreX = clamp(x, margin, engine.width - margin);
  const centreY = clamp(y, margin, engine.height - margin);
  for (let i = 0; i < amount; i++) {
    const [across, down] = DROP_SHAPE[i];
    engine.addParticle(centreX + across * spacing, centreY + down * spacing,
      0, 35 + down * 10);
  }
  return amount;
}
