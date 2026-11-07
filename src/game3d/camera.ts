import * as THREE from 'three';
import { autoYaw, fitDiorama } from '../render/camera';

/**
 * Gameplay camera: tilted diorama view that follows the kid with look-ahead
 * in the direction of movement, an overview (whole level) mode, and shake.
 */
export class GameCamera {
  readonly cam = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(55);
  private look = new THREE.Vector3();
  private lead = new THREE.Vector3();
  private dist = 14;
  private aspect = 1;
  private overviewT = 0; // 0 follow .. 1 overview
  overview = false;
  private ovTarget = new THREE.Vector3();
  private ovDist = 30;
  private shakeT = 0;
  private shakeAmp = 0;
  focus: THREE.Vector3 | null = null; // cinematic focus (win/caught)
  /** bounding box of the kid's current room (+1 cell for the doorways), provided by the scene */
  roomBox: ((x: number, z: number) => { x0: number; z0: number; x1: number; z1: number }) | null = null;
  private curDist = 14;
  private curCenter = new THREE.Vector3();
  private hfov = 1;
  private vfov = 1;
  private focusDist = 6;

  constructor(
    private w: number,
    private d: number,
  ) {}

  get portrait() {
    return this.aspect < 0.9;
  }

  resize(width: number, height: number) {
    this.aspect = width / height;
    this.cam.aspect = this.aspect;
    this.cam.fov = this.portrait ? 38 : 30;
    this.yaw = -autoYaw(this.aspect, this.w, this.d);
    this.cam.updateProjectionMatrix();
    // overview framing
    const fit = fitDiorama(this.cam, new THREE.Vector3(-0.8, 0, -0.8), new THREE.Vector3(this.w + 0.8, 0, this.d + 0.8), this.aspect, {
      yaw: this.yaw,
      pitchDeg: 55,
      fov: this.cam.fov,
      margin: this.portrait ? [0.02, 0.02, 0.14, 0.14] : [0.06, 0.06, 0.1, 0.12],
    });
    this.ovTarget.copy(fit.target);
    this.ovDist = fit.distance;
    // follow distance limits: never closer than ~7 cells across, never farther than ~10.5 (phone)
    this.vfov = THREE.MathUtils.degToRad(this.cam.fov);
    this.hfov = 2 * Math.atan(Math.tan(this.vfov / 2) * this.aspect);
    this.dist = this.distForWidth(this.portrait ? 7 : 12.5);
  }

  private distForWidth(w: number) {
    return w / 2 / Math.tan(this.hfov / 2);
  }

  /** distance that shows the whole room box (clamped so characters stay readable) */
  private roomFraming(px: number, pz: number) {
    const b = this.roomBox ? this.roomBox(px, pz) : { x0: px - 3, z0: pz - 3, x1: px + 3, z1: pz + 3 };
    const side = Math.abs(this.yaw) > 0.1;
    const sw = side ? b.z1 - b.z0 : b.x1 - b.x0; // extent across the screen
    const sd = side ? b.x1 - b.x0 : b.z1 - b.z0; // extent up the screen
    const dW = this.distForWidth(sw);
    const dD = (sd * Math.sin(this.pitch) * 0.5 + 0.7) / Math.tan(this.vfov / 2) / 0.82;
    const lo = this.distForWidth(this.portrait ? 6.8 : 11);
    const hi = this.distForWidth(this.portrait ? 8.6 : 16);
    return { dist: THREE.MathUtils.clamp(Math.max(dW, dD), lo, hi), cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 };
  }

  /** world-space ground direction vectors for screen right / up */
  groundAxes() {
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const up = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return { right, up };
  }

  snapTo(x: number, z: number) {
    this.look.set(x, 0, z);
    this.lead.set(0, 0, 0);
    const fr = this.roomFraming(x, z);
    this.curCenter.set(fr.cx, 0, fr.cz);
    this.curDist = fr.dist;
  }

  shake(amount = 0.25, time = 0.45) {
    this.shakeAmp = amount;
    this.shakeT = time;
  }

  setFocus(p: THREE.Vector3 | null, dist = 6) {
    this.focus = p;
    this.focusDist = dist;
  }

  update(dt: number, px: number, pz: number, vx: number, vz: number) {
    // look-ahead in the direction of movement (more along the long screen axis)
    const sp = Math.hypot(vx, vz);
    const want = new THREE.Vector3();
    if (sp > 0.2) {
      const k = this.portrait ? 1.9 : 2.4;
      want.set((vx / sp) * k * Math.min(1, sp / 1.7), 0, (vz / sp) * k * Math.min(1, sp / 1.7));
    }
    this.lead.lerp(want, 1 - Math.exp(-dt * 1.8));
    // frame the whole current room (+ doorways), leaning towards the kid and the direction of travel
    const fr = this.roomFraming(px, pz);
    this.curCenter.lerp(new THREE.Vector3(fr.cx, 0, fr.cz), 1 - Math.exp(-dt * 3));
    this.curDist += (fr.dist - this.curDist) * (1 - Math.exp(-dt * 2.5));
    const tgt = new THREE.Vector3(
      THREE.MathUtils.lerp(this.curCenter.x, px, 0.45) + this.lead.x * 0.7,
      0,
      THREE.MathUtils.lerp(this.curCenter.z, pz, 0.45) + this.lead.z * 0.7,
    );
    // keep the view mostly over the level
    const m = this.portrait ? 1.2 : 2.5;
    tgt.x = THREE.MathUtils.clamp(tgt.x, Math.min(this.w / 2, m), Math.max(this.w / 2, this.w - m));
    tgt.z = THREE.MathUtils.clamp(tgt.z, Math.min(this.d / 2, m), Math.max(this.d / 2, this.d - m));
    // keep the kid comfortably inside the frame
    const halfW = Math.tan(this.hfov / 2) * this.curDist * 0.8;
    const halfD = (Math.tan(this.vfov / 2) * this.curDist * 0.75) / Math.sin(this.pitch);
    const { up, right } = this.groundAxes();
    const rel = new THREE.Vector3(px - tgt.x, 0, pz - tgt.z);
    const ax = rel.dot(right),
      ay = rel.dot(up);
    if (Math.abs(ax) > halfW) tgt.addScaledVector(right, ax - Math.sign(ax) * halfW);
    if (Math.abs(ay) > halfD) tgt.addScaledVector(up, ay - Math.sign(ay) * halfD);
    this.look.lerp(tgt, 1 - Math.exp(-dt * 4.5));
    this.dist = this.curDist;

    this.overviewT += ((this.overview ? 1 : 0) - this.overviewT) * (1 - Math.exp(-dt * 5));
    let target = this.look.clone();
    let dist = this.dist;
    if (this.focus) {
      target = this.focus.clone();
      dist = this.focusDist;
    }
    target.lerp(this.ovTarget, this.overviewT);
    dist = THREE.MathUtils.lerp(dist, this.ovDist, this.overviewT);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.cam.position.copy(target).addScaledVector(dir, dist);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeT / 0.45);
      this.cam.position.x += (Math.random() - 0.5) * a;
      this.cam.position.y += (Math.random() - 0.5) * a;
      this.cam.position.z += (Math.random() - 0.5) * a;
    }
    this.cam.lookAt(target);
  }

  snapCamera() {
    this.update(1, this.look.x, this.look.z, 0, 0);
  }

  screenToGround(nx: number, ny: number): THREE.Vector3 | null {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(nx, ny), this.cam);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const out = new THREE.Vector3();
    return rc.ray.intersectPlane(plane, out) ? out : null;
  }
}
