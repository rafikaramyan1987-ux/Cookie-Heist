// Progress with the v3.4 houses: players who had finished the old 60 nights keep everything and find the 30 new
// nights unlocked in order (house 6 night 1 first); unfinished players are not skipped ahead.
import { describe, it, expect } from 'vitest';
import { parseSave, defaultSave, type SaveData } from '../../src/app/save';
import { isDone, unlocked, nextLevel, nextNight } from '../../src/app/progress';
import { ALL_LEVELS, NIGHTS, HOUSE_COUNT, levelId, nightsIn } from '../../src/levels/all';
import { nextUnlock } from '../../src/app/meta';

/** a save as v3.3 wrote it: every one of the old 60 nights won (or `upTo` of them) */
function oldSave(upTo = 60, extra: Partial<SaveData> = {}): SaveData {
  const stars: Record<string, number> = {};
  ALL_LEVELS.slice(0, upTo).forEach(([h, i], k) => (stars[levelId(h, i)] = (k % 3) + 1));
  return parseSave(JSON.stringify({ v: 1, coins: 4321, stars, best: { 'apartment-1': 9.5 }, owned: ['skin:starry', 'skin:dino'], skin: 'dino', tutorialDone: true, ...extra }));
}

describe('progress across the v3.4 houses', () => {
  it('8 houses: 5 × 12 + 3 × 10 = 90 nights, the new ones after the old ones', () => {
    expect(HOUSE_COUNT).toBe(8);
    expect([...NIGHTS]).toEqual([12, 12, 12, 12, 12, 10, 10, 10]);
    expect(ALL_LEVELS).toHaveLength(90);
    expect(ALL_LEVELS.slice(0, 60).every(([h]) => h < 5)).toBe(true);
    expect(ALL_LEVELS.slice(60).map(([h, i]) => levelId(h, i))).toEqual([
      ...Array.from({ length: 10 }, (_, i) => `farmhouse-${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `beachhouse-${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `castle-${i + 1}`),
    ]);
  });

  it('a player who finished all 60 old nights keeps every star, coin and item, and night 61 (Farmhouse 1) is next', () => {
    const s = oldSave(60);
    expect(Object.keys(s.stars)).toHaveLength(60);
    expect(s.coins).toBe(4321);
    expect(s.skin).toBe('dino');
    expect(s.owned).toContain('skin:dino');
    for (const [h, i] of ALL_LEVELS.slice(0, 60)) {
      expect(isDone(s, h, i)).toBe(true);
      expect(unlocked(s, h, i)).toBe(true);
    }
    expect(unlocked(s, 5, 0)).toBe(true);
    expect(unlocked(s, 5, 1)).toBe(false);
    expect(unlocked(s, 6, 0)).toBe(false);
    expect(unlocked(s, 7, 0)).toBe(false);
    expect(nextLevel(s)).toEqual([5, 0]);
  });

  it('the new nights open one after the other, house after house', () => {
    const s = oldSave(60);
    for (let k = 60; k < 90; k++) {
      const [h, i] = ALL_LEVELS[k];
      expect(nextLevel(s)).toEqual([h, i]);
      expect(unlocked(s, h, i)).toBe(true);
      if (k + 1 < 90) expect(unlocked(s, ...ALL_LEVELS[k + 1])).toBe(false);
      s.stars[levelId(h, i)] = 2;
    }
    // everything done: the last night stays the "next" one
    expect(nextLevel(s)).toEqual([7, nightsIn(7) - 1]);
  });

  it('a skipped night (rewarded ad) counts as done for unlocking', () => {
    const s = oldSave(60);
    s.skipped['farmhouse-1'] = true;
    expect(unlocked(s, 5, 1)).toBe(true);
    expect(nextLevel(s)).toEqual([5, 1]);
  });

  it('players in the middle of the old houses are not moved: their next night is the same as before', () => {
    const s = oldSave(40); // up to Snowy Chalet 4
    expect(nextLevel(s)).toEqual([3, 4]);
    expect(unlocked(s, 5, 0)).toBe(false);
    expect(nextLevel(defaultSave())).toEqual([0, 0]);
  });

  it('play order: after the mansion finale comes Farmhouse 1; after the last night, nothing', () => {
    expect(nextNight(4, 11)).toEqual([5, 0]);
    expect(nextNight(5, 9)).toEqual([6, 0]);
    expect(nextNight(6, 9)).toEqual([7, 0]);
    expect(nextNight(7, 9)).toBeNull();
    expect(nextNight(0, 3)).toEqual([0, 4]);
  });

  it('the next-unlock teaser counts the right number of nights per house', () => {
    const s = oldSave(60);
    const done = (h: number, i: number) => isDone(s, h, i);
    expect(nextUnlock(s, done, HOUSE_COUNT, nightsIn)).toEqual({ kind: 'house', house: 6, n: 10 });
  });
});
