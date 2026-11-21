// Every level, old and new, can be completed: the solver (src/game/solve.ts) finds a winning run on the real game
// logic and replays its recorded inputs on a fresh world, which must win again. Report: docs/solver.md
// (scripts/playtest/solve.ts).
import { describe, it, expect } from 'vitest';
import { ALL_LEVELS, getLevel } from '../../src/levels/all';
import { solveLevel } from '../../src/game/solve';

describe('solver: every level can be completed', () => {
  for (const [h, i] of ALL_LEVELS) {
    const L = getLevel(h, i);
    it(`${L.id}`, () => {
      const s = solveLevel(L);
      expect(s.solved, `${L.id}: no winning run found`).toBe(true);
      // a bot solution is proven by its replay; the hint fallback by a person-like follower
      if (s.frames > 0) expect(s.replayed).toBe(true);
      expect(s.cookies).toBeGreaterThanOrEqual(L.need);
    });
  }
});
