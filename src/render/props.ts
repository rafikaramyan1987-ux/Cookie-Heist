import * as THREE from 'three';
import { ball, cone, cyl, group, mesh, pill, rbox, sphereGeo, torusGeo, latheGeo, planeGeo } from './geom';
import { toon } from './toon';
import { fabricTex, radialTex, planksTex } from './textures';

/**
 * Furniture & decor library. Every builder returns a group whose origin is the
 * centre of its floor footprint, facing +Z. Metadata (footprint, hiding spot,
 * vision blocking) is shared with gameplay later.
 */

export interface PropMeta {
  w: number;
  d: number;
  /** blocks movement */
  solid?: boolean;
  /** player can hide here */
  hide?: 'under' | 'inside' | 'behind';
  /** blocks guards' line of sight */
  tall?: boolean;
  /** dynamic lights / animated parts: don't bake */
  dynamic?: boolean;
  build: (o: Record<string, unknown>) => THREE.Object3D;
}

const WOOD = 0xb9784a;
const WOOD_D = 0x8a5434;
const WOOD_L = 0xe2b07a;
const CREAM = 0xfff1da;

function glowSprite(color: number, size: number, opacity = 0.8): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(size);
  s.userData.dynamic = true;
  return s;
}

function lampShade(color: number, glow: number) {
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.08, 0.04, WOOD_D, { pos: [0, 0.02, 0] }));
  g.add(cyl(0.015, 0.015, 0.22, 0xd9b26a, { pos: [0, 0.13, 0] }));
  g.add(mesh(latheGeo('shade', [[0.06, 0.38], [0.13, 0.22], [0.14, 0.2]], 20), toon(color, { emissive: glow, emissiveIntensity: 0.55, side: THREE.DoubleSide, rim: 0.1 }), { cast: false }));
  const s = glowSprite(glow, 0.9, 0.55);
  s.position.y = 0.3;
  g.add(s);
  return g;
}

export const PROPS: Record<string, PropMeta> = {
  // ------------------------------------------------ beds
  bed: {
    w: 1.1,
    d: 2,
    solid: true,
    hide: 'under',
    build: (o) => {
      const blanket = (o.blanket as number) ?? 0x6c8cff;
      const g = new THREE.Group();
      g.add(rbox(1.04, 0.22, 1.94, WOOD, { pos: [0, 0.2, 0] }));
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(rbox(0.1, 0.12, 0.1, WOOD_D, { pos: [s * 0.45, 0.06, t * 0.88] }));
      g.add(rbox(1.08, 0.75, 0.12, WOOD, { pos: [0, 0.38, -0.96], r: 0.05 }));
      g.add(rbox(0.9, 0.06, 0.08, WOOD_L, { pos: [0, 0.7, -0.96], r: 0.02 }));
      g.add(rbox(1.08, 0.42, 0.1, WOOD, { pos: [0, 0.27, 0.96], r: 0.04 }));
      g.add(rbox(0.96, 0.14, 1.84, CREAM, { pos: [0, 0.36, 0], r: 0.06 }));
      g.add(rbox(0.7, 0.16, 0.36, 0xffffff, { pos: [0, 0.48, -0.68], r: 0.08 }));
      const bl = toon(0xffffff, { map: fabricTex('stars', blanket, 0xfff3b8), key: 'blanket' + blanket });
      g.add(rbox(1.02, 0.12, 1.25, bl, { pos: [0, 0.46, 0.28], r: 0.06 }));
      g.add(rbox(1.03, 0.13, 0.16, 0xfff3b8, { pos: [0, 0.47, -0.32], r: 0.06 }));
      return g;
    },
  },
  doubleBed: {
    w: 1.9,
    d: 2.1,
    solid: true,
    build: (o) => {
      const g = new THREE.Group();
      g.add(rbox(1.86, 0.24, 2.04, WOOD_D, { pos: [0, 0.2, 0] }));
      g.add(rbox(1.94, 0.95, 0.14, WOOD_D, { pos: [0, 0.48, -1.02], r: 0.06 }));
      g.add(rbox(1.7, 0.6, 0.06, 0xd6a77c, { pos: [0, 0.58, -0.96], r: 0.03 }));
      g.add(rbox(1.78, 0.16, 1.94, CREAM, { pos: [0, 0.38, 0], r: 0.06 }));
      for (const s of [-1, 1]) g.add(rbox(0.68, 0.16, 0.34, 0xffffff, { pos: [s * 0.42, 0.52, -0.74], r: 0.08 }));
      const bl = toon(0xffffff, { map: fabricTex('check', (o.blanket as number) ?? 0xd96a7c, 0xffd1d8), key: 'dblanket' });
      g.add(rbox(1.84, 0.14, 1.4, bl, { pos: [0, 0.5, 0.28], r: 0.06 }));
      if (o.sleeper) {
        // a sleeping lump + head
        g.add(ball(0.4, bl, { pos: [0.4, 0.55, 0.15], scale: [1, 0.5, 1.6] }));
        g.add(ball(0.17, 0xe6b08a, { pos: [0.42, 0.68, -0.68] }));
        g.add(ball(0.1, 0x6b4a36, { pos: [0.42, 0.74, -0.78], scale: [1.5, 0.8, 1] }));
        g.add(pill(0.03, 0.06, 0x5b3b2b, { pos: [0.37, 0.67, -0.52], rot: [0, 0, 1.2] }));
        g.add(pill(0.03, 0.06, 0x5b3b2b, { pos: [0.47, 0.67, -0.52], rot: [0, 0, -1.2] }));
      }
      return g;
    },
  },
  // ------------------------------------------------ storage
  wardrobe: {
    w: 1.2,
    d: 0.6,
    solid: true,
    hide: 'inside',
    tall: true,
    build: (o) => {
      const c = (o.color as number) ?? 0xe7a86a;
      const g = new THREE.Group();
      g.add(rbox(1.16, 1.75, 0.58, c, { pos: [0, 0.9, 0], r: 0.06 }));
      g.add(rbox(1.22, 0.08, 0.64, WOOD_D, { pos: [0, 1.8, 0], r: 0.03 }));
      g.add(rbox(1.1, 0.06, 0.56, WOOD_D, { pos: [0, 0.04, 0], r: 0.02 }));
      for (const s of [-1, 1]) {
        g.add(rbox(0.52, 1.55, 0.04, 0xf3c48e, { pos: [s * 0.28, 0.92, 0.29], r: 0.02 }));
        g.add(rbox(0.38, 0.6, 0.02, c, { pos: [s * 0.28, 1.25, 0.31], r: 0.015 }));
        g.add(rbox(0.38, 0.6, 0.02, c, { pos: [s * 0.28, 0.55, 0.31], r: 0.015 }));
        g.add(ball(0.03, 0xffd36b, { pos: [s * 0.06, 0.95, 0.33] }));
      }
      // a sleeve peeking out
      g.add(pill(0.04, 0.12, 0xff7aa8, { pos: [0.02, 0.5, 0.33], rot: [0, 0, 0.2] }));
      return g;
    },
  },
  toyBox: {
    w: 0.8,
    d: 0.5,
    solid: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.78, 0.42, 0.5, 0xff9f43, { pos: [0, 0.21, 0], r: 0.06 }));
      g.add(rbox(0.82, 0.08, 0.54, 0xff6b6b, { pos: [0, 0.45, -0.02], rot: [-0.25, 0, 0], r: 0.03 }));
      g.add(ball(0.1, 0x4dabf7, { pos: [0.2, 0.48, 0.05] }));
      g.add(rbox(0.12, 0.12, 0.12, 0x69db7c, { pos: [-0.18, 0.48, 0.08], rot: [0.3, 0.5, 0] }));
      for (const s of [-1, 1]) g.add(drawStarDecal(s * 0.2, 0.22, 0.252));
      return g;
    },
  },
  bookshelf: {
    w: 1,
    d: 0.4,
    solid: true,
    tall: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.96, 1.3, 0.38, WOOD, { pos: [0, 0.65, 0], r: 0.04 }));
      const cols = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xb197fc, 0xff922b];
      for (let r = 0; r < 3; r++) {
        g.add(rbox(0.86, 0.32, 0.04, WOOD_D, { pos: [0, 0.22 + r * 0.4, -0.12], r: 0.01, cast: false }));
        let x = -0.38;
        let i = r * 2;
        while (x < 0.36) {
          const bw = 0.06 + ((i * 37) % 5) * 0.012;
          const bh = 0.22 + ((i * 13) % 4) * 0.025;
          g.add(rbox(bw, bh, 0.24, cols[i % cols.length], { pos: [x + bw / 2, 0.08 + r * 0.4 + bh / 2, 0.0], r: 0.01, cast: false }));
          x += bw + 0.012;
          i++;
        }
      }
      return g;
    },
  },
  nightstand: {
    w: 0.5,
    d: 0.45,
    solid: true,
    dynamic: true,
    build: (o) => {
      const g = new THREE.Group();
      g.add(rbox(0.46, 0.44, 0.42, WOOD_L, { pos: [0, 0.22, 0], r: 0.05 }));
      g.add(rbox(0.38, 0.14, 0.03, 0xf5cf9f, { pos: [0, 0.26, 0.21], r: 0.02 }));
      g.add(ball(0.025, WOOD_D, { pos: [0, 0.26, 0.235] }));
      if (o.lamp !== false) {
        const l = lampShade((o.shade as number) ?? 0xffe1a6, (o.glow as number) ?? 0xffc46b);
        l.position.y = 0.44;
        g.add(l);
      }
      return g;
    },
  },
  dresser: {
    w: 1.2,
    d: 0.5,
    solid: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(1.16, 0.72, 0.48, 0xc98b5e, { pos: [0, 0.36, 0], r: 0.05 }));
      for (let r = 0; r < 3; r++)
        for (const s of [-1, 1]) {
          g.add(rbox(0.5, 0.18, 0.03, 0xe5ae7e, { pos: [s * 0.27, 0.15 + r * 0.21, 0.24], r: 0.02 }));
          g.add(ball(0.02, 0xffd36b, { pos: [s * 0.27, 0.15 + r * 0.21, 0.265] }));
        }
      g.add(rbox(0.32, 0.26, 0.04, 0xcfe2ff, { pos: [0.25, 0.86, -0.15], r: 0.02 }));
      g.add(cyl(0.06, 0.05, 0.12, 0xff9fb0, { pos: [-0.3, 0.78, 0] }));
      g.add(ball(0.07, 0xffd43b, { pos: [-0.3, 0.88, 0] }));
      return g;
    },
  },
  laundryBasket: {
    w: 0.6,
    d: 0.6,
    solid: true,
    hide: 'inside',
    build: () => {
      const g = new THREE.Group();
      g.add(mesh(latheGeo('basket', [[0.001, 0], [0.24, 0.01], [0.28, 0.38], [0.3, 0.42], [0.27, 0.42], [0.25, 0.04], [0.001, 0.04]], 24), toon(0xd9b27c)));
      for (let i = 0; i < 4; i++) g.add(mesh(torusGeo(0.25 + i * 0.012, 0.012, 6, 30), toon(0xb98d55), { pos: [0, 0.08 + i * 0.09, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
      g.add(ball(0.16, 0x7cc7ff, { pos: [-0.06, 0.38, 0.02], scale: [1.2, 0.6, 1] }));
      g.add(ball(0.13, 0xff9fb0, { pos: [0.1, 0.42, -0.05], scale: [1.2, 0.6, 1] }));
      g.add(pill(0.05, 0.22, 0xfff3b8, { pos: [0.18, 0.4, 0.14], rot: [1.1, 0.3, 0.9] }));
      return g;
    },
  },
  // ------------------------------------------------ kitchen
  counter: {
    w: 1,
    d: 0.7,
    solid: true,
    tall: false,
    build: (o) => {
      const c = (o.color as number) ?? 0x7fc8b8;
      const g = new THREE.Group();
      g.add(rbox(1.0, 0.82, 0.66, c, { pos: [0, 0.41, 0], r: 0.03 }));
      g.add(rbox(1.02, 0.07, 0.7, 0xf6efe2, { pos: [0, 0.85, 0.01], r: 0.025 }));
      g.add(rbox(0.88, 0.5, 0.03, 0x96d8c9, { pos: [0, 0.38, 0.33], r: 0.02 }));
      g.add(rbox(0.88, 0.14, 0.03, 0x96d8c9, { pos: [0, 0.72, 0.33], r: 0.02 }));
      g.add(rbox(0.2, 0.03, 0.03, 0xe8e8f0, { pos: [0, 0.72, 0.36], r: 0.01 }));
      g.add(rbox(0.03, 0.18, 0.03, 0xe8e8f0, { pos: [0.35, 0.5, 0.36], r: 0.01 }));
      g.add(rbox(1.0, 0.06, 0.6, 0x3e5a55, { pos: [0, 0.03, -0.02], r: 0.02 }));
      return g;
    },
  },
  sink: {
    w: 1,
    d: 0.7,
    solid: true,
    build: (o) => {
      const g = PROPS.counter.build(o) as THREE.Group;
      g.add(rbox(0.56, 0.04, 0.42, 0xb8c4cc, { pos: [0, 0.885, 0.02], r: 0.02 }));
      g.add(cyl(0.025, 0.025, 0.22, 0xd5dde4, { pos: [0, 0.98, -0.24] }));
      g.add(mesh(torusGeo(0.08, 0.022, 6, 14, Math.PI), toon(0xd5dde4), { pos: [0, 1.09, -0.16], rot: [0, Math.PI / 2, 0] }));
      return g;
    },
  },
  stove: {
    w: 1,
    d: 0.7,
    solid: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(1.0, 0.86, 0.66, 0xf4f1fb, { pos: [0, 0.43, 0], r: 0.04 }));
      g.add(rbox(0.74, 0.42, 0.03, 0x2e3446, { pos: [0, 0.4, 0.33], r: 0.03 }));
      g.add(rbox(0.5, 0.02, 0.02, 0xd5dde4, { pos: [0, 0.66, 0.35], r: 0.008 }));
      for (const [x, z] of [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]]) g.add(cyl(0.12, 0.12, 0.02, 0x2e3446, { pos: [x, 0.87, z] }));
      for (let i = 0; i < 4; i++) g.add(cyl(0.03, 0.03, 0.03, 0xffa94d, { pos: [-0.3 + i * 0.2, 0.78, 0.34], rot: [Math.PI / 2, 0, 0] }));
      // kettle
      g.add(ball(0.13, 0xff6b6b, { pos: [0.24, 0.98, 0.15], scale: [1, 0.85, 1] }));
      g.add(cyl(0.03, 0.03, 0.04, 0x2e3446, { pos: [0.24, 1.1, 0.15] }));
      g.add(cyl(0.02, 0.025, 0.12, 0xff6b6b, { pos: [0.37, 1.0, 0.15], rot: [0, 0, -0.9] }));
      return g;
    },
  },
  fridge: {
    w: 0.9,
    d: 0.75,
    solid: true,
    tall: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.86, 1.8, 0.72, 0xe9f3ff, { pos: [0, 0.9, 0], r: 0.1 }));
      g.add(rbox(0.8, 0.02, 0.02, 0xb8c4cc, { pos: [0, 1.22, 0.36], r: 0.005 }));
      g.add(rbox(0.04, 0.3, 0.05, 0xb8c4cc, { pos: [0.33, 1.45, 0.38], r: 0.02 }));
      g.add(rbox(0.04, 0.4, 0.05, 0xb8c4cc, { pos: [0.33, 0.85, 0.38], r: 0.02 }));
      // magnets + drawing
      g.add(rbox(0.3, 0.24, 0.01, 0xfffbe8, { pos: [-0.12, 0.9, 0.365], rot: [0, 0, 0.08], r: 0.005, cast: false }));
      g.add(ball(0.06, 0xffd43b, { pos: [-0.14, 0.92, 0.37], scale: [1, 1, 0.2], cast: false }));
      for (const [x, y, c] of [[-0.25, 1.5, 0xff6b6b], [0.05, 1.6, 0x4dabf7], [-0.1, 1.38, 0x69db7c]] as [number, number, number][]) g.add(ball(0.035, c, { pos: [x, y, 0.37], cast: false }));
      return g;
    },
  },
  table: {
    w: 1.8,
    d: 1.1,
    solid: false,
    hide: 'under',
    build: (o) => {
      const g = new THREE.Group();
      const top = (o.color as number) ?? 0xd99a62;
      g.add(rbox(1.8, 0.08, 1.1, top, { pos: [0, 0.74, 0], r: 0.04 }));
      // tablecloth
      g.add(rbox(1.5, 0.02, 0.9, toon(0xffffff, { map: fabricTex('check', 0xff8f8f, 0xffffff), key: 'cloth' }), { pos: [0, 0.79, 0], r: 0.008 }));
      g.add(rbox(1.84, 0.22, 1.14, toon(0xffffff, { map: fabricTex('check', 0xff8f8f, 0xffffff), key: 'cloth' }), { pos: [0, 0.66, 0], r: 0.02 }));
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(cyl(0.045, 0.035, 0.72, WOOD_D, { pos: [s * 0.78, 0.36, t * 0.44] }));
      g.add(cyl(0.12, 0.1, 0.05, 0xfff1da, { pos: [0.3, 0.82, 0.1] }));
      g.add(cyl(0.05, 0.04, 0.12, 0x9ad6ff, { pos: [-0.35, 0.86, -0.15], opacity: 0.8, transparent: true }));
      g.add(ball(0.09, 0xff7043, { pos: [0.3, 0.88, 0.1] }));
      g.add(ball(0.07, 0xffd43b, { pos: [0.4, 0.86, 0.18] }));
      const st = o.scaleTo as [number, number] | undefined;
      if (st) g.scale.set((st[0] * 0.92) / 1.84, 1, (st[1] * 0.88) / 1.14);
      return g;
    },
  },
  chair: {
    w: 0.5,
    d: 0.5,
    solid: true,
    build: (o) => {
      const c = (o.color as number) ?? 0xf3c48e;
      const g = new THREE.Group();
      g.add(rbox(0.46, 0.06, 0.44, c, { pos: [0, 0.44, 0], r: 0.025 }));
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(cyl(0.03, 0.025, 0.44, WOOD_D, { pos: [s * 0.18, 0.22, t * 0.17] }));
      g.add(rbox(0.46, 0.42, 0.05, c, { pos: [0, 0.7, -0.2], r: 0.025 }));
      g.add(rbox(0.38, 0.06, 0.4, 0xff8f8f, { pos: [0, 0.49, 0.01], r: 0.03 }));
      return g;
    },
  },
  cookieJar: {
    w: 0.4,
    d: 0.4,
    dynamic: true,
    build: () => {
      const g = new THREE.Group();
      g.name = 'cookieJar';
      const glass = new THREE.MeshToonMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.38, depthWrite: false });
      g.add(mesh(latheGeo('jar', [[0.001, 0], [0.15, 0.005], [0.17, 0.05], [0.17, 0.26], [0.13, 0.32], [0.12, 0.34], [0.001, 0.34]], 24), glass, { cast: false }));
      // cookies stacked inside
      for (let i = 0; i < 4; i++) g.add(cookieMesh(0.11, [Math.sin(i * 2.3) * 0.02, 0.04 + i * 0.055, Math.cos(i * 2.3) * 0.02], [0.2 * Math.sin(i), i, 0.15 * Math.cos(i)]));
      g.add(cyl(0.13, 0.135, 0.05, 0xff6b6b, { pos: [0, 0.37, 0] }));
      g.add(ball(0.04, 0xffd43b, { pos: [0, 0.42, 0] }));
      g.add(rbox(0.16, 0.08, 0.01, 0xfff1da, { pos: [0, 0.18, 0.168], r: 0.01, cast: false }));
      return g;
    },
  },
  plant: {
    w: 0.5,
    d: 0.5,
    solid: true,
    build: (o) => {
      const g = new THREE.Group();
      g.add(cyl(0.17, 0.13, 0.28, (o.pot as number) ?? 0xe8845a, { pos: [0, 0.14, 0] }));
      g.add(cyl(0.18, 0.18, 0.05, 0xf29a6e, { pos: [0, 0.28, 0] }));
      const leaf = toon(0x4fb06d);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.add(ball(0.12, leaf, { pos: [Math.cos(a) * 0.12, 0.45 + (i % 3) * 0.08, Math.sin(a) * 0.12], scale: [0.7, 1.4, 0.5], rot: [Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5] }));
      }
      g.add(ball(0.12, toon(0x5cc47a), { pos: [0, 0.62, 0], scale: [0.8, 1.3, 0.8] }));
      return g;
    },
  },
  rug: {
    w: 1,
    d: 1,
    build: (o) => {
      const w = (o.w as number) ?? 2,
        d = (o.d as number) ?? 1.2;
      const c = (o.color as number) ?? 0xff8fa3;
      const g = new THREE.Group();
      if (o.round) {
        g.add(cyl(w / 2, w / 2, 0.02, c, { pos: [0, 0.01, 0], seg: 40, cast: false }));
        g.add(cyl(w / 2 - 0.12, w / 2 - 0.12, 0.025, (o.inner as number) ?? 0xffd1dc, { pos: [0, 0.012, 0], seg: 40, cast: false }));
        g.add(cyl(w / 2 - 0.3, w / 2 - 0.3, 0.03, c, { pos: [0, 0.014, 0], seg: 40, cast: false }));
      } else {
        g.add(rbox(w, 0.02, d, c, { pos: [0, 0.01, 0], r: 0.008, cast: false }));
        g.add(rbox(w - 0.16, 0.024, d - 0.16, (o.inner as number) ?? 0xffd1dc, { pos: [0, 0.012, 0], r: 0.008, cast: false }));
        g.add(rbox(w - 0.3, 0.028, d - 0.3, c, { pos: [0, 0.014, 0], r: 0.008, cast: false }));
      }
      return g;
    },
  },
  sideTable: {
    w: 0.55,
    d: 0.45,
    solid: true,
    dynamic: true,
    build: (o) => {
      const g = new THREE.Group();
      g.add(rbox(0.52, 0.05, 0.42, WOOD, { pos: [0, 0.6, 0], r: 0.02 }));
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(cyl(0.025, 0.02, 0.6, WOOD_D, { pos: [s * 0.21, 0.3, t * 0.16] }));
      g.add(rbox(0.44, 0.03, 0.34, WOOD, { pos: [0, 0.22, 0], r: 0.01 }));
      if (o.lamp !== false) {
        const l = lampShade(0xffd6a0, 0xffbf66);
        l.position.y = 0.62;
        g.add(l);
      }
      g.add(rbox(0.16, 0.03, 0.22, 0x4dabf7, { pos: [-0.12, 0.25, 0], r: 0.01 }));
      return g;
    },
  },
  picture: {
    w: 0.6,
    d: 0.05,
    build: (o) => {
      const g = new THREE.Group();
      const c = (o.color as number) ?? 0x7cc7ff;
      g.add(rbox(0.5, 0.36, 0.04, 0xd9a35e, { pos: [0, 0.75, 0], r: 0.015, cast: false }));
      g.add(rbox(0.42, 0.28, 0.02, c, { pos: [0, 0.75, 0.015], r: 0.006, cast: false }));
      g.add(ball(0.06, 0xffe066, { pos: [0.1, 0.8, 0.03], scale: [1, 1, 0.2], cast: false }));
      g.add(cone(0.12, 0.12, toon(0x5cb85c), { pos: [-0.08, 0.68, 0.025], scale: [1, 1, 0.15], cast: false }));
      return g;
    },
  },
  sofa: {
    w: 1.8,
    d: 0.8,
    solid: true,
    hide: 'behind',
    build: (o) => {
      const c = (o.color as number) ?? 0x7b8cff;
      const g = new THREE.Group();
      g.add(rbox(1.8, 0.36, 0.8, c, { pos: [0, 0.24, 0], r: 0.1 }));
      g.add(rbox(1.8, 0.48, 0.24, c, { pos: [0, 0.56, -0.28], r: 0.1 }));
      for (const s of [-1, 1]) g.add(rbox(0.22, 0.5, 0.8, c, { pos: [s * 0.8, 0.35, 0], r: 0.1 }));
      for (const s of [-1, 1]) g.add(rbox(0.66, 0.14, 0.56, 0x98a6ff, { pos: [s * 0.34, 0.46, 0.05], r: 0.07 }));
      g.add(rbox(0.3, 0.28, 0.12, 0xffd43b, { pos: [-0.5, 0.6, -0.12], rot: [0, 0.3, 0.2], r: 0.06 }));
      return g;
    },
  },
  tv: {
    w: 1.2,
    d: 0.45,
    solid: true,
    dynamic: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(1.2, 0.4, 0.42, WOOD_D, { pos: [0, 0.2, 0], r: 0.04 }));
      g.add(rbox(0.9, 0.52, 0.06, 0x1c1f2b, { pos: [0, 0.72, -0.05], r: 0.03 }));
      g.add(mesh(planeGeo(0.82, 0.44), toon(0x6f8cff, { emissive: 0x5b7bff, emissiveIntensity: 0.9, rim: 0 }), { pos: [0, 0.72, -0.015], cast: false }));
      const s = glowSprite(0x6f8cff, 1.4, 0.35);
      s.position.set(0, 0.72, 0.2);
      g.add(s);
      return g;
    },
  },
  armchair: {
    w: 0.9,
    d: 0.85,
    solid: true,
    build: (o) => {
      const c = (o.color as number) ?? 0xc8607a;
      const g = new THREE.Group();
      g.add(rbox(0.85, 0.34, 0.8, c, { pos: [0, 0.22, 0], r: 0.1 }));
      g.add(rbox(0.85, 0.55, 0.22, c, { pos: [0, 0.55, -0.3], r: 0.1 }));
      for (const s of [-1, 1]) g.add(rbox(0.18, 0.46, 0.8, c, { pos: [s * 0.36, 0.34, 0], r: 0.08 }));
      g.add(rbox(0.5, 0.12, 0.5, 0xffd1dc, { pos: [0, 0.42, 0.06], r: 0.05 }));
      return g;
    },
  },
  rockingChair: {
    w: 0.8,
    d: 0.9,
    solid: true,
    build: () => {
      const g = new THREE.Group();
      for (const s of [-1, 1]) g.add(mesh(torusGeo(0.6, 0.025, 6, 24, 1.2), toon(WOOD_D), { pos: [s * 0.28, 0.62, 0], rot: [0, Math.PI / 2, Math.PI + 0.97] }));
      g.add(rbox(0.6, 0.06, 0.55, WOOD, { pos: [0, 0.4, 0], r: 0.02 }));
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(cyl(0.025, 0.025, 0.38, WOOD_D, { pos: [s * 0.27, 0.22, t * 0.22] }));
      g.add(rbox(0.6, 0.7, 0.05, WOOD, { pos: [0, 0.78, -0.27], rot: [-0.15, 0, 0], r: 0.02 }));
      g.add(rbox(0.5, 0.06, 0.45, 0xb0508a, { pos: [0, 0.46, 0.02], r: 0.03 }));
      // knitting
      g.add(ball(0.08, 0xff8fa3, { pos: [0.1, 0.52, 0.1] }));
      g.add(cyl(0.006, 0.006, 0.26, 0xd9b26a, { pos: [0.1, 0.56, 0.1], rot: [0.4, 0, 0.9] }));
      return g;
    },
  },
  fireplace: {
    w: 1.4,
    d: 0.6,
    solid: true,
    dynamic: true,
    build: (o) => {
      const stone = (o.color as number) ?? 0xb8a99a;
      const g = new THREE.Group();
      g.add(rbox(1.4, 1.1, 0.55, stone, { pos: [0, 0.55, 0], r: 0.06 }));
      g.add(rbox(1.55, 0.1, 0.65, WOOD_D, { pos: [0, 1.1, 0.03], r: 0.03 }));
      g.add(rbox(0.8, 0.6, 0.3, 0x2a1d26, { pos: [0, 0.38, 0.14], r: 0.05 }));
      for (const s of [-1, 1]) g.add(pill(0.05, 0.4, WOOD_D, { pos: [s * 0.06, 0.16, 0.2], rot: [0, s * 0.5, Math.PI / 2] }));
      const ember = toon(0xff7a2f, { emissive: 0xff5a1f, emissiveIntensity: 1.8, rim: 0 });
      g.add(cone(0.12, 0.26, ember, { pos: [0, 0.32, 0.22], cast: false }));
      g.add(cone(0.08, 0.18, toon(0xffd166, { emissive: 0xffc04a, emissiveIntensity: 2.2, rim: 0 }), { pos: [0.08, 0.28, 0.24], cast: false }));
      const s = glowSprite(0xff8a3d, 1.6, 0.7);
      s.position.set(0, 0.35, 0.45);
      g.add(s);
      g.add(cyl(0.05, 0.04, 0.14, 0xffffff, { pos: [-0.5, 1.22, 0] }));
      g.add(cyl(0.06, 0.06, 0.2, 0xd9a35e, { pos: [0.45, 1.25, 0] }));
      return g;
    },
  },
  clock: {
    w: 0.5,
    d: 0.35,
    solid: true,
    tall: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.46, 1.9, 0.32, WOOD_D, { pos: [0, 0.95, 0], r: 0.05 }));
      g.add(cyl(0.17, 0.17, 0.03, 0xfff1da, { pos: [0, 1.6, 0.16], rot: [Math.PI / 2, 0, 0] }));
      g.add(rbox(0.02, 0.12, 0.01, 0x2a1a33, { pos: [0, 1.65, 0.18], r: 0.004 }));
      g.add(rbox(0.3, 0.7, 0.02, 0xd9a35e, { pos: [0, 0.85, 0.16], r: 0.02 }));
      g.add(cyl(0.07, 0.07, 0.02, 0xffd36b, { pos: [0, 0.65, 0.18], rot: [Math.PI / 2, 0, 0] }));
      return g;
    },
  },
  pillar: {
    w: 0.6,
    d: 0.6,
    solid: true,
    tall: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.6, 0.16, 0.6, 0xf2ece4, { pos: [0, 0.08, 0], r: 0.03 }));
      g.add(cyl(0.2, 0.22, 1.8, 0xf7f2ea, { pos: [0, 1.06, 0], seg: 16 }));
      g.add(rbox(0.56, 0.14, 0.56, 0xf2ece4, { pos: [0, 2.0, 0], r: 0.03 }));
      return g;
    },
  },
  candelabra: {
    w: 0.5,
    d: 0.5,
    solid: true,
    dynamic: true,
    build: () => {
      const g = new THREE.Group();
      const gold = toon(0xe6b84a);
      g.add(cyl(0.18, 0.22, 0.06, gold, { pos: [0, 0.03, 0] }));
      g.add(cyl(0.03, 0.04, 1.2, gold, { pos: [0, 0.62, 0] }));
      g.add(mesh(torusGeo(0.22, 0.02, 6, 24, Math.PI), gold, { pos: [0, 1.22, 0], rot: [0, 0, Math.PI] }));
      for (const x of [-0.22, 0, 0.22]) {
        g.add(cyl(0.03, 0.03, 0.14, 0xfff1da, { pos: [x, x === 0 ? 1.3 : 1.3, 0] }));
        g.add(cone(0.025, 0.07, toon(0xffd166, { emissive: 0xffc04a, emissiveIntensity: 2.5, rim: 0 }), { pos: [x, 1.41, 0], cast: false }));
      }
      const s = glowSprite(0xffb85c, 1.0, 0.7);
      s.position.y = 1.4;
      g.add(s);
      return g;
    },
  },
  piano: {
    w: 1.5,
    d: 0.7,
    solid: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(1.5, 1.1, 0.5, 0x2a2238, { pos: [0, 0.55, -0.1], r: 0.05 }));
      g.add(rbox(1.4, 0.08, 0.3, 0x2a2238, { pos: [0, 0.72, 0.25], r: 0.02 }));
      g.add(rbox(1.3, 0.03, 0.18, 0xffffff, { pos: [0, 0.77, 0.27], r: 0.01 }));
      for (let i = 0; i < 9; i++) g.add(rbox(0.05, 0.03, 0.1, 0x111111, { pos: [-0.55 + i * 0.14, 0.79, 0.24], r: 0.005, cast: false }));
      for (const s of [-1, 1]) g.add(cyl(0.04, 0.04, 0.7, 0x2a2238, { pos: [s * 0.62, 0.35, 0.3] }));
      g.add(cyl(0.05, 0.05, 0.16, 0xe6b84a, { pos: [0.5, 1.18, -0.1] }));
      return g;
    },
  },
  armor: {
    w: 0.6,
    d: 0.6,
    solid: true,
    tall: true,
    build: () => {
      const g = new THREE.Group();
      const steel = toon(0xc9d2e6);
      g.add(rbox(0.5, 0.1, 0.5, WOOD_D, { pos: [0, 0.05, 0], r: 0.02 }));
      for (const s of [-1, 1]) g.add(pill(0.07, 0.5, steel, { pos: [s * 0.1, 0.42, 0] }));
      g.add(pill(0.2, 0.3, steel, { pos: [0, 1.0, 0], scale: [1, 1, 0.8] }));
      g.add(ball(0.15, steel, { pos: [0, 1.45, 0] }));
      g.add(rbox(0.2, 0.04, 0.05, 0x2a2238, { pos: [0, 1.46, 0.13], r: 0.01 }));
      g.add(cone(0.05, 0.18, toon(0xd9435e), { pos: [0, 1.65, -0.03] }));
      g.add(cyl(0.015, 0.015, 1.6, 0x8a5434, { pos: [0.3, 0.85, 0.1] }));
      g.add(cone(0.05, 0.2, steel, { pos: [0.3, 1.72, 0.1] }));
      return g;
    },
  },
  skis: {
    w: 0.4,
    d: 0.3,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.1, 1.5, 0.03, 0xff5c7a, { pos: [-0.06, 0.75, 0], rot: [-0.12, 0, 0.06], r: 0.02 }));
      g.add(rbox(0.1, 1.5, 0.03, 0xff5c7a, { pos: [0.08, 0.75, 0.02], rot: [-0.12, 0, -0.04], r: 0.02 }));
      g.add(cyl(0.015, 0.015, 1.2, 0xc9d2e6, { pos: [0.2, 0.6, 0.06], rot: [-0.1, 0, -0.1] }));
      return g;
    },
  },
  bench: {
    w: 1.2,
    d: 0.5,
    solid: true,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(1.2, 0.08, 0.45, 0x9a6038, { pos: [0, 0.42, 0], r: 0.03 }));
      for (const s of [-1, 1]) g.add(rbox(0.08, 0.4, 0.4, 0x7a4828, { pos: [s * 0.5, 0.2, 0], r: 0.02 }));
      g.add(rbox(0.36, 0.16, 0.36, 0xd9435e, { pos: [-0.3, 0.54, 0], r: 0.06 }));
      g.add(rbox(0.3, 0.12, 0.3, 0xffffff, { pos: [-0.3, 0.68, 0], r: 0.05 }));
      return g;
    },
  },
  boots: {
    w: 0.4,
    d: 0.3,
    build: () => {
      const g = new THREE.Group();
      for (const s of [-1, 1]) {
        g.add(rbox(0.12, 0.26, 0.12, 0x8a5434, { pos: [s * 0.08, 0.13, 0], r: 0.04 }));
        g.add(rbox(0.12, 0.08, 0.2, 0x8a5434, { pos: [s * 0.08, 0.04, 0.05], r: 0.035 }));
        g.add(rbox(0.13, 0.05, 0.13, 0xffffff, { pos: [s * 0.08, 0.26, 0], r: 0.025 }));
      }
      return g;
    },
  },
  toys: {
    w: 0.6,
    d: 0.6,
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(0.14, 0.14, 0.14, 0xff6b6b, { pos: [-0.15, 0.07, 0.05], rot: [0, 0.4, 0] }));
      g.add(rbox(0.14, 0.14, 0.14, 0x4dabf7, { pos: [0.02, 0.07, 0.12], rot: [0, -0.3, 0] }));
      g.add(rbox(0.14, 0.14, 0.14, 0xffd43b, { pos: [-0.07, 0.21, 0.08], rot: [0, 0.1, 0] }));
      g.add(ball(0.09, 0x69db7c, { pos: [0.2, 0.09, -0.12] }));
      return g;
    },
  },
  teddy: {
    w: 0.3,
    d: 0.3,
    build: () => {
      const g = new THREE.Group();
      const fur = toon(0xc98b5e);
      g.add(ball(0.11, fur, { pos: [0, 0.11, 0], scale: [1, 1.1, 0.9] }));
      g.add(ball(0.085, fur, { pos: [0, 0.27, 0.01] }));
      for (const s of [-1, 1]) {
        g.add(ball(0.035, fur, { pos: [s * 0.07, 0.34, 0] }));
        g.add(ball(0.04, fur, { pos: [s * 0.1, 0.12, 0.05] }));
        g.add(ball(0.045, fur, { pos: [s * 0.07, 0.03, 0.08] }));
        g.add(ball(0.012, 0x2a1a33, { pos: [s * 0.03, 0.29, 0.08], cast: false }));
      }
      g.add(ball(0.03, 0xf3d2b0, { pos: [0, 0.26, 0.08], cast: false }));
      g.add(mesh(torusGeo(0.05, 0.015, 6, 12), toon(0xff6b6b), { pos: [0, 0.2, 0.04], rot: [Math.PI / 2 - 0.3, 0, 0], cast: false }));
      return g;
    },
  },
  // ------------------------------------------------ outside / decor
  bush: {
    w: 0.8,
    d: 0.8,
    build: (o) => {
      const c = (o.color as number) ?? 0x2f7a5a;
      const g = new THREE.Group();
      const m = toon(c);
      g.add(ball(0.32, m, { pos: [0, 0.26, 0], scale: [1, 0.85, 1] }));
      g.add(ball(0.24, m, { pos: [0.25, 0.2, 0.08] }));
      g.add(ball(0.22, m, { pos: [-0.24, 0.18, 0.06] }));
      if (o.flowers) for (let i = 0; i < 5; i++) g.add(ball(0.045, [0xff8fa3, 0xffd43b, 0xffffff][i % 3], { pos: [Math.sin(i * 2.1) * 0.28, 0.3 + (i % 2) * 0.12, Math.cos(i * 2.1) * 0.22 + 0.1], cast: false }));
      return g;
    },
  },
  pine: {
    w: 0.9,
    d: 0.9,
    build: (o) => {
      const g = new THREE.Group();
      const snow = !!o.snow;
      g.add(cyl(0.07, 0.09, 0.4, WOOD_D, { pos: [0, 0.2, 0] }));
      const s = (o.s as number) ?? 1;
      for (let i = 0; i < 3; i++) {
        g.add(cone((0.55 - i * 0.13) * s, (0.7 - i * 0.1) * s, toon(0x2f6e5c), { pos: [0, (0.55 + i * 0.38) * s, 0] }));
        if (snow) g.add(cone((0.38 - i * 0.1) * s, (0.3 - i * 0.04) * s, toon(0xf4f8ff), { pos: [0, (0.78 + i * 0.38) * s, 0] }));
      }
      return g;
    },
  },
  fence: {
    w: 1,
    d: 0.1,
    build: (o) => {
      const len = (o.len as number) ?? 1;
      const g = new THREE.Group();
      const n = Math.max(2, Math.round(len / 0.28));
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + (i + 0.5) * (len / n);
        g.add(rbox(0.12, 0.42, 0.04, 0xf2ead8, { pos: [x, 0.21, 0], r: 0.02 }));
        g.add(cone(0.085, 0.08, toon(0xf2ead8), { pos: [x, 0.46, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.35] }));
      }
      for (const y of [0.12, 0.32]) g.add(rbox(len, 0.05, 0.03, 0xe0d4bb, { pos: [0, y, -0.03], r: 0.01 }));
      return g;
    },
  },
  lamppost: {
    w: 0.3,
    d: 0.3,
    dynamic: true,
    build: () => {
      const g = new THREE.Group();
      g.add(cyl(0.04, 0.06, 1.6, 0x2e3446, { pos: [0, 0.8, 0] }));
      g.add(cyl(0.1, 0.12, 0.06, 0x2e3446, { pos: [0, 0.03, 0] }));
      g.add(rbox(0.2, 0.26, 0.2, toon(0xffe2a0, { emissive: 0xffc96b, emissiveIntensity: 1.6, rim: 0 }), { pos: [0, 1.72, 0], r: 0.04, cast: false }));
      g.add(cone(0.18, 0.12, toon(0x2e3446), { pos: [0, 1.9, 0], rot: [0, Math.PI / 4, 0] }));
      const s = glowSprite(0xffc96b, 1.4, 0.75);
      s.position.y = 1.72;
      g.add(s);
      return g;
    },
  },
  flowers: {
    w: 0.6,
    d: 0.3,
    build: (o) => {
      const g = new THREE.Group();
      const len = (o.len as number) ?? 1;
      const n = Math.round(len * 5);
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + (i + 0.5) * (len / n);
        g.add(cyl(0.008, 0.008, 0.16, 0x4fb06d, { pos: [x, 0.08, 0], cast: false }));
        g.add(ball(0.045, [0xff8fa3, 0xffd43b, 0xb197fc, 0xffffff][i % 4], { pos: [x, 0.18, 0], cast: false }));
      }
      return g;
    },
  },
  snowman: {
    w: 0.6,
    d: 0.6,
    build: () => {
      const g = new THREE.Group();
      const sn = toon(0xf4f8ff);
      g.add(ball(0.28, sn, { pos: [0, 0.26, 0] }));
      g.add(ball(0.2, sn, { pos: [0, 0.66, 0] }));
      g.add(ball(0.14, sn, { pos: [0, 0.96, 0] }));
      g.add(cone(0.03, 0.16, toon(0xff8a3d), { pos: [0, 0.96, 0.18], rot: [Math.PI / 2, 0, 0] }));
      for (const s of [-1, 1]) g.add(ball(0.02, 0x2a1a33, { pos: [s * 0.05, 1.0, 0.12] }));
      g.add(mesh(torusGeo(0.14, 0.04, 8, 20), toon(0xd9435e), { pos: [0, 0.84, 0], rot: [Math.PI / 2, 0, 0] }));
      g.add(cyl(0.12, 0.12, 0.16, 0x2a2238, { pos: [0, 1.15, 0] }));
      g.add(cyl(0.18, 0.18, 0.02, 0x2a2238, { pos: [0, 1.07, 0] }));
      return g;
    },
  },
  hedge: {
    w: 1,
    d: 0.5,
    build: (o) => {
      const len = (o.len as number) ?? 1;
      const g = new THREE.Group();
      g.add(rbox(len, 0.6, 0.45, 0x2f6e4a, { pos: [0, 0.3, 0], r: 0.18 }));
      return g;
    },
  },
  fountain: {
    w: 1.4,
    d: 1.4,
    dynamic: true,
    build: () => {
      const g = new THREE.Group();
      g.add(cyl(0.7, 0.75, 0.3, 0xe8e0d4, { pos: [0, 0.15, 0], seg: 32 }));
      g.add(cyl(0.6, 0.6, 0.04, toon(0x6fb8ff, { emissive: 0x3a6fff, emissiveIntensity: 0.25 }), { pos: [0, 0.29, 0], seg: 32, cast: false }));
      g.add(cyl(0.1, 0.14, 0.6, 0xe8e0d4, { pos: [0, 0.5, 0] }));
      g.add(cyl(0.3, 0.12, 0.12, 0xe8e0d4, { pos: [0, 0.82, 0] }));
      g.add(ball(0.08, 0x9ad6ff, { pos: [0, 0.95, 0] }));
      return g;
    },
  },
  cityBlock: {
    w: 1,
    d: 1,
    build: (o) => {
      const h = (o.h as number) ?? 3;
      const w = (o.w as number) ?? 1;
      const c = (o.color as number) ?? 0x3a3570;
      const g = new THREE.Group();
      g.add(rbox(w, h, 0.9, c, { pos: [0, h / 2, 0], r: 0.04, cast: false }));
      const win = toon(0xffd98a, { emissive: 0xffc96b, emissiveIntensity: 1.2, rim: 0 });
      const dark = toon(0x4a4590, { rim: 0 });
      let k = (o.seed as number) ?? 1;
      for (let y = 0.4; y < h - 0.2; y += 0.4)
        for (let x = -w / 2 + 0.2; x < w / 2 - 0.1; x += 0.3) {
          k = (k * 16807) % 2147483647;
          g.add(rbox(0.16, 0.2, 0.02, k % 3 === 0 ? win : dark, { pos: [x + 0.05, y, 0.455], r: 0.01, cast: false, receive: false }));
        }
      return g;
    },
  },
  curtain: {
    w: 1,
    d: 0.3,
    hide: 'behind',
    build: (o) => {
      const c = (o.color as number) ?? 0x8f6fd6;
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) g.add(pill(0.09, 0.95, c, { pos: [-0.3 + i * 0.2, 0.6, 0.02 * (i % 2)], scale: [1, 1, 0.75] }));
      g.add(cyl(0.02, 0.02, 1.0, 0xd9a35e, { pos: [0, 1.16, 0], rot: [0, 0, Math.PI / 2] }));
      return g;
    },
  },
  dogBed: {
    w: 0.7,
    d: 0.7,
    build: () => {
      const g = new THREE.Group();
      g.add(mesh(torusGeo(0.24, 0.1, 10, 24), toon(0x8f6fd6), { pos: [0, 0.1, 0], rot: [Math.PI / 2, 0, 0] }));
      g.add(cyl(0.25, 0.25, 0.06, 0xffd1dc, { pos: [0, 0.05, 0] }));
      return g;
    },
  },
  bathtub: {
    w: 1.6,
    d: 0.8,
    solid: true,
    hide: 'inside',
    build: () => {
      const g = new THREE.Group();
      g.add(rbox(1.6, 0.6, 0.78, 0xf4f1fb, { pos: [0, 0.34, 0], r: 0.2 }));
      g.add(rbox(1.4, 0.1, 0.6, 0x9ad6ff, { pos: [0, 0.6, 0], r: 0.05, cast: false }));
      for (let i = 0; i < 6; i++) g.add(ball(0.08, 0xffffff, { pos: [-0.4 + i * 0.16, 0.66, Math.sin(i) * 0.15], cast: false }));
      g.add(ball(0.07, 0xffd43b, { pos: [0.3, 0.7, 0.1] }));
      for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(ball(0.06, 0xe6b84a, { pos: [s * 0.65, 0.04, t * 0.28] }));
      return g;
    },
  },
};

export function cookieMesh(r: number, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  const disc = mesh(sphereGeo(r, 20, 10), toon(0xe9ad62), { scale: [1, 0.32, 1] });
  g.add(disc);
  const choc = toon(0x5a2e1a);
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4;
    const d = r * (0.25 + (i % 3) * 0.22);
    g.add(ball(r * 0.13, choc, { pos: [Math.cos(a) * d, r * 0.27, Math.sin(a) * d], scale: [1, 0.6, 1], cast: false }));
  }
  return g;
}

function drawStarDecal(x: number, y: number, z: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.035 : 0.08;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), toon(0xfff3b8));
  m.position.set(x, y, z);
  return m;
}

export function buildProp(type: string, opts: Record<string, unknown> = {}): THREE.Object3D {
  const meta = PROPS[type];
  if (!meta) throw new Error('unknown prop ' + type);
  const o = meta.build(opts);
  o.userData.propType = type;
  return o;
}

export { group, planksTex };
