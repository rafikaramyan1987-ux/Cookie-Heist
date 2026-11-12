import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toon, ToonOpts } from './toon';

/** Geometry cache + tiny helpers to build "toy" shapes from rounded primitives. */

const gcache = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = gcache.get(key) as T | undefined;
  if (!g) {
    g = make();
    g.userData.shared = true; // cached: kept when a night is disposed (src/render/dispose.ts)
    gcache.set(key, g);
  }
  return g;
}

const r2 = (n: number) => Math.round(n * 1000) / 1000;

export function rboxGeo(w: number, h: number, d: number, r = 0.06, seg = 3) {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return cached(`rb${r2(w)}|${r2(h)}|${r2(d)}|${r2(rr)}|${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, rr)));
}
export function sphereGeo(r: number, ws = 20, hs = 14) {
  return cached(`sp${r2(r)}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}
export function capsuleGeo(r: number, len: number, cs = 6, rs = 16) {
  return cached(`cap${r2(r)}|${r2(len)}|${cs}|${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));
}
export function cylGeo(rt: number, rb: number, h: number, s = 20, open = false) {
  return cached(`cy${r2(rt)}|${r2(rb)}|${r2(h)}|${s}|${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
}
export function coneGeo(r: number, h: number, s = 18) {
  return cached(`co${r2(r)}|${r2(h)}|${s}`, () => new THREE.ConeGeometry(r, h, s));
}
export function torusGeo(r: number, t: number, rs = 10, ts = 24, arc = Math.PI * 2) {
  return cached(`to${r2(r)}|${r2(t)}|${rs}|${ts}|${r2(arc)}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
}
export function latheGeo(key: string, pts: [number, number][], seg = 24) {
  return cached(`la${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg));
}
export function planeGeo(w: number, h: number) {
  return cached(`pl${r2(w)}|${r2(h)}`, () => new THREE.PlaneGeometry(w, h));
}

type Col = number | string;
type V3 = [number, number, number];

export interface PartOpts extends ToonOpts {
  pos?: V3;
  rot?: V3;
  scale?: V3 | number;
  cast?: boolean;
  receive?: boolean;
  name?: string;
}

export function mesh(geo: THREE.BufferGeometry, color: Col | THREE.Material, o: PartOpts = {}): THREE.Mesh {
  const mat = color instanceof THREE.Material ? color : toon(color, o);
  const m = new THREE.Mesh(geo, mat);
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale !== undefined) {
    if (typeof o.scale === 'number') m.scale.setScalar(o.scale);
    else m.scale.set(...o.scale);
  }
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (o.name) m.name = o.name;
  return m;
}

export const rbox = (w: number, h: number, d: number, color: Col | THREE.Material, o: PartOpts & { r?: number } = {}) =>
  mesh(rboxGeo(w, h, d, o.r ?? Math.min(w, h, d) * 0.18), color, o);
export const ball = (r: number, color: Col | THREE.Material, o: PartOpts = {}) => mesh(sphereGeo(r), color, o);
export const pill = (r: number, len: number, color: Col | THREE.Material, o: PartOpts = {}) => mesh(capsuleGeo(r, len), color, o);
export const cyl = (rt: number, rb: number, h: number, color: Col | THREE.Material, o: PartOpts & { seg?: number } = {}) =>
  mesh(cylGeo(rt, rb, h, o.seg ?? 20), color, o);
export const cone = (r: number, h: number, color: Col | THREE.Material, o: PartOpts = {}) => mesh(coneGeo(r, h), color, o);

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0): T {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
}
