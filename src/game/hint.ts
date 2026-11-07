import type { Level, Vec2 } from './types';
import { World, Input, TIPTOE_SPEED } from './world';
import { Bot, PROFILES, BotProfile } from './bot';
import { makeRng } from './rng';

/**
 * Hints: a safe route for one attempt, recorded from the good bot playing the very same seed.
 * Guards are deterministic for a given seed (no jitter in real play), so the route and the moments
 * the bot waits ("wait here" markers + when to go) are valid for that attempt as long as the kid
 * doesn't make noise that changes the guards' plans.
 */
export interface HintWait {
  x: number;
  z: number;
  /** world time the bot stopped here */
  t0: number;
  /** world time the safe window opened (the bot left) */
  t1: number;
}

export interface HintPoint extends Vec2 {
  /** must reach this spot exactly (a wait marker) */
  key?: boolean;
  /** wait here until this world time (the safe window opens) */
  wait?: number;
  /** pick this up here (cookie / key / pillow / toy index) */
  item?: { type: 'cookie' | 'key' | 'pillow' | 'toy'; i: number };
}

export interface Hint {
  seed: number;
  /** kid positions every SAMPLE seconds, plus the exact pickup / wait spots */
  path: HintPoint[];
  waits: HintWait[];
  time: number;
}

export const HINT_SAMPLE = 0.2;
/** a pause at least this long becomes a "wait here" marker */
const WAIT_MIN = 0.4;
const DT = 1 / 60;

/** The hint planner: the good bot's look-ahead, required cookies only, never runs, no slips. */
const HINT_PROFILE: BotProfile = { ...PROFILES.good, greedy: false, runChance: 0, slip: 0 };

/** Record the hint planner on `seed`; null if it does not win. */
export function recordHint(level: Level, seed: number, maxTime = 120): Hint | null {
  const w = new World(level, { seed });
  const bot = new Bot(w, HINT_PROFILE, 7);
  // uniform samples (time = index × HINT_SAMPLE) and the pickups made after each sample
  const samples: Vec2[] = [{ x: w.player.x, z: w.player.z }];
  const items = new Map<number, HintPoint[]>();
  let next = HINT_SAMPLE;
  while (w.status === 'play' && w.t < maxTime) {
    w.step(DT, bot.update(DT));
    const p = w.player;
    for (const e of w.events) {
      let it: HintPoint['item'] | null = null;
      if (e.type === 'cookie') it = { type: 'cookie', i: e.i };
      else if (e.type === 'key' || e.type === 'pillow' || e.type === 'toyPickup') {
        const list = e.type === 'key' ? level.keys : e.type === 'pillow' ? level.pillows : level.toyPickups;
        const i = list.findIndex((q) => q.x === e.x && q.z === e.z);
        if (i >= 0) it = { type: e.type === 'key' ? 'key' : e.type === 'pillow' ? 'pillow' : 'toy', i };
      }
      if (it) {
        const k = samples.length - 1;
        items.set(k, [...(items.get(k) ?? []), { x: p.x, z: p.z, item: it }]);
      }
    }
    if (w.t >= next) {
      samples.push({ x: p.x, z: p.z });
      next += HINT_SAMPLE;
    }
  }
  if (w.status !== 'won') return null;
  samples.push({ x: w.player.x, z: w.player.z });
  // waits: wherever the bot went slower than tiptoe pace (pauses, dawdling in a cell), the time it lost is a
  // "wait here" marker at the spot where it set off again — so a person walking at tiptoe pace stays in sync
  const slack = samples.map((q, i) => (i === 0 ? 0 : Math.max(0, HINT_SAMPLE - Math.hypot(q.x - samples[i - 1].x, q.z - samples[i - 1].z) / TIPTOE_SPEED)));
  const waits: HintWait[] = [];
  const waitAt = new Map<number, HintPoint>();
  for (let i = 1; i < samples.length; i++) {
    if (slack[i] < 0.06) continue;
    let j = i,
      lost = 0;
    while (j < samples.length && slack[j] >= 0.06) lost += slack[j++];
    j--;
    if (lost >= WAIT_MIN) {
      const q = samples[j];
      const t0 = (i - 1) * HINT_SAMPLE,
        t1 = j * HINT_SAMPLE;
      const prev = waits[waits.length - 1];
      if (prev && Math.hypot(prev.x - q.x, prev.z - q.z) < 0.7 && t0 - prev.t1 < 3) {
        prev.t1 = t1;
        for (const v of waitAt.values()) if (v.x === prev.x && v.z === prev.z) v.wait = t1;
      } else {
        waits.push({ x: q.x, z: q.z, t0, t1 });
        waitAt.set(j, { x: q.x, z: q.z, key: true, wait: t1 });
      }
    }
    i = j;
  }
  const path: HintPoint[] = [];
  samples.forEach((q, i) => {
    path.push(q);
    const wp = waitAt.get(i);
    if (wp) path.push(wp);
    for (const it of items.get(i) ?? []) path.push(it);
  });
  return { seed, path, waits, time: w.t };
}

/** A person following the countdown rings: ~0.15 s late on average, ± 0.2 s. */
export const FOLLOW_REACT = 0.15;
export const FOLLOW_NOISE = 0.2;

/**
 * The most robust winning hint near `seed`: each candidate route is checked by a follower that reacts like a
 * person (late and a bit noisy); the attempt is then played on the chosen hint's seed.
 */
export function findHint(level: Level, seed: number, tries = 8, checks = 4): Hint | null {
  let best: Hint | null = null,
    bestOk = -1;
  for (let k = 0; k < tries; k++) {
    const h = recordHint(level, seed + k * 7919);
    if (!h) continue;
    let ok = 0;
    for (let c = 0; c < checks; c++) if (followHint(level, h, c + 1)) ok++;
    if (ok > bestOk) {
      best = h;
      bestOk = ok;
    }
    if (ok === checks) return h;
  }
  return best;
}

/**
 * A kid following a hint like a person would: walks the dotted path, waits at the markers and goes when they
 * pulse, with a human reaction delay and some timing noise. Used by the playtest to measure how much hints help.
 */
export class HintFollower {
  private k = 1;
  private rng;
  private goAt = -1;
  private best = Infinity;
  private bestT = 0;
  constructor(
    private w: World,
    private hint: Hint,
    seed = 1,
    private react = FOLLOW_REACT,
    private noise = FOLLOW_NOISE,
  ) {
    this.rng = makeRng(seed * 31 + 5);
  }
  private advance() {
    this.k++;
    this.goAt = -1;
    this.best = Infinity;
    this.bestT = this.w.t;
  }
  update(): Input {
    const w = this.w,
      p = w.player,
      H = this.hint,
      L = w.L;
    const taken = (q: HintPoint) => {
      const it = q.item!;
      return it.type === 'cookie' ? w.cookies[it.i] : it.type === 'key' ? w.keysTaken[it.i] : it.type === 'pillow' ? w.pillowsTaken[it.i] : w.toyPickupsTaken[it.i];
    };
    for (let guard = 0; guard < 8 && this.k < H.path.length - 1; guard++) {
      const q = H.path[this.k];
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (q.item) {
        if (taken(q)) {
          this.advance();
          continue;
        }
      } else if (q.wait !== undefined) {
        // at a wait marker: hold until its ring completes (+ reaction time, ± noise)
        if (d < 0.1) {
          if (this.goAt < 0) this.goAt = q.wait + this.react + (this.rng() - 0.5) * 2 * this.noise;
          if (w.t < this.goAt) return { mx: 0, mz: 0 };
          this.advance();
          continue;
        }
      } else if (d < 0.3) {
        this.advance();
        continue;
      }
      // no progress towards this point for a second (blocked by furniture): move on
      if (d < this.best - 0.02) {
        this.best = d;
        this.bestT = w.t;
      } else if (w.t - this.bestT > 1 && q.wait === undefined) {
        this.advance();
        continue;
      }
      break;
    }
    const q = H.path[this.k];
    let tgt: Vec2 = q;
    if (q.item) {
      const it = q.item;
      tgt = it.type === 'cookie' ? L.cookies[it.i] : it.type === 'key' ? L.keys[it.i] : it.type === 'pillow' ? L.pillows[it.i] : L.toyPickups[it.i];
    }
    // last leg: into bed
    if (this.k >= H.path.length - 1 && w.requiredDone) tgt = { x: (L.bed.x0 + L.bed.x1) / 2, z: (L.bed.z0 + L.bed.z1) / 2 };
    const dx = tgt.x - p.x,
      dz = tgt.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.03) return { mx: 0, mz: 0 };
    return { mx: (dx / d) * 0.5, mz: (dz / d) * 0.5 };
  }
}

/** Play one attempt following the hint; true on a win. */
export function followHint(level: Level, hint: Hint, seed: number, react = FOLLOW_REACT, noise = FOLLOW_NOISE): boolean {
  const w = new World(level, { seed: hint.seed });
  const f = new HintFollower(w, hint, seed, react, noise);
  while (w.status === 'play' && w.t < 150) w.step(DT, f.update());
  return w.status === 'won';
}
