import assert from "node:assert/strict";
import test from "node:test";
import { SurfaceFoam } from "../src/assets/js/fluid/foam.js";

function pool() {
  return {
    width: 720, height: 400, count: 4, particleScale: 1,
    x: new Float32Array([100, 115, 100, 115]),
    y: new Float32Array([100, 100, 140, 140]),
    vx: new Float32Array([0, 0, 200, 200]),
    vy: new Float32Array(4),
  };
}

test("Foam follows moving surface particles without whitening buried motion or changing physics", () => {
  const engine = pool();
  const foam = new SurfaceFoam(8);
  foam.update(engine, 1 / 60);
  assert.ok(foam.values.every(value => value === 0), "Motion below the surface stays blue");
  engine.vx[0] = 180;
  const before = structuredClone(engine);
  foam.update(engine, 1 / 60);
  assert.ok(foam.values[0] > 0.5);
  assert.equal(foam.values[1], 0, "A stationary neighbour stays clear");
  assert.equal(foam.values[2], 0);
  assert.equal(foam.values[3], 0);
  assert.deepEqual(engine, before, "Only the decorative field may change");
});

test("Foam freezes without simulation time, fades after motion and clears on reset", () => {
  const engine = pool();
  engine.vx[0] = 180;
  const foam = new SurfaceFoam(8);
  foam.update(engine, 1 / 60);
  const peak = foam.values[0];
  engine.vx.fill(0);
  foam.update(engine, 0);
  assert.equal(foam.values[0], peak);
  foam.update(engine, 0.65);
  assert.ok(foam.values[0] > 0 && foam.values[0] < peak * 0.5);
  for (let i = 0; i < 8; i++) foam.update(engine, 0.65);
  assert.ok(foam.values[0] < 0.001);
  engine.vx[0] = 180;
  foam.update(engine, 1 / 60);
  assert.ok(foam.values[0] > 0.5);
  foam.clear();
  assert.ok(foam.values.every(value => value === 0));
});

test("Foam follows a sideways free surface rather than the screen's top edge", () => {
  const engine = pool();
  engine.gravityX = 920;
  engine.gravityY = 0;
  engine.x.set([100, 100, 140, 140]);
  engine.y.set([100, 115, 100, 115]);
  const foam = new SurfaceFoam(8);
  foam.update(engine, 1 / 60);
  assert.ok(foam.values.every(value => value === 0), "Buried sideways motion stays clear");
  engine.vx[0] = 180;
  foam.update(engine, 1 / 60);
  assert.ok(foam.values[0] > 0.5);
  assert.equal(foam.values[2], 0);
  assert.equal(foam.values[3], 0);
});
