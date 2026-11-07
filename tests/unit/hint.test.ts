import { describe, it, expect } from 'vitest';
import { getLevel } from '../../src/levels/index';
import { findHint, followHint, recordHint } from '../../src/game/hint';

describe('hints', () => {
  it('a hint is a safe route for that exact attempt: following it like a person wins', () => {
    for (const [h, i] of [
      [0, 3],
      [0, 10],
      [2, 4],
    ]) {
      const L = getLevel(h, i);
      const H = findHint(L, 4242)!;
      expect(H).not.toBeNull();
      expect(H.path.length).toBeGreaterThan(5);
      // the markers are in time order and each opens after it starts
      for (let k = 0; k < H.waits.length; k++) {
        expect(H.waits[k].t1).toBeGreaterThan(H.waits[k].t0);
        if (k) expect(H.waits[k].t0).toBeGreaterThanOrEqual(H.waits[k - 1].t1 - 1e-6);
      }
      let ok = 0;
      for (let s = 1; s <= 6; s++) if (followHint(L, H, s)) ok++;
      expect(ok).toBeGreaterThanOrEqual(5);
    }
  });

  it('is deterministic for a seed (the attempt is played on the hint seed)', () => {
    const L = getLevel(0, 6);
    const a = recordHint(L, 77)!;
    const b = recordHint(L, 77)!;
    expect(a).not.toBeNull();
    expect(b.path).toEqual(a.path);
    expect(b.waits).toEqual(a.waits);
  });

  it('a corridor guard gives a "wait here" moment on Double ennui (apartment-11)', () => {
    const L = getLevel(0, 10);
    const H = findHint(L, 9)!;
    expect(H.waits.length).toBeGreaterThan(0);
  });
});
