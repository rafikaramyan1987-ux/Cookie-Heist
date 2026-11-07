import { describe, it, expect } from 'vitest';
import { getLevel } from '../../src/levels/index';
import { closedTargets, startSightings, stationaryGuards } from '../../src/game/audit';

describe('level audit (real guard simulation)', () => {
  for (let h = 0; h < 5; h++)
    for (let i = 0; i < 12; i++) {
      const L = getLevel(h, i);
      it(`${L.id}: no stationary adult guard, safe start, every patrol cycle opens a path`, () => {
        // every awake adult walks a patrol (no guard parked forever)
        expect(stationaryGuards(L)).toEqual([]);
        // nobody sees the start or the first three steps during the first 3 s (any seed)
        expect(startSightings(L, 3, 3)).toEqual([]);
        // start → required cookies → bed through cells that are each clear at least every 6 s
        expect(closedTargets(L, 6)).toEqual([]);
      });
    }
});
