import { parseLevel, HOUSES } from '../game/level';
import type { Level, LevelSrc } from '../game/types';
import { APARTMENT } from './houses/apartment';
import { FAMILY } from './houses/family';
import { COTTAGE } from './houses/cottage';
import { CHALET } from './houses/chalet';
import { MANSION } from './houses/mansion';

/** All 60 hand-designed levels (5 houses × 12 nights). */
export const LEVEL_SRC: LevelSrc[][] = [APARTMENT, FAMILY, COTTAGE, CHALET, MANSION];

const cache = new Map<string, Level>();
export function getLevel(house: number, index: number): Level {
  const key = `${house}-${index}`;
  let l = cache.get(key);
  if (!l) {
    l = parseLevel(LEVEL_SRC[house][index], HOUSES[house], index);
    cache.set(key, l);
  }
  return l;
}

export const levelId = (house: number, index: number) => `${HOUSES[house]}-${index + 1}`;
export const HOUSE_COUNT = 5;
export const LEVELS_PER_HOUSE = 12;
