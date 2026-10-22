const radians = degrees => degrees * Math.PI / 180;

export function screenAngle(host = window) {
  const angle = host.screen?.orientation?.angle ?? host.orientation ?? 0;
  return Number.isFinite(angle) ? angle : 0;
}

// DeviceOrientation fuses accelerometer/gyro data. Project earth gravity onto
// the display, then account for the screen's rotation relative to the device.
// Alpha (compass heading) is unnecessary; no magnetometer permission is requested.
export function tiltGravity(beta, gamma, angle = 0) {
  if (![beta, gamma, angle].every(Number.isFinite)) return null;
  if (Math.abs(beta) > 180 || Math.abs(gamma) > 90) return null;
  const x = Math.cos(radians(beta)) * Math.sin(radians(gamma));
  const y = Math.sin(radians(beta));
  const turn = radians(angle);
  const gravity = { x: x * Math.cos(turn) + y * Math.sin(turn),
    y: -x * Math.sin(turn) + y * Math.cos(turn) };
  // Face-up phones have almost no gravity in the display plane. Keep a little
  // downward pull there instead of letting sensor noise suspend the pool.
  const length = Math.hypot(gravity.x, gravity.y);
  if (length < 0.2) gravity.y += 0.2 - length;
  return gravity;
}

export class PhoneTilt {
  constructor({ host = window, onChange = () => {} } = {}) {
    this.host = host;
    this.onChange = onChange;
    this.supported = Boolean(host.isSecureContext && host.DeviceOrientationEvent);
    this.enabled = false;
    this.running = false;
    this.permission = false;
    this.state = "off";
    this.reading = null;
    this.sequence = 0;
    this.receive = event => {
      if (!this.enabled || !this.running || !this.listening) return;
      if (!tiltGravity(event.beta, event.gamma)) return;
      this.reading = { beta: event.beta, gamma: event.gamma };
      host.clearTimeout(this.timer);
      if (this.state !== "on") this.change("on");
    };
  }

  change(state) { this.state = state; this.onChange(state); }

  async enable() {
    if (!this.supported || this.state === "requesting") return;
    const sequence = ++this.sequence;
    this.change("requesting");
    try {
      const api = this.host.DeviceOrientationEvent;
      // Invoke directly from the button's click, before any asynchronous work.
      const permission = this.permission ? "granted" : typeof api.requestPermission === "function"
        ? await api.requestPermission() : "granted";
      if (sequence !== this.sequence) return;
      if (permission !== "granted") { this.change("denied"); return; }
      this.permission = this.enabled = true;
      this.change("waiting");
      this.listen();
    } catch {
      if (sequence === this.sequence) this.change("unavailable");
    }
  }

  listen() {
    if (!this.enabled || !this.running || this.listening) return;
    this.listening = true;
    this.reading = null;
    this.change("waiting");
    this.host.addEventListener("deviceorientation", this.receive, { passive: true });
    this.timer = this.host.setTimeout(() => {
      this.enabled = false;
      this.unlisten();
      this.change("unavailable");
    }, 4000);
  }

  unlisten() {
    this.host.removeEventListener("deviceorientation", this.receive);
    this.host.clearTimeout(this.timer);
    this.listening = false;
    this.reading = null;
  }

  setRunning(value) {
    this.running = Boolean(value);
    if (this.running) this.listen();
    else this.unlisten();
  }

  disable() {
    ++this.sequence;
    this.enabled = false;
    this.unlisten();
    this.change("off");
  }

  gravity() {
    // Orientation is a retained pose, not a continuous acceleration stream.
    // A stationary phone may stop sending events; keep its last valid angle
    // until another event, suspension or the user turning tilt off.
    if (!this.running || !this.enabled || !this.reading) return null;
    return tiltGravity(this.reading.beta, this.reading.gamma, screenAngle(this.host));
  }
}
