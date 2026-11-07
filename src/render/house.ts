import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EdgeRef, LevelDef, PropDef } from '../levels/types';
import { HouseTheme, floorTexture, wallTexture } from './themes';
import { toon } from './toon';
import { rbox, mesh, planeGeo, cyl, ball } from './geom';
import { buildProp, PROPS, cookieMesh } from './props';
import { aoStripTex, blobTex, radialTex, windowPatchTex, planksTex } from './textures';
import type { Seg } from './vision';
import { Drift, Sparkles } from './fx';

/**
 * Builds a cut-away "toy diorama" house from level data:
 * slab base → floors → half-height walls (two-tone, world-mapped wallpaper,
 * cream cut caps, skirting) → doors/windows → moonlight → props → outside.
 * Static meshes are merged per material to keep draw calls low.
 */

export const WALL_H = 1.05;
export const WALL_T = 0.14;
export const SILL_H = 0.42;

export interface BuiltHouse {
  root: THREE.Group;
  dynamic: THREE.Group;
  /** 2D wall segments that block vision (doors excluded) */
  walls: Seg[];
  lights: THREE.Light[];
  cookies: THREE.Group[];
  jar?: THREE.Object3D;
  center: THREE.Vector3;
  size: THREE.Vector2;
  update(t: number, dt: number): void;
}

type EdgeType = 'wall' | 'door' | 'window';
interface Edge {
  vertical: boolean; // line x = const
  x: number;
  z: number; // start cell coordinate along the line
  a: number; // room on the low side (west / north), -1 = outside
  b: number; // room on the high side
  type: EdgeType;
}

function edgeKey(e: EdgeRef): string {
  switch (e.side) {
    case 'n':
      return `h:${e.x}:${e.z}`;
    case 's':
      return `h:${e.x}:${e.z + 1}`;
    case 'w':
      return `v:${e.x}:${e.z}`;
    case 'e':
      return `v:${e.x + 1}:${e.z}`;
  }
}

/** Assign world-space UVs to a geometry already transformed into world space. */
function worldUV(g: THREE.BufferGeometry, hScale = WALL_H) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const nx = Math.abs(n.getX(i)),
      ny = Math.abs(n.getY(i));
    if (ny > 0.5) {
      uv[i * 2] = x;
      uv[i * 2 + 1] = -z;
    } else if (nx > 0.5) {
      uv[i * 2] = z;
      uv[i * 2 + 1] = y / hScale;
    } else {
      uv[i * 2] = x;
      uv[i * 2 + 1] = y / hScale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

export function buildHouse(level: LevelDef, theme: HouseTheme, opts: { outside?: boolean; lights?: boolean } = {}): BuiltHouse {
  const root = new THREE.Group();
  const stat = new THREE.Group();
  const dynamic = new THREE.Group();
  root.add(stat, dynamic);
  const W = level.w,
    D = level.d;
  const lights: THREE.Light[] = [];
  const updaters: ((t: number, dt: number) => void)[] = [];

  // ---------------------------------------------------------------- grid
  const grid: number[][] = Array.from({ length: W }, () => Array(D).fill(-1));
  const groupKeys: string[] = [];
  const groupOf = level.rooms.map((r, i) => {
    const k = r.group ?? '#' + i;
    let g = groupKeys.indexOf(k);
    if (g < 0) g = groupKeys.push(k) - 1;
    return g;
  });
  const groupRoom = groupKeys.map((_, g) => level.rooms[groupOf.indexOf(g)]);
  level.rooms.forEach((r, i) => {
    for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) if (x >= 0 && x < W && z >= 0 && z < D) grid[x][z] = groupOf[i];
  });
  const cell = (x: number, z: number) => (x >= 0 && x < W && z >= 0 && z < D ? grid[x][z] : -1);
  const doorSet = new Set(level.doors.map(edgeKey));
  const winSet = new Set(level.windows.map(edgeKey));

  const open = new Set(level.open ?? []);
  const isOpen = (vertical: boolean, line: number, a: number, b: number) =>
    (a < 0 || b < 0) && ((vertical && ((line === W && open.has('e')) || (line === 0 && open.has('w')))) || (!vertical && ((line === D && open.has('s')) || (line === 0 && open.has('n')))));
  const edges: Edge[] = [];
  for (let x = 0; x <= W; x++)
    for (let z = 0; z < D; z++) {
      const a = cell(x - 1, z),
        b = cell(x, z);
      if (a === b || isOpen(true, x, a, b)) continue;
      const k = `v:${x}:${z}`;
      edges.push({ vertical: true, x, z, a, b, type: doorSet.has(k) ? 'door' : winSet.has(k) ? 'window' : 'wall' });
    }
  for (let z = 0; z <= D; z++)
    for (let x = 0; x < W; x++) {
      const a = cell(x, z - 1),
        b = cell(x, z);
      if (a === b || isOpen(false, z, a, b)) continue;
      const k = `h:${x}:${z}`;
      edges.push({ vertical: false, x, z, a, b, type: doorSet.has(k) ? 'door' : winSet.has(k) ? 'window' : 'wall' });
    }

  // merge consecutive edges with identical type & rooms into runs
  interface Run {
    vertical: boolean;
    line: number;
    from: number;
    to: number;
    a: number;
    b: number;
    type: EdgeType;
  }
  const runs: Run[] = [];
  const sorted = edges.slice().sort((p, q) => (p.vertical === q.vertical ? (p.vertical ? p.x - q.x || p.z - q.z : p.z - q.z || p.x - q.x) : p.vertical ? -1 : 1));
  for (const e of sorted) {
    const line = e.vertical ? e.x : e.z;
    const pos = e.vertical ? e.z : e.x;
    const last = runs[runs.length - 1];
    if (last && last.vertical === e.vertical && last.line === line && last.to === pos && last.a === e.a && last.b === e.b && last.type === e.type && e.type !== 'window') {
      last.to = pos + 1;
    } else runs.push({ vertical: e.vertical, line, from: pos, to: pos + 1, a: e.a, b: e.b, type: e.type });
  }

  // ---------------------------------------------------------------- materials
  const wallMats = groupRoom.map((r) => toon(0xffffff, { map: wallTexture(r.wall), key: 'wall-' + r.wall, rim: 0.15 }));
  const extMat = toon(theme.exterior, { rim: 0.2 });
  const capMat = toon(theme.cap, { rim: 0.3 });
  const baseMat = toon(theme.baseboard, { rim: 0.1 });
  const sideMat = (room: number) => (room < 0 ? extMat : wallMats[room]);

  const geoBuckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (mat: THREE.Material, g: THREE.BufferGeometry) => {
    if (!geoBuckets.has(mat)) geoBuckets.set(mat, []);
    geoBuckets.get(mat)!.push(g);
  };

  const walls: Seg[] = [];
  const T = WALL_T,
    H = WALL_H;
  const wallGeo = (r: Run, h: number, y0: number, ext: number) => {
    // returns two half-thickness geometries [sideA, sideB]
    const len = r.to - r.from + ext * 2;
    const mid = (r.from + r.to) / 2;
    const out: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      const off = (s * T) / 4;
      const g = r.vertical ? boxAt(T / 2, h, len, r.line + off, y0 + h / 2, mid) : boxAt(len, h, T / 2, mid, y0 + h / 2, r.line + off);
      worldUV(g);
      out.push(g);
    }
    return out;
  };

  for (const r of runs) {
    const ext = T / 2;
    const len = r.to - r.from;
    const mid = (r.from + r.to) / 2;
    const P = (along: number, across: number, y: number): [number, number, number] => (r.vertical ? [r.line + across, y, along] : [along, y, r.line + across]);
    if (r.type === 'door') {
      // door trims (posts) + threshold
      for (const end of [r.from, r.to]) {
        const g = r.vertical ? boxAt(T + 0.06, H + 0.04, 0.08, r.line, (H + 0.04) / 2, end) : boxAt(0.08, H + 0.04, T + 0.06, end, (H + 0.04) / 2, r.line);
        add(capMat, g);
      }
      const th = r.vertical ? boxAt(T + 0.04, 0.025, len, r.line, 0.0125, mid) : boxAt(len, 0.025, T + 0.04, mid, 0.0125, r.line);
      add(toon(0xc98b5a), th);
      continue;
    }
    if (r.type === 'window') {
      const [ga, gb] = wallGeo(r, SILL_H, 0, ext);
      add(sideMat(r.a), ga);
      add(sideMat(r.b), gb);
      // frame posts + sill + glass + mullion
      for (const end of [r.from + 0.04, r.to - 0.04]) {
        const g = r.vertical ? boxAt(T + 0.04, H - SILL_H, 0.08, r.line, SILL_H + (H - SILL_H) / 2, end) : boxAt(0.08, H - SILL_H, T + 0.04, end, SILL_H + (H - SILL_H) / 2, r.line);
        add(capMat, g);
      }
      add(capMat, r.vertical ? boxAt(T + 0.12, 0.05, len, r.line, SILL_H + 0.025, mid) : boxAt(len, 0.05, T + 0.12, mid, SILL_H + 0.025, r.line));
      add(capMat, r.vertical ? boxAt(0.05, H - SILL_H, 0.04, r.line, SILL_H + (H - SILL_H) / 2, mid) : boxAt(0.04, H - SILL_H, 0.05, mid, SILL_H + (H - SILL_H) / 2, r.line));
      add(capMat, r.vertical ? boxAt(0.05, 0.04, len, r.line, SILL_H + 0.32, mid) : boxAt(len, 0.04, 0.05, mid, SILL_H + 0.32, r.line));
      const glass = new THREE.Mesh(
        planeGeo(len - 0.1, H - SILL_H - 0.04),
        new THREE.MeshBasicMaterial({ color: 0x6f8fff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      glass.position.set(...P(mid, 0, SILL_H + (H - SILL_H) / 2));
      if (r.vertical) glass.rotation.y = Math.PI / 2;
      dynamic.add(glass);
      // moonlight: floor patch + light shaft into the room that faces the moon (N / W walls lean in)
      const inside = r.b >= 0 ? 1 : -1;
      const roomIdx = inside > 0 ? r.b : r.a;
      if (roomIdx >= 0) {
        const dir = inside; // +1 → into the high side
        const patch = new THREE.Mesh(
          planeGeo(len * 1.05, 1.15),
          new THREE.MeshBasicMaterial({ map: windowPatchTex(), color: 0x7f9cff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        );
        patch.rotation.x = -Math.PI / 2;
        if (r.vertical) patch.rotation.z = Math.PI / 2;
        patch.position.set(...P(mid, dir * 0.95, 0.02));
        patch.renderOrder = 1;
        dynamic.add(patch);
        // shaft: a soft additive slab from window to patch
        const shaftMat = new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(0x8fa8ff) }, uT: { value: 0 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `uniform vec3 uColor; uniform float uT; varying vec2 vUv;
            void main(){ float a = smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x)*smoothstep(0.0,0.3,vUv.y)*smoothstep(1.0,0.6,vUv.y);
              a *= 0.16 + 0.03*sin(uT*0.8 + vUv.x*6.0); gl_FragColor = vec4(uColor*a, a); }`,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });
        updaters.push((t) => (shaftMat.uniforms.uT.value = t));
        for (const k of [-0.25, 0.25]) {
          const shaft = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.95, 1.3), shaftMat);
          const ang = Math.atan2(H - 0.1, 0.95);
          shaft.position.set(...P(mid + k * 0.2, dir * 0.48, (H + 0.05) / 2));
          if (r.vertical) {
            shaft.rotation.set(0, Math.PI / 2, 0);
            shaft.rotateX(dir * -(Math.PI / 2 - ang));
          } else {
            shaft.rotation.set(dir * (Math.PI / 2 - ang), 0, 0);
          }
          shaft.renderOrder = 6;
          dynamic.add(shaft);
        }
        const dust = new Drift(18, new THREE.Box3(new THREE.Vector3(...P(mid - len / 2, dir * 0.1, 0.1)).min(new THREE.Vector3(...P(mid + len / 2, dir * 1.1, H))), new THREE.Vector3(...P(mid - len / 2, dir * 0.1, 0.1)).max(new THREE.Vector3(...P(mid + len / 2, dir * 1.1, H)))), 0xbfd0ff, 0.06, 'dust');
        dynamic.add(dust.points);
        updaters.push((t) => dust.update(t));
      }
      walls.push(r.vertical ? [r.line, r.from, r.line, r.to] : [r.from, r.line, r.to, r.line]);
    } else {
      const [ga, gb] = wallGeo(r, H, 0, ext);
      add(sideMat(r.a), ga);
      add(sideMat(r.b), gb);
      walls.push(r.vertical ? [r.line, r.from, r.line, r.to] : [r.from, r.line, r.to, r.line]);
    }
    // cut cap + skirting boards on both sides
    const capH = r.type === 'window' ? SILL_H : H;
    if (r.type !== 'window') add(capMat, r.vertical ? boxAt(T + 0.03, 0.04, len + T + 0.03, r.line, H + 0.02, mid) : boxAt(len + T + 0.03, 0.04, T + 0.03, mid, H + 0.02, r.line));
    void capH;
    for (const s of [-1, 1]) {
      const room = s < 0 ? r.a : r.b;
      if (room < 0) continue;
      const off = s * (T / 2 + 0.012);
      add(baseMat, r.vertical ? boxAt(0.025, 0.09, len + T, r.line + off, 0.045, mid) : boxAt(len + T, 0.09, 0.025, mid, 0.045, r.line + off));
      // AO strip on the floor
      const ao = new THREE.Mesh(planeGeo(len + T, 0.42), aoMat());
      ao.rotation.x = -Math.PI / 2;
      if (r.vertical) {
        ao.rotation.z = (s > 0 ? -1 : 1) * Math.PI / 2;
        ao.position.set(r.line + s * (T / 2 + 0.21), 0.006, mid);
      } else {
        ao.rotation.z = s > 0 ? 0 : Math.PI;
        ao.position.set(mid, 0.006, r.line + s * (T / 2 + 0.21));
      }
      ao.renderOrder = 1;
      dynamic.add(ao);
    }
  }

  // ---------------------------------------------------------------- floors
  level.rooms.forEach((r) => {
    const g = boxAt(r.w, 0.12, r.d, r.x + r.w / 2, -0.06, r.z + r.d / 2);
    worldUV(g);
    const tex = floorTexture(r.floor);
    add(toon(0xffffff, { map: tex, key: 'floor-' + r.floor, rim: 0.0 }), g);
  });

  // ---------------------------------------------------------------- slab base
  const M = 1.1;
  const slab = rbox(W + M * 2, 0.55, D + M * 2, theme.slabSide, { pos: [W / 2, -0.33, D / 2], r: 0.18, cast: false });
  stat.add(slab);
  stat.add(rbox(W + M * 2 + 0.02, 0.12, D + M * 2 + 0.02, theme.slabEdge, { pos: [W / 2, -0.1, D / 2], r: 0.06, cast: false }));
  const top = rbox(W + M * 2 - 0.08, 0.1, D + M * 2 - 0.08, theme.slabTop, { pos: [W / 2, -0.06, D / 2], r: 0.05, cast: false });
  stat.add(top);
  stat.add(rbox(W + M * 2 - 0.3, 0.3, D + M * 2 - 0.3, theme.slabSide, { pos: [W / 2, -0.62, D / 2], r: 0.12, cast: false, scale: [1, 1, 1] }));
  // a soft glow under the diorama
  const under = new THREE.Mesh(planeGeo(W + 8, D + 8), new THREE.MeshBasicMaterial({ map: radialTex(), color: 0x6a4cff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  under.rotation.x = -Math.PI / 2;
  under.position.set(W / 2, -0.9, D / 2);
  dynamic.add(under);

  // ---------------------------------------------------------------- creaky boards
  const creakMat = toon(0x7a4a30);
  for (const [cx, cz] of level.creaky) {
    for (let i = 0; i < 3; i++) {
      const b = rbox(0.86, 0.025, 0.2, creakMat, { pos: [cx + 0.5 + (i - 1) * 0.02, 0.008 + (i === 1 ? 0.01 : 0), cz + 0.2 + i * 0.3], rot: [0, (i - 1) * 0.05, i === 1 ? 0.03 : 0], r: 0.01, cast: false });
      stat.add(b);
      for (const s of [-1, 1]) stat.add(ball(0.018, 0xd9c2a0, { pos: [cx + 0.5 + s * 0.36, 0.024 + (i === 1 ? 0.01 : 0), cz + 0.2 + i * 0.3], cast: false }));
    }
    // little "creak" squiggle marks
    const sq = new THREE.Mesh(planeGeo(0.9, 0.9), new THREE.MeshBasicMaterial({ map: creakTex(), transparent: true, depthWrite: false, opacity: 0.85 }));
    sq.rotation.x = -Math.PI / 2;
    sq.position.set(cx + 0.5, 0.03, cz + 0.5);
    dynamic.add(sq);
  }

  // ---------------------------------------------------------------- props
  const placeProp = (p: PropDef, parent: THREE.Object3D) => {
    const o = buildProp(p.type, p.opts ?? {});
    o.position.set(p.x, p.y ?? 0, p.z);
    o.rotation.y = -((p.rot ?? 0) * Math.PI) / 2;
    parent.add(o);
    const meta = PROPS[p.type];
    if (meta.solid && (p.y ?? 0) < 0.1) {
      const turned = (p.rot ?? 0) % 2 === 1;
      const bw = (turned ? meta.d : meta.w) * 1.25,
        bd = (turned ? meta.w : meta.d) * 1.25;
      const sh = new THREE.Mesh(planeGeo(bw + 0.3, bd + 0.3), blobMat());
      sh.rotation.x = -Math.PI / 2;
      sh.position.set(p.x, 0.008, p.z);
      sh.renderOrder = 1;
      dynamic.add(sh);
    }
    if (p.opts?.light) {
      const c = (p.opts.lightColor as number) ?? 0xffb35c;
      const L = new THREE.PointLight(c, (p.opts.lightPower as number) ?? 2.2, (p.opts.lightRange as number) ?? 3.2, 1.6);
      L.position.set(p.x, (p.y ?? 0) + ((p.opts.lightY as number) ?? 0.9), p.z);
      if (opts.lights !== false) {
        dynamic.add(L);
        lights.push(L);
      }
    }
    return o;
  };
  for (const p of level.props) placeProp(p, p.type === 'cookieJar' ? dynamic : stat);
  // kid's bed
  if (level.bed.x >= 0) placeProp({ type: 'bed', x: level.bed.x, z: level.bed.z, rot: level.bed.rot ?? 0, opts: { blanket: 0x6c8cff } }, stat);

  // ---------------------------------------------------------------- cookies & jar glow
  const cookies: THREE.Group[] = [];
  let jar: THREE.Object3D | undefined;
  dynamic.traverse((o) => {
    if (o.name === 'cookieJar') jar = o;
  });
  for (const [x, z, y] of level.cookies) {
    const c = new THREE.Group();
    c.position.set(x, y ?? 0, z);
    const ck = cookieMesh(0.21, [0, 0.34, 0], [0.45, 0, 0.1]);
    c.add(ck);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: 0xffc35c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
    halo.scale.setScalar(1.1);
    halo.position.y = 0.3;
    c.add(halo);
    const ring = new THREE.Mesh(planeGeo(1.2, 1.2), new THREE.MeshBasicMaterial({ map: radialTex(), color: 0xffb347, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    c.add(ring);
    const sp = new Sparkles(14, new THREE.Vector3(0.5, 0.2, 0.5), 0xffe08a, 0.09, 0.7);
    sp.points.position.y = 0.15;
    c.add(sp.points);
    updaters.push((t) => {
      ck.rotation.y = t * 1.6;
      ck.position.y = 0.36 + Math.sin(t * 2.4) * 0.06;
      halo.material.opacity = 0.7 + Math.sin(t * 3) * 0.15;
      sp.update(t);
    });
    dynamic.add(c);
    cookies.push(c);
  }
  if (jar) {
    const j = jar;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color: 0xffb84d, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
    halo.scale.setScalar(1.3);
    halo.position.y = 0.2;
    j.add(halo);
    const sp = new Sparkles(22, new THREE.Vector3(0.6, 0.3, 0.6), 0xffe08a, 0.09, 0.8);
    j.add(sp.points);
    const L = new THREE.PointLight(0xffb347, 2.4, 3.4, 1.5);
    L.position.set(0, 0.35, 0.3);
    if (opts.lights !== false) {
      j.add(L);
      lights.push(L);
    }
    updaters.push((t) => {
      halo.material.opacity = 0.75 + Math.sin(t * 2.6) * 0.15;
      L.intensity = 2.2 + Math.sin(t * 2.6) * 0.4;
      sp.update(t);
    });
  }

  // ---------------------------------------------------------------- outside
  if (opts.outside !== false) buildOutside(theme, W, D, M, stat, dynamic, updaters, lights, opts.lights !== false);

  // ---------------------------------------------------------------- bake
  for (const [mat, geos] of geoBuckets) {
    const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)), false);
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    stat.add(m);
  }
  bakeStatic(stat, dynamic);

  return {
    root,
    dynamic,
    walls,
    lights,
    cookies,
    jar,
    center: new THREE.Vector3(W / 2, 0, D / 2),
    size: new THREE.Vector2(W, D),
    update(t, dt) {
      for (const u of updaters) u(t, dt);
    },
  };
}

let _ao: THREE.Material | null = null;
function aoMat() {
  return (_ao ??= new THREE.MeshBasicMaterial({ map: aoStripTex(), transparent: true, depthWrite: false, toneMapped: false }));
}
let _blob: THREE.Material | null = null;
function blobMat() {
  return (_blob ??= new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.7, toneMapped: false }));
}
let _creak: THREE.Texture | null = null;
function creakTex() {
  if (_creak) return _creak;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(255,236,200,0.75)';
  g.lineWidth = 4;
  g.lineCap = 'round';
  for (const [x, y, s] of [[18, 22, 1], [108, 104, -1]] as [number, number, number][]) {
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(x, y, 8 + k * 7, s > 0 ? Math.PI * 0.9 : -Math.PI * 0.1, s > 0 ? Math.PI * 1.6 : Math.PI * 0.6);
      g.stroke();
    }
  }
  _creak = new THREE.CanvasTexture(c);
  _creak.colorSpace = THREE.SRGBColorSpace;
  return _creak;
}

/** Merge every static mesh under `stat` by material; non-mesh children move to `dynamic`. */
export function bakeStatic(stat: THREE.Group, dynamic: THREE.Group) {
  stat.updateMatrixWorld(true);
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
  const keep: THREE.Object3D[] = [];
  stat.traverse((o) => {
    if (o === stat) return;
    if ((o as THREE.Mesh).isMesh && !(o as THREE.Mesh).userData.dynamic) {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.Material;
      if (Array.isArray(m.material)) return;
      const key = mat.uuid + (m.castShadow ? 'c' : 'n');
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, cast: m.castShadow, geos: [] }));
      let g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      b.geos.push(g);
    } else if (!(o as THREE.Mesh).isMesh && o.type !== 'Group' && o.type !== 'Object3D') {
      keep.push(o);
    }
  });
  for (const o of keep) {
    const wp = new THREE.Vector3(),
      wq = new THREE.Quaternion(),
      ws = new THREE.Vector3();
    o.matrixWorld.decompose(wp, wq, ws);
    dynamic.add(o);
    o.position.copy(wp);
    o.quaternion.copy(wq);
    o.scale.copy(ws);
  }
  stat.clear();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = true;
    stat.add(m);
  }
}

function buildOutside(
  theme: HouseTheme,
  W: number,
  D: number,
  M: number,
  stat: THREE.Group,
  dynamic: THREE.Group,
  updaters: ((t: number, dt: number) => void)[],
  lights: THREE.Light[],
  withLights: boolean,
) {
  const put = (type: string, x: number, z: number, ry = 0, o: Record<string, unknown> = {}) => {
    const p = buildProp(type, o);
    p.position.set(x, -0.01, z);
    p.rotation.y = ry;
    (PROPS[type].dynamic ? dynamic : stat).add(p);
    return p;
  };
  const e = M * 0.55;
  if (theme.outside === 'lawn') {
    put('fence', W / 2, D + M - 0.25, 0, { len: W + M * 1.6 });
    put('bush', -e, D + 0.2, 0, { flowers: true });
    put('bush', W + e, -0.2, 0.5);
    put('bush', W + e, D * 0.55, 0.5, { flowers: true });
    put('bush', -e, D * 0.35, 0.5);
    put('pine', -e, -0.3, 0, { s: 1.1 });
    put('flowers', W * 0.3, D + 0.45, 0, { len: 2.4 });
    put('flowers', W * 0.75, D + 0.45, 0, { len: 2 });
    const lp = put('lamppost', W + e, D + 0.4);
    if (withLights) {
      const L = new THREE.PointLight(0xffc96b, 2.0, 3.5, 1.6);
      L.position.set(lp.position.x, 1.7, lp.position.z);
      dynamic.add(L);
      lights.push(L);
    }
    const ff = new Drift(16, new THREE.Box3(new THREE.Vector3(-M, 0.2, -M), new THREE.Vector3(W + M, 1.2, D + M)), 0xd8ff7a, 0.09, 'firefly');
    dynamic.add(ff.points);
    updaters.push((t) => ff.update(t));
  } else if (theme.outside === 'city') {
    for (let i = 0; i < Math.ceil((W + 2 * M) / 1.3); i++) put('cityBlock', -M + 0.6 + i * 1.3, -M - 0.6, 0, { h: 2.4 + ((i * 7) % 5) * 0.6, w: 1.2, color: [0x3a3570, 0x2e2a5e, 0x463f80][i % 3], seed: i + 3 });
    put('plant', W + e, D * 0.3);
    put('plant', -e, D * 0.7, 0, { pot: 0x7a8cff });
    // balcony rail
    stat.add(rbox(W + M * 2 - 0.2, 0.05, 0.05, 0xd5dde4, { pos: [W / 2, 0.5, D + M - 0.15], r: 0.02 }));
    for (let x = -M + 0.2; x < W + M; x += 0.35) stat.add(cyl(0.015, 0.015, 0.5, 0xd5dde4, { pos: [x, 0.25, D + M - 0.15] }));
  } else if (theme.outside === 'garden') {
    put('bush', -e, D * 0.2, 0, { flowers: true, color: 0x3f8a4f });
    put('bush', W + e, D * 0.6, 0, { flowers: true, color: 0x3f8a4f });
    put('flowers', W / 2, D + 0.45, 0, { len: W });
    put('flowers', -e, D * 0.6, Math.PI / 2, { len: 2 });
    put('pine', W + e, -0.2, 0, { s: 0.9 });
    // stone path
    for (let i = 0; i < 3; i++) stat.add(cyl(0.18, 0.2, 0.04, 0xb8a99a, { pos: [W * 0.4 + (i % 2) * 0.15, 0.0, D + 0.25 + i * 0.32], seg: 10, cast: false }));
    const ff = new Drift(14, new THREE.Box3(new THREE.Vector3(-M, 0.2, -M), new THREE.Vector3(W + M, 1.2, D + M)), 0xd8ff7a, 0.09, 'firefly');
    dynamic.add(ff.points);
    updaters.push((t) => ff.update(t));
  } else if (theme.outside === 'snow') {
    put('pine', -e, -0.2, 0, { snow: true, s: 1.2 });
    put('pine', W + e, D * 0.4, 0, { snow: true, s: 1.0 });
    put('pine', -e, D * 0.75, 0, { snow: true, s: 0.8 });
    put('snowman', W + e * 0.9, D + 0.3, -0.4);
    for (let i = 0; i < 6; i++) stat.add(ball(0.25 + (i % 3) * 0.08, 0xffffff, { pos: [(i / 5) * W, -0.02, -M * 0.6 + (i % 2) * 0.2], scale: [1.4, 0.45, 1], cast: false }));
    const snow = new Drift(140, new THREE.Box3(new THREE.Vector3(-M - 1, 0, -M - 1), new THREE.Vector3(W + M + 1, 4.5, D + M + 1)), 0xffffff, 0.06, 'snow');
    dynamic.add(snow.points);
    updaters.push((t) => snow.update(t));
  } else if (theme.outside === 'estate') {
    put('hedge', W / 2, -M + 0.35, 0, { len: W + M });
    put('hedge', -M + 0.35, D / 2, Math.PI / 2, { len: D * 0.6 });
    put('fountain', W + e * 0.9, D + 0.1);
    put('lamppost', -e, D + 0.3);
    if (withLights) {
      const L = new THREE.PointLight(0xffc96b, 1.8, 3.5, 1.6);
      L.position.set(-e, 1.7, D + 0.3);
      dynamic.add(L);
      lights.push(L);
    }
  }
}

export { mesh, planksTex };
