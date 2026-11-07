import { describe, it, expect } from 'vitest';
import { World, SPOT_REACT, EDGE_ALERT } from '../../src/game/world';
import { testLevel } from './helpers';

const still = { mx: 0, mz: 0 };

describe('guard states', () => {
  it('patrol → suspicious → spotted ("!") → caught when the kid stands in the light', () => {
    const L = testLevel([{ k: 'mum', p: '1,4 6,4', w: 1 }]);
    const w = new World(L, { seed: 1 });
    const g = w.guards[0];
    expect(g.state).toBe('patrol');
    // put the kid right in front of mum's path, in plain sight
    w.player.x = 4.5;
    w.player.z = 4.5;
    const states = new Set<string>();
    for (let i = 0; i < 600 && w.status === 'play'; i++) {
      w.step(1 / 60, still);
      states.add(g.state);
    }
    expect(states.has('spot')).toBe(true);
    expect(w.status).toBe('caught');
    expect(w.stats.spotted).toBeGreaterThan(0);
  });

  it('a brief glimpse only makes the guard suspicious', () => {
    const L = testLevel([{ k: 'mum', p: '1,4', face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    const g = w.guards[0];
    w.player.x = 5.3;
    w.player.z = 4.5;
    for (let i = 0; i < 45; i++) w.step(1 / 60, still); // 0.75 s far out in the beam
    expect(['suspicious', 'look']).toContain(g.state);
    expect(g.alert).toBeLessThan(1);
  });

  it('catch on sight: after "!" the kid freezes and is caught after the reaction time — no foot race', () => {
    const L = testLevel([{ k: 'mum', p: '1,4', face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    w.player.x = 4.6;
    w.player.z = 4.5;
    const flee = { mx: 1, mz: 0, run: true }; // sprint away from mum (east)
    let spotT = -1;
    let spotX = 0;
    for (let i = 0; i < 600 && w.status === 'play'; i++) {
      w.step(1 / 60, spotT < 0 ? { mx: 0, mz: 0 } : flee);
      if (spotT < 0 && w.events.some((e) => e.type === 'spotted')) {
        spotT = w.t;
        spotX = w.player.x;
      }
    }
    expect(spotT).toBeGreaterThan(0);
    expect(w.status).toBe('caught');
    expect(w.t - spotT).toBeLessThanOrEqual(SPOT_REACT + 0.05);
    expect(Math.abs(w.player.x - spotX)).toBeLessThan(0.05); // frozen: could not run
    expect(w.stats.spotted).toBe(1);
  });

  it('a glimpse in a dark room is only a "Hein ?" until mum comes close', () => {
    const L = testLevel([{ k: 'mum', p: '0,4', face: 0, look: [0] }], {
      dark: 'H',
    });
    const w = new World(L, { seed: 1 });
    const g = w.guards[0];
    w.player.x = 2.6;
    w.player.z = 4.5;
    let spotD = -1;
    let maxFar = 0;
    for (let i = 0; i < 600 && w.status === 'play'; i++) {
      w.step(1 / 60, { mx: 0, mz: 0 });
      const d = Math.hypot(g.x - w.player.x, g.z - w.player.z);
      if (d > 1.3) maxFar = Math.max(maxFar, g.alert);
      if (spotD < 0 && w.events.some((e) => e.type === 'spotted')) spotD = d;
    }
    expect(maxFar).toBeLessThanOrEqual(EDGE_ALERT);
    expect(spotD).toBeGreaterThan(0);
    expect(spotD).toBeLessThan(1.3);
  });

  it('after a noise she looks around for at most ~3 s, then goes back to her route', () => {
    const L = testLevel([{ k: 'mum', p: '1,4 5,4', w: 1 }]);
    const w = new World(L, { seed: 1 });
    w.player.x = -10;
    w.player.z = -10;
    w.ghost = true;
    const g = w.guards[0];
    w.noise(1.5, 2.5, 4, 'toy', true); // just through the kitchen door
    expect(g.state).toBe('suspicious');
    let look = 0,
      maxLook = 0;
    for (let i = 0; i < 60 * 20; i++) {
      w.step(1 / 60, { mx: 0, mz: 0 });
      look = g.state === 'look' ? look + 1 / 60 : 0;
      maxLook = Math.max(maxLook, look);
    }
    expect(maxLook).toBeGreaterThan(1);
    expect(maxLook).toBeLessThanOrEqual(3);
    expect(['wait', 'patrol']).toContain(g.state);
  });

  it('sleeping guards wake on nearby noise only', () => {
    const L = testLevel([{ k: 'dad', p: '3,1', sleep: true }]);
    const w = new World(L, { seed: 1 });
    const g = w.guards[0];
    w.noise(3.5, 6.5, 2.3, 'creak', true); // far away, through walls
    expect(g.state).toBe('sleep');
    w.noise(3.5, 2.5, 2.3, 'creak', true);
    expect(g.state).toBe('suspicious');
  });
});
