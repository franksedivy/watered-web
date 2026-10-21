import { SPACING, clamp } from "./model.js";

// Decorative foam carried by particle IDs. Read the solver; never modify it.
export class SurfaceFoam {
  constructor(capacity) {
    this.strength = new Float32Array(capacity);
    this.values = new Float32Array(capacity);
    this.top = new Float32Array(0);
  }

  clear() {
    this.strength.fill(0);
    this.values.fill(0);
  }

  update(engine, dt) {
    if (dt <= 0) return;
    const scale = engine.particleScale || 1;
    const cell = SPACING * scale * 1.5;
    const columns = Math.max(1, Math.ceil(engine.width / cell));
    if (this.top.length !== columns) this.top = new Float32Array(columns);
    this.top.fill(Infinity);
    const column = x => clamp(Math.floor(x / cell), 0, columns - 1);
    for (let i = 0; i < engine.count; i++) {
      const c = column(engine.x[i]);
      this.top[c] = Math.min(this.top[c], engine.y[i]);
    }
    const decay = Math.exp(-dt / 0.65);
    for (let i = 0; i < engine.count; i++) {
      const c = column(engine.x[i]);
      const surface = Math.min(this.top[c], this.top[Math.max(0, c - 1)],
        this.top[Math.min(columns - 1, c + 1)]);
      const exposure = clamp(1 - (engine.y[i] - surface) / (SPACING * scale * 1.3), 0, 1);
      const speed = Math.hypot(engine.vx[i], engine.vy[i]) / scale;
      const activity = clamp((speed - 20) / 150, 0, 1);
      this.strength[i] = Math.max(this.strength[i] * decay, activity * exposure);
      this.values[i] = this.strength[i] * exposure;
    }
    this.strength.fill(0, engine.count);
    this.values.fill(0, engine.count);
  }
}
