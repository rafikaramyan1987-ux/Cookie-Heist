import { describe, it, expect } from 'vitest';
import { getLevel } from '../../src/levels/all';
import { closedTargets, startSightings, stationaryGuards, crossingWaits, MAX_CROSS_WAIT } from '../../src/game/audit';

describe('level audit (real guard simulation)', () => {
  for (let h = 0; h < 5; h++)
    for (let i = 0; i < 12; i++) {
      const L = getLevel(h, i);
      it(`${L.id}: no stationary adult guard, safe start, every patrol cycle opens a path, readable only-route windows`, () => {
        // every awake adult walks a patrol (no guard parked forever)
        expect(stationaryGuards(L)).toEqual([]);
        // nobody sees the start or the first three steps during the first 3 s (any seed)
        expect(startSightings(L, 3, 3)).toEqual([]);
        // start → required cookies → bed through cells that are each clear at least every 6 s
        expect(closedTargets(L, 6)).toEqual([]);
        // a guard controlling the only route opens a window to cross it at least every 10 s
        expect(crossingWaits(L).filter((s) => s.maxWait > MAX_CROSS_WAIT).map((s) => s.maxWait)).toEqual([]);
      });
    }
});
