import { DEFAULT_PARTICLE_SCALE, DOSE, SPACING, WIDTH, clamp } from "./model.js";

export const HOME_CAPACITY = 1800;

// Match the existing CSS waterline at startup, with headroom for added water.
// The physical scale stays 0.8; only the starting number adapts to the layout.
export function homeStartingCount(viewWidth, waterHeight) {
  const pixelsPerUnit = viewWidth / WIDTH;
  const depth = waterHeight * 0.94 / pixelsPerUnit;
  // Settled SPH packs more tightly than the emission grid.
  const area = (SPACING * DEFAULT_PARTICLE_SCALE) ** 2 * 0.76;
  return clamp(Math.round(depth * WIDTH / area), DOSE, HOME_CAPACITY - DOSE * 6);
}

export function homeTotalCount(baseline, added) {
  return Math.min(HOME_CAPACITY, baseline + added);
}
