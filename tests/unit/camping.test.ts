import { describe, it, expect } from 'vitest';
import { World, CAMP_MAX } from '../../src/game/world';
import { testLevel } from './helpers';

const still = { mx: 0, mz: 0 };

describe('no camping', () => {
  it('a guard never idles more than ~3 s right next to a hidden kid', () => {
    // mum's post is two cells from the laundry basket and she would wait 20 s there
    const L = testLevel([{ k: 'mum', p: '1,4 2,4', w: 20 }]);
    const w = new World(L, { seed: 1 });
    w.player.x = 3.5;
    w.player.z = 4.5;
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(w.player.hidden).toBe(true);
    const g = w.guards[0];
    let idle = 0,
      maxIdle = 0,
      moved = 0;
    for (let i = 0; i < 60 * 60; i++) {
      w.step(1 / 60, still);
      idle = w.campingNear(g) ? idle + 1 / 60 : 0;
      maxIdle = Math.max(maxIdle, idle);
      if (g.moving > 0.5) moved++;
    }
    expect(w.status).toBe('play');
    expect(maxIdle).toBeLessThanOrEqual(CAMP_MAX + 0.05);
    expect(maxIdle).toBeLessThanOrEqual(3);
    expect(moved).toBeGreaterThan(0);
  });

  it('keeps her normal wait when the hidden kid is far away', () => {
    const L = testLevel([{ k: 'mum', p: '1,1 2,1', w: 20 }]);
    const w = new World(L, { seed: 1 });
    w.player.x = 1.5;
    w.player.z = 6.5; // under the bed covers, other room
    w.player.hidden = true;
    w.player.stillT = 1;
    const g = w.guards[0];
    for (let i = 0; i < 60 * 8; i++) w.step(1 / 60, still);
    expect(g.state).toBe('wait');
  });
});
