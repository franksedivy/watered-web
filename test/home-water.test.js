import assert from "node:assert/strict";
import test from "node:test";
import { SPHStudy } from "../src/assets/js/fluid/sph.js";
import { DEFAULT_PARTICLE_SCALE, DOSE, WIDTH, addDose, seed } from "../src/assets/js/fluid/model.js";
import { HOME_CAPACITY, homeStartingCount, homeTotalCount } from "../src/assets/js/fluid/home-model.js";

test("Homepage seeds responsive desktop and phone pools at 0.8 with room for additions", () => {
  for (const [width, height, water] of [[1280, 720, 180], [402, 874, 55], [874, 402, 30]]) {
    const initial = homeStartingCount(width, water);
    assert.ok(initial >= DOSE && initial <= HOME_CAPACITY - DOSE * 6);
    const engine = new SPHStudy({ width: WIDTH, height: WIDTH * height / width, maxParticles: HOME_CAPACITY });
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

test("Homepage rotation retains added amount while adapting its baseline and capping capacity", () => {
  const portrait = homeStartingCount(402, 55);
  const landscape = homeStartingCount(874, 30);
  assert.ok(portrait > landscape);
  const engine = new SPHStudy({ width: WIDTH, height: WIDTH * 874 / 402, maxParticles: HOME_CAPACITY });
  seed(engine, portrait);
  const added = addDose(engine, "pour", 360, 65) + addDose(engine, "pour", 360, 65);
  assert.equal(added, DOSE * 2);
  engine.resize(WIDTH, WIDTH * 402 / 874);
  seed(engine, homeTotalCount(landscape, added));
  assert.equal(engine.count - landscape, added);
  assert.equal(homeTotalCount(portrait, HOME_CAPACITY), HOME_CAPACITY);
  seed(engine, HOME_CAPACITY);
  for (let i = 0; i < 180; i++) engine.step(1 / 60);
  assert.equal(engine.count, HOME_CAPACITY);
  for (let i = 0; i < engine.count; i++) {
    assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
    assert.ok(engine.x[i] >= 0 && engine.x[i] <= engine.width);
    assert.ok(engine.y[i] >= 0 && engine.y[i] <= engine.height);
  }
});
