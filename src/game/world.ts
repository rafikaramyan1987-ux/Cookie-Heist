import type { GuardKind } from '../levels/types';
import type { Level, Vec2, GuardSpec } from './types';
import { angleDiff, collide, findPath, los, rayDist, walkable, Edges, Passable } from './grid';
import { makeRng, Rng } from './rng';

/**
 * Deterministic game simulation (no rendering). Used by the game, the
 * playtest bot and the unit tests.
 */

export const PLAYER_R = 0.24;
export const TIPTOE_SPEED = 1.7;
export const RUN_SPEED = 3.4;
export const RUN_THRESHOLD = 0.8;
export const TOY_RANGE = 5.5;
/** a guard idling this close to a hidden kid (with line of sight to the spot) is "camping" */
export const CAMP_R = 3.5;
/** a camping guard moves on after this long (s) */
export const CAMP_MAX = 2.5;
/** reaction time between "!" and "Au lit !" (s) */
export const SPOT_REACT = 0.4;
/** sightings outside this fraction of the half-angle (or in the dark) only make a guard suspicious */
export const EDGE_FRAC = 0.7;
/** alert cap for an edge / dim-light sighting: "Hein ?" but never "!" */
export const EDGE_ALERT = 0.85;
/** "Hein ?": a guard stops and stares this long before walking over to check (s) */
export const PUZZLED = 0.6;
/** alert gained per second in the beam: base + bonus × closeness (0 far edge … 1 at the guard) */
export const ALERT_RATE: [number, number] = [0.55, 1.7];

export interface GuardCfg {
  range: number;
  half: number;
  walk: number;
  hear: number;
  react: number;
  adult: boolean;
}

export const GUARD_CFG: Record<GuardKind, GuardCfg> = {
  mum: { range: 4.2, half: 0.52, walk: 1.2, hear: 1, react: 1, adult: true },
  dad: {
    range: 5.0,
    half: 0.42,
    walk: 0.95,
    hear: 0.85,
    react: 0.85,
    adult: true,
  },
  grandma: {
    range: 2.9,
    half: 0.95,
    walk: 0.75,
    hear: 0.55,
    react: 0.8,
    adult: true,
  },
  teen: {
    range: 3.6,
    half: 0.4,
    walk: 1.05,
    hear: 0.75,
    react: 1.1,
    adult: true,
  },
  cat: { range: 2.5, half: 0.85, walk: 0.6, hear: 0, react: 1.6, adult: false },
  vacuum: {
    range: 1.8,
    half: 0.55,
    walk: 0.8,
    hear: 0,
    react: 2,
    adult: false,
  },
};

export const NOISE = {
  creakTiptoe: 2.3,
  creakRun: 3.6,
  toyTiptoe: 2.4,
  toyRun: 3.4,
  step: 2.6,
  throwLand: 4.2,
  meow: 5,
  beep: 4.5,
  switch: 1.2,
};

/** 'spot' = full sighting ("!"): the kid freezes and is caught after SPOT_REACT */
export type GuardState = 'patrol' | 'wait' | 'suspicious' | 'look' | 'spot' | 'return' | 'sleep';

export interface Guard {
  spec: GuardSpec;
  kind: GuardKind;
  cfg: GuardCfg;
  x: number;
  z: number;
  dir: number;
  state: GuardState;
  alert: number;
  pathIdx: number;
  pathStep: number;
  timer: number;
  target: Vec2;
  route: Vec2[];
  routeT: number;
  campT: number;
  sees: boolean;
  range: number;
  half: number;
  coneOn: boolean;
  cooldown: number;
  phase: number;
  lookBase: number;
  moving: number; // 0..1 for animation
  delay: number;
}

export interface Player {
  x: number;
  z: number;
  dir: number;
  speed: number;
  mode: 'idle' | 'tiptoe' | 'run';
  hidden: boolean;
  stillT: number;
  stepT: number;
  cell: number;
}

export interface Input {
  /** desired move vector in world space, magnitude 0..1 (≤ RUN_THRESHOLD = tiptoe) */
  mx: number;
  mz: number;
  /** force run (keyboard shift) */
  run?: boolean;
  throwAt?: Vec2 | null;
}

export type GameEvent =
  | {
      type: 'noise';
      x: number;
      z: number;
      r: number;
      kind: string;
      player: boolean;
    }
  | { type: 'cookie'; i: number; x: number; z: number }
  | { type: 'key' | 'pillow' | 'toyPickup'; x: number; z: number }
  | { type: 'unlock'; x: number; z: number }
  | { type: 'switch'; room: number; dark: boolean }
  | {
      type: 'suspicious' | 'spotted' | 'heard' | 'wake' | 'meow' | 'beep';
      g: number;
    }
  | { type: 'hide' | 'unhide' }
  | { type: 'throw'; x: number; z: number; tx: number; tz: number; t: number }
  | { type: 'caught'; g: number }
  | { type: 'bedcheck' }
  | { type: 'win' }
  | { type: 'needCookies' };

export interface Projectile {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  t: number;
  dur: number;
}

export interface Stats {
  time: number;
  spotted: number;
  noises: number;
  hides: number;
  toysThrown: number;
}

export class World {
  readonly L: Level;
  readonly E: Edges;
  t = 0;
  player: Player;
  guards: Guard[];
  status: 'play' | 'caught' | 'won' | 'bedcheck' = 'play';
  caughtBy = -1;
  cookies: boolean[];
  keys = 0;
  keysTaken: boolean[];
  pillowsTaken: boolean[];
  toyPickupsTaken: boolean[];
  decoy = false;
  /** guards cannot perceive the kid (predictions and audits) */
  ghost = false;
  toys: number;
  roomDark: boolean[];
  projectiles: Projectile[] = [];
  events: GameEvent[] = [];
  stats: Stats = { time: 0, spotted: 0, noises: 0, hides: 0, toysThrown: 0 };
  private rng: Rng;
  private passG: Passable;
  private needT = 0;
  private throwCd = 0;

  constructor(level: Level, opts: { seed?: number; jitter?: number; extraToys?: number } = {}) {
    this.L = level;
    this.E = { eh: level.eh.slice(), ev: level.ev.slice() };
    this.rng = makeRng(opts.seed ?? 1);
    const s = level.start;
    this.player = {
      x: s.x,
      z: s.z,
      dir: Math.PI / 2,
      speed: 0,
      mode: 'idle',
      hidden: false,
      stillT: 0,
      stepT: 0,
      cell: -1,
    };
    this.player.cell = this.cellIndex(this.player);
    this.cookies = level.cookies.map(() => false);
    this.keysTaken = level.keys.map(() => false);
    this.pillowsTaken = level.pillows.map(() => false);
    this.toyPickupsTaken = level.toyPickups.map(() => false);
    this.toys = level.toys + (opts.extraToys ?? 0);
    this.roomDark = level.roomDark.slice();
    this.passG = walkable(level, true);
    const jit = opts.jitter ?? 0;
    this.guards = level.guards.map((spec) => {
      const cfg = GUARD_CFG[spec.kind];
      const p0 = spec.path[0];
      const g: Guard = {
        spec,
        kind: spec.kind,
        cfg,
        x: p0.x,
        z: p0.z,
        dir: spec.face,
        state: spec.sleep ? 'sleep' : spec.path.length > 1 ? 'patrol' : 'wait',
        alert: 0,
        pathIdx: spec.path.length > 1 ? 1 : 0,
        pathStep: 1,
        timer: spec.delay + (jit ? (this.rng() - 0.5) * 2 * jit : 0),
        target: { ...p0 },
        route: [],
        routeT: 0,
        campT: 0,
        sees: false,
        range: cfg.range,
        half: cfg.half,
        coneOn: !spec.sleep,
        cooldown: 0,
        phase: this.rng() * 10,
        lookBase: spec.face,
        moving: 0,
        // playtest jitter only ever delays a guard (a designed safe start stays safe)
        delay: spec.delay + (jit ? this.rng() * jit : 0),
      };
      return g;
    });
  }

  cellIndex(p: Vec2) {
    return Math.floor(p.z) * this.L.w + Math.floor(p.x);
  }

  get cookieCount() {
    return this.cookies.filter(Boolean).length;
  }

  /** a guard has spotted the kid: frozen until the catch */
  get spotted() {
    return this.guards.some((g) => g.state === 'spot');
  }

  /** all required (non-bonus) cookies collected */
  get requiredDone() {
    return this.cookies.every((got, i) => got || i === this.L.bonus);
  }

  // ------------------------------------------------------------------ main step
  step(dt: number, input: Input) {
    this.events.length = 0;
    if (this.status !== 'play') return;
    this.t += dt;
    this.stats.time = this.t;
    this.throwCd -= dt;
    this.needT -= dt;
    this.updatePlayer(dt, input);
    this.updateProjectiles(dt);
    for (let i = 0; i < this.guards.length; i++) this.updateGuard(i, dt);
    if (this.L.bedCheck > 0 && this.t >= this.L.bedCheck && !this.decoy && this.status === 'play' && !this.spotted) {
      this.status = 'bedcheck';
      this.events.push({ type: 'bedcheck' });
    }
  }

  // ------------------------------------------------------------------ player
  private updatePlayer(dt: number, input: Input) {
    const p = this.player;
    const L = this.L;
    let mag = Math.hypot(input.mx, input.mz);
    // spotted ("!"): the kid freezes like a deer in the headlights
    if (mag < 0.08 || this.spotted) mag = 0;
    const run = mag > 0 && (input.run || mag > RUN_THRESHOLD);
    const target = mag === 0 ? 0 : run ? RUN_SPEED : TIPTOE_SPEED;
    // snappy acceleration
    p.speed += (target - p.speed) * Math.min(1, dt * 14);
    p.mode = mag === 0 ? 'idle' : run ? 'run' : 'tiptoe';
    if (mag > 0) {
      const tdir = Math.atan2(input.mz, input.mx);
      p.dir += angleDiff(tdir, p.dir) * Math.min(1, dt * 16);
      const nx = input.mx / mag,
        nz = input.mz / mag;
      p.x += nx * p.speed * dt;
      p.z += nz * p.speed * dt;
    }
    collide(L, this.E, p, PLAYER_R, (i) => !!L.solid[i]);
    p.x = Math.max(0.25, Math.min(L.w - 0.25, p.x));
    p.z = Math.max(0.25, Math.min(L.d - 0.25, p.z));

    const ci = this.cellIndex(p);
    const entered = ci !== p.cell;
    p.cell = ci;

    // hiding
    if (L.hide[ci] && p.speed < 0.3) {
      p.stillT += dt;
      // you can't hide once you've been spotted: "Caché" only when really safe
      if (p.stillT > 0.2 && !p.hidden && !this.spotted) {
        p.hidden = true;
        this.stats.hides++;
        this.events.push({ type: 'hide' });
      }
    } else {
      p.stillT = 0;
      if (p.hidden) {
        p.hidden = false;
        this.events.push({ type: 'unhide' });
      }
    }

    // noise from the floor
    if (entered) {
      if (L.creaky[ci]) this.noise(p.x, p.z, run ? NOISE.creakRun : NOISE.creakTiptoe, 'creak', true);
      if (L.floorToy[ci]) this.noise(p.x, p.z, run ? NOISE.toyRun : NOISE.toyTiptoe, 'squeak', true);
      for (const sw of L.switches)
        if (Math.floor(sw.x) + Math.floor(sw.z) * L.w === ci && !this.roomDark[sw.room]) {
          this.roomDark[sw.room] = true;
          this.events.push({
            type: 'switch',
            room: sw.room,
            dark: this.roomDark[sw.room],
          });
          this.noise(p.x, p.z, NOISE.switch, 'click', true);
        }
    }
    if (run && p.speed > 2) {
      p.stepT -= dt;
      if (p.stepT <= 0) {
        p.stepT = 0.32;
        this.noise(p.x, p.z, NOISE.step, 'step', true);
      }
    } else p.stepT = 0;

    // pickups
    L.cookies.forEach((c, i) => {
      if (this.cookies[i]) return;
      const r = c.onSolid ? 1.2 : 0.6;
      if (Math.hypot(c.x - p.x, c.z - p.z) < r) {
        this.cookies[i] = true;
        this.events.push({ type: 'cookie', i, x: c.x, z: c.z });
      }
    });
    L.keys.forEach((k, i) => {
      if (!this.keysTaken[i] && Math.hypot(k.x - p.x, k.z - p.z) < 0.6) {
        this.keysTaken[i] = true;
        this.keys++;
        this.events.push({ type: 'key', x: k.x, z: k.z });
      }
    });
    L.pillows.forEach((k, i) => {
      if (!this.pillowsTaken[i] && Math.hypot(k.x - p.x, k.z - p.z) < 0.6) {
        this.pillowsTaken[i] = true;
        this.decoy = true;
        this.events.push({ type: 'pillow', x: k.x, z: k.z });
      }
    });
    L.toyPickups.forEach((k, i) => {
      if (!this.toyPickupsTaken[i] && Math.hypot(k.x - p.x, k.z - p.z) < 0.6) {
        this.toyPickupsTaken[i] = true;
        this.toys++;
        this.events.push({ type: 'toyPickup', x: k.x, z: k.z });
      }
    });
    // locked doors
    if (this.keys > 0) {
      const cx = Math.floor(p.x),
        cz = Math.floor(p.z);
      const tryEdge = (arr: Uint8Array, idx: number, ex: number, ez: number) => {
        if (arr[idx] === 3 && Math.hypot(ex - p.x, ez - p.z) < 0.75 && this.keys > 0) {
          arr[idx] = 2;
          this.keys--;
          this.events.push({ type: 'unlock', x: ex, z: ez });
        }
      };
      tryEdge(this.E.eh, cz * L.w + cx, cx + 0.5, cz);
      tryEdge(this.E.eh, (cz + 1) * L.w + cx, cx + 0.5, cz + 1);
      tryEdge(this.E.ev, cz * (L.w + 1) + cx, cx, cz + 0.5);
      tryEdge(this.E.ev, cz * (L.w + 1) + cx + 1, cx + 1, cz + 0.5);
    }
    // throwing
    if (input.throwAt && this.toys > 0 && this.throwCd <= 0) {
      let tx = input.throwAt.x - p.x,
        tz = input.throwAt.z - p.z;
      const d = Math.hypot(tx, tz);
      if (d > TOY_RANGE) {
        tx *= TOY_RANGE / d;
        tz *= TOY_RANGE / d;
      }
      const x1 = Math.max(0.3, Math.min(L.w - 0.3, p.x + tx)),
        z1 = Math.max(0.3, Math.min(L.d - 0.3, p.z + tz));
      const dur = 0.35 + Math.hypot(x1 - p.x, z1 - p.z) * 0.07;
      this.projectiles.push({ x0: p.x, z0: p.z, x1, z1, t: 0, dur });
      this.toys--;
      this.throwCd = 0.5;
      this.stats.toysThrown++;
      this.events.push({
        type: 'throw',
        x: p.x,
        z: p.z,
        tx: x1,
        tz: z1,
        t: dur,
      });
    }
    // bed
    const b = L.bed;
    const m = 0.55;
    if (p.x > b.x0 - m && p.x < b.x1 + m && p.z > b.z0 - m && p.z < b.z1 + m) {
      if (this.requiredDone) {
        this.status = 'won';
        this.events.push({ type: 'win' });
      } else if (this.needT <= 0 && this.t > 1.5) {
        this.needT = 3;
        this.events.push({ type: 'needCookies' });
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (const pr of this.projectiles) {
      pr.t += dt;
      if (pr.t >= pr.dur) this.noise(pr.x1, pr.z1, NOISE.throwLand, 'toy', true);
    }
    this.projectiles = this.projectiles.filter((p) => p.t < p.dur);
  }

  // ------------------------------------------------------------------ noise
  noise(x: number, z: number, r: number, kind: string, player: boolean, target?: Vec2) {
    this.events.push({ type: 'noise', x, z, r, kind, player });
    if (player) this.stats.noises++;
    const src = { x, z };
    this.guards.forEach((g, gi) => {
      if (!g.cfg.adult) return;
      const d = Math.hypot(g.x - x, g.z - z);
      const eff = r * g.cfg.hear * (los(this.L, this.E, g, src) ? 1 : 0.7);
      if (d > eff) return;
      if (g.state === 'spot') return;
      const tgt = target ?? src;
      if (g.state === 'sleep') {
        if (d > eff * 0.85) return;
        this.events.push({ type: 'wake', g: gi });
      } else this.events.push({ type: 'heard', g: gi });
      this.goSuspicious(g, gi, tgt, false);
      g.alert = Math.max(g.alert, 0.45);
    });
  }

  private goSuspicious(g: Guard, gi: number, target: Vec2, saw: boolean) {
    const was = g.state;
    g.state = 'suspicious';
    g.target = { x: target.x, z: target.z };
    g.route = this.route(g, g.target) ?? [];
    g.routeT = 0;
    // "Hein ?": stop and stare for a moment before walking over (only when it starts)
    if (was !== 'suspicious') g.timer = PUZZLED;
    g.coneOn = true;
    if (was !== 'suspicious' || saw) this.events.push({ type: 'suspicious', g: gi });
  }

  private route(g: Guard, to: Vec2): Vec2[] | null {
    const goal = Math.floor(to.z) * this.L.w + Math.floor(to.x);
    const pass: Passable = (i) => this.passG(i) || i === goal;
    return findPath(this.L, this.E, pass, g, to);
  }

  // ------------------------------------------------------------------ vision
  /** Effective vision of a guard right now (range shrinks in dark rooms / when distracted). */
  visionOf(g: Guard): { range: number; half: number; on: boolean } {
    let range = g.cfg.range * g.spec.sight,
      half = g.cfg.half,
      on = g.state !== 'sleep';
    if (g.kind === 'dad') {
      // yawns every ~8 s: beam drops for 1.4 s
      const c = (this.t + g.phase) % 8;
      if (c < 1.4 && g.state !== 'spot') on = false;
    }
    if (g.kind === 'teen' && g.state !== 'spot' && g.state !== 'suspicious') {
      // glued to the phone, looks up for 2 s every 6 s
      const c = (this.t + g.phase) % 6;
      if (c > 2) {
        range *= 0.55;
        half *= 0.8;
      }
    }
    return { range, half, on };
  }

  canSee(g: Guard, p: Vec2, ignoreHidden = false): { sees: boolean; d: number } {
    const v = this.visionOf(g);
    if (!v.on) return { sees: false, d: 99 };
    if (!ignoreHidden && p === this.player && (this.player.hidden || this.ghost)) return { sees: false, d: 99 };
    const dx = p.x - g.x,
      dz = p.z - g.z;
    const d = Math.hypot(dx, dz);
    const pr = this.L.room[Math.floor(p.z) * this.L.w + Math.floor(p.x)];
    const range = v.range * (pr >= 0 && this.roomDark[pr] ? 0.6 : 1);
    if (d > range + PLAYER_R) return { sees: false, d };
    if (d > 0.35 && Math.abs(angleDiff(Math.atan2(dz, dx), g.dir)) > v.half + Math.atan2(PLAYER_R, d)) return { sees: false, d };
    if (!los(this.L, this.E, g, p)) return { sees: false, d };
    return { sees: true, d };
  }

  /** Cone outline distance for rendering (matches the rules). */
  coneRay(g: Guard, a: number, range: number) {
    return rayDist(this.L, this.E, g.x, g.z, Math.cos(a), Math.sin(a), range);
  }

  /** Is this awake adult guard standing still close to the hidden kid, watching the hiding spot? */
  campingNear(g: Guard): boolean {
    const p = this.player;
    if (!p.hidden || !g.cfg.adult || g.state === 'sleep' || g.delay > 0 || g.moving > 0.1) return false;
    if (Math.hypot(g.x - p.x, g.z - p.z) > CAMP_R) return false;
    return los(this.L, this.E, g, p);
  }

  // ------------------------------------------------------------------ guards
  private moveAlong(g: Guard, dt: number, speed: number): boolean {
    // follow g.route; returns true when finished
    while (g.route.length) {
      const n = g.route[0];
      const dx = n.x - g.x,
        dz = n.z - g.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        g.route.shift();
        continue;
      }
      const stepLen = Math.min(d, speed * dt);
      g.x += (dx / d) * stepLen;
      g.z += (dz / d) * stepLen;
      const td = Math.atan2(dz, dx);
      g.dir += angleDiff(td, g.dir) * Math.min(1, dt * 4.5);
      g.moving = Math.min(1, g.moving + dt * 6);
      return false;
    }
    g.moving = Math.max(0, g.moving - dt * 6);
    return true;
  }

  private updateGuard(gi: number, dt: number) {
    const g = this.guards[gi];
    const p = this.player;
    g.cooldown -= dt;
    if (g.delay > 0) {
      g.delay -= dt;
      g.moving = 0;
      return;
    }
    const v = this.visionOf(g);
    g.range = v.range;
    g.half = v.half;
    g.coneOn = v.on;

    // ---- perception
    const { sees, d } = this.canSee(g, p);
    g.sees = sees;
    if (sees) {
      const close = 1 - d / Math.max(0.1, v.range);
      // a full sighting takes a clear look (≈ 0.6–1.5 s in the beam), not a split-second glimpse
      g.alert += dt * (ALERT_RATE[0] + ALERT_RATE[1] * close) * g.cfg.react;
      if (d < 1.25) g.alert = Math.max(g.alert, 1);
      // a glimpse at the edge of the beam or in a dark room is only a "Hein ?"
      else if (this.edgeSighting(g, v.half)) g.alert = Math.min(g.alert, EDGE_ALERT);
    } else if (g.state !== 'spot') g.alert = Math.max(0, g.alert - dt * 0.25);

    if (!g.cfg.adult) {
      // cat / vacuum: raise the alarm
      if (g.alert >= 0.6 && g.cooldown <= 0) {
        g.cooldown = 4;
        g.alert = 0;
        const kind = g.kind === 'cat' ? 'meow' : 'beep';
        this.events.push({ type: kind, g: gi });
        this.noise(g.x, g.z, g.kind === 'cat' ? NOISE.meow : NOISE.beep, kind, false, { x: p.x, z: p.z });
      }
      this.patrol(g, dt, g.cfg.walk * g.spec.speed);
      return;
    }

    if (g.state !== 'spot' && g.alert >= 1 && sees && this.status === 'play' && !this.spotted) {
      // full sighting: "!" → caught after a short reaction (no foot race)
      g.state = 'spot';
      g.timer = SPOT_REACT;
      g.route = [];
      g.target = { x: p.x, z: p.z };
      this.stats.spotted++;
      this.events.push({ type: 'spotted', g: gi });
    } else if (sees && g.alert >= 0.3 && g.state !== 'spot' && g.state !== 'sleep') {
      if (g.state !== 'suspicious' || Math.hypot(g.target.x - p.x, g.target.z - p.z) > 1) this.goSuspicious(g, gi, p, true);
    }

    switch (g.state) {
      case 'sleep':
        g.moving = 0;
        break;
      case 'patrol':
      case 'wait':
        this.patrol(g, dt, g.cfg.walk * g.spec.speed);
        break;
      case 'suspicious': {
        if (g.timer > 0) {
          g.timer -= dt;
          g.moving = Math.max(0, g.moving - dt * 6);
          break;
        }
        const done = this.moveAlong(g, dt, g.cfg.walk * g.spec.speed * 1.25);
        if (done || Math.hypot(g.target.x - g.x, g.target.z - g.z) < 0.4) {
          g.state = 'look';
          g.timer = 2.2;
          g.lookBase = g.dir;
        }
        break;
      }
      case 'look':
        g.moving = Math.max(0, g.moving - dt * 6);
        g.timer -= dt;
        g.dir = g.lookBase + Math.sin((2.2 - g.timer) * 2.4) * 0.9;
        if (g.timer <= 0) this.goHome(g);
        break;
      case 'return': {
        const done = this.moveAlong(g, dt, g.cfg.walk * g.spec.speed);
        if (done) {
          if (g.spec.sleep) {
            g.state = 'sleep';
            g.dir = g.spec.face;
            g.alert = 0;
          } else {
            g.state = g.spec.path.length > 1 ? 'patrol' : 'wait';
            g.timer = g.spec.wait;
            g.lookBase = g.spec.face;
          }
        }
        break;
      }
      case 'spot': {
        // turn to the kid, then "Au lit !"
        g.moving = Math.max(0, g.moving - dt * 6);
        g.dir += angleDiff(Math.atan2(p.z - g.z, p.x - g.x), g.dir) * Math.min(1, dt * 10);
        g.timer -= dt;
        if (g.timer <= 0 && this.status === 'play') {
          this.status = 'caught';
          this.caughtBy = gi;
          this.events.push({ type: 'caught', g: gi });
        }
        break;
      }
    }

    // ---- no camping: a guard never idles for long right next to a hidden kid
    if (this.campingNear(g)) {
      g.campT += dt;
      if (g.campT >= CAMP_MAX) this.moveOn(g);
    } else g.campT = 0;

    // ---- catching
    if (this.status === 'play' && g.state !== 'sleep') {
      const dd = Math.hypot(g.x - p.x, g.z - p.z);
      // bumping into the kid (a hidden kid is never caught)
      if (dd < 0.5 && !p.hidden && g.state !== 'spot') {
        this.status = 'caught';
        this.caughtBy = gi;
        this.events.push({ type: 'caught', g: gi });
      }
    }
  }

  /** "Edge" sighting: outside the bright core of the beam, or the kid stands in a dark room. */
  private edgeSighting(g: Guard, half: number): boolean {
    const p = this.player;
    const off = Math.abs(angleDiff(Math.atan2(p.z - g.z, p.x - g.x), g.dir));
    const pr = this.L.room[this.cellIndex(p)];
    return off > half * EDGE_FRAC || (pr >= 0 && this.roomDark[pr]);
  }

  /** Stop camping: walk to the patrol point farthest from the hidden kid. */
  private moveOn(g: Guard) {
    const pts = g.spec.path;
    g.campT = 0;
    let best = -1,
      bd = -1;
    pts.forEach((q, i) => {
      if (Math.hypot(q.x - g.x, q.z - g.z) < 0.5) return;
      const dd = Math.hypot(q.x - this.player.x, q.z - this.player.z);
      if (dd > bd) {
        bd = dd;
        best = i;
      }
    });
    if (best < 0) return;
    g.state = 'patrol';
    g.pathIdx = best;
    g.alert = Math.min(g.alert, 0.2);
    g.route = this.route(g, pts[best]) ?? [{ ...pts[best] }];
  }

  private goHome(g: Guard) {
    g.state = 'return';
    g.alert = Math.min(g.alert, 0.2);
    const pts = g.spec.path;
    let best = 0,
      bd = Infinity;
    pts.forEach((q, i) => {
      const dd = Math.hypot(q.x - g.x, q.z - g.z);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    g.pathIdx = best;
    g.route = this.route(g, pts[best]) ?? [{ ...pts[best] }];
    if (!g.route.length) g.route.push({ ...pts[best] });
  }

  private patrol(g: Guard, dt: number, speed: number) {
    const pts = g.spec.path;
    if (g.state === 'wait' || pts.length < 2) {
      g.moving = Math.max(0, g.moving - dt * 6);
      g.timer -= dt;
      const look = g.spec.look;
      if (look && look.length) {
        const k = Math.floor((this.t + g.phase) / Math.max(0.8, g.spec.wait)) % look.length;
        const tgt = (look[k] * Math.PI) / 180;
        g.dir += angleDiff(tgt, g.dir) * Math.min(1, dt * 4);
      } else {
        g.dir = g.lookBase + Math.sin((this.t + g.phase) * 0.9) * (pts.length < 2 ? 0.7 : 0.5);
      }
      if (pts.length >= 2 && g.timer <= 0) {
        g.state = 'patrol';
        g.route = this.route(g, pts[g.pathIdx]) ?? [{ ...pts[g.pathIdx] }];
      }
      return;
    }
    if (!g.route.length) g.route = this.route(g, pts[g.pathIdx]) ?? [{ ...pts[g.pathIdx] }];
    const done = this.moveAlong(g, dt, speed);
    if (done) {
      g.lookBase = g.dir;
      // ping-pong along the path
      let ni = g.pathIdx + g.pathStep;
      if (ni >= pts.length || ni < 0) {
        g.pathStep = -g.pathStep;
        ni = g.pathIdx + g.pathStep;
      }
      if (pts.length > 2 && pts[0].x === pts[pts.length - 1].x && pts[0].z === pts[pts.length - 1].z) {
        // closed loop: keep going forward
        g.pathStep = 1;
        ni = (g.pathIdx + 1) % pts.length;
      }
      g.pathIdx = ni;
      g.state = 'wait';
      g.timer = g.spec.wait;
    }
  }
}

export interface GuardSnap {
  x: number;
  z: number;
  dir: number;
  range: number;
  half: number;
  on: boolean;
  state: GuardState;
  adult: boolean;
}

/**
 * Predict guard positions/cones at the given future times (seconds from now),
 * assuming the player stays unseen and silent. World state is restored afterwards.
 */
export function predictGuards(w: World, times: number[], dt = 0.1): GuardSnap[][] {
  const saved = w.guards.map((g) => ({
    ...g,
    route: g.route.map((r) => ({ ...r })),
    target: { ...g.target },
  }));
  const savedT = w.t,
    savedStatus = w.status,
    savedEvents = w.events.slice(),
    savedGhost = w.ghost,
    savedStats = { ...w.stats };
  w.ghost = true;
  const out: GuardSnap[][] = [];
  const snap = () =>
    w.guards.map((g) => {
      const v = w.visionOf(g);
      return {
        x: g.x,
        z: g.z,
        dir: g.dir,
        range: v.range,
        half: v.half,
        on: v.on && g.delay <= 0,
        state: g.state,
        adult: g.cfg.adult,
      };
    });
  let now = 0;
  for (const target of times) {
    while (now < target - 1e-6) {
      const step = Math.min(dt, target - now);
      w.t += step;
      for (let i = 0; i < w.guards.length; i++) (w as unknown as { updateGuard(i: number, dt: number): void }).updateGuard(i, step);
      now += step;
    }
    out.push(snap());
  }
  w.guards = saved;
  w.t = savedT;
  w.status = savedStatus;
  w.events = savedEvents;
  w.ghost = savedGhost;
  w.stats = savedStats;
  return out;
}
