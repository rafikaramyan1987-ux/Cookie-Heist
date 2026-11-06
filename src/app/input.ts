/**
 * Touch / mouse / keyboard input.
 * - drag anywhere = virtual joystick (screen-space vector; small drag = tiptoe, long drag = run)
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
  radius = 80;

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
    this.joy = { active: true, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  };
  private move = (e: PointerEvent) => {
    if (e.pointerId !== this.pid || !this.joy.active) return;
    e.preventDefault();
    let dx = e.clientX - this.joy.ox,
      dy = e.clientY - this.joy.oy;
    const d = Math.hypot(dx, dy);
    const R = this.radius;
    // the base follows the finger if dragged beyond the ring (comfortable on phones)
    if (d > R * 1.25) {
      const k = (d - R * 1.25) / d;
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
    else if (quick) this.onTap(e.clientX, e.clientY);
    this.release();
  };
  private release() {
    this.pid = -1;
    this.joy.active = false;
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
        this.vx = (dx / d) * m;
        this.vy = (-dy / d) * m;
        return;
      }
    }
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
