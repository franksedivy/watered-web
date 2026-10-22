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
    const length = Math.hypot(engine.gravityX || 0, engine.gravityY || 0);
    const downX = length > 0.01 ? engine.gravityX / length : 0;
    const downY = length > 0.01 ? engine.gravityY / length : 1;
    const acrossX = downY;
    const acrossY = -downX;
    const minimum = Math.min(0, engine.width * acrossX) + Math.min(0, engine.height * acrossY);
    const span = Math.abs(engine.width * acrossX) + Math.abs(engine.height * acrossY);
    const columns = Math.max(1, Math.ceil(span / cell));
    if (this.top.length !== columns) this.top = new Float32Array(columns);
    this.top.fill(Infinity);
    const column = i => clamp(Math.floor((engine.x[i] * acrossX + engine.y[i] * acrossY - minimum) / cell), 0, columns - 1);
    const depth = i => engine.x[i] * downX + engine.y[i] * downY;
    for (let i = 0; i < engine.count; i++) {
      const c = column(i);
      this.top[c] = Math.min(this.top[c], depth(i));
    }
    const decay = Math.exp(-dt / 0.65);
    for (let i = 0; i < engine.count; i++) {
      const c = column(i);
      const surface = Math.min(this.top[c], this.top[Math.max(0, c - 1)],
        this.top[Math.min(columns - 1, c + 1)]);
      const exposure = clamp(1 - (depth(i) - surface) / (SPACING * scale * 1.3), 0, 1);
      const speed = Math.hypot(engine.vx[i], engine.vy[i]) / scale;
      const activity = clamp((speed - 20) / 150, 0, 1);
      this.strength[i] = Math.max(this.strength[i] * decay, activity * exposure);
      this.values[i] = this.strength[i] * exposure;
    }
    this.strength.fill(0, engine.count);
    this.values.fill(0, engine.count);
  }
}
