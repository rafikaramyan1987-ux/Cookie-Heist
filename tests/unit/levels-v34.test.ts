// The 30 v3.4 nights (houses 6–8): after the old 60, unchanged old levels, own layouts, rising difficulty, the
// three new mechanics spread over the new nights.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { LEVEL_SRC, ALL_LEVELS, getLevel } from '../../src/levels/all';
import { difficulty } from '../../src/game/difficulty';
import type { LevelSrc } from '../../src/game/types';

const NEW = ALL_LEVELS.slice(60);
const OLD = ALL_LEVELS.slice(0, 60);

/** the 8 rotations / mirrors of a grid of strings */
function variants(rows: string[]): string[] {
  const grid = rows.map((r) => r.padEnd(Math.max(...rows.map((x) => x.length)), ' ').split(''));
  const rot = (g: string[][]) => g[0].map((_, x) => g.map((r) => r[x]).reverse());
  const flip = (g: string[][]) => g.map((r) => r.slice().reverse());
  const out: string[] = [];
  let g = grid;
  for (let k = 0; k < 4; k++) {
    out.push(g.map((r) => r.join('')).join('/'), flip(g).map((r) => r.join('')).join('/'));
    g = rot(g);
  }
  return out;
}
const layout = (s: LevelSrc) => s.map;
const furnished = (s: LevelSrc) => s.map.map((r, z) => r.split('').map((c, x) => c + (s.obj[z]?.[x] ?? ' ')).join(''));

describe('v3.4: 30 new nights', () => {
  it('the 60 old nights are unchanged (same data as v3.3)', () => {
    expect(createHash('sha256').update(JSON.stringify(LEVEL_SRC.slice(0, 5))).digest('hex')).toBe('a0e2de8639c6cc9cca514e00463c7dcbbf67b97352940401e22f5945b230cd5a');
  });

  it('30 new nights come after the old ones', () => {
    expect(NEW).toHaveLength(30);
    expect(OLD.every(([h]) => h < 5)).toBe(true);
    expect(NEW.every(([h]) => h >= 5)).toBe(true);
  });

  it('every new night has its own floorplan: no copy, rotation or mirror of any other night, old or new', () => {
    const all = ALL_LEVELS.map(([h, i]) => ({ id: getLevel(h, i).id, src: LEVEL_SRC[h][i] }));
    for (const [h, i] of NEW) {
      const me = LEVEL_SRC[h][i];
      const mine = new Set([...variants(layout(me)), ...variants(furnished(me))]);
      for (const o of all) {
        if (o.src === me) continue;
        // the room layout itself must differ from every other night's (and from its rotations / mirrors)
        expect(mine.has(layout(o.src).join('/')), `${getLevel(h, i).id} has the room layout of ${o.id}`).toBe(false);
        expect(mine.has(furnished(o.src).join('/')), `${getLevel(h, i).id} copies ${o.id}`).toBe(false);
      }
    }
  });

  it('each new night is a little longer (par) and harder (difficulty score) than the one before it', () => {
    const prev = getLevel(...OLD[OLD.length - 1]);
    let par = prev.par,
      score = difficulty(prev).score;
    for (const [h, i] of NEW) {
      const L = getLevel(h, i);
      const d = difficulty(L);
      expect(L.par, `${L.id} par`).toBeGreaterThan(par);
      expect(d.score, `${L.id} difficulty`).toBeGreaterThan(score);
      par = L.par;
      score = d.score;
    }
  });

  it('three new mechanics, each on several new nights in more than one house, with its tip on the first one', () => {
    const uses = { doze: [] as string[], alarm: [] as string[], motion: [] as string[] };
    const tips: Record<string, string> = {};
    for (const [h, i] of NEW) {
      const L = getLevel(h, i);
      if (L.guards.some((g) => g.doze)) uses.doze.push(L.id);
      if (L.guards.some((g) => g.wakeAt > 0)) uses.alarm.push(L.id);
      if (L.motion.length) uses.motion.push(L.id);
      if (L.tip) tips[L.tip] ??= L.id;
    }
    for (const [m, ids] of Object.entries(uses)) {
      expect(ids.length, `${m} nights`).toBeGreaterThanOrEqual(3);
      expect(new Set(ids.map((id) => id.split('-')[0])).size, `${m} houses`).toBeGreaterThanOrEqual(2);
      expect(tips[m], `${m} tip`).toBe(ids[0]);
    }
    // none of them existed before v3.4
    for (const [h, i] of OLD) {
      const L = getLevel(h, i);
      expect(L.guards.some((g) => g.doze || g.wakeAt) || L.motion.length > 0).toBe(false);
    }
  });

  it('the last night of each new house is its finale', () => {
    for (const h of [5, 6, 7]) {
      expect(getLevel(h, 9).finale).toBe(true);
      expect(getLevel(h, 8).finale).toBe(false);
    }
  });
});
