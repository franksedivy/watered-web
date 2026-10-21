import assert from "node:assert/strict";
import test from "node:test";
import { SPHStudy } from "../src/assets/js/fluid/sph.js";
import { CAPACITY, INITIAL_PARTICLES, DOSE, DEFAULT_PARTICLE_SCALE, addDose, seed } from "../src/assets/js/fluid/model.js";

test(`SPHjs: changing particle size rebuilds the pool and keeps small/large simulations bounded`, () => {
  const engine = new SPHStudy({ width: 720, height: 174, maxParticles: CAPACITY });
  try {
    for (const scale of [0.5, 1.5, 1]) {
      engine.configureParticleScale(scale);
      seed(engine);
      assert.equal(engine.count, INITIAL_PARTICLES);
      assert.equal(engine.particleScale, scale);
      assert.equal(engine.smoothingRadius, 32 * scale);
      for (let i = 0; i < 25; i++) addDose(engine, i % 2 ? "pour" : "pool", 360, 65);
      assert.equal(engine.count, engine.maxParticles);
      for (let i = 0; i < 120; i++) engine.step(1 / 60);
      assert.equal(engine.count, engine.maxParticles);
      for (let i = 0; i < engine.count; i++) {
        assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
        assert.ok(engine.x[i] >= 0 && engine.x[i] <= engine.width);
        assert.ok(engine.y[i] >= 0 && engine.y[i] <= engine.height);
      }
    }
  } finally { engine.dispose?.(); }
});

test(`SPHjs: water is retained through taps, settling, resizing, capacity and reset`, () => {
  const engine = new SPHStudy({ width: 720, height: 360, maxParticles: CAPACITY });
  assert.equal(engine.particleScale, DEFAULT_PARTICLE_SCALE);
  try {
    seed(engine);
    assert.equal(engine.count, INITIAL_PARTICLES);
    assert.equal(addDose(engine, "pour", 5, 5), DOSE);
    assert.equal(addDose(engine, "pool", 715, 350), DOSE);
    for (let i = 0; i < 180; i++) engine.step(1 / 60);
    assert.equal(engine.count, INITIAL_PARTICLES + DOSE * 2);

    engine.resize(720, 700);
    engine.resize(720, 196);
    assert.equal(engine.count, INITIAL_PARTICLES + DOSE * 2);
    for (let i = 0; i < 30; i++) addDose(engine, i % 2 ? "pour" : "pool", 360, 65);
    assert.equal(engine.count, CAPACITY);
    assert.equal(addDose(engine, "pour", 360, 65), 0);
    engine.resize(720, 700);
    engine.resize(720, 174);
    for (let i = 0; i < 180; i++) engine.step(1 / 60);
    assert.equal(engine.count, CAPACITY, "No oldest-particle replacement or age-based loss");
    for (let i = 0; i < engine.count; i++) {
      assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
      assert.ok(engine.x[i] >= 0 && engine.x[i] <= engine.width);
      assert.ok(engine.y[i] >= 0 && engine.y[i] <= engine.height);
    }
    for (let i = 0; i < 5; i++) seed(engine);
    assert.equal(engine.count, INITIAL_PARTICLES);
    engine.clear();
    assert.equal(engine.count, 0);
  } finally {
    engine.dispose?.();
  }
});
