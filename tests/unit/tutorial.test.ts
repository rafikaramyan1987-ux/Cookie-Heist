import { describe, it, expect } from 'vitest';
import { World } from '../../src/game/world';
import { getLevel, getSnackLevel } from '../../src/levels/all';
import { simulate, PROFILES } from '../../src/game/bot';
import type { Vec2 } from '../../src/game/types';

/** steer the kid through waypoints at tiptoe speed; returns false if it takes too long */
function walk(w: World, pts: Vec2[], onStep: () => void = () => {}, maxT = 20) {
  const t0 = w.t;
  for (const p of pts) {
    while (Math.hypot(p.x - w.player.x, p.z - w.player.z) > 0.15 && w.status === 'play') {
      const dx = p.x - w.player.x,
        dz = p.z - w.player.z,
        d = Math.hypot(dx, dz);
      w.step(1 / 60, { mx: (dx / d) * 0.5, mz: (dz / d) * 0.5 });
      onStep();
      if (w.t - t0 > maxT) return false;
    }
  }
  return true;
}
const idle = (w: World, s: number, onStep: () => void = () => {}) => {
  for (let i = 0; i < s * 60 && w.status === 'play'; i++) {
    w.step(1 / 60, { mx: 0, mz: 0 });
    onStep();
  }
};

describe('night 1 tutorial (scripted near miss)', () => {
  it('mum stays off-stage until the kid hides, sweeps right past the basket, never catches, "Phew!", cookie within 15 s', () => {
    const L = getLevel(0, 0);
    const w = new World(L, { seed: 3 });
    const mum = w.guards[0];
    expect(mum.spec.cue).toBe(true);
    // drag to sneak → the basket
    const events: string[] = [];
    let closest = 99,
      cueAt = -1,
      clearAt = -1,
      cookieAt = -1;
    const watch = () => {
      for (const e of w.events) {
        events.push(e.type);
        if (e.type === 'cue') cueAt = w.t;
        if (e.type === 'cueClear') clearAt = w.t;
        if (e.type === 'cookie') cookieAt = w.t;
      }
      if (mum.cueState === 1) closest = Math.min(closest, Math.hypot(mum.x - w.player.x, mum.z - w.player.z));
    };
    // before hiding, mum is off-stage: no beam
    idle(w, 1, watch);
    expect(mum.coneOn).toBe(false);
    expect(walk(w, [{ x: 4.5, z: 6.5 }], watch)).toBe(true);
    idle(w, 0.5, watch);
    expect(w.player.hidden).toBe(true);
    expect(cueAt).toBeGreaterThan(0);
    // the kid tries to leave while mum is near: held in the basket
    for (let i = 0; i < 60 * 8 && clearAt < 0; i++) {
      w.step(1 / 60, { mx: 0, mz: -0.5 });
      watch();
      expect(w.status).toBe('play');
    }
    expect(clearAt).toBeGreaterThan(cueAt);
    expect(closest).toBeLessThan(1.6); // a real near miss
    expect(w.stats.spotted).toBe(0);
    // grab the cookie, back to bed
    expect(walk(w, [{ x: 1.5, z: 5.5 }, { x: 1.5, z: 3.4 }, { x: 0.7, z: 1.4 }], watch)).toBe(true);
    expect(cookieAt).toBeGreaterThan(0);
    expect(cookieAt).toBeLessThan(15);
    console.log(`hide→mum ${cueAt.toFixed(1)} s, phew ${clearAt.toFixed(1)} s, cookie ${cookieAt.toFixed(1)} s, closest ${closest.toFixed(2)}`);
    expect(walk(w, [{ x: 1.5, z: 3.4 }, { x: 1.5, z: 5.2 }, { x: 0.6, z: 5.6 }], watch)).toBe(true);
    idle(w, 0.2, watch);
    expect(w.status).toBe('won');
    expect(mum.cueState).toBe(2);
  });

  it('a player who never hides still plays a calm, winnable night (mum never comes)', () => {
    const r = simulate(new World(getLevel(0, 0), { seed: 1 }), PROFILES.beginner, 1);
    expect(r.won).toBe(true);
  });
});

describe('midnight snack bonus nights', () => {
  for (let k = 0; k < 3; k++)
    it(`snack ${k + 1}: 2 cookies win, solvable by the bot`, () => {
      const L = getSnackLevel(k);
      expect(L.minCookies).toBe(2);
      expect(L.cookies.length).toBeGreaterThanOrEqual(6);
      let wins = 0;
      for (let s = 1; s <= 4; s++) if (simulate(new World(L, { seed: s }), PROFILES.average, s).won) wins++;
      expect(wins).toBeGreaterThanOrEqual(3);
    });
});
