import { parseLevel } from '../game/level';
import type { Level } from '../game/types';
import { night } from './helpers';
import { A1, A2, A3 } from './houses/apartment';

/**
 * "Midnight snack": a bonus night, once a day (rotating between 3 layouts). Lots of cookies, sleepy grown-ups;
 * 2 cookies are enough to win, every cookie pays coins. Never affects stars or progress.
 */
const SRC = [
  night(A3, {
    put: 'j 0,0; c 0,1 3,1 1,3 4,2 7,2 3,3; Q 0,4',
    guards: [
      { k: 'dad', p: '7,8', sleep: true, face: 90 },
      { k: 'mum', p: '8,9', sleep: true, face: 90 },
    ],
    par: 45,
  }),
  night(A2, {
    put: 'j 0,0; c 0,1 2,1 3,3 5,2 7,1 6,3; Q 4,4',
    guards: [{ k: 'mum', p: '0,5 7,5', w: 2.5, speed: 0.45, delay: 4 }],
    par: 45,
  }),
  night(A1, {
    put: 'j 0,0; c 1,1 2,2 4,1 5,2 6,1 4,3',
    doors: '1,4n',
    guards: [{ k: 'cat', p: '5,5 6,7', w: 2, speed: 0.5 }],
    par: 40,
  }),
];

export const SNACK_MIN = 2;

const cache = new Map<number, Level>();
export function getSnackLevel(k: number): Level {
  let l = cache.get(k);
  if (!l) {
    const p = parseLevel(SRC[k % SRC.length], 'apartment', 0);
    l = { ...p, id: `snack-${(k % SRC.length) + 1}`, nameKey: `lv_snack_${(k % SRC.length) + 1}`, need: SNACK_MIN, bonus: -1, minCookies: SNACK_MIN, tip: null, finale: false };
    cache.set(k, l);
  }
  return l;
}
