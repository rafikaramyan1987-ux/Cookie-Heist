import type { Level } from './types';
import { World, type Input } from './world';
import { Bot, PROFILES } from './bot';
import { recordHint, followHint } from './hint';

/**
 * Level solver (tests/unit/solver.test.ts, scripts/playtest/solve.ts): finds a winning run on the real game logic and
 * proves it by replaying the recorded inputs, frame by frame, on a fresh world (the simulation is deterministic, so
 * a recorded solution wins every time). Tries the playtest bot's profiles over a few seeds, then the hint planner.
 */
export interface Solution {
  solved: boolean;
  /** who found it: "<profile> seed <n>" or "hint planner" */
  by: string;
  /** game seconds of the winning run */
  time: number;
  /** frames in the recorded solution */
  frames: number;
  /** the replay of the recorded inputs won again */
  replayed: boolean;
  cookies: number;
}

const DT = 1 / 30;
const MAX_T = 150;

function record(L: Level, seed: number, profile: keyof typeof PROFILES, botSeed: number): { inputs: Input[]; won: boolean; time: number; cookies: number } {
  const w = new World(L, { seed });
  const bot = new Bot(w, PROFILES[profile], botSeed);
  const inputs: Input[] = [];
  while (w.status === 'play' && w.t < MAX_T) {
    const raw = bot.update(DT);
    const inp: Input = { mx: raw.mx, mz: raw.mz, run: raw.run, throwAt: raw.throwAt ? { ...raw.throwAt } : null };
    inputs.push(inp);
    w.step(DT, inp);
  }
  return { inputs, won: w.status === 'won', time: w.t, cookies: w.cookieCount };
}

/** replay recorded inputs on a fresh world with the same seed */
export function replay(L: Level, seed: number, inputs: Input[]): boolean {
  const w = new World(L, { seed });
  for (const inp of inputs) {
    if (w.status !== 'play') break;
    w.step(DT, inp);
  }
  return w.status === 'won';
}

export function solveLevel(L: Level, seeds = 8): Solution {
  for (const profile of ['good', 'average', 'beginner'] as const)
    for (let s = 1; s <= seeds; s++) {
      const seed = 7000 + s;
      const r = record(L, seed, profile, s);
      if (!r.won) continue;
      const ok = replay(L, seed, r.inputs);
      return { solved: ok, by: `${profile} bot, seed ${s}`, time: +r.time.toFixed(1), frames: r.inputs.length, replayed: ok, cookies: r.cookies };
    }
  // the hint planner: a safe route recorded from many bot attempts
  for (let s = 1; s <= seeds; s++) {
    const h = recordHint(L, 9000 + s);
    // the route counts once a person-like follower (late reactions, a little noise) wins with it
    if (h && followHint(L, h, 9100 + s)) return { solved: true, by: 'hint route, followed', time: +h.time.toFixed(1), frames: 0, replayed: false, cookies: L.need };
  }
  return { solved: false, by: '', time: 0, frames: 0, replayed: false, cookies: 0 };
}
