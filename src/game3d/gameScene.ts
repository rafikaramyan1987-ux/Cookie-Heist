import * as THREE from 'three';
import type { Level } from '../game/types';
import { World, GameEvent, Guard } from '../game/world';
import { buildHouse, BuiltHouse, WALL_H } from '../render/house';
import { THEMES } from '../render/themes';
import { nightLights } from '../render/stage';
import { skyTex, radialTex, canvasTex } from '../render/textures';
import { makeCharacter, animateRig, optimizeRig, bubble, Rig, PyjamaSkin, CapId } from '../render/characters';
import { VisionCone } from '../render/vision';
import { NoiseRing, Particles, Sparkles } from '../render/fx';
import { hideMarker } from '../render/markers';
import { ball, cyl, rbox, mesh, torusGeo } from '../render/geom';
import { toon } from '../render/toon';
import { cookieMesh } from '../render/props';
import { GameCamera } from './camera';

export type TrailId = 'none' | 'crumbs' | 'stars' | 'hearts' | 'bubbles';

export interface SceneOpts {
  skin: PyjamaSkin;
  cap: CapId;
  trail: TrailId;
  low?: boolean;
}

interface GuardView {
  g: Guard;
  rig: Rig;
  cone: VisionCone;
  q: THREE.Sprite;
  ex: THREE.Sprite;
  z: THREE.Sprite;
  ph: THREE.Sprite;
  pop: number;
  last: string;
}

const NOISE_COLORS: Record<string, number> = {
  creak: 0xffc27a,
  squeak: 0xff9fd0,
  step: 0xdfe6ff,
  toy: 0xffe066,
  meow: 0xb6ff7a,
  beep: 0x5ef0ff,
  click: 0xffffff,
};

/** 3D presentation of a running World. */
export class GameScene {
  readonly scene = new THREE.Scene();
  readonly camera: GameCamera;
  house: BuiltHouse;
  kid: Rig;
  guards: GuardView[] = [];
  private tmp = new THREE.Vector3();
  private rings: NoiseRing[] = [];
  private ringAge: number[] = [];
  private particles: Particles;
  private trailT = 0;
  private items: { obj: THREE.Object3D; kind: 'key' | 'pillow' | 'toy'; i: number; base: number }[] = [];
  private doors: { obj: THREE.Group; x: number; z: number; open: number }[] = [];
  private darkMeshes: THREE.Mesh[] = [];
  private projectiles: THREE.Object3D[] = [];
  private peek: THREE.Sprite;
  private hideRing: THREE.Mesh;
  private cookieVis: (THREE.Object3D | null)[] = [];
  private prevPos = new THREE.Vector2();
  private vel = new THREE.Vector2();
  private cinematic: null | { kind: 'win' | 'caught'; t: number; g?: number; from: THREE.Vector3 } = null;
  private switchVis: THREE.Mesh[] = [];

  constructor(
    readonly level: Level,
    readonly world: World,
    readonly opts: SceneOpts,
  ) {
    const theme = THEMES[level.house];
    this.scene.background = skyTex(theme.skyTop, theme.skyBottom, true, level.house);
    this.house = buildHouse(level.def, theme, { lights: !opts.low });
    this.scene.add(this.house.root);
    nightLights(this.scene, { size: Math.max(level.w, level.d) + 3, center: this.house.center, moon: 1.05, fill: 0.72 });
    this.camera = new GameCamera(level.w, level.d);

    // cookies → visuals (floor cookies in order, jar for counter cookies)
    let k = 0;
    this.cookieVis = level.cookies.map((c) => (c.onSolid ? this.house.jar ?? null : this.house.cookies[k++] ?? null));

    // kid
    this.kid = makeCharacter('kid', opts.skin, opts.cap);
    optimizeRig(this.kid);
    this.scene.add(this.kid.root);
    this.peek = this.makePeek();
    this.scene.add(this.peek);
    this.hideRing = hideMarker(1.0);
    this.hideRing.visible = false;
    this.scene.add(this.hideRing);

    // guards
    world.guards.forEach((g) => {
      const rig = makeCharacter(g.kind);
      optimizeRig(rig);
      this.scene.add(rig.root);
      const adult = g.cfg.adult;
      const cone = new VisionCone(g.cfg.range, g.cfg.half, { volume: adult && g.kind !== 'teen', spot: adult && !opts.low, intensity: adult ? 1 : 0.85 });
      if (g.kind === 'cat') cone.base = new THREE.Color(0xc8ff7a);
      if (g.kind === 'vacuum') cone.base = new THREE.Color(0x5ef0ff);
      if (g.kind === 'teen') cone.base = new THREE.Color(0x9fdcff);
      if (g.kind === 'grandma') cone.base = new THREE.Color(0xffc46b);
      this.scene.add(cone.group);
      const q = bubble('?', '#ff8a2f');
      const ex = bubble('!', '#ff3d4f');
      const z = bubble('Zzz', '#cdd8ff');
      const ph = bubble('phone', '#9fdcff');
      for (const b of [q, ex, z, ph]) {
        b.visible = false;
        this.scene.add(b);
      }
      this.guards.push({ g, rig, cone, q, ex, z, ph, pop: 0, last: '' });
    });

    this.buildItems();
    this.buildDark();
    for (let i = 0; i < 2; i++) {
      const r = new NoiseRing(1);
      r.mesh.visible = false;
      this.scene.add(r.mesh);
      this.rings.push(r);
      this.ringAge.push(99);
    }
    this.particles = new Particles(360);
    this.scene.add(this.particles.mesh);
    this.syncKid(0, 0);
    // room boxes for the camera framing
    const boxes = level.roomLetters.map(() => ({ x0: 99, z0: 99, x1: -1, z1: -1 }));
    for (let z = 0; z < level.d; z++)
      for (let x = 0; x < level.w; x++) {
        const r = level.room[z * level.w + x];
        if (r < 0) continue;
        const b = boxes[r];
        b.x0 = Math.min(b.x0, x);
        b.z0 = Math.min(b.z0, z);
        b.x1 = Math.max(b.x1, x + 1);
        b.z1 = Math.max(b.z1, z + 1);
      }
    this.camera.roomBox = (x, z) => {
      const cx = Math.max(0, Math.min(level.w - 1, Math.floor(x))),
        cz = Math.max(0, Math.min(level.d - 1, Math.floor(z)));
      const r = level.room[cz * level.w + cx];
      const b = r >= 0 ? boxes[r] : { x0: x - 2, z0: z - 2, x1: x + 2, z1: z + 2 };
      return { x0: b.x0 - 1, z0: b.z0 - 1, x1: b.x1 + 1, z1: b.z1 + 1 };
    };
    this.camera.snapTo(world.player.x, world.player.z);
    this.prevPos.set(world.player.x, world.player.z);
  }

  resize(w: number, h: number) {
    this.camera.resize(w, h);
  }

  // ------------------------------------------------------------------ items
  private buildItems() {
    const L = this.level;
    const gold = toon(0xffd25e, { emissive: 0x8a5a00, emissiveIntensity: 0.4 });
    L.keys.forEach((k, i) => {
      const g = new THREE.Group();
      g.add(mesh(torusGeo(0.09, 0.03, 8, 18), gold, { pos: [0, 0.18, 0] }));
      g.add(rbox(0.04, 0.2, 0.04, gold, { pos: [0, 0.0, 0], r: 0.01 }));
      g.add(rbox(0.08, 0.035, 0.035, gold, { pos: [0.04, -0.06, 0], r: 0.01 }));
      g.add(rbox(0.06, 0.035, 0.035, gold, { pos: [0.03, 0.0, 0], r: 0.01 }));
      g.add(this.glow(0xffd25e, 0.9));
      g.position.set(k.x, 0.45, k.z);
      this.scene.add(g);
      this.items.push({ obj: g, kind: 'key', i, base: 0.45 });
    });
    L.pillows.forEach((p, i) => {
      const g = new THREE.Group();
      g.add(rbox(0.5, 0.14, 0.34, 0xffffff, { r: 0.07 }));
      g.add(ball(0.06, 0xffd1dc, { pos: [0, 0.07, 0], scale: [1, 0.3, 1] }));
      g.add(this.glow(0xbfd0ff, 1.0));
      g.position.set(p.x, 0.32, p.z);
      this.scene.add(g);
      this.items.push({ obj: g, kind: 'pillow', i, base: 0.32 });
    });
    L.toyPickups.forEach((p, i) => {
      const g = this.duck(1.4);
      g.add(this.glow(0x8fe8ff, 0.8));
      g.position.set(p.x, 0.3, p.z);
      this.scene.add(g);
      this.items.push({ obj: g, kind: 'toy', i, base: 0.3 });
    });
    // squeaky floor toys
    for (let z = 0; z < L.d; z++)
      for (let x = 0; x < L.w; x++)
        if (L.floorToy[z * L.w + x]) {
          const d = this.duck(1);
          d.position.set(x + 0.5 + Math.sin(x * 3.1) * 0.12, 0.0, z + 0.5 + Math.cos(z * 2.3) * 0.12);
          d.rotation.y = x * 1.7 + z;
          this.scene.add(d);
          const ring = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: radialTex(), color: 0xff9fd0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(x + 0.5, 0.02, z + 0.5);
          this.scene.add(ring);
        }
    // light switches: plate on the nearest wall + floor marker
    for (const sw of L.switches) {
      const g = new THREE.Group();
      g.add(rbox(0.16, 0.24, 0.04, 0xfff4dc, { r: 0.02 }));
      g.add(rbox(0.05, 0.09, 0.03, 0xffb347, { pos: [0, 0.02, 0.02], r: 0.01 }));
      const cx = Math.floor(sw.x),
        cz = Math.floor(sw.z);
      const E = this.world.E;
      const wall = (v: number) => v === 1 || v === 4;
      let placed = false;
      const cand: [boolean, number, number, number][] = [
        [wall(E.eh[cz * L.w + cx]), sw.x, cz + 0.09, 0],
        [wall(E.ev[cz * (L.w + 1) + cx]), cx + 0.09, sw.z, Math.PI / 2],
        [wall(E.ev[cz * (L.w + 1) + cx + 1]), cx + 0.91, sw.z, -Math.PI / 2],
        [wall(E.eh[(cz + 1) * L.w + cx]), sw.x, cz + 0.91, Math.PI],
      ];
      for (const [ok, x, z, ry] of cand)
        if (ok && !placed) {
          g.position.set(x, 0.7, z);
          g.rotation.y = ry;
          placed = true;
        }
      if (!placed) g.position.set(sw.x, 0.7, sw.z);
      this.scene.add(g);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: this.switchTex(), transparent: true, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(sw.x, 0.025, sw.z);
      this.scene.add(m);
      this.switchVis.push(m);
    }
    // locked doors
    const addDoor = (x: number, z: number, vertical: boolean) => {
      const g = new THREE.Group();
      const pivot = new THREE.Group();
      g.add(pivot);
      const panel = new THREE.Group();
      panel.add(rbox(0.86, WALL_H - 0.05, 0.08, 0xb5703f, { pos: [0.45, (WALL_H - 0.05) / 2, 0], r: 0.03 }));
      panel.add(rbox(0.6, 0.35, 0.02, 0xd08a52, { pos: [0.45, 0.65, 0.045], r: 0.02 }));
      panel.add(rbox(0.6, 0.25, 0.02, 0xd08a52, { pos: [0.45, 0.25, 0.045], r: 0.02 }));
      panel.add(ball(0.05, gold, { pos: [0.8, 0.5, 0.06] }));
      panel.add(rbox(0.05, 0.1, 0.02, 0x2a1a33, { pos: [0.8, 0.4, 0.06], r: 0.01 }));
      const lock = new THREE.Group();
      lock.add(rbox(0.16, 0.14, 0.06, gold, { pos: [0.45, 0.5, 0.08], r: 0.03 }));
      lock.add(mesh(torusGeo(0.05, 0.015, 6, 12, Math.PI), gold, { pos: [0.45, 0.57, 0.08] }));
      lock.name = 'lock';
      panel.add(lock);
      pivot.add(panel);
      if (vertical) {
        g.position.set(x, 0, z - 0.45);
        g.rotation.y = -Math.PI / 2;
      } else g.position.set(x - 0.45, 0, z);
      pivot.position.x = -0.0;
      this.scene.add(g);
      this.doors.push({ obj: pivot, x: vertical ? x : x, z, open: 0 });
      (pivot.userData as { cx: number; cz: number }).cx = vertical ? x : x;
      (pivot.userData as { cx: number; cz: number }).cz = vertical ? z : z;
    };
    for (let z = 0; z <= L.d; z++) for (let x = 0; x < L.w; x++) if (L.eh[z * L.w + x] === 3) addDoor(x + 0.5, z, false);
    for (let z = 0; z < L.d; z++) for (let x = 0; x <= L.w; x++) if (L.ev[z * (L.w + 1) + x] === 3) addDoor(x, z + 0.5, true);
  }

  private duck(s: number) {
    const g = new THREE.Group();
    g.add(ball(0.09 * s, 0xffd43b, { pos: [0, 0.08 * s, 0], scale: [1.2, 0.9, 1] }));
    g.add(ball(0.06 * s, 0xffd43b, { pos: [0.07 * s, 0.17 * s, 0] }));
    g.add(ball(0.03 * s, 0xff8a3d, { pos: [0.13 * s, 0.16 * s, 0], scale: [1.4, 0.6, 1] }));
    g.add(ball(0.012 * s, 0x2a1a33, { pos: [0.1 * s, 0.19 * s, 0.035 * s], cast: false }));
    g.add(ball(0.012 * s, 0x2a1a33, { pos: [0.1 * s, 0.19 * s, -0.035 * s], cast: false }));
    return g;
  }

  private glow(color: number, size: number) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
    s.scale.setScalar(size);
    return s;
  }

  private switchTex() {
    return canvasTex(
      'switchmark',
      128,
      128,
      (g, w, h) => {
        g.translate(w / 2, h / 2);
        g.strokeStyle = 'rgba(255,214,120,0.9)';
        g.lineWidth = 6;
        g.setLineDash([10, 8]);
        g.beginPath();
        g.arc(0, 0, 54, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = 'rgba(255,214,120,0.95)';
        g.beginPath();
        g.arc(0, -8, 16, Math.PI * 0.8, Math.PI * 2.2);
        g.fill();
        g.fillRect(-9, 4, 18, 12);
      },
      false,
    );
  }

  private makePeek(): THREE.Sprite {
    const tex = canvasTex(
      'peek',
      128,
      64,
      (g) => {
        for (const x of [42, 86]) {
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.ellipse(x, 34, 17, 20, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#2a1a33';
          g.beginPath();
          g.arc(x + 4, 38, 9, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(x + 7, 34, 3, 0, Math.PI * 2);
          g.fill();
        }
      },
      false,
    );
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(0.5, 0.25, 1);
    s.renderOrder = 15;
    s.visible = false;
    return s;
  }

  private buildDark() {
    const L = this.level;
    L.roomLetters.forEach((_, r) => {
      const geos: THREE.BufferGeometry[] = [];
      for (let z = 0; z < L.d; z++)
        for (let x = 0; x < L.w; x++)
          if (L.room[z * L.w + x] === r) {
            const g = new THREE.PlaneGeometry(1, 1);
            g.rotateX(-Math.PI / 2);
            g.translate(x + 0.5, 0.015, z + 0.5);
            geos.push(g);
          }
      if (!geos.length) {
        this.darkMeshes.push(new THREE.Mesh());
        return;
      }
      const merged = mergeAll(geos);
      const m = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: 0x050318, transparent: true, opacity: 0, depthWrite: false }));
      m.renderOrder = 1;
      this.scene.add(m);
      this.darkMeshes.push(m);
    });
  }

  // ------------------------------------------------------------------ per frame
  /** screen joystick vector (right, up) → world movement */
  screenToWorldMove(sx: number, sy: number) {
    const { right, up } = this.camera.groundAxes();
    return { mx: right.x * sx + up.x * sy, mz: right.z * sx + up.z * sy };
  }

  private syncKid(dt: number, t: number) {
    const p = this.world.player;
    const k = this.kid;
    k.root.position.set(p.x, 0, p.z);
    k.root.rotation.set(0, Math.atan2(Math.cos(p.dir), Math.sin(p.dir)), 0);
    k.mode = p.mode === 'run' ? 'run' : p.mode === 'tiptoe' ? 'tiptoe' : 'idle';
    k.speed = p.mode === 'run' ? 1 : 0.6;
    k.root.visible = !p.hidden;
    this.peek.visible = p.hidden;
    if (p.hidden) this.peek.position.set(Math.floor(p.x) + 0.5, 0.75 + Math.sin(t * 3) * 0.03, Math.floor(p.z) + 0.5);
    animateRig(k, dt, t);
  }

  update(dt: number, t: number, events: GameEvent[]) {
    const w = this.world;
    const L = this.level;
    const p = w.player;
    for (const e of events) this.onEvent(e);

    if (!this.cinematic) this.syncKid(dt, t);
    else animateRig(this.kid, dt, t);

    // velocity (for camera look-ahead and trail)
    if (dt > 0) {
      this.vel.set((p.x - this.prevPos.x) / dt, (p.z - this.prevPos.y) / dt);
      this.prevPos.set(p.x, p.z);
    }

    // hide marker: show nearby hiding spots
    let nearHide = -1,
      nd = 2.2;
    for (let z = Math.floor(p.z) - 2; z <= Math.floor(p.z) + 2; z++)
      for (let x = Math.floor(p.x) - 2; x <= Math.floor(p.x) + 2; x++) {
        if (x < 0 || z < 0 || x >= L.w || z >= L.d || !L.hide[z * L.w + x]) continue;
        const d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
        if (d < nd) {
          nd = d;
          nearHide = z * L.w + x;
        }
      }
    this.hideRing.visible = nearHide >= 0 && !p.hidden;
    if (nearHide >= 0) {
      this.hideRing.position.set((nearHide % L.w) + 0.5, 0.03, Math.floor(nearHide / L.w) + 0.5);
      this.hideRing.rotation.z = t * 0.6;
      const s = 1 + Math.sin(t * 4) * 0.05;
      this.hideRing.scale.set(s, s, s);
    }

    // guards
    for (const v of this.guards) this.syncGuard(v, dt, t);

    // items
    for (const it of this.items) {
      const taken = it.kind === 'key' ? w.keysTaken[it.i] : it.kind === 'pillow' ? w.pillowsTaken[it.i] : w.toyPickupsTaken[it.i];
      if (taken) {
        it.obj.scale.multiplyScalar(Math.max(0, 1 - dt * 8));
        it.obj.position.y += dt * 2;
        if (it.obj.scale.x < 0.02) it.obj.visible = false;
      } else {
        it.obj.position.y = it.base + Math.sin(t * 2.5 + it.i) * 0.05;
        it.obj.rotation.y = t * 1.5;
      }
    }
    for (const d of this.doors) {
      const ud = d.obj.userData as { cx: number; cz: number };
      const open = this.world.E.eh.length && this.isUnlocked(ud.cx, ud.cz);
      d.open += ((open ? 1 : 0) - d.open) * Math.min(1, dt * 4);
      d.obj.rotation.y = -d.open * 1.6;
      const lock = d.obj.getObjectByName('lock');
      if (lock) lock.visible = d.open < 0.1;
    }
    // dark rooms
    this.darkMeshes.forEach((m, r) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      if (!mat || !('opacity' in mat)) return;
      const want = w.roomDark[r] ? 0.5 : 0;
      mat.opacity += (want - mat.opacity) * Math.min(1, dt * 5);
      m.visible = mat.opacity > 0.01;
    });
    this.switchVis.forEach((m, i) => {
      (m.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 3 + i) * 0.25;
    });

    // cookies taken
    L.cookies.forEach((_, i) => {
      const vis = this.cookieVis[i];
      if (!vis || !w.cookies[i]) return;
      if (vis === this.house.jar) {
        vis.traverse((o) => {
          if ((o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints) o.visible = false;
          if ((o as THREE.PointLight).isPointLight) (o as THREE.PointLight).intensity = 0;
        });
      } else {
        vis.scale.multiplyScalar(Math.max(0, 1 - dt * 10));
        vis.position.y += dt * 3;
        if (vis.scale.x < 0.02) vis.visible = false;
      }
    });

    // thrown toys
    while (this.projectiles.length < w.projectiles.length) {
      const d = this.duck(1.3);
      this.scene.add(d);
      this.projectiles.push(d);
    }
    this.projectiles.forEach((o, i) => {
      const pr = w.projectiles[i];
      o.visible = !!pr;
      if (!pr) return;
      const a = pr.t / pr.dur;
      o.position.set(pr.x0 + (pr.x1 - pr.x0) * a, 0.3 + Math.sin(a * Math.PI) * 1.6, pr.z0 + (pr.z1 - pr.z0) * a);
      o.rotation.set(a * 9, a * 5, 0);
    });

    // trail
    if (this.opts.trail !== 'none' && p.mode !== 'idle' && !p.hidden && !this.cinematic) {
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = p.mode === 'run' ? 0.05 : 0.09;
        const col = { crumbs: 0xc98b4a, stars: 0xffe066, hearts: 0xff7aa8, bubbles: 0x9fe8ff }[this.opts.trail];
        this.particles.emit(p.x, 0.15, p.z, { color: col, size: this.opts.trail === 'bubbles' ? 0.09 : 0.06, life: 0.9, spread: 0.4, up: 0.8, gravity: this.opts.trail === 'bubbles' ? -0.6 : 4, spin: 4 });
      }
    }

    // noise rings
    this.rings.forEach((r, i) => {
      this.ringAge[i] += dt;
      const a = this.ringAge[i];
      r.mesh.visible = a < 0.9;
      if (r.mesh.visible) {
        r.update(a / 0.9);
        r.mesh.position.set(p.x, 0.04, p.z);
      }
    });

    this.particles.update(dt);
    this.house.update(t, dt);
    this.updateCinematic(dt, t);
    this.camera.update(dt, p.x, p.z, this.vel.x, this.vel.y);
  }

  private isUnlocked(x: number, z: number) {
    const L = this.level,
      E = this.world.E;
    if (Number.isInteger(z) && !Number.isInteger(x)) return E.eh[z * L.w + Math.floor(x)] === 2;
    return E.ev[Math.floor(z) * (L.w + 1) + x] === 2;
  }

  private rayFn(g: Guard) {
    const w = this.world,
      L = this.level;
    return (a: number, r: number) => {
      const d = w.coneRay(g, a, r);
      // shorter reach inside dark rooms (same rule as the game logic)
      const ca = Math.cos(a),
        sa = Math.sin(a);
      for (let s = 0.3; s < d; s += 0.25) {
        const x = Math.floor(g.x + ca * s),
          z = Math.floor(g.z + sa * s);
        const room = x >= 0 && z >= 0 && x < L.w && z < L.d ? L.room[z * L.w + x] : -1;
        if (room >= 0 && w.roomDark[room] && s > r * 0.6) return s;
      }
      return d;
    };
  }

  private syncGuard(v: GuardView, dt: number, t: number) {
    const g = v.g;
    const w = this.world;
    const rig = v.rig;
    const lying = g.state === 'sleep';
    const onSolid = !!this.level.solid[Math.floor(g.z) * this.level.w + Math.floor(g.x)];
    if (!(this.cinematic?.kind === 'caught' && this.cinematic.g === this.guards.indexOf(v))) {
      rig.root.position.set(g.x, lying ? (onSolid ? 0.55 : 0.12) : 0, g.z);
      if (lying) rig.root.rotation.set(-Math.PI / 2, 0, Math.atan2(Math.cos(g.dir), Math.sin(g.dir)) * 0 + 0.4, 'YXZ');
      else rig.root.rotation.set(0, Math.atan2(Math.cos(g.dir), Math.sin(g.dir)), 0);
    }
    const vis = w.visionOf(g);
    const phone = w.phoneLevel(g);
    rig.mode = lying ? 'sleep' : g.moving > 0.2 ? 'walk' : phone > 0 ? 'phone' : g.kind === 'dad' && !vis.on ? 'yawn' : g.state === 'look' ? 'look' : 'idle';
    rig.speed = 0.55;
    animateRig(rig, dt, t);
    // vision cone
    const cone = v.cone;
    cone.setVisible(vis.on && g.delay <= 0 && w.status === 'play');
    cone.range = vis.range;
    cone.halfAngle = vis.half;
    cone.setDim(phone);
    cone.setAlert(g.state === 'spot' ? 'chase' : g.state === 'suspicious' || g.state === 'look' || g.alert > 0.3 ? 'suspicious' : 'calm');
    rig.root.updateMatrixWorld(true);
    if (rig.lightTip && g.cfg.adult) rig.lightTip.getWorldPosition(this.tmp);
    else this.tmp.set(g.x, 0.3, g.z);
    cone.update(g.x, g.z, g.dir, this.tmp, this.rayFn(g), dt, t);
    // bubbles
    const kind = lying ? 'z' : g.state === 'spot' ? '!' : g.state === 'suspicious' || g.state === 'look' ? '?' : phone > 0.5 ? 'phone' : '';
    if (kind !== v.last) {
      v.last = kind;
      v.pop = 0;
    }
    v.pop = Math.min(1, v.pop + dt * 5);
    const s = kind ? 0.42 * (v.pop < 1 ? 1 + Math.sin(v.pop * Math.PI) * 0.5 : 1) : 0;
    const top = lying ? 1.2 : rig.height + 0.45;
    for (const [b, k] of [
      [v.q, '?'],
      [v.ex, '!'],
      [v.z, 'z'],
      [v.ph, 'phone'],
    ] as [THREE.Sprite, string][]) {
      b.visible = kind === k && w.status === 'play';
      if (b.visible) {
        b.position.set(g.x, top + Math.sin(t * 4) * 0.04, g.z);
        b.scale.setScalar(k === 'z' ? 0.42 : s);
        if (k === 'z') (b.material as THREE.SpriteMaterial).opacity = 0.6 + Math.sin(t * 2) * 0.3;
      }
    }
  }

  // ------------------------------------------------------------------ events & juice
  private onEvent(e: GameEvent) {
    const p = this.world.player;
    if (e.type === 'noise') {
      // subtle ripples around the kid only: max 2 alive, none while tiptoeing, rate-limited
      if (!e.player || e.kind === 'toy' || p.mode === 'tiptoe') return;
      if (Math.min(...this.ringAge) < 0.55) return;
      let i = this.ringAge.indexOf(Math.max(...this.ringAge));
      if (i < 0) i = 0;
      const r = this.rings[i];
      r.mesh.position.set(p.x, 0.04, p.z);
      r.mesh.scale.setScalar(e.r);
      (r.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.set(NOISE_COLORS[e.kind] ?? 0xffffff);
      this.ringAge[i] = 0;
    } else if (e.type === 'cookie') {
      for (let k = 0; k < 18; k++) this.particles.emit(e.x, 0.45, e.z, { color: k % 3 ? 0xc98b4a : 0x5a2e1a, size: 0.05 + Math.random() * 0.04, life: 0.9, spread: 2.4, up: 3, gravity: 9 });
      for (let k = 0; k < 10; k++) this.particles.emit(e.x, 0.5, e.z, { color: 0xffe066, size: 0.05, life: 0.7, spread: 1.6, up: 2.5, gravity: 2 });
    } else if (e.type === 'pillow') {
      // a pillow "kid" appears under the blanket, nightcap and all
      const b = this.level.bed;
      const decoy = new THREE.Group();
      decoy.add(rbox(0.5, 0.2, 0.9, 0xfff1da, { pos: [0, 0.58, 0.1], r: 0.1 }));
      decoy.add(ball(0.16, 0xfff1da, { pos: [0, 0.62, -0.5] }));
      decoy.add(mesh(new THREE.ConeGeometry(0.15, 0.32, 14), toon(this.opts.skin.cap), { pos: [0.02, 0.78, -0.6], rot: [-0.9, 0, 0] }));
      decoy.position.set((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2);
      if (b.x1 - b.x0 > b.z1 - b.z0) decoy.rotation.y = Math.PI / 2;
      this.scene.add(decoy);
      for (let k = 0; k < 14; k++) this.particles.emit(e.x, 0.5, e.z, { color: 0xdfe6ff, size: 0.05, life: 0.8, spread: 1.8, up: 2.6, gravity: 3 });
    } else if (e.type === 'key' || e.type === 'toyPickup' || e.type === 'unlock') {
      for (let k = 0; k < 14; k++) this.particles.emit(e.x, 0.5, e.z, { color: 0xffe066, size: 0.05, life: 0.8, spread: 1.8, up: 2.6, gravity: 3 });
    } else if (e.type === 'caught') {
      this.camera.shake(0.3, 0.5);
      const gv = this.guards[e.g];
      this.cinematic = { kind: 'caught', t: 0, g: e.g, from: new THREE.Vector3(gv.g.x, 0, gv.g.z) };
      this.camera.setFocus(new THREE.Vector3(gv.g.x, 0.6, gv.g.z), this.camera.portrait ? 6.5 : 8);
    } else if (e.type === 'win') {
      const b = this.level.bed;
      this.cinematic = { kind: 'win', t: 0, from: new THREE.Vector3(p.x, 0, p.z) };
      this.camera.setFocus(new THREE.Vector3((b.x0 + b.x1) / 2, 0.4, (b.z0 + b.z1) / 2), this.camera.portrait ? 6 : 7.5);
    } else if (e.type === 'spotted') {
      this.camera.shake(0.08, 0.25);
    }
  }

  private updateCinematic(dt: number, t: number) {
    const c = this.cinematic;
    if (!c) return;
    c.t += dt;
    const kid = this.kid;
    if (c.kind === 'win') {
      const b = this.level.bed;
      const bx = (b.x0 + b.x1) / 2,
        bz = (b.z0 + b.z1) / 2;
      const a = Math.min(1, c.t / 0.6);
      kid.root.visible = true;
      this.peek.visible = false;
      const hop = Math.sin(a * Math.PI) * 0.8;
      kid.root.position.set(c.from.x + (bx - c.from.x) * a, 0.5 * a + hop, c.from.z + (bz - c.from.z) * a);
      if (c.t > 0.6) {
        // happy bounces on the bed
        kid.mode = 'cheer';
        kid.root.position.y = 0.55 + Math.abs(Math.sin((c.t - 0.6) * 6)) * 0.45;
        kid.root.rotation.set(0, Math.sin(c.t * 2) * 0.4, 0);
        if (c.t < 2.4 && Math.random() < dt * 40) {
          const cols = [0xff7aa8, 0xffd25e, 0x6ff0c8, 0x7aa8ff, 0xffffff, 0xff8a3d];
          this.particles.emit(bx + (Math.random() - 0.5) * 0.8, 1.2, bz + (Math.random() - 0.5) * 0.8, { color: cols[(Math.random() * cols.length) | 0], size: 0.07, life: 2.2, spread: 3.5, up: 4.5, gravity: 4, spin: 14 });
        }
      }
    } else if (c.kind === 'caught' && c.g !== undefined) {
      const gv = this.guards[c.g];
      void gv.g;
      // the kid is scooped up and carried back towards bed
      gv.cone.setVisible(false);
      kid.root.visible = true;
      this.peek.visible = false;
      kid.mode = 'surprised';
      const b = this.level.bed;
      const bx = (b.x0 + b.x1) / 2,
        bz = (b.z0 + b.z1) / 2;
      const lift = Math.min(1, c.t / 0.5);
      const walk = Math.max(0, c.t - 0.9);
      const dx = bx - c.from.x,
        dz = bz - c.from.z;
      const dd = Math.hypot(dx, dz) || 1;
      const gx = c.from.x + (dx / dd) * Math.min(dd, walk * 1.2),
        gz = c.from.z + (dz / dd) * Math.min(dd, walk * 1.2);
      const face = Math.atan2(Math.cos(Math.atan2(dz, dx)), Math.sin(Math.atan2(dz, dx)));
      gv.rig.root.position.set(gx, 0, gz);
      gv.rig.root.rotation.set(0, walk > 0 ? face : gv.rig.root.rotation.y, 0);
      gv.rig.mode = walk > 0 ? 'walk' : 'surprised';
      kid.root.position.set(gx + Math.sin(face) * 0.35, lift * (gv.rig.height * 0.62), gz + Math.cos(face) * 0.35);
      kid.root.rotation.set(0, face + Math.PI / 2, lift * 1.2);
      this.camera.setFocus(new THREE.Vector3(gx, 0.6, gz), this.camera.portrait ? 6.5 : 8);
    }
    void t;
  }
}

function mergeAll(geos: THREE.BufferGeometry[]) {
  // tiny local merge (planes only)
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const idx: number[] = [];
  let o = 0;
  for (const g of geos) {
    const p = g.attributes.position.array as Float32Array;
    const base = o / 3;
    pos.set(p, o);
    const gi = g.index!.array;
    for (let i = 0; i < gi.length; i++) idx.push(gi[i] + base);
    o += p.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}

export { cyl, cookieMesh, Sparkles };
