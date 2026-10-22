import assert from "node:assert/strict";
import test from "node:test";
import { PhoneTilt, screenAngle, tiltGravity } from "../src/assets/js/fluid/tilt.js";
import { SPHStudy } from "../src/assets/js/fluid/sph.js";
import { seed } from "../src/assets/js/fluid/model.js";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);

test("Gravity follows the lowered edge in portrait, both landscapes and upside-down", () => {
  let g = tiltGravity(45, 90, 0);
  assert.ok(g.x > 0 && g.y > 0);
  close(g.x, g.y);
  g = tiltGravity(45, -90, 0);
  assert.ok(g.x < 0 && g.y > 0);
  for (const [beta, gamma, angle] of [[90, 0, 0], [0, -90, 90], [0, 90, -90], [-90, 0, 180]]) {
    g = tiltGravity(beta, gamma, angle);
    close(g.x, 0);
    close(g.y, 1);
  }
  close(tiltGravity(0, 0).y, 0.2);
  for (const bad of [[null, 0], [0, null], [NaN, 30], [181, 0], [0, Infinity]]) {
    assert.equal(tiltGravity(...bad), null);
  }
  assert.equal(screenAngle({ screen: { orientation: { angle: 270 } }, orientation: 90 }), 270);
  assert.equal(screenAngle({ orientation: -90 }), -90);
});

function phone(requestPermission = () => Promise.resolve("granted")) {
  const host = new EventTarget();
  host.isSecureContext = true;
  host.DeviceOrientationEvent = { requestPermission };
  host.screen = { orientation: { angle: 0 } };
  host.setTimeout = callback => { host.timeout = callback; return 1; };
  host.clearTimeout = () => { host.timeout = null; };
  host.send = (beta, gamma) => {
    const event = new Event("deviceorientation");
    Object.assign(event, { beta, gamma });
    host.dispatchEvent(event);
  };
  return host;
}

test("Tilt requests permission only on enable, ignores null data, and stops/restarts listeners", async () => {
  let requests = 0;
  const host = phone(() => { requests++; return Promise.resolve("granted"); });
  const tilt = new PhoneTilt({ host });
  tilt.setRunning(true);
  assert.equal(requests, 0);
  const enabling = tilt.enable();
  assert.equal(requests, 1, "Permission call happens synchronously in the initiating gesture");
  await enabling;
  assert.equal(tilt.state, "waiting");
  host.send(null, null);
  assert.equal(tilt.gravity(), null);
  host.send(45, 90);
  assert.equal(tilt.state, "on");
  assert.ok(tilt.gravity().x > 0);
  tilt.setRunning(false);
  host.send(45, -90);
  assert.equal(tilt.gravity(), null);
  assert.equal(host.timeout, null);
  tilt.setRunning(true);
  assert.equal(tilt.gravity(), null, "Resume waits for fresh readings");
  host.send(90, 0);
  close(tilt.gravity().y, 1);
  host.send(75, 90);
  const held = tilt.gravity();
  assert.ok(held.x > 0.25 && held.x < 0.27, "A 15-degree roll produces lateral gravity");
  for (let frame = 0; frame < 600; frame++) {
    assert.deepEqual(tilt.gravity(), held, "Holding a pose without new events retains its gravity");
  }
  tilt.disable();
  host.send(45, -90);
  assert.equal(tilt.state, "off");
  await tilt.enable();
  assert.equal(requests, 1, "Already granted access does not prompt again");
  tilt.disable();
});

test("Denied, failed, unsupported and silent sensors leave ordinary water available", async () => {
  for (const request of [() => Promise.resolve("denied"), () => Promise.reject(new Error("blocked"))]) {
    const host = phone(request);
    const tilt = new PhoneTilt({ host });
    tilt.setRunning(true);
    await tilt.enable();
    assert.equal(tilt.enabled, false);
    assert.equal(tilt.gravity(), null);
    assert.ok(["denied", "unavailable"].includes(tilt.state));
    tilt.disable();
  }
  const host = phone();
  const tilt = new PhoneTilt({ host });
  tilt.setRunning(true);
  await tilt.enable();
  host.timeout();
  assert.equal(tilt.state, "unavailable");
  assert.equal(tilt.enabled, false);
  host.send(45, 90);
  assert.equal(tilt.gravity(), null);
  host.isSecureContext = false;
  const insecure = new PhoneTilt({ host });
  assert.equal(insecure.supported, false);
  await insecure.enable();
  assert.equal(insecure.state, "off");
});

test("Cancelling a pending request cannot turn sensors back on", async () => {
  let resolve;
  const host = phone(() => new Promise(done => { resolve = done; }));
  const tilt = new PhoneTilt({ host });
  tilt.setRunning(true);
  const request = tilt.enable();
  tilt.disable();
  resolve("granted");
  await request;
  assert.equal(tilt.state, "off");
  assert.equal(tilt.enabled, false);
});

test("Actual SPH water gathers to the lowered side and flows back after tilt changes", () => {
  const engine = new SPHStudy({ width: 720, height: 400, maxParticles: 1200 });
  engine.motionGravityStrength = engine.gravityStrength;
  seed(engine, 360);
  const meanX = () => engine.x.subarray(0, engine.count).reduce((sum, x) => sum + x, 0) / engine.count;
  for (const [direction, expected] of [[1, x => x > 500], [-1, x => x < 220]]) {
    engine.setGravityDirection(direction * 0.8, 0.6);
    for (let i = 0; i < 420; i++) engine.step(1 / 60);
    assert.ok(expected(meanX()), `Pool centre is ${meanX()}`);
    assert.equal(engine.count, 360);
    for (let i = 0; i < engine.count; i++) assert.ok(Number.isFinite(engine.x[i]) && Number.isFinite(engine.y[i]));
  }
});

test("A held 15-degree tilt moves water without a screen-orientation change", async t => {
  const host = phone();
  const tilt = new PhoneTilt({ host });
  tilt.setRunning(true);
  await tilt.enable();
  const engine = new SPHStudy({ width: 720, height: 1160, maxParticles: 1800 });
  engine.motionGravityStrength = engine.gravityStrength;
  seed(engine, 858);
  for (let i = 0; i < 180; i++) engine.step(1 / 60);
  const meanX = () => engine.x.subarray(0, engine.count).reduce((sum, x) => sum + x, 0) / engine.count;
  const initial = meanX();
  try {
    host.send(75, 90); // One 15-degree reading; no continuous event stream.
    const tenSecondsLater = Date.now() + 10000;
    t.mock.method(Date, "now", () => tenSecondsLater);
    for (let i = 0; i < 600; i++) {
      const g = tilt.gravity();
      assert.ok(g);
      engine.setGravityDirection(g.x, g.y);
      engine.step(1 / 60);
    }
    assert.ok(meanX() > initial + 100, `15-degree tilt moves pool centre from ${initial} to ${meanX()}`);
    assert.equal(host.screen.orientation.angle, 0, "Viewport remains portrait throughout");
    assert.equal(engine.count, 858);
  } finally { tilt.disable(); }
});
