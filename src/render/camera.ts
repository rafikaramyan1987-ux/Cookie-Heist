import * as THREE from 'three';

/**
 * Tilted top-down diorama camera (~55°). Finds the distance that fits the
 * level box into the viewport (with safe margins for the HUD). In landscape
 * a tall level is viewed from the side (yaw 90°) to use the wide screen.
 */
export interface FitOpts {
  pitchDeg?: number;
  fov?: number;
  yaw?: number;
  /** NDC margins: [left, right, bottom, top] (fractions of half-screen) */
  margin?: [number, number, number, number];
  height?: number;
}

export function autoYaw(aspect: number, w: number, d: number): number {
  if (aspect > 1.15 && d > w * 1.15) return Math.PI / 2;
  if (aspect < 0.87 && w > d * 1.15) return Math.PI / 2;
  return 0;
}

export function fitDiorama(cam: THREE.PerspectiveCamera, min: THREE.Vector3, max: THREE.Vector3, aspect: number, o: FitOpts = {}) {
  const pitch = THREE.MathUtils.degToRad(o.pitchDeg ?? 55);
  const yaw = o.yaw ?? 0;
  cam.fov = o.fov ?? 30;
  cam.aspect = aspect;
  cam.far = Math.max(cam.far, 600);
  const [ml, mr, mb, mt] = o.margin ?? [0.04, 0.04, 0.06, 0.06];
  const center = min.clone().add(max).multiplyScalar(0.5);
  center.y = 0;
  const hgt = o.height ?? 1.2;
  const corners: THREE.Vector3[] = [];
  for (const x of [min.x, max.x]) for (const z of [min.z, max.z]) for (const y of [min.y, hgt]) corners.push(new THREE.Vector3(x, y, z));
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const target = center.clone();
  const place = (dist: number) => {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  };
  // iterate: fit distance, then recentre the projected box inside the margins
  let best = 50;
  for (let iter = 0; iter < 14; iter++) {
    let lo = 1,
      hi = 200;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      place(mid);
      let ok = true;
      for (const c of corners) {
        const p = c.clone().project(cam);
        if (p.x < -1 + ml * 2 || p.x > 1 - mr * 2 || p.y < -1 + mb * 2 || p.y > 1 - mt * 2 || p.z > 1) {
          ok = false;
          break;
        }
      }
      if (ok) hi = mid;
      else lo = mid;
    }
    place(hi);
    best = hi;
    // recentre
    let x0 = 9,
      x1 = -9,
      y0 = 9,
      y1 = -9;
    for (const c of corners) {
      const p = c.clone().project(cam);
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
    const wantX = (-1 + ml * 2 + 1 - mr * 2) / 2 - (x0 + x1) / 2;
    const wantY = (-1 + mb * 2 + 1 - mt * 2) / 2 - (y0 + y1) / 2;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * hi;
    const groundUp = new THREE.Vector3(up.x, 0, up.z).normalize();
    target.addScaledVector(right, -wantX * halfH * aspect);
    target.addScaledVector(groundUp, (-wantY * halfH) / Math.sin(pitch));
  }
  place(best);
  return { target, distance: cam.position.distanceTo(target), dir };
}
