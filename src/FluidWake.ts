/** Small 2D velocity/dye simulation. Dye represents a thin clearing in the fog. */
export class FluidWake {
  readonly dye: Float32Array;
  active = false;
  private u: Float32Array;
  private v: Float32Array;
  private previousU: Float32Array;
  private previousV: Float32Array;
  private previousDye: Float32Array;
  private curl: Float32Array;
  private divergence: Float32Array;
  private pressure: Float32Array;
  private idle = 0;

  constructor(readonly columns: number, readonly rows: number) {
    const size = columns * rows;
    this.dye = new Float32Array(size);
    this.u = new Float32Array(size); this.v = new Float32Array(size);
    this.previousU = new Float32Array(size); this.previousV = new Float32Array(size);
    this.previousDye = new Float32Array(size); this.curl = new Float32Array(size);
    this.divergence = new Float32Array(size); this.pressure = new Float32Array(size);
  }

  injectStroke(fromX: number, fromY: number, toX: number, toY: number, seconds: number, cssWidth: number, cssHeight: number) {
    if (![fromX, fromY, toX, toY, seconds, cssWidth, cssHeight].every(Number.isFinite) || cssWidth <= 0 || cssHeight <= 0) return;
    const distance = Math.hypot((toX - fromX) * cssWidth, (toY - fromY) * cssHeight);
    // Six CSS pixels at the tip. It stretches downstream through advection.
    const radiusX = Math.max(.65, 6 * this.columns / cssWidth);
    const radiusY = Math.max(.65, 6 * this.rows / cssHeight);
    const steps = Math.min(200, Math.max(1, Math.ceil(distance / 3)));
    const dt = Math.max(.008, Math.min(.05, seconds));
    const pushX = Math.max(-110, Math.min(110, (toX - fromX) * this.columns / dt * .22));
    const pushY = Math.max(-110, Math.min(110, (toY - fromY) * this.rows / dt * .22));
    for (let step = 1; step <= steps; step++) {
      const x = (fromX + (toX - fromX) * step / steps) * (this.columns - 1);
      const y = (fromY + (toY - fromY) * step / steps) * (this.rows - 1);
      const left = Math.max(1, Math.floor(x - radiusX * 2));
      const right = Math.min(this.columns - 2, Math.ceil(x + radiusX * 2));
      const top = Math.max(1, Math.floor(y - radiusY * 2));
      const bottom = Math.min(this.rows - 2, Math.ceil(y + radiusY * 2));
      for (let gy = top; gy <= bottom; gy++) {
        for (let gx = left; gx <= right; gx++) {
          const d = ((gx - x) / radiusX) ** 2 + ((gy - y) / radiusY) ** 2;
          const weight = Math.exp(-d * 2);
          const i = gy * this.columns + gx;
          this.dye[i] = Math.min(1, this.dye[i] + weight * .9);
          this.u[i] = Math.max(-120, Math.min(120, this.u[i] + pushX * weight * .55));
          this.v[i] = Math.max(-120, Math.min(120, this.v[i] + pushY * weight * .55));
        }
      }
    }
    this.idle = 0; this.active = true;
  }

  private sample(field: Float32Array, x: number, y: number) {
    x = Math.max(.001, Math.min(this.columns - 1.001, x));
    y = Math.max(.001, Math.min(this.rows - 1.001, y));
    const ix = Math.floor(x); const iy = Math.floor(y);
    const tx = x - ix; const ty = y - iy; const i = iy * this.columns + ix;
    return (field[i] * (1 - tx) + field[i + 1] * tx) * (1 - ty)
      + (field[i + this.columns] * (1 - tx) + field[i + this.columns + 1] * tx) * ty;
  }

  step(seconds: number, reducedMotion = false) {
    if (!this.active) return;
    const dt = Math.min(.033, Math.max(0, seconds));
    this.idle += dt;
    if (this.idle > 4.5) { this.dye.fill(0); this.u.fill(0); this.v.fill(0); this.active = false; return; }
    const w = this.columns; const h = this.rows;
    const velocityFade = Math.exp(-2.4 * dt); const dyeFade = Math.exp(-(reducedMotion ? 2.8 : 1.5) * dt);
    if (reducedMotion) {
      this.u.fill(0); this.v.fill(0);
      let peak = 0;
      for (let i = 0; i < this.dye.length; i++) { this.dye[i] *= dyeFade; peak = Math.max(peak, this.dye[i]); }
      this.active = peak > .004;
      return;
    }
    this.previousU.set(this.u); this.previousV.set(this.v); this.previousDye.set(this.dye);
    // Semi-Lagrangian velocity advection remains stable for rapid pointer input.
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const sx = x - this.previousU[i] * dt; const sy = y - this.previousV[i] * dt;
      this.u[i] = this.sample(this.previousU, sx, sy) * velocityFade;
      this.v[i] = this.sample(this.previousV, sx, sy) * velocityFade;
    }
    // Vorticity confinement keeps a fine, curling wake instead of round stamps.
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      this.curl[i] = .5 * (this.v[i + 1] - this.v[i - 1] - this.u[i + w] + this.u[i - w]);
    }
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      let nx = Math.abs(this.curl[i + 1]) - Math.abs(this.curl[i - 1]);
      let ny = Math.abs(this.curl[i + w]) - Math.abs(this.curl[i - w]);
      const length = Math.hypot(nx, ny) + .0001; nx /= length; ny /= length;
      const force = this.curl[i] * 8 * dt;
      this.u[i] = Math.max(-120, Math.min(120, this.u[i] + ny * force));
      this.v[i] = Math.max(-120, Math.min(120, this.v[i] - nx * force));
    }
    // Pressure projection makes local motion flow around the cursor's path.
    this.pressure.fill(0);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      this.divergence[i] = -.5 * (this.u[i + 1] - this.u[i - 1] + this.v[i + w] - this.v[i - w]);
    }
    for (let iteration = 0; iteration < 7; iteration++) {
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        this.pressure[i] = (this.divergence[i] + this.pressure[i - 1] + this.pressure[i + 1] + this.pressure[i - w] + this.pressure[i + w]) * .25;
      }
    }
    let peak = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      this.u[i] -= .5 * (this.pressure[i + 1] - this.pressure[i - 1]);
      this.v[i] -= .5 * (this.pressure[i + w] - this.pressure[i - w]);
    }
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      this.dye[i] = this.sample(this.previousDye, x - this.u[i] * dt, y - this.v[i] * dt) * dyeFade;
      peak = Math.max(peak, this.dye[i]);
    }
    this.active = peak > .004;
    if (!this.active) { this.dye.fill(0); this.u.fill(0); this.v.fill(0); }
  }

  writeMask(pixels: Uint8ClampedArray) {
    for (let i = 0; i < this.dye.length; i++) pixels[i * 4 + 3] = Math.min(245, this.dye[i] * 245);
  }
}
