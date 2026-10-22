import { clamp } from "./model.js";

// Reshape an existing pool in physical screen units. A screen-axis change rotates
// positions AND momentum; resizing never seeds new particles or resets velocity.
export function reshapePool(engine, width, height, angle = 0) {
  const turn = angle * Math.PI / 180;
  const cosine = Math.cos(turn);
  const sine = Math.sin(turn);
  const oldWidth = engine.width;
  const oldHeight = engine.height;
  const positions = Array.from({ length: engine.count }, (_, i) => {
    const x = engine.x[i] - oldWidth / 2;
    const y = engine.y[i] - oldHeight / 2;
    return [x * cosine + y * sine + width / 2,
      -x * sine + y * cosine + height / 2,
      engine.vx[i] * cosine + engine.vy[i] * sine,
      -engine.vx[i] * sine + engine.vy[i] * cosine];
  });
  const gravity = [engine.gravityX, engine.gravityY];
  const target = [engine.targetGravityX, engine.targetGravityY];
  engine.resize(width, height);
  const padding = engine.boundaryPadding;
  positions.forEach(([x, y, vx, vy], i) => {
    engine.x[i] = engine.previousX[i] = clamp(x, padding, width - padding);
    engine.y[i] = engine.previousY[i] = clamp(y, padding, height - padding);
    engine.vx[i] = vx;
    engine.vy[i] = vy;
  });
  engine.gravityX = gravity[0] * cosine + gravity[1] * sine;
  engine.gravityY = -gravity[0] * sine + gravity[1] * cosine;
  engine.targetGravityX = target[0] * cosine + target[1] * sine;
  engine.targetGravityY = -target[0] * sine + target[1] * cosine;
}
