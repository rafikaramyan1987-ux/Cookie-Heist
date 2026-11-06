import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ball, cone, cyl, mesh, pill, rbox, sphereGeo, torusGeo, latheGeo, capsuleGeo, planeGeo } from './geom';
import { toon, glowBasic } from './toon';
import { blobTex, fabricTex, radialTex } from './textures';

/**
 * Procedural characters built from rounded primitives, each with a tiny
 * procedural animation rig (bob, squash & stretch, limb swing, head turns).
 * Forward = +Z in local space.
 */

export type CharKind = 'kid' | 'mum' | 'dad' | 'grandma' | 'teen' | 'cat' | 'vacuum';
export type AnimMode = 'idle' | 'walk' | 'tiptoe' | 'run' | 'yawn' | 'look' | 'phone' | 'sit' | 'sleep' | 'surprised' | 'cheer';

export interface PyjamaSkin {
  id: string;
  name: { en: string; fr: string };
  fabric: 'stars' | 'stripes' | 'dino' | 'dots' | 'check';
  a: number;
  b: number;
  cap: number;
  capTrim: number;
  hood?: 'dino';
}

export const SKINS: PyjamaSkin[] = [
  { id: 'starry', name: { en: 'Starry Night', fr: 'Nuit étoilée' }, fabric: 'stars', a: 0x3346a8, b: 0xffd45c, cap: 0x3346a8, capTrim: 0xfff4dc },
  { id: 'candy', name: { en: 'Candy Stripe', fr: 'Sucre d’orge' }, fabric: 'stripes', a: 0xff8fb3, b: 0xfff1f4, cap: 0xf0507e, capTrim: 0xffffff },
  { id: 'dino', name: { en: 'Little Dino', fr: 'Petit dino' }, fabric: 'dino', a: 0x5cc46a, b: 0x3e9a55, cap: 0x5cc46a, capTrim: 0xfff2b0, hood: 'dino' },
  { id: 'astro', name: { en: 'Space Cadet', fr: 'Petit astronaute' }, fabric: 'dots', a: 0x1f2a5c, b: 0xffd45c, cap: 0x1f2a5c, capTrim: 0xff8a3d },
  { id: 'mint', name: { en: 'Mint Check', fr: 'Carreaux menthe' }, fabric: 'check', a: 0x7fdcc0, b: 0x2f9a80, cap: 0x2f9a80, capTrim: 0xffffff },
  { id: 'sunny', name: { en: 'Sunny Stripes', fr: 'Rayures soleil' }, fabric: 'stripes', a: 0xffc23d, b: 0xff7a3d, cap: 0xff7a3d, capTrim: 0xfff4dc },
];

export type CapId = 'classic' | 'crown' | 'bunny' | 'propeller' | 'chef';
export const CAPS: { id: CapId; name: { en: string; fr: string } }[] = [
  { id: 'classic', name: { en: 'Nightcap', fr: 'Bonnet de nuit' } },
  { id: 'bunny', name: { en: 'Bunny ears', fr: 'Oreilles de lapin' } },
  { id: 'crown', name: { en: 'Paper crown', fr: 'Couronne en papier' } },
  { id: 'propeller', name: { en: 'Propeller cap', fr: 'Casquette hélice' } },
  { id: 'chef', name: { en: 'Cookie chef', fr: 'Toque de chef' } },
];

export interface Rig {
  kind: CharKind;
  root: THREE.Group; // world placement + facing
  body: THREE.Group; // bob / squash
  torso: THREE.Group;
  head: THREE.Group;
  armL?: THREE.Group;
  armR?: THREE.Group;
  legL?: THREE.Group;
  legR?: THREE.Group;
  mouth?: THREE.Mesh;
  tail?: THREE.Group;
  extra: Record<string, THREE.Object3D>;
  /** world-space point where a flashlight / lamp beam starts */
  lightTip?: THREE.Object3D;
  height: number;
  phase: number;
  mode: AnimMode;
  speed: number; // 0..1
  lookYaw: number;
  seed: number;
}

const SKIN = { kid: 0xf6c29a, mum: 0xf8d0b0, dad: 0xe6b08a, grandma: 0xf1cbb4, teen: 0xb97c57 };
const EYE = 0x2a1a33;

function blob(size: number): THREE.Mesh {
  const m = new THREE.Mesh(
    planeGeo(size, size),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  m.name = 'blob';
  return m;
}

function limb(x: number, y: number, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

interface FaceOpts {
  r: number;
  eye?: number;
  spread?: number;
  height?: number;
  lashes?: boolean;
  sleepy?: boolean;
  cheeks?: number | null;
  mouth?: 'smile' | 'o' | 'flat' | 'grin';
  brows?: number | null;
  nose?: number | null;
  glow?: number; // emissive eyes (cat)
}

function addFace(head: THREE.Group, o: FaceOpts): THREE.Mesh {
  const r = o.r;
  const e = o.eye ?? r * 0.17;
  const sp = o.spread ?? 0.36;
  const hy = o.height ?? 0.08;
  const eyeMat = o.glow ? toon(o.glow, { emissive: o.glow, emissiveIntensity: 0.9, rim: 0 }) : toon(EYE, { rim: 0.1 });
  const z = Math.sqrt(Math.max(0, 1 - sp * sp - hy * hy)) * r * 0.97;
  for (const s of [-1, 1]) {
    const eye = mesh(sphereGeo(e, 14, 10), eyeMat, { pos: [s * sp * r, hy * r, z], scale: [0.85, o.sleepy ? 0.5 : 1.15, 0.55], cast: false });
    head.add(eye);
    const glint = mesh(sphereGeo(e * 0.32, 8, 6), toon(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6, rim: 0 }), {
      pos: [s * sp * r + e * 0.3, hy * r + e * 0.35, z + e * 0.42],
      cast: false,
    });
    head.add(glint);
    if (o.sleepy) {
      const lid = mesh(sphereGeo(e * 1.25, 12, 8), toon(SKIN.dad), { pos: [s * sp * r, hy * r + e * 0.45, z - e * 0.1], scale: [1, 0.7, 0.7], cast: false });
      head.add(lid);
    }
    if (o.lashes) {
      for (const k of [-1, 0, 1]) {
        const l = rbox(e * 0.18, e * 0.7, e * 0.1, EYE, { pos: [s * sp * r + k * e * 0.42 + s * e * 0.25, hy * r + e * 1.25, z - e * 0.1], rot: [0, 0, -s * 0.25 - k * 0.35], cast: false, r: 0.005 });
        head.add(l);
      }
    }
    if (o.brows !== null && o.brows !== undefined) {
      const b = pill(e * 0.28, e * 1.1, o.brows, { pos: [s * sp * r, hy * r + e * 2.0, z - e * 0.2], rot: [0, 0, Math.PI / 2 + s * 0.15], cast: false });
      head.add(b);
    }
    if (o.cheeks !== null) {
      const c = mesh(sphereGeo(r * 0.13, 12, 8), toon(o.cheeks ?? 0xff8f9a, { rim: 0 }), {
        pos: [s * (sp + 0.2) * r, (hy - 0.24) * r, z * 0.86],
        scale: [1, 0.6, 0.4],
        cast: false,
      });
      (c.material as THREE.MeshToonMaterial).transparent = true;
      (c.material as THREE.MeshToonMaterial).opacity = 0.75;
      head.add(c);
    }
  }
  if (o.nose !== null && o.nose !== undefined) {
    head.add(ball(r * 0.11, o.nose, { pos: [0, (hy - 0.12) * r, r * 0.98], scale: [1, 0.85, 0.8], cast: false }));
  }
  let mouth: THREE.Mesh;
  const my = (hy - 0.33) * r;
  const mz = Math.sqrt(Math.max(0, 1 - (my / r) ** 2)) * r * 0.97;
  if (o.mouth === 'o') {
    mouth = mesh(sphereGeo(r * 0.07, 10, 8), toon(0x6b2433, { rim: 0 }), { pos: [0, my, mz], scale: [1, 1.2, 0.5], cast: false });
  } else if (o.mouth === 'flat') {
    mouth = pill(r * 0.025, r * 0.12, 0x6b2433, { pos: [0, my, mz], rot: [0, 0, Math.PI / 2], cast: false });
  } else {
    mouth = mesh(torusGeo(r * 0.1, r * 0.025, 6, 12, Math.PI), toon(0x6b2433, { rim: 0 }), { pos: [0, my + r * 0.05, mz], rot: [0, 0, Math.PI], cast: false });
    if (o.mouth === 'grin') mouth.scale.set(1.3, 1.2, 1);
  }
  mouth.name = 'mouth';
  head.add(mouth);
  return mouth;
}

/** A cone bent backwards (for droopy nightcaps). */
function bentCone(r: number, h: number, bend: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, 18, 10, true);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = y / h;
    p.setZ(i, p.getZ(i) - bend * t * t * h);
    p.setY(i, y * (1 - 0.35 * t * t));
  }
  g.computeVertexNormals();
  return g;
}

function newRig(kind: CharKind, height: number): Rig {
  const root = new THREE.Group();
  root.name = kind;
  const body = new THREE.Group();
  const torso = new THREE.Group();
  const head = new THREE.Group();
  root.add(body);
  body.add(torso);
  return { kind, root, body, torso, head, extra: {}, height, phase: Math.random() * 6, mode: 'idle', speed: 0, lookYaw: 0, seed: Math.random() * 100 };
}

// ------------------------------------------------------------------ kid
export function makeKid(skin: PyjamaSkin = SKINS[0], capId: CapId = 'classic'): Rig {
  const rig = newRig('kid', 0.95);
  rig.root.scale.setScalar(1.15);
  rig.root.add(blob(0.62));
  const fab = toon(0xffffff, { map: fabricTex(skin.fabric, skin.a, skin.b), key: `kidfab-${skin.id}` });
  const plain = toon(skin.a);
  const skinM = toon(SKIN.kid);

  // legs + slippers
  for (const s of [-1, 1]) {
    const leg = limb(s * 0.085, 0.25);
    leg.add(pill(0.07, 0.1, fab, { pos: [0, -0.1, 0] }));
    const foot = rbox(0.12, 0.08, 0.17, skin.capTrim === 0xffffff ? 0xfff0f4 : 0xfff3dd, { pos: [0, -0.215, 0.03], r: 0.035 });
    leg.add(foot);
    rig.body.add(leg);
    if (s < 0) rig.legL = leg;
    else rig.legR = leg;
  }
  // torso
  rig.torso.position.y = 0.25;
  const t = pill(0.17, 0.14, fab, { pos: [0, 0.14, 0], scale: [1.05, 1, 0.92] });
  rig.torso.add(t);
  rig.torso.add(mesh(torusGeo(0.1, 0.03, 8, 20), toon(skin.capTrim), { pos: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
  for (const y of [0.18, 0.08]) rig.torso.add(ball(0.022, skin.capTrim, { pos: [0, y, 0.165], cast: false }));
  // arms
  for (const s of [-1, 1]) {
    const arm = limb(s * 0.19, 0.25);
    arm.add(pill(0.055, 0.12, fab, { pos: [0, -0.09, 0] }));
    arm.add(ball(0.06, skinM, { pos: [0, -0.2, 0] }));
    rig.torso.add(arm);
    if (s < 0) rig.armL = arm;
    else rig.armR = arm;
  }
  // head
  rig.head.position.y = 0.36;
  rig.torso.add(rig.head);
  const hr = 0.215;
  rig.head.add(ball(hr, skinM, { pos: [0, hr * 0.9, 0] }));
  const face = new THREE.Group();
  face.position.y = hr * 0.9;
  rig.head.add(face);
  rig.mouth = addFace(face, { r: hr, mouth: 'smile', cheeks: 0xff8b8b, brows: null });
  for (const s of [-1, 1]) face.add(ball(0.05, skinM, { pos: [s * hr * 0.98, -0.01, 0], scale: [0.5, 1, 0.8] }));
  // hair tufts
  const hair = toon(0x8a4b2a);
  face.add(ball(0.07, hair, { pos: [-0.08, hr * 0.62, hr * 0.68], scale: [1.2, 0.6, 0.7] }));
  face.add(ball(0.06, hair, { pos: [0.04, hr * 0.66, hr * 0.68], scale: [1.2, 0.6, 0.7] }));

  if (capId !== 'classic') {
    const cap = makeCap(capId, hr);
    rig.head.add(cap);
    rig.extra.hat = cap;
  } else if (skin.hood === 'dino') {
    const hood = mesh(sphereGeo(hr * 1.08, 22, 16, ), plain, { pos: [0, hr * 0.98, -0.03], scale: [1, 1, 1] });
    hood.name = 'hood';
    // cut the face opening by pushing a skin-coloured disc? keep simple: hood behind + rim
    hood.scale.set(1.02, 1.0, 0.92);
    hood.position.z = -0.045;
    rig.head.add(hood);
    rig.head.add(mesh(torusGeo(hr * 0.84, 0.035, 8, 26), toon(skin.capTrim), { pos: [0, hr * 0.92, hr * 0.42], cast: false }));
    for (let i = 0; i < 4; i++) {
      const a = -0.2 + i * 0.55;
      rig.head.add(
        cone(0.05, 0.11, toon(0xffe07a), {
          pos: [0, hr * 0.9 + Math.cos(a) * hr * 1.06, Math.sin(-a) * hr * 1.06 - 0.04],
          rot: [-a, 0, 0],
        }),
      );
    }
    // tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.06, -0.15);
    tail.add(cone(0.08, 0.28, plain, { rot: [-Math.PI / 2 - 0.4, 0, 0], pos: [0, -0.04, -0.12] }));
    rig.torso.add(tail);
    rig.tail = tail;
  } else {
    const cap = new THREE.Group();
    cap.position.set(0, hr * 1.38, -0.01);
    cap.rotation.x = -0.25;
    cap.add(mesh(bentCone(hr * 0.98, 0.42, 0.9), toon(skin.cap, { side: THREE.DoubleSide })));
    cap.add(mesh(torusGeo(hr * 0.93, 0.045, 10, 28), toon(skin.capTrim), { rot: [Math.PI / 2, 0, 0], pos: [0, 0.01, 0] }));
    const pom = ball(0.065, toon(skin.capTrim), { pos: [0, 0.27, -0.39] });
    pom.name = 'pom';
    cap.add(pom);
    rig.head.add(cap);
    rig.extra.cap = cap;
  }
  return rig;
}

function makeCap(id: CapId, hr: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(0, hr * 1.7, 0);
  if (id === 'crown') {
    const gold = toon(0xffd25e, { emissive: 0x6a4a00, emissiveIntensity: 0.3 });
    g.add(mesh(new THREE.CylinderGeometry(hr * 0.78, hr * 0.8, 0.12, 20, 1, true), toon(0xffd25e, { side: THREE.DoubleSide })));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(cone(0.045, 0.1, gold, { pos: [Math.cos(a) * hr * 0.78, 0.1, Math.sin(a) * hr * 0.78] }));
      g.add(ball(0.022, [0xff5c7a, 0x5ec8ff, 0x69db7c][i % 3], { pos: [Math.cos(a) * hr * 0.8, 0.0, Math.sin(a) * hr * 0.8], cast: false }));
    }
  } else if (id === 'bunny') {
    for (const s of [-1, 1]) {
      g.add(pill(0.05, 0.22, 0xffffff, { pos: [s * 0.08, 0.14, -0.02], rot: [0, 0, s * 0.25], scale: [1, 1, 0.6] }));
      g.add(pill(0.028, 0.18, 0xffb3c6, { pos: [s * 0.08, 0.14, 0.01], rot: [0, 0, s * 0.25], scale: [1, 1, 0.4], cast: false }));
    }
    g.add(mesh(torusGeo(hr * 0.9, 0.025, 6, 24, Math.PI), toon(0xffb3c6), { pos: [0, -0.04, 0], rot: [0, Math.PI / 2, 0] }));
  } else if (id === 'propeller') {
    g.add(mesh(new THREE.SphereGeometry(hr * 0.95, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff5c7a)));
    g.add(rbox(0.16, 0.02, 0.12, 0x5ec8ff, { pos: [0, -0.01, hr * 0.95], r: 0.008 }));
    g.add(cyl(0.012, 0.012, 0.1, 0xffd25e, { pos: [0, hr * 0.95, 0] }));
    const prop = new THREE.Group();
    prop.position.y = hr * 0.95 + 0.05;
    prop.add(rbox(0.3, 0.012, 0.05, 0x5ec8ff, { r: 0.005 }));
    prop.add(rbox(0.05, 0.012, 0.3, 0xffd25e, { r: 0.005 }));
    prop.name = 'propeller';
    g.add(prop);
  } else if (id === 'chef') {
    g.add(cyl(hr * 0.75, hr * 0.7, 0.14, 0xffffff, { pos: [0, 0.02, 0] }));
    g.add(ball(0.13, 0xffffff, { pos: [0, 0.19, 0], scale: [1.2, 0.85, 1.2] }));
    g.add(ball(0.08, 0xffffff, { pos: [0.1, 0.17, 0.04] }));
    g.add(ball(0.08, 0xffffff, { pos: [-0.1, 0.17, -0.03] }));
    g.add(cyl(hr * 0.76, hr * 0.76, 0.03, 0xe9a55a, { pos: [0, -0.02, 0] }));
  }
  return g;
}

/** Merge each group's static meshes per material to cut draw calls (animated parts stay separate). */
export function optimizeRig(rig: Rig) {
  const keep = new Set<THREE.Object3D>();
  const mark = (o: THREE.Object3D | undefined) => o && o.traverse((c) => keep.add(c));
  if (rig.mouth) keep.add(rig.mouth);
  for (const v of Object.values(rig.extra)) if (v !== rig.extra.flashlight && v !== rig.extra.hat && v !== rig.extra.cap) mark(v);
  rig.root.traverse((o) => {
    if (o.name === 'pom' || o.name === 'blob' || o.name === 'propeller' || o.name === 'lightTip') mark(o);
  });
  const groups: THREE.Object3D[] = [];
  rig.root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh && !(o as THREE.Sprite).isSprite) groups.push(o);
  });
  for (const grp of groups) {
    const buckets = new Map<THREE.Material, THREE.Mesh[]>();
    for (const c of grp.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || keep.has(m) || m.children.length || Array.isArray(m.material)) continue;
      const mat = m.material as THREE.Material;
      if (!buckets.has(mat)) buckets.set(mat, []);
      buckets.get(mat)!.push(m);
    }
    for (const [mat, list] of buckets) {
      if (list.length < 2) continue;
      const geos = list.map((m) => {
        m.updateMatrix();
        let g = m.geometry.clone().applyMatrix4(m.matrix);
        if (g.index) g = g.toNonIndexed();
        for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        return g;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mm = new THREE.Mesh(merged, mat);
      mm.castShadow = list.some((m) => m.castShadow);
      mm.receiveShadow = true;
      for (const m of list) grp.remove(m);
      grp.add(mm);
    }
  }
}

// ------------------------------------------------------------------ helpers for adults
function flashlight(size = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.035 * size, 0.03 * size, 0.2 * size, 0x2e3446, { rot: [Math.PI / 2, 0, 0] }));
  g.add(cyl(0.055 * size, 0.04 * size, 0.07 * size, 0xf1c232, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.12 * size] }));
  g.add(cyl(0.045 * size, 0.045 * size, 0.01, toon(0xfff2b8, { emissive: 0xfff2b8, emissiveIntensity: 1.4, rim: 0 }), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.158 * size], cast: false }));
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, 0.17 * size);
  tip.name = 'lightTip';
  g.add(tip);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: 0xffe9a8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
  halo.scale.setScalar(0.32 * size);
  halo.position.copy(tip.position);
  g.add(halo);
  return g;
}

function slipper(color: number, fluffy = false): THREE.Group {
  const g = new THREE.Group();
  g.add(rbox(0.13, 0.08, 0.22, color, { pos: [0, 0.04, 0.03], r: 0.035 }));
  if (fluffy) g.add(ball(0.07, toon(0xffffff), { pos: [0, 0.08, 0.11], scale: [1.2, 0.7, 0.8] }));
  return g;
}

// ------------------------------------------------------------------ mum
export function makeMum(): Rig {
  const rig = newRig('mum', 1.5);
  rig.root.add(blob(0.95));
  const robeM = toon(0xffffff, { map: fabricTex('dots', 0xc08ad8, 0xe8c9f2), key: 'mumrobe' });
  const trim = toon(0xf5e1ff);
  const skinM = toon(SKIN.mum);
  for (const s of [-1, 1]) {
    const leg = limb(s * 0.1, 0.12);
    leg.add(pill(0.055, 0.06, skinM, { pos: [0, -0.04, 0] }));
    const sl = slipper(0xff9ec4, true);
    sl.position.y = -0.12;
    leg.add(sl);
    rig.body.add(leg);
    if (s < 0) rig.legL = leg;
    else rig.legR = leg;
  }
  rig.torso.position.y = 0.1;
  const robe = mesh(
    latheGeo('mumrobe', [[0.001, 0], [0.33, 0.02], [0.31, 0.2], [0.25, 0.55], [0.23, 0.68], [0.27, 0.86], [0.24, 0.98], [0.12, 1.06], [0.001, 1.08]], 28),
    robeM,
  );
  rig.torso.add(robe);
  rig.torso.add(mesh(torusGeo(0.235, 0.035, 8, 28), toon(0x8e4fb0), { pos: [0, 0.62, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.9, 1] }));
  rig.torso.add(rbox(0.1, 0.06, 0.06, 0x8e4fb0, { pos: [0.08, 0.6, 0.22], rot: [0, 0, 0.4] }));
  // lapels
  for (const s of [-1, 1]) rig.torso.add(rbox(0.07, 0.36, 0.03, trim, { pos: [s * 0.08, 0.86, 0.225], rot: [-0.12, 0, s * 0.35], r: 0.012 }));
  // arms with wide sleeves
  for (const s of [-1, 1]) {
    const arm = limb(s * 0.26, 0.93);
    arm.add(pill(0.065, 0.26, robeM, { pos: [0, -0.18, 0] }));
    arm.add(cyl(0.09, 0.065, 0.12, trim, { pos: [0, -0.36, 0] }));
    arm.add(ball(0.065, skinM, { pos: [0, -0.45, 0] }));
    rig.torso.add(arm);
    if (s < 0) rig.armL = arm;
    else rig.armR = arm;
  }
  const fl = flashlight(1);
  fl.position.set(0, -0.46, 0.08);
  rig.armR!.add(fl);
  rig.lightTip = fl.getObjectByName('lightTip')!;
  rig.extra.flashlight = fl;
  // head
  rig.head.position.y = 1.08;
  rig.torso.add(rig.head);
  rig.head.add(pill(0.06, 0.05, skinM, { pos: [0, 0.03, 0] }));
  const hr = 0.2;
  const face = new THREE.Group();
  face.position.y = 0.2;
  rig.head.add(face);
  face.add(ball(hr, skinM));
  rig.mouth = addFace(face, { r: hr, lashes: true, mouth: 'smile', cheeks: 0xff8f9a, nose: SKIN.mum, eye: hr * 0.15 });
  const hair = toon(0x7a3b28);
  face.add(ball(hr * 1.06, hair, { pos: [0, 0.03, -0.045], scale: [1, 1, 0.95] }));
  face.add(ball(0.09, hair, { pos: [0, 0.09, -0.21] }));
  // curlers
  const cols = [0xff7aa8, 0x7ad3ff, 0xffd166, 0x9ef0a6, 0xff7aa8];
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    const c = cyl(0.045, 0.045, 0.13, toon(cols[i]), { pos: [Math.sin(a) * 0.13, 0.19 - Math.abs(a) * 0.04, Math.cos(a) * 0.1 - 0.02], rot: [0, a, Math.PI / 2] });
    face.add(c);
  }
  return rig;
}

// ------------------------------------------------------------------ dad
export function makeDad(): Rig {
  const rig = newRig('dad', 1.58);
  rig.root.add(blob(1.05));
  const pj = toon(0xffffff, { map: fabricTex('stripes', 0x4f7fd6, 0xd8e6ff), key: 'dadpj' });
  const skinM = toon(SKIN.dad);
  for (const s of [-1, 1]) {
    const leg = limb(s * 0.13, 0.36);
    leg.add(pill(0.085, 0.18, pj, { pos: [0, -0.16, 0] }));
    const sl = slipper(0x8a5a3c);
    sl.position.y = -0.36;
    sl.scale.set(1.25, 1, 1.15);
    leg.add(sl);
    rig.body.add(leg);
    if (s < 0) rig.legL = leg;
    else rig.legR = leg;
  }
  rig.torso.position.y = 0.3;
  rig.torso.add(ball(0.36, pj, { pos: [0, 0.38, 0], scale: [1, 1.1, 0.9] }));
  for (const y of [0.6, 0.45, 0.3]) rig.torso.add(ball(0.025, 0xffffff, { pos: [0, y, 0.33 - Math.abs(y - 0.45) * 0.3] }));
  rig.torso.add(rbox(0.3, 0.06, 0.14, 0xd8e6ff, { pos: [0, 0.76, 0.06], r: 0.025 }));
  for (const s of [-1, 1]) {
    const arm = limb(s * 0.35, 0.62);
    arm.add(pill(0.075, 0.24, pj, { pos: [0, -0.16, 0] }));
    arm.add(ball(0.08, skinM, { pos: [0, -0.34, 0] }));
    rig.torso.add(arm);
    if (s < 0) rig.armL = arm;
    else rig.armR = arm;
  }
  const fl = flashlight(1.7);
  fl.position.set(0, -0.36, 0.1);
  rig.armR!.add(fl);
  rig.lightTip = fl.getObjectByName('lightTip')!;
  rig.extra.flashlight = fl;
  rig.head.position.y = 0.8;
  rig.torso.add(rig.head);
  const hr = 0.2;
  const face = new THREE.Group();
  face.position.y = 0.2;
  rig.head.add(face);
  face.add(ball(hr, skinM));
  rig.mouth = addFace(face, { r: hr, mouth: 'flat', cheeks: 0xf08c7c, brows: 0x5b3b2b, nose: 0xdd9a78, sleepy: true, eye: hr * 0.15 });
  // moustache
  for (const s of [-1, 1]) face.add(pill(0.035, 0.08, 0x5b3b2b, { pos: [s * 0.05, -0.05, hr * 0.93], rot: [0, 0, s * 1.2], cast: false }));
  // side hair + tuft
  for (const s of [-1, 1]) face.add(ball(0.07, 0x6b4a36, { pos: [s * 0.17, 0.02, -0.04], scale: [0.6, 1, 1.1] }));
  face.add(pill(0.02, 0.07, 0x6b4a36, { pos: [0.02, hr + 0.03, 0.02], rot: [0.3, 0, 0.5] }));
  for (const s of [-1, 1]) face.add(ball(0.05, skinM, { pos: [s * hr * 0.98, 0, 0], scale: [0.5, 1, 0.8] }));
  return rig;
}

// ------------------------------------------------------------------ grandma
export function makeGrandma(): Rig {
  const rig = newRig('grandma', 1.25);
  rig.root.add(blob(0.9));
  const dress = toon(0xffffff, { map: fabricTex('check', 0x5f9e8f, 0x2f6b62), key: 'grandress' });
  const shawlM = toon(0xb0508a);
  const skinM = toon(SKIN.grandma);
  for (const s of [-1, 1]) {
    const leg = limb(s * 0.09, 0.1);
    const sl = slipper(0x6a3d7a);
    sl.position.y = -0.1;
    leg.add(sl);
    rig.body.add(leg);
    if (s < 0) rig.legL = leg;
    else rig.legR = leg;
  }
  rig.torso.position.y = 0.04;
  rig.torso.add(mesh(latheGeo('grandress', [[0.001, 0], [0.32, 0.02], [0.3, 0.25], [0.23, 0.55], [0.2, 0.7], [0.22, 0.8], [0.1, 0.9], [0.001, 0.92]], 26), dress));
  // shawl
  rig.torso.add(mesh(latheGeo('shawl', [[0.001, 0.92], [0.18, 0.88], [0.29, 0.74], [0.31, 0.62], [0.27, 0.6]], 24), shawlM, { scale: [1, 1, 1.05] }));
  rig.torso.add(cone(0.1, 0.22, shawlM, { pos: [0, 0.52, -0.26], rot: [Math.PI + 0.3, 0, 0] }));
  rig.torso.rotation.x = 0.12; // hunched
  for (const s of [-1, 1]) {
    const arm = limb(s * 0.24, 0.78);
    arm.add(pill(0.06, 0.2, shawlM, { pos: [0, -0.15, 0] }));
    arm.add(ball(0.06, skinM, { pos: [0, -0.3, 0] }));
    rig.torso.add(arm);
    if (s < 0) rig.armL = arm;
    else rig.armR = arm;
  }
  // lantern
  const lan = new THREE.Group();
  lan.position.set(0, -0.36, 0.06);
  lan.add(torusGeoMesh(0.05, 0.008, 0x9c7a3c, [0, 0.12, 0], [0, 0, 0]));
  lan.add(cyl(0.06, 0.07, 0.03, 0x9c7a3c, { pos: [0, 0.09, 0] }));
  lan.add(cyl(0.05, 0.05, 0.1, toon(0xffc46b, { emissive: 0xffb347, emissiveIntensity: 1.6, rim: 0 }), { pos: [0, 0.03, 0], cast: false }));
  lan.add(cyl(0.07, 0.075, 0.03, 0x9c7a3c, { pos: [0, -0.03, 0] }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: 0xffb35c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  halo.scale.setScalar(0.55);
  halo.position.y = 0.03;
  lan.add(halo);
  const tip = new THREE.Object3D();
  tip.position.set(0, 0.03, 0.05);
  tip.name = 'lightTip';
  lan.add(tip);
  rig.armR!.add(lan);
  rig.lightTip = tip;
  rig.extra.flashlight = lan;
  // cane
  const cane = new THREE.Group();
  cane.position.set(0, -0.3, 0.02);
  cane.add(cyl(0.015, 0.015, 0.62, 0x6b4226, { pos: [0, -0.28, 0.05] }));
  cane.add(mesh(torusGeo(0.04, 0.015, 6, 12, Math.PI), toon(0x6b4226), { pos: [0, 0.03, 0.09], rot: [0, Math.PI / 2, 0] }));
  rig.armL!.add(cane);
  rig.head.position.y = 0.88;
  rig.torso.add(rig.head);
  const hr = 0.18;
  const face = new THREE.Group();
  face.position.y = 0.16;
  rig.head.add(face);
  face.add(ball(hr, skinM));
  rig.mouth = addFace(face, { r: hr, mouth: 'smile', cheeks: 0xff8fa0, nose: SKIN.grandma, eye: hr * 0.13 });
  const hair = toon(0xeceaf4);
  face.add(ball(hr * 1.05, hair, { pos: [0, 0.035, -0.04] }));
  face.add(ball(0.08, hair, { pos: [0, 0.2, -0.03] }));
  face.add(ball(0.03, 0xe0567c, { pos: [0.06, 0.22, 0.0] }));
  // glasses
  for (const s of [-1, 1]) face.add(mesh(torusGeo(0.045, 0.008, 6, 18), toon(0xc9a24a), { pos: [s * 0.065, 0.015, hr * 0.96], cast: false }));
  face.add(rbox(0.04, 0.01, 0.01, 0xc9a24a, { pos: [0, 0.02, hr * 1.0], r: 0.004, cast: false }));
  return rig;
}

function torusGeoMesh(r: number, t: number, color: number, pos: [number, number, number], rot: [number, number, number]) {
  return mesh(torusGeo(r, t, 6, 16, Math.PI), toon(color), { pos, rot });
}

// ------------------------------------------------------------------ teen
export function makeTeen(): Rig {
  const rig = newRig('teen', 1.5);
  rig.root.add(blob(0.9));
  const hoodie = toon(0x2fb5a6);
  const pants = toon(0x5a5f7a);
  const skinM = toon(SKIN.teen);
  for (const s of [-1, 1]) {
    const leg = limb(s * 0.1, 0.5);
    leg.add(pill(0.08, 0.32, pants, { pos: [0, -0.24, 0] }));
    const shoe = rbox(0.14, 0.1, 0.24, 0xf2f2f7, { pos: [0, -0.46, 0.04], r: 0.04 });
    leg.add(shoe);
    leg.add(rbox(0.145, 0.03, 0.245, 0xff5c7a, { pos: [0, -0.5, 0.04], r: 0.01 }));
    rig.body.add(leg);
    if (s < 0) rig.legL = leg;
    else rig.legR = leg;
  }
  rig.torso.position.y = 0.46;
  rig.torso.add(pill(0.22, 0.24, hoodie, { pos: [0, 0.28, 0], scale: [1.05, 1, 0.85] }));
  rig.torso.add(rbox(0.22, 0.1, 0.05, 0x24978a, { pos: [0, 0.14, 0.18], r: 0.03 }));
  rig.torso.add(mesh(torusGeo(0.13, 0.06, 8, 20), hoodie, { pos: [0, 0.55, -0.06], rot: [Math.PI / 2 + 0.4, 0, 0] }));
  for (const s of [-1, 1]) rig.torso.add(cyl(0.008, 0.008, 0.16, 0xffffff, { pos: [s * 0.05, 0.42, 0.19] }));
  for (const s of [-1, 1]) {
    const arm = limb(s * 0.26, 0.48);
    arm.add(pill(0.07, 0.24, hoodie, { pos: [0, -0.16, 0] }));
    arm.add(ball(0.065, skinM, { pos: [0, -0.33, 0] }));
    rig.torso.add(arm);
    if (s < 0) rig.armL = arm;
    else rig.armR = arm;
  }
  // phone
  const phone = new THREE.Group();
  phone.position.set(0, -0.36, 0.06);
  phone.add(rbox(0.09, 0.15, 0.015, 0x1c1f2b, { r: 0.012 }));
  phone.add(mesh(planeGeo(0.075, 0.13), toon(0xbfe9ff, { emissive: 0x9fdcff, emissiveIntensity: 1.5, rim: 0, side: THREE.DoubleSide }), { pos: [0, 0, 0.009], cast: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: 0x7fd0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
  halo.scale.setScalar(0.45);
  phone.add(halo);
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, 0.02);
  tip.name = 'lightTip';
  phone.add(tip);
  rig.armR!.add(phone);
  rig.lightTip = tip;
  rig.extra.flashlight = phone;
  rig.head.position.y = 0.6;
  rig.torso.add(rig.head);
  const hr = 0.19;
  const face = new THREE.Group();
  face.position.y = 0.2;
  rig.head.add(face);
  face.add(ball(hr, skinM));
  rig.mouth = addFace(face, { r: hr, mouth: 'flat', cheeks: null, brows: 0x1d1420, nose: SKIN.teen, eye: hr * 0.14 });
  const hair = toon(0x1d1420);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI - Math.PI / 2;
    face.add(ball(0.075, hair, { pos: [Math.sin(a) * 0.12, 0.13 + Math.cos(a) * 0.03, -0.02 + Math.cos(a) * 0.08], scale: [1, 0.8, 1] }));
  }
  face.add(ball(hr * 1.04, hair, { pos: [0, 0.04, -0.05] }));
  // headphones
  face.add(mesh(torusGeo(0.205, 0.02, 6, 24, Math.PI), toon(0xff5c7a), { pos: [0, 0.0, -0.01], rot: [0, 0, 0] }));
  for (const s of [-1, 1]) face.add(cyl(0.065, 0.065, 0.05, 0xff5c7a, { pos: [s * 0.2, -0.0, 0], rot: [0, 0, Math.PI / 2] }));
  return rig;
}

// ------------------------------------------------------------------ cat
export function makeCat(): Rig {
  const rig = newRig('cat', 0.45);
  rig.root.add(blob(0.55));
  const fur = toon(0xffffff, { map: fabricTex('stripes', 0xf29b4b, 0xd8762c), key: 'catfur' });
  const white = toon(0xfff6ea);
  rig.torso.add(ball(0.17, fur, { pos: [0, 0.15, -0.02], scale: [0.9, 1.0, 1.15] }));
  rig.torso.add(ball(0.1, white, { pos: [0, 0.18, 0.11], scale: [1, 1.2, 0.6] }));
  for (const s of [-1, 1]) {
    rig.torso.add(ball(0.05, white, { pos: [s * 0.07, 0.03, 0.12], scale: [1, 0.7, 1.3] }));
    rig.torso.add(ball(0.07, fur, { pos: [s * 0.12, 0.06, -0.1], scale: [0.8, 0.8, 1.3] }));
  }
  rig.head.position.set(0, 0.36, 0.06);
  rig.torso.add(rig.head);
  rig.head.add(ball(0.14, fur, { scale: [1.12, 0.95, 1] }));
  rig.head.add(ball(0.065, white, { pos: [0, -0.04, 0.11], scale: [1.3, 0.8, 0.7] }));
  for (const s of [-1, 1]) {
    rig.head.add(cone(0.055, 0.1, fur, { pos: [s * 0.085, 0.13, -0.01], rot: [0, 0, -s * 0.3] }));
    rig.head.add(cone(0.032, 0.06, toon(0xff9fb0), { pos: [s * 0.083, 0.125, 0.012], rot: [0, 0, -s * 0.3] }));
    for (const k of [-1, 1]) rig.head.add(cyl(0.003, 0.003, 0.14, 0xffffff, { pos: [s * 0.12, -0.04 + k * 0.012, 0.11], rot: [0, 0, Math.PI / 2 + k * 0.12 * s], cast: false }));
  }
  const face = new THREE.Group();
  rig.head.add(face);
  rig.mouth = addFace(face, { r: 0.14, mouth: 'smile', cheeks: null, glow: 0x9dff6a, spread: 0.4, height: 0.1, eye: 0.03 });
  for (const s of [-1, 1]) face.add(rbox(0.008, 0.035, 0.01, 0x10200a, { pos: [s * 0.056, 0.014, 0.137], r: 0.003, cast: false }));
  face.add(ball(0.018, 0xff7b93, { pos: [0, -0.02, 0.142], scale: [1.2, 0.8, 0.8], cast: false }));
  // tail: a chain of segments so it can sway
  const tail = new THREE.Group();
  tail.position.set(0, 0.06, -0.2);
  let parent: THREE.Object3D = tail;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i === 0 ? 0 : 0.07, 0);
    seg.rotation.x = i === 0 ? -1.2 : 0.28;
    seg.add(mesh(capsuleGeo(0.035 - i * 0.002, 0.05, 4, 10), i === 5 ? toon(0xd8762c) : fur, { pos: [0, 0.035, 0] }));
    parent.add(seg);
    parent = seg;
  }
  rig.torso.add(tail);
  rig.tail = tail;
  return rig;
}

// ------------------------------------------------------------------ robot vacuum
export function makeVacuum(): Rig {
  const rig = newRig('vacuum', 0.2);
  rig.root.add(blob(0.75));
  rig.torso.add(cyl(0.29, 0.3, 0.09, 0x3a3f55, { pos: [0, 0.06, 0], seg: 32 }));
  rig.torso.add(cyl(0.275, 0.285, 0.035, 0xeef1f8, { pos: [0, 0.12, 0], seg: 32 }));
  const led = mesh(torusGeo(0.2, 0.012, 6, 40), toon(0x5ef0ff, { emissive: 0x5ef0ff, emissiveIntensity: 1.6, rim: 0 }), { pos: [0, 0.14, 0], rot: [Math.PI / 2, 0, 0], cast: false });
  rig.torso.add(led);
  rig.extra.led = led;
  rig.torso.add(cyl(0.07, 0.08, 0.05, 0x3a3f55, { pos: [0, 0.16, -0.05] }));
  // cute face screen on the bumper
  const screen = rbox(0.2, 0.06, 0.03, 0x161a28, { pos: [0, 0.07, 0.275], r: 0.02 });
  rig.torso.add(screen);
  for (const s of [-1, 1]) {
    const e = rbox(0.03, 0.035, 0.01, toon(0x5ef0ff, { emissive: 0x5ef0ff, emissiveIntensity: 2, rim: 0 }), { pos: [s * 0.045, 0.072, 0.292], r: 0.008, cast: false });
    rig.torso.add(e);
    rig.extra['eye' + s] = e;
  }
  rig.torso.add(rbox(0.06, 0.04, 0.03, 0xff5c7a, { pos: [0, 0.135, 0.17], r: 0.012 }));
  // side brushes
  for (const s of [-1, 1]) {
    const br = new THREE.Group();
    br.position.set(s * 0.2, 0.02, 0.2);
    for (let i = 0; i < 3; i++) br.add(rbox(0.16, 0.008, 0.012, 0xffd166, { rot: [0, (i * Math.PI) / 3, 0], r: 0.003, cast: false }));
    rig.torso.add(br);
    rig.extra['brush' + s] = br;
  }
  rig.head = rig.torso;
  const tip = new THREE.Object3D();
  tip.position.set(0, 0.1, 0.3);
  rig.torso.add(tip);
  rig.lightTip = tip;
  return rig;
}

export function makeCharacter(kind: CharKind, skin?: PyjamaSkin, cap?: CapId): Rig {
  switch (kind) {
    case 'kid':
      return makeKid(skin, cap);
    case 'mum':
      return makeMum();
    case 'dad':
      return makeDad();
    case 'grandma':
      return makeGrandma();
    case 'teen':
      return makeTeen();
    case 'cat':
      return makeCat();
    case 'vacuum':
      return makeVacuum();
  }
}

// ------------------------------------------------------------------ animation
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Procedural animation. Call every frame. */
export function animateRig(rig: Rig, dt: number, t: number) {
  const m = rig.mode;
  const moving = m === 'walk' || m === 'tiptoe' || m === 'run';
  const freq = m === 'run' ? 13 : m === 'tiptoe' ? 6.5 : 8;
  if (moving) rig.phase += dt * freq * Math.max(0.35, rig.speed || 1);
  const p = rig.phase;
  const s = Math.sin(p);
  const tt = t + rig.seed;

  if (rig.kind === 'vacuum') {
    rig.extra.brush1 && (rig.extra.brush1.rotation.y += dt * 18);
    rig.extra['brush-1'] && (rig.extra['brush-1'].rotation.y -= dt * 18);
    rig.body.position.y = Math.sin(tt * 30) * 0.002;
    const blink = Math.sin(tt * 1.3) > 0.97 ? 0.2 : 1;
    for (const k of ['eye1', 'eye-1']) rig.extra[k] && (rig.extra[k].scale.y = blink);
    return;
  }
  if (rig.kind === 'cat') {
    rig.tail && rig.tail.children.forEach(() => 0);
    let seg: THREE.Object3D | undefined = rig.tail?.children[0];
    let i = 0;
    while (seg) {
      seg.rotation.z = Math.sin(tt * 2 - i * 0.6) * 0.18;
      seg = seg.children.find((c) => c instanceof THREE.Group);
      i++;
    }
    rig.head.rotation.y = Math.sin(tt * 0.6) * 0.35 + rig.lookYaw;
    rig.head.rotation.z = Math.sin(tt * 0.9) * 0.08;
    rig.torso.scale.y = 1 + Math.sin(tt * 2.2) * 0.015;
    return;
  }

  // legs / arms swing
  const legAmp = m === 'run' ? 0.9 : m === 'tiptoe' ? 0.45 : moving ? 0.6 : 0;
  rig.legL && (rig.legL.rotation.x = lerp(rig.legL.rotation.x, s * legAmp, 0.4));
  rig.legR && (rig.legR.rotation.x = lerp(rig.legR.rotation.x, -s * legAmp, 0.4));

  let armLx = 0,
    armRx = 0,
    armLz = 0,
    armRz = 0;
  if (moving) {
    armLx = -s * legAmp * 0.8;
    armRx = s * legAmp * 0.8;
  }
  if (m === 'tiptoe' && rig.kind === 'kid') {
    // sneaky pose: arms raised forward, fingers "tiptoeing"
    armLx = -1.5 + Math.sin(p) * 0.2;
    armRx = -1.5 - Math.sin(p) * 0.2;
    armLz = -0.35;
    armRz = 0.35;
  }
  if (m === 'cheer') {
    armLx = 0;
    armRx = 0;
    armLz = -2.6 + Math.sin(tt * 10) * 0.2;
    armRz = 2.6 - Math.sin(tt * 10) * 0.2;
  }
  if (m === 'surprised') {
    armLz = -1.0;
    armRz = 1.0;
  }
  if (m === 'yawn') {
    const y = (Math.sin(tt * 0.9) + 1) / 2;
    armLz = -2.2 * y;
    armRz = 2.2 * y;
  }
  // adults always hold the light forward with the right arm
  if (rig.lightTip && rig.kind !== 'kid') {
    armRx = rig.kind === 'teen' ? -1.0 : -1.25 + (moving ? s * 0.06 : Math.sin(tt * 1.4) * 0.05);
    armRz = rig.kind === 'teen' ? 0.35 : 0.12;
    if (m === 'yawn') armRz = 0.1;
    // keep the flashlight level
    const fl = rig.extra.flashlight;
    if (fl) fl.rotation.x = -armRx - (rig.kind === 'grandma' ? 0.12 : rig.kind === 'teen' ? 0.6 : 0.35);
  }
  const k = 0.25;
  if (rig.armL) {
    rig.armL.rotation.x = lerp(rig.armL.rotation.x, armLx, k);
    rig.armL.rotation.z = lerp(rig.armL.rotation.z, armLz, k);
  }
  if (rig.armR) {
    rig.armR.rotation.x = lerp(rig.armR.rotation.x, armRx, k);
    rig.armR.rotation.z = lerp(rig.armR.rotation.z, armRz, k);
  }

  // body bob + squash & stretch
  const bobAmp = m === 'run' ? 0.06 : m === 'tiptoe' ? 0.05 : moving ? 0.035 : 0;
  const bob = Math.abs(Math.sin(p)) * bobAmp * (rig.height / 0.8) ** 0.5;
  const breathe = Math.sin(tt * 2.2) * 0.018;
  let lift = 0;
  if (m === 'tiptoe') lift = 0.03;
  if (m === 'cheer') lift = Math.abs(Math.sin(tt * 7)) * 0.25;
  rig.body.position.y = bob + lift;
  const sq = moving ? Math.cos(p * 2) * 0.04 : breathe;
  rig.body.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
  // lean
  const lean = m === 'run' ? 0.22 : m === 'tiptoe' ? 0.16 : moving ? 0.06 : 0;
  rig.body.rotation.x = lerp(rig.body.rotation.x, lean, 0.15);
  if (rig.kind === 'kid' && m === 'tiptoe') rig.body.rotation.z = Math.sin(p) * 0.06;
  else rig.body.rotation.z = lerp(rig.body.rotation.z, 0, 0.2);

  // head
  let headX = 0,
    headY = rig.lookYaw;
  if (m === 'look' || m === 'idle') headY += Math.sin(tt * 0.7) * (m === 'look' ? 0.7 : 0.25);
  if (m === 'yawn') headX = -0.35 * ((Math.sin(tt * 0.9) + 1) / 2);
  if (m === 'phone') headX = 0.35;
  if (m === 'tiptoe') headY += Math.sin(tt * 1.3) * 0.35;
  if (m === 'sleep') headX = 0.25;
  rig.head.rotation.x = lerp(rig.head.rotation.x, headX, 0.15);
  rig.head.rotation.y = lerp(rig.head.rotation.y, headY, 0.12);
  if (rig.mouth) {
    const open = m === 'yawn' ? 1 + 1.8 * ((Math.sin(tt * 0.9) + 1) / 2) : m === 'surprised' ? 2 : 1;
    rig.mouth.scale.y = lerp(rig.mouth.scale.y, open, 0.2);
  }
  // nightcap pompom wobble
  const cap = rig.extra.cap;
  if (cap) {
    cap.rotation.z = Math.sin(p * 0.5 + tt) * 0.06;
    cap.rotation.x = -0.25 + (moving ? Math.sin(p * 2) * 0.05 : 0);
  }
  if (rig.tail) rig.tail.rotation.y = Math.sin(tt * 3 + p) * 0.4;
  const hat = rig.extra.hat;
  if (hat) {
    const pr = hat.getObjectByName('propeller');
    if (pr) pr.rotation.y += dt * (moving ? 22 : 6);
  }
}

/** Floating "?" "!" "Zzz" speech bubbles. */
export function bubble(text: string, color = '#ff7a2f'): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  const isZ = text.startsWith('Z');
  if (!isZ) {
    g.fillStyle = '#fffaf0';
    g.strokeStyle = '#2a1a33';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(64, 56, 44, 0, Math.PI * 2);
    g.moveTo(50, 92);
    g.lineTo(60, 118);
    g.lineTo(76, 94);
    g.closePath();
    g.stroke();
    g.fill();
    g.beginPath();
    g.arc(64, 56, 44, 0, Math.PI * 2);
    g.fill();
  }
  g.font = `bold ${isZ ? 70 : 72}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (isZ) {
    g.lineWidth = 8;
    g.strokeStyle = '#2a1a33';
    g.strokeText(text, 64, 64);
  }
  g.fillStyle = color;
  g.fillText(text, 64, isZ ? 64 : 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
  sp.renderOrder = 20;
  sp.scale.setScalar(0.42);
  return sp;
}

export { glowBasic };
