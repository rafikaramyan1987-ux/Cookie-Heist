import { describe, it, expect } from 'vitest';
import { World, NOISE } from '../../src/game/world';
import { testLevel } from './helpers';

describe('noise', () => {
  it('creaky boards alert guards within the radius', () => {
    const L = testLevel([{ k: 'mum', p: '3,3', face: 0, look: [0] }], { obj: ['C j    ', '       ', '       ', '       ', '  ~Q   ', '       ', 'b      '] });
    const w = new World(L, { seed: 1 });
    expect(L.creaky[4 * L.w + 2]).toBe(1);
    w.player.x = 1.9;
    w.player.z = 4.5;
    w.step(1 / 60, { mx: 0, mz: 0 });
    // tiptoe onto the board
    let heard = false;
    for (let i = 0; i < 30; i++) {
      w.step(1 / 60, { mx: 0.5, mz: 0 });
      if (w.events.some((e) => e.type === 'heard')) heard = true;
    }
    expect(w.stats.noises).toBeGreaterThan(0);
    expect(heard).toBe(true);
  });

  it('noise beyond the radius is not heard', () => {
    const L = testLevel([{ k: 'mum', p: '6,0', face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    w.noise(0.5, 6.5, NOISE.creakTiptoe, 'creak', true);
    expect(w.guards[0].state).not.toBe('suspicious');
  });

  it('running makes footstep noise, tiptoeing does not', () => {
    const L = testLevel([]);
    const tip = new World(L, { seed: 1 });
    tip.player.x = 1.5;
    tip.player.z = 4.5;
    for (let i = 0; i < 60; i++) tip.step(1 / 60, { mx: 0.4, mz: 0 });
    expect(tip.stats.noises).toBe(0);
    const run = new World(L, { seed: 1 });
    run.player.x = 1.5;
    run.player.z = 4.5;
    for (let i = 0; i < 60; i++) run.step(1 / 60, { mx: 1, mz: 0 });
    expect(run.stats.noises).toBeGreaterThan(0);
  });

  it('a thrown toy lures guards to where it lands', () => {
    const L = testLevel([{ k: 'mum', p: '2,1', face: 180, look: [180] }], { toys: 1 });
    const w = new World(L, { seed: 1 });
    w.player.x = 3.5;
    w.player.z = 4.5;
    w.step(1 / 60, { mx: 0, mz: 0, throwAt: { x: 5.5, z: 1.5 } });
    expect(w.toys).toBe(0);
    for (let i = 0; i < 60; i++) w.step(1 / 60, { mx: 0, mz: 0 });
    const g = w.guards[0];
    expect(g.state).toBe('suspicious');
    expect(Math.round(g.target.x)).toBe(6);
  });
});
