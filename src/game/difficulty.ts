import type { Level, Vec2 } from './types';
import { distanceField, walkable } from './grid';

/**
 * Static difficulty measures of a level (deterministic, no simulation), used to check that the v3.4 nights get a
 * little longer or harder one after the other (tests/unit/levels-v34.test.ts, docs/levels-v34.md).
 *
 * - `route`: the shortest walk, in cells, from the start through every required cookie (and every key, when the level
 *   has locked doors) and back into bed, ignoring the grown-ups (the "length" of the night)
 * - `score`: route + the pressure on that route: awake grown-ups 8 each, pets 4, sleepers / light sleepers / alarm
 *   clocks 5, a bed check 6, a locked door 3, a dark room 2, a motion lamp 3
 */
export interface Difficulty {
  route: number;
  awake: number;
  sleepers: number;
  pets: number;
  score: number;
}

export function difficulty(L: Level): Difficulty {
  const open = { eh: L.eh.map((v) => (v === 3 ? 2 : v)), ev: L.ev.map((v) => (v === 3 ? 2 : v)) };
  const pass = walkable(L, false);
  const cell = (p: Vec2) => Math.floor(p.z) * L.w + Math.floor(p.x);
  // a jar on the counter is picked up from a neighbouring free cell
  const reachCells = (p: Vec2, onSolid: boolean): number[] => {
    if (!onSolid) return [cell(p)];
    const cx = Math.floor(p.x),
      cz = Math.floor(p.z);
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
      .map(([dx, dz]) => [cx + dx, cz + dz])
      .filter(([x, z]) => x >= 0 && z >= 0 && x < L.w && z < L.d && pass(z * L.w + x))
      .map(([x, z]) => z * L.w + x);
  };
  const b = L.bed;
  const bedCells: number[] = [];
  for (let z = b.z0 - 1; z <= b.z1; z++) for (let x = b.x0 - 1; x <= b.x1; x++) if (x >= 0 && z >= 0 && x < L.w && z < L.d && pass(z * L.w + x)) bedCells.push(z * L.w + x);
  const targets: number[][] = [
    ...L.cookies.flatMap((c, i) => (i === L.bonus ? [] : [reachCells(c, c.onSolid)])),
    ...(L.eh.includes(3) || L.ev.includes(3) ? L.keys.map((k) => [cell(k)]) : []),
  ];
  const fieldFrom = (cells: number[]) => {
    let best: Float32Array | null = null;
    for (const c of cells) {
      const f = distanceField(L, open, pass, { x: (c % L.w) + 0.5, z: Math.floor(c / L.w) + 0.5 });
      if (!best) best = f;
      else for (let i = 0; i < f.length; i++) best[i] = Math.min(best[i], f[i]);
    }
    return best!;
  };
  const dist = (f: Float32Array, cells: number[]) => Math.min(...cells.map((c) => f[c]));
  const fStart = distanceField(L, open, pass, L.start);
  const fT = targets.map(fieldFrom);
  // exact shortest order over the (few) targets
  let route = Infinity;
  const perm = (order: number[], rest: number[]) => {
    if (!rest.length) {
      let d = dist(fStart, targets[order[0]] ?? bedCells);
      for (let k = 1; k < order.length; k++) d += dist(fT[order[k - 1]], targets[order[k]]);
      d += order.length ? dist(fT[order[order.length - 1]], bedCells) : 0;
      route = Math.min(route, d);
      return;
    }
    rest.forEach((r, k) => perm([...order, r], rest.filter((_, j) => j !== k)));
  };
  perm([], targets.map((_, i) => i));
  const awake = L.guards.filter((g) => !g.sleep && g.kind !== 'cat' && g.kind !== 'vacuum').length;
  const sleepers = L.guards.filter((g) => g.sleep).length;
  const pets = L.guards.filter((g) => g.kind === 'cat' || g.kind === 'vacuum').length;
  const locked = [...L.eh, ...L.ev].filter((v) => v === 3).length;
  const dark = L.roomDark.filter(Boolean).length;
  const score = route + 8 * awake + 5 * sleepers + 4 * pets + (L.bedCheck > 0 ? 6 : 0) + 3 * locked + 2 * dark + 3 * L.motion.length;
  return { route: Math.round(route * 10) / 10, awake, sleepers, pets, score: Math.round(score * 10) / 10 };
}
