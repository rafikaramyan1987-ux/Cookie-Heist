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
    // follow distance: visible ground width around the kid
    const visibleW = this.portrait ? 6.2 : 12.5;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2)) * this.aspect);
    this.dist = visibleW / 2 / Math.tan(hfov / 2);
    if (!this.portrait) this.dist = Math.min(this.dist, 17);
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
    const tgt = new THREE.Vector3(px + this.lead.x, 0, pz + this.lead.z);
    // keep the view mostly over the level
    const m = this.portrait ? 1.2 : 2.5;
    tgt.x = THREE.MathUtils.clamp(tgt.x, Math.min(this.w / 2, m), Math.max(this.w / 2, this.w - m));
    tgt.z = THREE.MathUtils.clamp(tgt.z, Math.min(this.d / 2, m), Math.max(this.d / 2, this.d - m));
    // the camera looks a bit ahead of the kid: shift the target "up" the screen
    const { up } = this.groundAxes();
    tgt.addScaledVector(up, this.portrait ? 0.9 : 0.3);
    this.look.lerp(tgt, 1 - Math.exp(-dt * 4.5));

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
