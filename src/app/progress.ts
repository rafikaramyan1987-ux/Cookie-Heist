import type { SaveData } from './save';
import { HOUSE_COUNT, levelId, nightsIn } from '../levels/index';

/**
 * Progress through the houses, from the save alone (no level data needed). Levels unlock in play order: a night opens
 * when the one before it is done (won or skipped), the first night of a house when the previous house's finale is
 * done. Progress is keyed by level id (`<house>-<night>`), so new houses added after the last one (v3.4: houses 6–8)
 * open for players who had finished everything before, and nothing they had is lost.
 */
export function isDone(save: SaveData, h: number, i: number): boolean {
  const id = levelId(h, i);
  return save.stars[id] !== undefined || !!save.skipped[id];
}

export function unlocked(save: SaveData, h: number, i: number): boolean {
  if (h === 0 && i === 0) return true;
  if (h < 0 || h >= HOUSE_COUNT || i < 0 || i >= nightsIn(h)) return false;
  if (i === 0) return isDone(save, h - 1, nightsIn(h - 1) - 1);
  return isDone(save, h, i - 1);
}

/** the first night that is open and not done yet (the very last night when everything is done) */
export function nextLevel(save: SaveData): [number, number] {
  for (let h = 0; h < HOUSE_COUNT; h++) for (let i = 0; i < nightsIn(h); i++) if (!isDone(save, h, i) && unlocked(save, h, i)) return [h, i];
  return [HOUSE_COUNT - 1, nightsIn(HOUSE_COUNT - 1) - 1];
}

/** the night after (h, i) in play order, or null after the last one */
export function nextNight(h: number, i: number): [number, number] | null {
  if (i + 1 < nightsIn(h)) return [h, i + 1];
  return h + 1 < HOUSE_COUNT ? [h + 1, 0] : null;
}
