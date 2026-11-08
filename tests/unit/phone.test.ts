import { describe, it, expect } from 'vitest';
import { World, PHONE_CYCLE, PHONE_TIME, GUARD_CFG } from '../../src/game/world';
import { testLevel } from './helpers';

describe('teen phone break (a predictable, visible safe window)', () => {
  it('every cycle she stops ~2 s with a small beam, then walks on with the full beam', () => {
    const L = testLevel([{ k: 'teen', p: '0,4 6,4', w: 0.5 }]);
    const w = new World(L, { seed: 3 });
    w.ghost = true;
    w.player.x = -10;
    w.player.z = -10;
    const g = w.guards[0];
    let phoneT = 0,
      movedOnPhone = 0,
      minRange = 99,
      maxRange = 0;
    let px = g.x,
      pz = g.z;
    const T = PHONE_CYCLE * 3;
    for (let i = 0; i < T * 60; i++) {
      w.step(1 / 60, { mx: 0, mz: 0 });
      const ph = w.phoneLevel(g);
      const v = w.visionOf(g);
      if (ph > 0.95) {
        phoneT += 1 / 60;
        movedOnPhone += Math.hypot(g.x - px, g.z - pz);
        minRange = Math.min(minRange, v.range);
      } else if (ph === 0) maxRange = Math.max(maxRange, v.range);
      px = g.x;
      pz = g.z;
    }
    // ~1.5 s fully on the phone per cycle (2.2 s incl. easing), 3 cycles
    expect(phoneT).toBeGreaterThan(3 * (PHONE_TIME - 0.9));
    expect(phoneT).toBeLessThan(3 * PHONE_TIME);
    expect(movedOnPhone).toBeLessThan(0.05);
    expect(minRange).toBeLessThan(GUARD_CFG.teen.range * 0.4);
    expect(maxRange).toBeCloseTo(GUARD_CFG.teen.range, 5);
  });

  it('no phone break while she is suspicious or has spotted the kid', () => {
    const L = testLevel([{ k: 'teen', p: '0,4 6,4', w: 0.5 }]);
    const w = new World(L, { seed: 3 });
    const g = w.guards[0];
    g.state = 'suspicious';
    for (let t = 0; t < PHONE_CYCLE; t += 0.1) {
      w.t = t;
      expect(w.phoneLevel(g)).toBe(0);
    }
  });
});
