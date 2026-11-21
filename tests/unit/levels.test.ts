import { describe, it, expect } from 'vitest';
import { getLevel, LEVEL_SRC, ALL_LEVELS, NIGHTS } from '../../src/levels/all';
import { distanceField, walkable } from '../../src/game/grid';
import { World } from '../../src/game/world';
import { simulate, PROFILES } from '../../src/game/bot';
import { hiddenRequiredCookies } from '../../src/game/visibility';

/** a long run of synchronous level tests starves the worker's event loop (vitest RPC timeouts): yield once per test */
const yieldToWorker = () => new Promise((r) => setTimeout(r, 0));

describe('levels', () => {
  it('there are 5 houses × 12 nights + 3 houses × 10 nights (v3.4)', () => {
    expect(LEVEL_SRC).toHaveLength(8);
    LEVEL_SRC.forEach((h, k) => expect(h).toHaveLength(NIGHTS[k]));
  });

  for (const [h, i] of ALL_LEVELS)
    it(`house ${h + 1} night ${i + 1}: cookies, keys and bed are reachable`, async () => {
      await yieldToWorker();
      const L = getLevel(h, i);
      const open = {
        eh: L.eh.map((v) => (v === 3 ? 2 : v)),
        ev: L.ev.map((v) => (v === 3 ? 2 : v)),
      };
      const f = distanceField(L, open, walkable(L, false), L.start);
      const near = (x: number, z: number, solid: boolean) =>
        solid
          ? [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ].some(([dx, dz]) => f[(Math.floor(z) + dz) * L.w + Math.floor(x) + dx] < Infinity)
          : f[Math.floor(z) * L.w + Math.floor(x)] < Infinity;
      for (const c of L.cookies) expect(near(c.x, c.z, c.onSolid)).toBe(true);
      for (const k of L.keys) expect(near(k.x, k.z, false)).toBe(true);
      expect(L.cookies.length).toBeGreaterThanOrEqual(1);
      // no required cookie hidden behind a wall or tall furniture from the phone camera
      expect(hiddenRequiredCookies(L)).toEqual([]);
      // with 2+ cookies exactly one is the golden bonus, and it is never needed to win
      if (L.cookies.length >= 2) {
        expect(L.bonus).toBeGreaterThanOrEqual(0);
        expect(L.need).toBe(L.cookies.length - 1);
      } else expect(L.bonus).toBe(-1);
      expect(L.cookies.length).toBeLessThanOrEqual(3);
    });

  // one test per level: a single 90-level loop blocks the test worker for minutes (vitest's RPC times out)
  for (const [h, i] of ALL_LEVELS)
    it(`house ${h + 1} night ${i + 1} is solvable by the playtest bot`, async () => {
      await yieldToWorker();
      const L = getLevel(h, i);
      let ok = false;
      for (const prof of [PROFILES.good, PROFILES.average]) for (let s = 1; s <= 6 && !ok; s++) ok = simulate(new World(L, { seed: s, jitter: 1 }), prof, s).won;
      expect(ok, `${L.id} unsolved`).toBe(true);
    });
});
