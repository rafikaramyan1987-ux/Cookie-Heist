// v3.4 mechanics: the light sleeper (doze), the alarm clock (wakeAt) and the motion-sensor lamp.
import { describe, it, expect } from 'vitest';
import { World, MOTION_R, MOTION_TIME } from '../../src/game/world';
import { parseLevel } from '../../src/game/level';
import { testLevel } from './helpers';

const idle = { mx: 0, mz: 0 };
const run = (w: World, s: number, input = idle) => {
  const ev: string[] = [];
  for (let t = 0; t < s; t += 1 / 30) {
    w.step(1 / 30, input);
    for (const e of w.events) ev.push(e.type === 'doze' ? `doze:${e.up ? 'up' : 'down'}` : e.type === 'motion' ? `motion:${e.on ? 'on' : 'off'}` : e.type);
  }
  return ev;
};

describe('light sleeper (doze)', () => {
  it('sleeps, sits up and looks around for the awake time (beam on), then sleeps again — on a fixed rhythm', () => {
    const L = testLevel([{ k: 'mum', p: '4,0', sleep: true, face: 90, doze: [3, 2, 2] }]);
    const w = new World(L);
    const g = w.guards[0];
    expect(g.state).toBe('sleep');
    expect(w.visionOf(g).on).toBe(false);
    let ev = run(w, 1.9);
    expect(g.state).toBe('sleep');
    ev = run(w, 0.3);
    expect(ev).toContain('doze:up');
    expect(g.state).toBe('wait');
    expect(g.dozing).toBe(true);
    expect(w.visionOf(g).on).toBe(true);
    expect(g.moving).toBe(0); // she stays on the spot
    ev = run(w, 2.1);
    expect(ev).toContain('doze:down');
    expect(g.state).toBe('sleep');
    // the next wake-up comes `asleep` seconds later
    // she lay down at 4.0 s: up again at 7.0 s
    ev = run(w, 2.4);
    expect(ev).not.toContain('doze:up');
    ev = run(w, 0.6);
    expect(ev).toContain('doze:up');
  });

  it('a hidden kid next to her is never "camped" on', () => {
    const L = testLevel([{ k: 'mum', p: '3,4', sleep: true, face: 90, doze: [0.5, 30] }]);
    const w = new World(L, {});
    w.player.x = 3.5;
    w.player.z = 4.5; // the basket
    run(w, 1);
    expect(w.player.hidden).toBe(true);
    run(w, 6);
    expect(w.guards[0].dozing).toBe(true);
    expect(w.guards[0].campT).toBe(0);
  });

  it('needs to be asleep', () => {
    expect(() => testLevel([{ k: 'dad', p: '4,0', doze: [3, 2] }])).toThrow(/asleep/);
  });
});

describe('alarm clock (wakeAt)', () => {
  it('sleeps in bed until the alarm, then patrols the other points for the rest of the night', () => {
    const L = testLevel([{ k: 'mum', p: '6,0 1,1 5,1', sleep: true, face: 180, wakeAt: 4, w: 0.5 }]);
    expect(L.guards[0].rest).toEqual({ x: 6.5, z: 0.5 });
    expect(L.guards[0].path).toHaveLength(2);
    const w = new World(L, {});
    const g = w.guards[0];
    expect([g.x, g.z]).toEqual([6.5, 0.5]);
    let ev = run(w, 3.9);
    expect(g.state).toBe('sleep');
    expect(ev).not.toContain('alarm');
    ev = run(w, 0.2);
    expect(ev).toContain('alarm');
    expect(w.visionOf(g).on).toBe(true);
    run(w, 6);
    expect(g.state === 'patrol' || g.state === 'wait').toBe(true);
    expect(Math.hypot(g.x - 6.5, g.z - 0.5)).toBeGreaterThan(1);
    // and never goes back to sleep
    run(w, 20);
    expect(g.state).not.toBe('sleep');
  });

  it('woken early by a noise she checks it, then goes back to bed until the alarm', () => {
    const L = testLevel([{ k: 'mum', p: '6,0 1,1 5,1', sleep: true, face: 180, wakeAt: 30 }]);
    const w = new World(L, {});
    const g = w.guards[0];
    w.noise(5.5, 1.5, 5, 'toy', true);
    expect(g.state).toBe('suspicious');
    run(w, 15);
    expect(g.state).toBe('sleep');
    expect(Math.hypot(g.x - 6.5, g.z - 0.5)).toBeLessThan(0.2);
  });

  it('needs a bed spot and at least two patrol points', () => {
    expect(() => testLevel([{ k: 'mum', p: '6,0 1,1', sleep: true, wakeAt: 5 }])).toThrow(/patrol points/);
  });
});

describe('motion-sensor lamp', () => {
  const src = (dark = 'H') => ({
    map: ['KKKKKKK', 'KKKKKKK', 'HHHHHHH', 'HHHHHHH', 'BBBBBBB', 'BBBBBBB'],
    obj: ['C j    ', '       ', 'm      ', '       ', '       ', 'b      '],
    doors: '1,2n 5,2n 1,4n',
    dark,
    guards: [],
    par: 30,
  });

  it('moving inside its ring lights the dark room; it goes dark again MOTION_TIME s after the last movement', () => {
    const L = parseLevel(src(), 'farmhouse', 0);
    expect(L.motion).toHaveLength(1);
    const room = L.motion[0].room;
    const w = new World(L);
    w.player.x = 4.5;
    w.player.z = 3.5;
    expect(Math.hypot(w.player.x - L.motion[0].x, w.player.z - L.motion[0].z)).toBeGreaterThan(MOTION_R);
    // walking far from the lamp: still dark
    run(w, 0.5, { mx: 0.5, mz: 0 });
    expect(w.roomDark[room]).toBe(true);
    // into the ring
    w.player.x = 1.5;
    w.player.z = 2.5;
    const ev = run(w, 0.3, { mx: 0.5, mz: 0 });
    expect(ev).toContain('motion:on');
    expect(w.roomDark[room]).toBe(false);
    // standing still: the light stays on for MOTION_TIME, then goes off
    run(w, MOTION_TIME - 0.5);
    expect(w.roomDark[room]).toBe(false);
    const off = run(w, 1);
    expect(off).toContain('motion:off');
    expect(w.roomDark[room]).toBe(true);
  });

  it('a lit room shows the kid at the full beam range (a dark room hides at 60 %)', () => {
    const L = parseLevel({ ...src(), guards: [{ k: 'mum', p: '6,3', face: 180 }] }, 'farmhouse', 0);
    const w = new World(L);
    const g = w.guards[0];
    w.player.x = 6.5 - 3.4;
    w.player.z = 3.5;
    expect(w.canSee(g, w.player).sees).toBe(false); // 3.4 > 4.2 × 0.6
    w.roomDark[L.motion[0].room] = false;
    expect(w.canSee(g, w.player).sees).toBe(true);
  });

  it('must stand in a dark room', () => {
    expect(() => parseLevel(src(''), 'farmhouse', 0)).toThrow(/not dark/);
  });
});
