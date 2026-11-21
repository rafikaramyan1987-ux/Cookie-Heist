/**
 * Search for v3.4 nights: generate candidates (scripts/levels/gen.ts) for each difficulty tier and keep the ones
 * that pass the same strict checks as `npm run playtest -- --strict` (solvable, hint works, safe start, every patrol
 * cycle opens a path, readable crossings, no camping, no escape, cookies visible) plus a win-rate band for the
 * average bot. Accepted candidates are written as JSON lines; scripts/levels/freeze.ts turns the chosen ones into
 * src/levels/houses/*.ts.
 *
 * usage: npx tsx scripts/levels/tune.ts --house farmhouse --tiers 0-9 --per 3 --tries 60 --out out.jsonl
 */
import { appendFileSync } from 'node:fs';
import { generate, type Candidate } from './gen';
import { night } from '../../src/levels/helpers';
import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { simulate, PROFILES } from '../../src/game/bot';
import { findHint, followHint } from '../../src/game/hint';
import { hiddenRequiredCookies } from '../../src/game/visibility';
import { closedTargets, startSightings, stationaryGuards, crossingWaits, MAX_CROSS_WAIT } from '../../src/game/audit';
import { distanceField, walkable } from '../../src/game/grid';
import { difficulty } from '../../src/game/difficulty';
import type { Level } from '../../src/game/types';
import type { HouseId } from '../../src/levels/types';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const house = arg('--house', 'farmhouse') as HouseId;
const [t0, t1] = arg('--tiers', '0-9').split('-').map(Number);
const per = +arg('--per', '2');
const tries = +arg('--tries', '80');
const out = arg('--out', '/dev/stdout');
const runs = +arg('--runs', '10');
const seed0 = +arg('--seed', '1');

/** every free cell of the house can be reached from the start (furniture never walls a room off) */
function connected(L: Level) {
  const open = { eh: L.eh.map((v) => (v === 3 ? 2 : v)), ev: L.ev.map((v) => (v === 3 ? 2 : v)) };
  const pass = walkable(L, false);
  const f = distanceField(L, open, pass, L.start);
  for (let i = 0; i < L.w * L.d; i++) if (L.room[i] >= 0 && pass(i) && !(f[i] < Infinity)) return false;
  return true;
}

export interface Eval {
  ok: boolean;
  why: string[];
  win: Record<string, number>;
  time: number;
  hint: number;
}

export function evaluate(L: Level, RUNS = runs): Eval {
  const why: string[] = [];
  if (!connected(L)) why.push('disconnected');
  if (hiddenRequiredCookies(L).length) why.push('hidden cookie');
  if (stationaryGuards(L).length) why.push('stationary');
  if (why.length) return { ok: false, why, win: {}, time: 0, hint: -1 };
  if (startSightings(L, 3, 3).length) why.push('start seen');
  if (closedTargets(L, 6).length) why.push('never opens');
  if (crossingWaits(L).some((s) => s.maxWait > MAX_CROSS_WAIT)) why.push('crossing');
  if (why.length) return { ok: false, why, win: {}, time: 0, hint: -1 };
  const win: Record<string, number> = {};
  let time = 0,
    tw = 0;
  for (const p of ['average', 'good', 'beginner'] as const) {
    let w = 0;
    for (let s = 0; s < RUNS; s++) {
      const r = simulate(new World(L, { seed: 1000 * L.houseIndex + 37 * L.index + s + 1, jitter: 1.2 }), PROFILES[p], s + 1);
      if (r.escapes) why.push('escape');
      if (r.earlySight) why.push('early');
      if (r.maxCamp > 3) why.push('camp');
      if (r.won) {
        w++;
        if (p === 'average') {
          time += r.time;
          tw++;
        }
      }
    }
    win[p] = w / RUNS;
    if (p === 'average' && (win.average < 0.35 || win.average > 0.97)) {
      why.push(`avg ${win.average}`);
      return { ok: false, why: [...new Set(why)], win, time: 0, hint: -1 };
    }
  }
  const H = findHint(L, 1000 + 37 * L.index + L.houseIndex);
  let hint = -1;
  if (H) {
    let ok = 0;
    const n = 6;
    for (let s = 0; s < n; s++) if (followHint(L, H, 500 + s)) ok++;
    hint = ok / n;
  }
  if (hint < 0.5) why.push('hint');
  return { ok: why.length === 0, why: [...new Set(why)], win, time: tw ? time / tw : 0, hint };
}

const houseIndex = { farmhouse: 5, beachhouse: 6, castle: 7 }[house as 'farmhouse'];
for (let tier = t0; tier <= t1; tier++) {
  let found = 0;
  const reasons: Record<string, number> = {};
  const variants = +arg('--variants', '6');
  for (let k = 0; k < tries && found < per; k++) {
    const seed = seed0 + k * 31 + tier * 1009;
    for (let v = 0; v < variants && found < per; v++) {
      let c: Candidate | null = null;
      try {
        c = generate(house, tier, seed, v);
      } catch {
        c = null;
      }
      if (!c) {
        reasons.gen = (reasons.gen ?? 0) + 1;
        break;
      }
      const idx = tier % 10;
      let L: Level;
      try {
        L = parseLevel(night(c.plan, c.opts), house, idx, idx === 9);
      } catch (e) {
        reasons.parse = (reasons.parse ?? 0) + 1;
        if (args.includes('--verbose')) console.error('parse:', String(e).slice(0, 160));
        continue;
      }
      // index for the per-level seeds as in the playtest
      (L as { houseIndex: number }).houseIndex = houseIndex;
      // the 30 chosen nights must rise strictly (freeze.ts builds that chain); every one is above the old finale (59)
      const d0 = difficulty(L);
      if (d0.score < 60) {
        reasons.score = (reasons.score ?? 0) + 1;
        break;
      }
      const ev = evaluate(L);
      for (const w of ev.why) reasons[w.split(' ')[0]] = (reasons[w.split(' ')[0]] ?? 0) + 1;
      // a layout problem: no other patrol will fix it
      if (ev.why.some((w) => w === 'disconnected' || w === 'hidden cookie')) break;
      if (!ev.ok) continue;
      found++;
      appendFileSync(out, JSON.stringify({ house, tier, seed, variant: v, score: d0.score, route: d0.route, win: ev.win, time: +ev.time.toFixed(1), hint: ev.hint, knobs: c.knobs, plan: c.plan, opts: c.opts }) + '\n');
      console.error(`tier ${tier} seed ${seed}/${v}: OK score ${d0.score} route ${d0.route} avg ${ev.win.average} good ${ev.win.good} t ${ev.time.toFixed(0)}s`);
      break;
    }
  }
  console.error(`tier ${tier}: ${found} found; rejects ${JSON.stringify(reasons)}`);
}
