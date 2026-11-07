/**
 * Touch / mouse / keyboard input.
 * - drag anywhere = virtual joystick (screen-space vector). Tiptoe is the default: running needs the knob
 *   held at ≥ 85 % of the full drag for a moment, or a deliberate double-tap-and-hold
 * - toy button then tap = throw at that point; Space throws ahead
 * - WASD / arrows move (tiptoe), Shift runs
 */
export interface Joy {
  active: boolean;
  ox: number;
  oy: number;
  x: number;
  y: number;
}

/** fraction of the full drag where running starts (with a short dwell), and where it stops again */
export const RUN_ZONE = 0.85;
const RUN_OFF = 0.7;
const RUN_DWELL = 200; // ms
/** a non-running drag never asks for more than this (the world runs above 0.8) */
const TIPTOE_MAX = 0.6;

export class InputCtl {
  joy: Joy = { active: false, ox: 0, oy: 0, x: 0, y: 0 };
  /** screen-space move vector: x right, y up, magnitude 0..1 */
  vx = 0;
  vy = 0;
  run = false;
  aiming = false;
  /** pending throw target in screen coords (px) */
  tapThrow: { x: number; y: number } | null = null;
  spaceThrow = false;
  enabled = true;
  private keys = new Set<string>();
  private pid = -1;
  private downAt = 0;
  private downPos = { x: 0, y: 0 };
  onAnyInput: () => void = () => {};
  onTap: (x: number, y: number) => void = () => {};
  /** called when the drag switches between tiptoe and run */
  onRunChange: (run: boolean) => void = () => {};
  radius = 80;
  /** double-tap-and-hold: this drag runs */
  private runLock = false;
  private dragRun = false;
  private zoneSince = 0;
  private lastTap = { t: -1e9, x: 0, y: 0 };

  constructor(readonly el: HTMLElement) {
    el.addEventListener('pointerdown', this.down, { passive: false });
    window.addEventListener('pointermove', this.move, { passive: false });
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.up);
    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.release();
    });
  }

  private down = (e: PointerEvent) => {
    this.onAnyInput();
    if (!this.enabled) return;
    if (this.pid !== -1) return;
    e.preventDefault();
    this.pid = e.pointerId;
    this.downAt = performance.now();
    this.downPos = { x: e.clientX, y: e.clientY };
    if (this.aiming) return;
    this.runLock = this.downAt - this.lastTap.t < 320 && Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 60;
    this.joy = { active: true, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  };
  private move = (e: PointerEvent) => {
    if (e.pointerId !== this.pid || !this.joy.active) return;
    e.preventDefault();
    let dx = e.clientX - this.joy.ox,
      dy = e.clientY - this.joy.oy;
    const d = Math.hypot(dx, dy);
    const R = this.radius;
    // the base follows the finger if dragged well beyond the ring (comfortable on phones)
    if (d > R * 1.4) {
      const k = (d - R * 1.4) / d;
      this.joy.ox += dx * k;
      this.joy.oy += dy * k;
      dx = e.clientX - this.joy.ox;
      dy = e.clientY - this.joy.oy;
    }
    this.joy.x = e.clientX;
    this.joy.y = e.clientY;
  };
  private up = (e: PointerEvent) => {
    if (e.pointerId !== this.pid) return;
    const quick = performance.now() - this.downAt < 260 && Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) < 14;
    if (this.aiming && quick) this.tapThrow = { x: e.clientX, y: e.clientY };
    else if (quick) {
      this.onTap(e.clientX, e.clientY);
      this.lastTap = { t: performance.now(), x: e.clientX, y: e.clientY };
    }
    this.release();
  };
  private release() {
    this.pid = -1;
    this.joy.active = false;
    this.runLock = false;
    this.setDragRun(false);
  }
  private setDragRun(on: boolean) {
    if (on === this.dragRun) return;
    this.dragRun = on;
    if (on) {
      try {
        navigator.vibrate?.(15);
      } catch {
        /* not supported */
      }
    }
    this.onRunChange(on);
  }
  private kd = (e: KeyboardEvent) => {
    this.onAnyInput();
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === 'Space') {
      this.spaceThrow = true;
      e.preventDefault();
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
  };
  private ku = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  /** call once per frame */
  poll() {
    let x = 0,
      y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft') || k.has('KeyQ')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp') || k.has('KeyZ')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    this.run = k.has('ShiftLeft') || k.has('ShiftRight');
    if (x || y) {
      const d = Math.hypot(x, y);
      // keyboard: tiptoe by default, Shift to run
      this.vx = (x / d) * 0.5;
      this.vy = (y / d) * 0.5;
      return;
    }
    this.run = false;
    if (this.joy.active && this.enabled) {
      const dx = this.joy.x - this.joy.ox,
        dy = this.joy.y - this.joy.oy;
      const d = Math.hypot(dx, dy);
      const m = Math.min(1, d / this.radius);
      if (d > 6) {
        const now = performance.now();
        if (m >= RUN_ZONE) {
          if (!this.zoneSince) this.zoneSince = now;
        } else this.zoneSince = 0;
        const run = this.runLock || (this.dragRun ? m >= RUN_OFF : !!this.zoneSince && now - this.zoneSince >= RUN_DWELL);
        this.setDragRun(run);
        this.run = run;
        const k = run ? 1 : Math.min(m, TIPTOE_MAX);
        this.vx = (dx / d) * k;
        this.vy = (-dy / d) * k;
        return;
      }
    }
    this.zoneSince = 0;
    this.setDragRun(false);
    this.vx = 0;
    this.vy = 0;
  }

  clear() {
    this.keys.clear();
    this.release();
    this.vx = this.vy = 0;
    this.tapThrow = null;
    this.spaceThrow = false;
    this.aiming = false;
  }
}
