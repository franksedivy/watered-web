import assert from "node:assert/strict";
import test from "node:test";
import { SPHStudy } from "../src/assets/js/fluid/sph.js";
import { DEFAULT_PARTICLE_SCALE, DOSE, seed } from "../src/assets/js/fluid/model.js";
import { reshapePool } from "../src/assets/js/fluid/pool-frame.js";
import { HOME_CAPACITY, HOME_UNITS_PER_PIXEL, homeCapacity, homeStartingCount, HOME_DROP, addHomeDrop } from "../src/assets/js/fluid/home-model.js";

test("Homepage seeds responsive desktop and phone pools at 0.8 with room for additions", () => {
  for (const [width, height, water] of [[1280, 720, 180], [1440, 900, 225], [402, 874, 55], [874, 402, 30]]) {
    const initial = homeStartingCount(width, water);
    assert.ok(initial >= DOSE && initial <= HOME_CAPACITY - DOSE * 6);
    const capacity = homeCapacity(width, water);
    assert.ok(initial <= capacity - DOSE * 6);
    const engine = new SPHStudy({ width: width * HOME_UNITS_PER_PIXEL,
      height: height * HOME_UNITS_PER_PIXEL, maxParticles: capacity });
    seed(engine, initial);
    assert.equal(engine.particleScale, DEFAULT_PARTICLE_SCALE);
    assert.equal(engine.count, initial);
    for (let i = 0; i < 120; i++) engine.step(1 / 60);
    assert.equal(engine.count, initial);
    for (let i = 0; i < engine.count; i++) {
      assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
      assert.ok(engine.x[i] >= 0 && engine.x[i] <= engine.width);
      assert.ok(engine.y[i] >= 0 && engine.y[i] <= engine.height);
    }
  }
});

test("Homepage rotation preserves the same particles, physical scale and momentum", () => {
  const capacity = homeCapacity(402, 55);
  const engine = new SPHStudy({ width: 402 * HOME_UNITS_PER_PIXEL,
    height: 874 * HOME_UNITS_PER_PIXEL, maxParticles: capacity });
  seed(engine, homeStartingCount(402, 55));
  addHomeDrop(engine, 360, 65);
  const count = engine.count;
  const x = engine.x[0];
  const y = engine.y[0];
  engine.vx[0] = 12;
  engine.vy[0] = 34;
  const width = engine.width;
  const height = engine.height;
  reshapePool(engine, height, width, 90);
  assert.equal(engine.count, count);
  assert.ok(Math.abs(engine.x[0] - y) < 0.001);
  assert.ok(Math.abs(engine.y[0] - (width - x)) < 0.001);
  assert.ok(Math.abs(engine.vx[0] - 34) < 0.001);
  assert.ok(Math.abs(engine.vy[0] + 12) < 0.001);
  assert.equal(engine.particleScale, DEFAULT_PARTICLE_SCALE);
  reshapePool(engine, width, height, -90);
  assert.ok(Math.abs(engine.x[0] - x) < 0.001);
  assert.ok(Math.abs(engine.y[0] - y) < 0.001);
  assert.ok(Math.abs(engine.vx[0] - 12) < 0.001);
  assert.ok(Math.abs(engine.vy[0] - 34) < 0.001);
  seed(engine, capacity);
  for (const angle of [90, -90, -90, 90]) {
    reshapePool(engine, engine.height, engine.width, angle);
    engine.setGravityDirection(angle > 0 ? 0.7 : -0.7, 0.7);
    for (let i = 0; i < 120; i++) engine.step(1 / 60);
    assert.equal(engine.count, capacity);
    for (let i = 0; i < engine.count; i++) {
      assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
      assert.ok(engine.x[i] >= 0 && engine.x[i] <= engine.width);
      assert.ok(engine.y[i] >= 0 && engine.y[i] <= engine.height);
    }
  }
});

test("Homepage particle footprints and small drops stay constant across viewport widths", () => {
  const footprints = [];
  const pours = [];
  for (const width of [375, 402, 874, 1280, 1440, 1920]) {
    const engine = new SPHStudy({ width: width * HOME_UNITS_PER_PIXEL,
      height: 900 * HOME_UNITS_PER_PIXEL, maxParticles: homeCapacity(width, 55) });
    footprints.push(32 * engine.particleScale * width / engine.width);
    assert.equal(addHomeDrop(engine, engine.width / 2, 100), HOME_DROP);
    pours.push((Math.max(...engine.x.subarray(0, engine.count))
      - Math.min(...engine.x.subarray(0, engine.count))) * width / engine.width);
  }
  for (const footprint of footprints) assert.ok(Math.abs(footprint - 20) < 0.001);
  for (const pour of pours) {
    assert.ok(pour < 15, "A compact drop spans less than 15 CSS pixels between particle centres");
    assert.ok(Math.abs(pour - pours[0]) < 0.001);
  }
  assert.equal(homeCapacity(402, 55), 1800, "Phones retain a small allocation");
  assert.equal(homeCapacity(3840, 540), HOME_CAPACITY, "Large screens retain a hard limit");
});

test("A full desktop pool remains bounded at the larger fixed-pixel budget", () => {
  const engine = new SPHStudy({ width: 1440 * HOME_UNITS_PER_PIXEL,
    height: 900 * HOME_UNITS_PER_PIXEL, maxParticles: HOME_CAPACITY });
  seed(engine, HOME_CAPACITY);
  engine.setGravityDirection(0.6, 0.8);
  for (let frame = 0; frame < 120; frame++) engine.step(1 / 60);
  assert.equal(engine.count, HOME_CAPACITY);
  for (let i = 0; i < engine.count; i++) {
    assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
    assert.ok(engine.x[i] >= 0 && engine.x[i] <= engine.width);
    assert.ok(engine.y[i] >= 0 && engine.y[i] <= engine.height);
  }
});

test("Small homepage drops respect the tank edges and remaining capacity", () => {
  const engine = new SPHStudy({ width: 402 * HOME_UNITS_PER_PIXEL,
    height: 874 * HOME_UNITS_PER_PIXEL, maxParticles: 1800 });
  for (const [x, y] of [[0, 0], [engine.width, engine.height]]) {
    assert.equal(addHomeDrop(engine, x, y), HOME_DROP);
  }
  for (let i = 0; i < engine.count; i++) {
    assert.ok(engine.x[i] >= engine.boundaryPadding && engine.x[i] <= engine.width - engine.boundaryPadding);
    assert.ok(engine.y[i] >= engine.boundaryPadding && engine.y[i] <= engine.height - engine.boundaryPadding);
    assert.ok(engine.vy[i] >= 15 && engine.vy[i] <= 46, "The pointed tail trails the gently falling base");
  }
  seed(engine, engine.maxParticles - 3);
  const first = [engine.x[0], engine.y[0]];
  assert.equal(addHomeDrop(engine, 200, 100), 3);
  assert.equal(addHomeDrop(engine, 200, 100), 0);
  assert.equal(engine.count, engine.maxParticles);
  assert.deepEqual([engine.x[0], engine.y[0]], first, "Existing water is retained at capacity");
});
