import { describe, it, expect } from 'vitest';
import { World } from '../../src/game/world';
import { testLevel } from './helpers';

const still = { mx: 0, mz: 0 };

describe('guard states', () => {
  it('patrol → suspicious → chase → caught when the kid stands in the light', () => {
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
    expect(states.has('chase')).toBe(true);
    expect(w.status).toBe('caught');
    expect(w.stats.spotted).toBeGreaterThan(0);
  });

  it('a brief glimpse only makes the guard suspicious', () => {
    const L = testLevel([{ k: 'mum', p: '1,4', face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    const g = w.guards[0];
    w.player.x = 5.3;
    w.player.z = 4.5;
    for (let i = 0; i < 24; i++) w.step(1 / 60, still);
    expect(['suspicious', 'look']).toContain(g.state);
    expect(g.alert).toBeLessThan(1);
  });

  it('loses track, searches, then returns to its post', () => {
    const L = testLevel([{ k: 'mum', p: '1,4', face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    const g = w.guards[0];
    g.state = 'chase';
    g.target = { x: 6.5, z: 1.5 };
    // the kid slipped away into the bedroom, out of sight
    w.player.x = 6.5;
    w.player.z = 6.5;
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 15; i++) {
      w.step(1 / 60, still);
      seen.add(g.state);
    }
    expect(seen.has('search')).toBe(true);
    expect(['wait', 'patrol', 'return']).toContain(g.state);
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
