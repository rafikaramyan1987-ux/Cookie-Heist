import type { Vec2 } from './types';
import { World, Input, predictGuards, GuardSnap, TOY_RANGE, PLAYER_R, NOISE } from './world';
import { distanceField, walkable, los, canStep, angleDiff, Passable } from './grid';
import { makeRng, Rng } from './rng';

/**
 * Playtest / autoplay bot. Plans in space-time over the cell grid using
 * predicted guard vision cones, so it plays on the real rules.
 * Profiles differ in look-ahead, safety margin, reaction time and habits.
 */

export interface BotProfile {
  name: 'beginner' | 'average' | 'good';
  replan: number;
  horizon: number;
  margin: number;
  react: number;
  /** chance per decision to sprint when it "feels" safe */
  runChance: number;
  /** cost multiplier for noisy cells */
  noiseCare: number;
  useToys: boolean;
  greedy: boolean; // goes for every cookie
  /** probability per second of a careless move ignoring danger */
  slip: number;
}

export const PROFILES: Record<BotProfile['name'], BotProfile> = {
  beginner: { name: 'beginner', replan: 0.5, horizon: 2.4, margin: 0.0, react: 0.35, runChance: 0.035, noiseCare: 0.6, useToys: false, greedy: false, slip: 0.05 },
  average: { name: 'average', replan: 0.35, horizon: 4.2, margin: 0.15, react: 0.22, runChance: 0.01, noiseCare: 2, useToys: true, greedy: false, slip: 0.025 },
  good: { name: 'good', replan: 0.2, horizon: 9, margin: 0.35, react: 0.05, runChance: 0.0, noiseCare: 4, useToys: true, greedy: true, slip: 0 },
};

const STEP = 0.6; // seconds per plan step (≈ 1 cell at tiptoe speed)

export class Bot {
  private rng: Rng;
  private plan: number[] = []; // cell indices, one per STEP
  private planStart = 0;
  private giveUp = false;
  private banned = new Map<number, number>(); // cookie index → time until which it is avoided
  private goalCookie = -1;
  private assumeDark = new Set<number>();
  private blockedT = 0;
  private planT = 0;
  private stuckT = 0;
  private reactQueue: { t: number; input: Input }[] = [];
  private passP: Passable;
  private throwCd = 0;
  private sprint = false;
  private slipT = 0;

  constructor(
    private w: World,
    public profile: BotProfile,
    seed = 1,
  ) {
    this.rng = makeRng(seed * 7919 + 13);
    this.passP = walkable(w.L, false);
  }

  /** Decide the next input. */
  update(dt: number): Input {
    const w = this.w;
    this.planT -= dt;
    this.throwCd -= dt;
    this.slipT -= dt;
    let throwAt: Vec2 | null = null;
    const chased = w.guards.some((g) => g.state === 'chase');
    if (this.planT <= 0) {
      this.planT = this.profile.replan * (0.8 + this.rng() * 0.4);
      this.planStart = w.t;
      if (chased) this.plan = this.escapePlan();
      else {
        const r = this.makePlan();
        this.plan = r.plan;
        if (r.blocked) this.blockedT += this.profile.replan;
        else this.blockedT = Math.max(0, this.blockedT - this.profile.replan * 0.5);
        if (this.blockedT > 6 && w.requiredDone && !this.giveUp) {
          this.giveUp = true;
          this.blockedT = 0;
        }
        // stuck on one cookie for a long time: try another one for a while
        if (this.blockedT > 6 && this.goalCookie >= 0) {
          this.banned.set(this.goalCookie, w.t + 25);
          this.blockedT = 0;
        }
        if (r.blocked) this.stuckT += this.profile.replan;
        else this.stuckT = Math.max(0, this.stuckT - this.profile.replan);
        if (this.profile.useToys && w.toys > 0 && this.stuckT > 2.2 && this.throwCd <= 0) {
          throwAt = this.pickThrow();
          if (throwAt) {
            this.throwCd = 4;
            this.stuckT = 0;
          }
        }
        this.sprint = this.rng() < this.profile.runChance;
        if (this.profile.slip > 0 && this.rng() < this.profile.slip * this.profile.replan * 10) this.slipT = 0.6;
      }
    }
    const input = this.follow(chased);
    input.throwAt = throwAt;
    // reaction delay: the human sees the plan a moment late
    const react = this.profile.react;
    if (react <= 0.01) return input;
    this.reactQueue.push({ t: w.t + react, input });
    let due: Input | null = null;
    while (this.reactQueue.length && this.reactQueue[0].t <= w.t) due = this.reactQueue.shift()!.input;
    if (due) this.lastOut = due;
    const out = { ...this.lastOut };
    this.lastOut.throwAt = null;
    return out;
  }
  private lastOut: Input = { mx: 0, mz: 0 };
  private snaps: GuardSnap[][] = [];

  /** would a noise of radius r at cell j be heard at plan step k? */
  private heard(j: number, k: number, r: number): boolean {
    const L = this.w.L;
    const x = (j % L.w) + 0.5,
      z = ((j / L.w) | 0) + 0.5;
    const gs = this.snaps[Math.min(k, this.snaps.length - 1)] ?? [];
    return gs.some((g, gi) => g.adult && Math.hypot(g.x - x, g.z - z) < r * this.w.guards[gi].cfg.hear + 0.6);
  }

  // ------------------------------------------------------------------ goals
  private goal(): Vec2 {
    const w = this.w,
      L = w.L;
    const here = { x: w.player.x, z: w.player.z };
    const field = distanceField(L, w.E, this.passP, here);
    const reach = (p: Vec2, solid = false) => {
      const i = Math.floor(p.z) * L.w + Math.floor(p.x);
      if (!solid) return field[i];
      // pickup on a counter: nearest neighbouring cell
      let best = Infinity;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = Math.floor(p.x) + dx,
          z = Math.floor(p.z) + dz;
        if (x < 0 || z < 0 || x >= L.w || z >= L.d) continue;
        best = Math.min(best, field[z * L.w + x]);
      }
      return best + 1;
    };
    // pillow decoy first if there is a bed check
    if (L.bedCheck > 0 && !w.decoy) {
      const i = L.pillows.findIndex((_, k) => !w.pillowsTaken[k]);
      if (i >= 0 && reach(L.pillows[i]) < Infinity) return L.pillows[i];
    }
    const have = w.cookieCount;
    const wantAll = this.profile.greedy && !this.giveUp;
    const needMore = !w.requiredDone || (wantAll && have < L.cookies.length);
    if (needMore) {
      let best: Vec2 | null = null,
        bd = Infinity;
      this.goalCookie = -1;
      // required cookies first; the golden bonus only once they are all collected
      const wanted = (i: number) => !w.cookies[i] && (w.requiredDone || i !== L.bonus);
      const avail = L.cookies.filter((_, i) => wanted(i) && (this.banned.get(i) ?? 0) < w.t).length;
      L.cookies.forEach((c, i) => {
        if (!wanted(i)) return;
        if (avail > 0 && (this.banned.get(i) ?? 0) >= w.t) return;
        const d = reach(c, c.onSolid);
        if (d < bd) {
          bd = d;
          best = c.onSolid ? this.standCell(c, field) : c;
          this.goalCookie = i;
        }
      });
      if (best && bd < Infinity) return best;
    }
    // bed
    const b = L.bed;
    let bestBed: Vec2 = { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 },
      bd = Infinity;
    for (let z = b.z0 - 1; z <= b.z1; z++)
      for (let x = b.x0 - 1; x <= b.x1; x++) {
        if (x < 0 || z < 0 || x >= L.w || z >= L.d) continue;
        const i = z * L.w + x;
        if (!this.passP(i)) continue;
        const ortho = (x >= b.x0 && x < b.x1) || (z >= b.z0 && z < b.z1);
        if (!ortho) continue;
        if (field[i] < bd) {
          bd = field[i];
          bestBed = { x: x + 0.5, z: z + 0.5 };
        }
      }
    if (bd < Infinity && w.requiredDone) return bestBed;
    // something is locked away: fetch a key
    const k = L.keys.findIndex((_, i) => !w.keysTaken[i] && reach(L.keys[i]) < Infinity);
    if (k >= 0 && w.keys === 0) return L.keys[k];
    // have a key: walk to the nearest locked door
    if (w.keys > 0) {
      let best: Vec2 | null = null,
        bd2 = Infinity;
      for (let z = 0; z < L.d; z++)
        for (let x = 0; x < L.w; x++) {
          const i = z * L.w + x;
          const locked = w.E.eh[i] === 3 || w.E.eh[(z + 1) * L.w + x] === 3 || w.E.ev[z * (L.w + 1) + x] === 3 || w.E.ev[z * (L.w + 1) + x + 1] === 3;
          if (locked && field[i] < bd2) {
            bd2 = field[i];
            best = { x: x + 0.5, z: z + 0.5 };
          }
        }
      if (best) return best;
    }
    return bestBed;
  }

  private standCell(c: Vec2, field: Float32Array): Vec2 {
    const L = this.w.L;
    let best = c,
      bd = Infinity;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = Math.floor(c.x) + dx,
        z = Math.floor(c.z) + dz;
      if (x < 0 || z < 0 || x >= L.w || z >= L.d) continue;
      const i = z * L.w + x;
      if (field[i] < bd) {
        bd = field[i];
        best = { x: x + 0.5, z: z + 0.5 };
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ danger
  private dangerMaps(K: number): Uint8Array[] {
    const w = this.w,
      L = w.L;
    // sample guards 4× per plan step so fast turns between steps are not missed
    const SUB = 4;
    const times: number[] = [];
    for (let k = 0; k <= K * SUB; k++) times.push((k * STEP) / SUB);
    const snaps = predictGuards(w, times);
    this.snaps = snaps.filter((_, i) => i % SUB === 0);
    const m = this.profile.margin;
    const raw: Uint8Array[] = [];
    for (let k = 0; k <= K; k++) {
      const D = new Uint8Array(L.w * L.d);
      // cells seen at any sub-sample in (k-1, k]
      const from = Math.max(0, (k - 1) * SUB + 1);
      for (let j = from; j <= k * SUB; j++) for (const g of snaps[j]) this.paint(D, g, m);
      raw.push(D);
    }
    // a move between k and k+1 must be safe at both instants
    return raw.map((D, k) => {
      if (k === 0) return D;
      const o = D.slice();
      const P = raw[k - 1];
      for (let i = 0; i < o.length; i++) o[i] |= P[i];
      return o;
    });
  }

  private paint(D: Uint8Array, g: GuardSnap, m: number) {
    const w = this.w,
      L = w.L;
    // body
    const bx = Math.floor(g.x),
      bz = Math.floor(g.z);
    if (g.adult) for (let z = bz - 2; z <= bz + 2; z++) for (let x = bx - 2; x <= bx + 2; x++) if (x >= 0 && z >= 0 && x < L.w && z < L.d && Math.hypot(x + 0.5 - g.x, z + 0.5 - g.z) < 1.6) D[z * L.w + x] = 1;
    if (!g.on) return;
    const R = Math.ceil(g.range + 1);
    for (let z = Math.max(0, bz - R); z <= Math.min(L.d - 1, bz + R); z++)
      for (let x = Math.max(0, bx - R); x <= Math.min(L.w - 1, bx + R); x++) {
        const i = z * L.w + x;
        if (D[i] || L.room[i] < 0) continue;
        const cx = x + 0.5,
          cz = z + 0.5;
        const dx = cx - g.x,
          dz = cz - g.z;
        const d = Math.hypot(dx, dz);
        const range = g.range * (w.roomDark[L.room[i]] || this.assumeDark.has(L.room[i]) ? 0.6 : 1);
        // a cell counts if any part of the kid standing anywhere in it could be seen
        const reach = range + PLAYER_R + 0.3 + m;
        if (d > reach) continue;
        if (d > 0.5 && Math.abs(angleDiff(Math.atan2(dz, dx), g.dir)) > g.half + Math.atan2(0.42 + m, d)) continue;
        // line of sight to the cell centre or a corner-ish point
        const pts = [
          { x: cx, z: cz },
          { x: cx - 0.3, z: cz - 0.3 },
          { x: cx + 0.3, z: cz + 0.3 },
          { x: cx - 0.3, z: cz + 0.3 },
          { x: cx + 0.3, z: cz - 0.3 },
        ];
        if (pts.some((p) => los(L, w.E, g, p))) D[i] = 1;
      }
  }

  // ------------------------------------------------------------------ planning
  private makePlan(): { plan: number[]; blocked: boolean } {
    const w = this.w,
      L = w.L;
    const K = Math.max(2, Math.round(this.profile.horizon / STEP));
    const goal = this.goal();
    const gi = Math.floor(goal.z) * L.w + Math.floor(goal.x);
    const field = distanceField(L, w.E, this.passP, goal);
    // light switches on the way will darken their room: plan with that in mind
    this.assumeDark.clear();
    const fromMe = distanceField(L, w.E, this.passP, { x: w.player.x, z: w.player.z });
    const total = fromMe[gi];
    for (const sw of L.switches) {
      const si = Math.floor(sw.z) * L.w + Math.floor(sw.x);
      if (!w.roomDark[sw.room] && fromMe[si] + field[si] <= total + 2) this.assumeDark.add(sw.room);
    }
    const D = this.dangerMaps(K);
    const s = Math.floor(w.player.z) * L.w + Math.floor(w.player.x);
    const N = L.w * L.d;
    // space-time Dijkstra
    const INF = 1e9;
    const cost = new Float32Array((K + 1) * N).fill(INF);
    const prev = new Int32Array((K + 1) * N).fill(-1);
    cost[s] = 0;
    let bestState = -1,
      bestScore = INF;
    const careless = this.slipT > 0;
    for (let k = 0; k < K; k++) {
      const Dn = D[k + 1];
      for (let i = 0; i < N; i++) {
        const c = cost[k * N + i];
        if (c >= INF) continue;
        const x = i % L.w,
          z = (i / L.w) | 0;
        const tryMove = (j: number, extra: number) => {
          const hidden = L.hide[j] > 0 && j === i;
          if (!careless && Dn[j] && !hidden) return;
          let nc = c + extra;
          if (j !== i && (L.creaky[j] || L.floorToy[j])) {
            const r = L.creaky[j] ? NOISE.creakTiptoe : NOISE.toyTiptoe;
            if (this.profile.noiseCare >= 2 && this.heard(j, k + 1, r)) return;
            nc += 2.5 * this.profile.noiseCare;
          }
          const si = (k + 1) * N + j;
          if (nc < cost[si]) {
            cost[si] = nc;
            prev[si] = k * N + i;
          }
        };
        tryMove(i, 0.35 + 0.03 * (K - k)); // wait (waiting early costs more: no procrastinating)
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!canStep(L, w.E, this.passP, x, z, dx, dz)) continue;
          tryMove((z + dz) * L.w + x + dx, 1);
        }
      }
      // reached goal at k+1?
      const gs = (k + 1) * N + gi;
      if (cost[gs] < INF) {
        bestState = gs;
        bestScore = -1;
        break;
      }
    }
    if (bestState < 0) {
      // best frontier: closest to the goal (static distance), prefer progress
      for (let k = K; k >= 1; k--) {
        for (let i = 0; i < N; i++) {
          const c = cost[k * N + i];
          if (c >= INF) continue;
          const score = field[i] * 3 + c * 0.2 + (K - k) * 0.5;
          if (score < bestScore) {
            bestScore = score;
            bestState = k * N + i;
          }
        }
        if (bestState >= 0) break;
      }
    }
    if (bestState < 0) return { plan: [], blocked: true }; // no safe move at all
    const seq: number[] = [];
    for (let st = bestState; st >= 0 && st >= N; st = prev[st]) seq.push(st % N);
    seq.reverse();
    const progressed = seq.length > 0 && field[seq[seq.length - 1]] < field[s] - 0.5;
    return { plan: seq, blocked: !progressed && bestScore !== -1 };
  }

  /** Being chased: sprint to the best hiding spot / away from the chasers. */
  private escapePlan(): number[] {
    const w = this.w,
      L = w.L;
    // already tucked away: stay put until they give up
    if (w.player.hidden && this.profile.name !== 'beginner') {
      const ci = Math.floor(w.player.z) * L.w + Math.floor(w.player.x);
      return [ci, ci, ci];
    }
    const here = { x: w.player.x, z: w.player.z };
    const field = distanceField(L, w.E, this.passP, here);
    const chasers = w.guards.filter((g) => g.state === 'chase');
    let best = -1,
      bs = -Infinity;
    for (let i = 0; i < L.w * L.d; i++) {
      if (field[i] === Infinity) continue;
      const p = { x: (i % L.w) + 0.5, z: ((i / L.w) | 0) + 0.5 };
      let s = 0;
      for (const g of chasers) {
        const d = Math.hypot(g.x - p.x, g.z - p.z);
        s += Math.min(d, 8);
        if (los(L, w.E, g, p)) s -= 3;
      }
      if (L.hide[i]) s += this.profile.name === 'beginner' ? 2 : 5;
      s -= field[i] * 0.6;
      if (s > bs) {
        bs = s;
        best = i;
      }
    }
    if (best < 0) return [];
    // walk the distance field backwards from best
    const seq: number[] = [];
    let cur = best;
    for (let n = 0; n < 40 && field[cur] > 0; n++) {
      seq.push(cur);
      const x = cur % L.w,
        z = (cur / L.w) | 0;
      let nb = cur;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!canStep(L, w.E, this.passP, x, z, dx, dz)) continue;
        const j = (z + dz) * L.w + x + dx;
        if (field[j] < field[nb]) nb = j;
      }
      if (nb === cur) break;
      cur = nb;
    }
    seq.reverse();
    return seq;
  }

  private pickThrow(): Vec2 | null {
    const w = this.w,
      L = w.L;
    const p = w.player;
    const goal = this.goal();
    // the awake adult guard closest to the route (player→goal)
    let g = null,
      gd = Infinity;
    for (const q of w.guards) {
      if (!q.cfg.adult || q.state === 'sleep' || q.state === 'chase') continue;
      const d = Math.min(Math.hypot(q.x - p.x, q.z - p.z), Math.hypot(q.x - goal.x, q.z - goal.z));
      if (d < gd) {
        gd = d;
        g = q;
      }
    }
    if (!g || gd > 8) return null;
    let best: Vec2 | null = null,
      bs = 0.5;
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      for (const dist of [2.2, 3.0, 3.6]) {
        const t = { x: g.x + Math.cos(ang) * dist, z: g.z + Math.sin(ang) * dist };
        if (t.x < 0.3 || t.z < 0.3 || t.x > L.w - 0.3 || t.z > L.d - 0.3) continue;
        const ci = Math.floor(t.z) * L.w + Math.floor(t.x);
        if (L.room[ci] < 0 || L.solid[ci]) continue;
        const dp = Math.hypot(t.x - p.x, t.z - p.z);
        if (dp > TOY_RANGE - 0.2 || dp < 2) continue;
        // lure the guard away from both us and the goal
        const score = Math.min(Math.hypot(t.x - goal.x, t.z - goal.z), dp) - Math.min(Math.hypot(g.x - goal.x, g.z - goal.z), Math.hypot(g.x - p.x, g.z - p.z));
        if (score > bs) {
          bs = score;
          best = t;
        }
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ steering
  private follow(chased: boolean): Input {
    const w = this.w,
      L = w.L;
    const p = w.player;
    if (!this.plan.length) return { mx: 0, mz: 0 };
    const ci = Math.floor(p.z) * L.w + Math.floor(p.x);
    // where should we be? plan[k] is the cell at the end of step k
    let k = Math.floor((w.t - this.planStart) / STEP);
    if (chased) k = 0;
    k = Math.min(this.plan.length - 1, Math.max(0, k));
    let target = this.plan[k];
    // slightly ahead of schedule is fine once most of the step has elapsed
    if (target === ci && k + 1 < this.plan.length && this.plan[k + 1] !== ci && w.t - this.planStart > (k + 0.75) * STEP) target = this.plan[k + 1];
    if (chased && target === ci && this.plan.indexOf(ci) >= 0) {
      const idx = this.plan.indexOf(ci);
      if (idx + 1 < this.plan.length) target = this.plan[idx + 1];
    }
    const tx = (target % L.w) + 0.5,
      tz = ((target / L.w) | 0) + 0.5;
    const dx = tx - p.x,
      dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (target === ci) {
      // waiting in a hiding spot: keep perfectly still so we stay hidden
      if (d < 0.12 || L.hide[ci]) return { mx: 0, mz: 0 };
      return { mx: (dx / d) * 0.3, mz: (dz / d) * 0.3 };
    }
    const run = chased || this.sprint;
    const mag = run ? 1 : 0.5;
    return { mx: (dx / d) * mag, mz: (dz / d) * mag };
  }
}

/** Run one full game with a bot; returns the outcome. */
export function simulate(w: World, profile: BotProfile, seed: number, maxTime = 150, dt = 1 / 30) {
  const bot = new Bot(w, profile, seed);
  while (w.status === 'play' && w.t < maxTime) w.step(dt, bot.update(dt));
  return { ...w.stats, won: w.status === 'won', status: w.status, time: w.t, cookies: w.cookieCount };
}
