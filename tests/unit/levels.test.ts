import { describe, it, expect } from 'vitest';
import { getLevel, LEVEL_SRC } from '../../src/levels/index';
import { distanceField, walkable } from '../../src/game/grid';
import { World } from '../../src/game/world';
import { simulate, PROFILES } from '../../src/game/bot';

describe('levels', () => {
  it('there are 5 houses × 12 nights', () => {
    expect(LEVEL_SRC).toHaveLength(5);
    for (const h of LEVEL_SRC) expect(h).toHaveLength(12);
  });

  for (let h = 0; h < 5; h++)
    for (let i = 0; i < 12; i++) {
      it(`house ${h + 1} night ${i + 1}: cookies, keys and bed are reachable`, () => {
        const L = getLevel(h, i);
        const open = { eh: L.eh.map((v) => (v === 3 ? 2 : v)), ev: L.ev.map((v) => (v === 3 ? 2 : v)) };
        const f = distanceField(L, open, walkable(L, false), L.start);
        const near = (x: number, z: number, solid: boolean) =>
          solid ? [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => f[(Math.floor(z) + dz) * L.w + Math.floor(x) + dx] < Infinity) : f[Math.floor(z) * L.w + Math.floor(x)] < Infinity;
        for (const c of L.cookies) expect(near(c.x, c.z, c.onSolid)).toBe(true);
        for (const k of L.keys) expect(near(k.x, k.z, false)).toBe(true);
        expect(L.cookies.length).toBeGreaterThanOrEqual(1);
        expect(L.cookies.length).toBeLessThanOrEqual(3);
      });
    }

  it('every level is solvable by the playtest bot', () => {
    const unsolved: string[] = [];
    for (let h = 0; h < 5; h++)
      for (let i = 0; i < 12; i++) {
        const L = getLevel(h, i);
        let ok = false;
        for (const prof of [PROFILES.good, PROFILES.average])
          for (let s = 1; s <= 6 && !ok; s++) ok = simulate(new World(L, { seed: s, jitter: 1 }), prof, s).won;
        if (!ok) unsolved.push(L.id);
      }
    expect(unsolved).toEqual([]);
  });
});
