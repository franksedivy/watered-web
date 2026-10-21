import SPH from "../../vendor/sphjs/SPH.js";
import { clamp, PADDING, DEFAULT_PARTICLE_SCALE } from "./model.js";

// Use the upstream CPU solver deliberately. This study does not benchmark
// SPHjs's separate WebGPU solver.
export class SPHStudy extends SPH {
  constructor(options) {
    super({ ...options, boundaryPadding: PADDING });
    this.backend = "SPHjs CPU";
    this.capacity = this.maxParticles;
    this.configureParticleScale(DEFAULT_PARTICLE_SCALE);
  }

  configureParticleScale(value) {
    const scale = clamp(Number(value) || 1, 0.5, 1.5);
    this.particleScale = scale;
    this.maxParticles = Math.floor(this.capacity / Math.max(1, scale * scale));
    this.smoothingRadius = 32 * scale;
    this.smoothingRadiusSquared = this.smoothingRadius ** 2;
    this.inverseSmoothingRadius = 1 / this.smoothingRadius;
    this.boundaryPadding = PADDING * scale;
    this.stiffness = 850 * scale;
    this.nearStiffness = 1100 * scale;
    this._allocateGrid();
  }

  resize(width, height) {
    const padding = this.boundaryPadding;
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    // Normalize on every resize; upstream only rescales for large aspect changes.
    const positions = Array.from({ length: this.count }, (_, i) => [
      clamp(this.x[i] * scaleX, padding, width - padding),
      clamp(this.y[i] * scaleY, padding, height - padding),
    ]);
    super.resize(width, height);
    positions.forEach(([x, y], i) => {
      this.x[i] = this.previousX[i] = x;
      this.y[i] = this.previousY[i] = y;
      this.vx[i] = this.vy[i] = 0;
    });
  }
}

export async function createEngine(options) {
  return new SPHStudy(options);
}
