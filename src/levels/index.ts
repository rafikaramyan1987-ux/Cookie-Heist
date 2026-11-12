import { parseLevel, HOUSES } from '../game/level';
import type { Level, LevelSrc } from '../game/types';
import { APARTMENT } from './houses/apartment';
import { importRetry } from '../app/lazy';

/**
 * All 60 hand-designed levels (5 houses × 12 nights). The first house ships with the game; the other four are a
 * separate chunk, loaded in the background after level 1 is on screen (`loadHouses()`). Node scripts and tests
 * import `./all`, which registers every house synchronously.
 */
export const LEVEL_SRC: LevelSrc[][] = [APARTMENT];

export function registerHouses(rest: LevelSrc[][]) {
  rest.forEach((h, k) => (LEVEL_SRC[k + 1] = h));
}

let loading: Promise<void> | null = null;
/**
 * Load houses 2–5 (once, with retries); resolves when every house is available. Rejects when the chunk could not
 * be loaded (offline); a later call tries again (a failed attempt is not kept).
 */
export function loadHouses(): Promise<void> {
  if (housesLoaded()) return Promise.resolve();
  return (loading ??= importRetry(() => import('./houses/rest')).then(
    (m) => {
      registerHouses(m.REST);
      snack = m.getSnackLevel;
    },
    (e) => {
      loading = null;
      throw e;
    },
  ));
}
let snack: ((k: number) => Level) | null = null;
/** today's midnight-snack bonus night (after loadHouses()) */
export const getSnackLevel = (k: number): Level => {
  if (!snack) throw new Error('snack levels not loaded');
  return snack(k);
};
export const housesLoaded = () => LEVEL_SRC.length === HOUSE_COUNT;

const cache = new Map<string, Level>();
export function getLevel(house: number, index: number): Level {
  const key = `${house}-${index}`;
  let l = cache.get(key);
  if (!l) {
    const src = LEVEL_SRC[house]?.[index];
    if (!src) throw new Error(`level ${key} is not loaded yet`);
    l = parseLevel(src, HOUSES[house], index);
    cache.set(key, l);
  }
  return l;
}

export const levelId = (house: number, index: number) => `${HOUSES[house]}-${index + 1}`;
export const HOUSE_COUNT = 5;
export const LEVELS_PER_HOUSE = 12;
