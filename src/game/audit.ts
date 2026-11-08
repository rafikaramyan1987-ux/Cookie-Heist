import type { Level } from './types';
import { World } from './world';
import { canStep, walkable } from './grid';

/**
 * Level audits on the real guard simulation (guards undisturbed, the kid invisible):
 *  - safe start: nobody can see the start or the first steps for the first seconds;
 *  - patrol windows: every route cell needed to win is clear at least once every few seconds.
 */

const OFFS = [
  [0, 0],
  [-0.3, -0.3],
  [0.3, 0.3],
  [-0.3, 0.3],
  [0.3, -0.3],
];
const STILL = { mx: 0, mz: 0 };

/**
 * Run the guards alone for `T` seconds, calling `fn` after every step.
 * `phase` (s) overrides the per-game phase of the yawn / phone / look cycles.
 */
export function guardTimeline(L: Level, T: number, fn: (w: World) => void, dt = 0.1, seed = 1, phase?: number) {
  const w = new World(L, { seed });
  if (phase !== undefined) for (const g of w.guards) g.phase = phase;
  w.ghost = true;
  // park the kid outside the house so nothing (pickups, bed, hiding) reacts to it
  w.player.x = -10;
  w.player.z = -10;
  const p = w.player;
  for (let t = 0; t < T - 1e-6; t += dt) {
    w.step(dt, STILL);
    w.status = 'play';
    p.x = -10;
    p.z = -10;
    fn(w);
  }
}

/** Can any awake guard see a kid standing anywhere in cell i? (pets only raise a "Hein ?" alarm: optional) */
export function cellSeen(w: World, i: number, pets = true): boolean {
  const L = w.L;
  const cx = (i % L.w) + 0.5,
    cz = ((i / L.w) | 0) + 0.5;
  for (const g of w.guards) {
    if (g.delay > 0 || g.state === 'sleep' || (!pets && !g.cfg.adult)) continue;
    if (g.cfg.adult && Math.hypot(g.x - cx, g.z - cz) < 0.7) return true; // standing on it
    for (const [ox, oz] of OFFS) if (w.canSee(g, { x: cx + ox, z: cz + oz }, true).sees) return true;
  }
  return false;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** The start cell and every cell within `steps` steps of it (the kid's first steps). */
export function startCells(L: Level, steps = 2): number[] {
  const pass = walkable(L, false);
  const s = Math.floor(L.start.z) * L.w + Math.floor(L.start.x);
  const depth = new Map<number, number>([[s, 0]]);
  const q = [s];
  while (q.length) {
    const c = q.shift()!;
    const d = depth.get(c)!;
    if (d >= steps) continue;
    const x = c % L.w,
      z = (c / L.w) | 0;
    for (const [dx, dz] of DIRS) {
      const j = (z + dz) * L.w + x + dx;
      if (!depth.has(j) && canStep(L, L, pass, x, z, dx, dz)) {
        depth.set(j, d + 1);
        q.push(j);
      }
    }
  }
  return [...depth.keys()];
}

/**
 * Sightings of the start area (start + first `steps` steps) during the first `T` seconds,
 * over the whole range of look / yawn / phone cycle phases: [phase, time, cell].
 */
export function startSightings(L: Level, T = 3, steps = 3, phases = 12): [number, number, number][] {
  const cells = startCells(L, steps);
  const out: [number, number, number][] = [];
  for (let k = 0; k < phases; k++) {
    const phase = (k * 10) / phases;
    guardTimeline(
      L,
      T,
      (w) => {
        for (const c of cells) if (cellSeen(w, c)) out.push([+phase.toFixed(2), +w.t.toFixed(1), c]);
      },
      0.1,
      k + 1,
      phase,
    );
  }
  return out;
}

/** Longest continuous time (s) each walkable cell is watched by an adult, over `T` seconds of patrols. */
export function watchRuns(L: Level, T = 60, dt = 0.1, phases = 3): Float32Array {
  const pass = walkable(L, false);
  const cells: number[] = [];
  for (let i = 0; i < L.w * L.d; i++) if (pass(i)) cells.push(i);
  const best = new Float32Array(L.w * L.d);
  for (let k = 0; k < phases; k++) {
    const run = new Float32Array(L.w * L.d);
    guardTimeline(
      L,
      T,
      (w) => {
        for (const c of cells) {
          run[c] = cellSeen(w, c, false) ? run[c] + dt : 0;
          if (run[c] > best[c]) best[c] = run[c];
        }
      },
      dt,
      k + 1,
      (k * 10) / phases,
    );
  }
  return best;
}

/**
 * Every patrol cycle opens a path: start → every required cookie (and pillow / key when needed) → bed
 * through cells that are each clear at least once every `maxWatch` seconds (hiding spots always count as clear).
 * Returns the targets that cannot be reached that way (empty = OK).
 */
export function closedTargets(L: Level, maxWatch = 6, T = 60): string[] {
  const runs = watchRuns(L, T);
  const base = walkable(L, false);
  const pass = (i: number) => base(i) && (L.hide[i] > 0 || runs[i] <= maxWatch);
  const keyReach = L.keys.length > 0;
  const E = keyReach
    ? {
        eh: L.eh.map((v) => (v === 3 ? 2 : v)),
        ev: L.ev.map((v) => (v === 3 ? 2 : v)),
      }
    : L;
  // flood fill from the start
  const seen = new Uint8Array(L.w * L.d);
  const s = Math.floor(L.start.z) * L.w + Math.floor(L.start.x);
  const q = [s];
  seen[s] = 1;
  while (q.length) {
    const c = q.pop()!;
    const x = c % L.w,
      z = (c / L.w) | 0;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (!canStep(L, E, pass, x, z, dx, dz)) continue;
      const j = (z + dz) * L.w + x + dx;
      if (!seen[j]) {
        seen[j] = 1;
        q.push(j);
      }
    }
  }
  const at = (x: number, z: number, solid = false) => {
    const cx = Math.floor(x),
      cz = Math.floor(z);
    if (!solid) return !!seen[cz * L.w + cx];
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dz]) => cx + dx >= 0 && cz + dz >= 0 && cx + dx < L.w && cz + dz < L.d && !!seen[(cz + dz) * L.w + cx + dx]);
  };
  const bad: string[] = [];
  L.cookies.forEach((c, i) => {
    if (i !== L.bonus && !at(c.x, c.z, c.onSolid)) bad.push(`cookie ${Math.floor(c.x)},${Math.floor(c.z)}`);
  });
  if (L.bedCheck > 0 && L.pillows.length && !L.pillows.some((p) => at(p.x, p.z))) bad.push('pillow');
  if (keyReach && !L.keys.some((k) => at(k.x, k.z))) bad.push('key');
  const b = L.bed;
  let bedOk = false;
  for (let z = b.z0 - 1; z <= b.z1; z++)
    for (let x = b.x0 - 1; x <= b.x1; x++) {
      if (x < 0 || z < 0 || x >= L.w || z >= L.d) continue;
      if (((x >= b.x0 && x < b.x1) || (z >= b.z0 && z < b.z1)) && seen[z * L.w + x]) bedOk = true;
    }
  if (!bedOk) bad.push('bed');
  return bad;
}

/** Awake adult guards that never move (a single patrol point). */
export function stationaryGuards(L: Level): number[] {
  return L.guards.flatMap((g, i) => {
    if (g.sleep || (g.kind !== 'mum' && g.kind !== 'dad' && g.kind !== 'grandma' && g.kind !== 'teen')) return [];
    const distinct = new Set(g.path.map((p) => `${p.x},${p.z}`));
    return distinct.size < 2 ? [i] : [];
  });
}

// ------------------------------------------------------------------ route control
/** a corridor every route must take opens a crossing window at least this often (s) */
export const MAX_CROSS_WAIT = 10;

/** Cells to reach: required cookies (or a cell next to them), keys / pillow when needed, and the bed sides. */
function targetSets(L: Level): number[][] {
  const pass = walkable(L, false);
  const near = (x: number, z: number, solid: boolean): number[] => {
    const cx = Math.floor(x),
      cz = Math.floor(z);
    if (!solid) return [cz * L.w + cx];
    return DIRS.map(([dx, dz]) => [cx + dx, cz + dz])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < L.w && b < L.d && pass(b * L.w + a))
      .map(([a, b]) => b * L.w + a);
  };
  const sets: number[][] = [];
  L.cookies.forEach((c, i) => {
    if (i !== L.bonus) sets.push(near(c.x, c.z, c.onSolid));
  });
  if (L.keys.length) sets.push(L.keys.flatMap((k) => near(k.x, k.z, false)));
  if (L.bedCheck > 0 && L.pillows.length) sets.push(L.pillows.flatMap((k) => near(k.x, k.z, false)));
  const b = L.bed;
  const bed: number[] = [];
  for (let z = b.z0 - 1; z <= b.z1; z++)
    for (let x = b.x0 - 1; x <= b.x1; x++) if (x >= 0 && z >= 0 && x < L.w && z < L.d && ((x >= b.x0 && x < b.x1) || (z >= b.z0 && z < b.z1)) && pass(z * L.w + x)) bed.push(z * L.w + x);
  sets.push(bed);
  return sets;
}

function flood(L: Level, blocked: number): Uint8Array {
  const pass = walkable(L, false);
  const E = L.keys.length ? { eh: L.eh.map((v) => (v === 3 ? 2 : v)), ev: L.ev.map((v) => (v === 3 ? 2 : v)) } : L;
  const ok = (i: number) => pass(i) && i !== blocked;
  const seen = new Uint8Array(L.w * L.d);
  const s = Math.floor(L.start.z) * L.w + Math.floor(L.start.x);
  if (!ok(s)) return seen;
  const q = [s];
  seen[s] = 1;
  while (q.length) {
    const c = q.pop()!;
    const x = c % L.w,
      z = (c / L.w) | 0;
    for (const [dx, dz] of DIRS) {
      if (!canStep(L, E, ok, x, z, dx, dz)) continue;
      const j = (z + dz) * L.w + x + dx;
      if (!seen[j]) {
        seen[j] = 1;
        q.push(j);
      }
    }
  }
  return seen;
}

/** Corridors every route must take (connected choke cells; hiding spots split them, they are safe rest points). */
export function chokeSegments(L: Level): number[][] {
  const sets = targetSets(L);
  const base = flood(L, -1);
  const pass = walkable(L, false);
  const s0 = Math.floor(L.start.z) * L.w + Math.floor(L.start.x);
  const choke = new Uint8Array(L.w * L.d);
  for (let c = 0; c < L.w * L.d; c++) {
    if (!base[c] || L.hide[c] || c === s0) continue;
    const f = flood(L, c);
    if (sets.some((set) => set.some((i) => base[i]) && !set.some((i) => f[i] && i !== c))) choke[c] = 1;
  }
  // the start room's own cells right next to the bed are not "corridors"
  const segs: number[][] = [];
  const done = new Uint8Array(L.w * L.d);
  for (let c = 0; c < L.w * L.d; c++) {
    if (!choke[c] || done[c]) continue;
    const seg: number[] = [];
    const q = [c];
    done[c] = 1;
    while (q.length) {
      const k = q.pop()!;
      seg.push(k);
      const x = k % L.w,
        z = (k / L.w) | 0;
      for (const [dx, dz] of DIRS) {
        const j = (z + dz) * L.w + x + dx;
        if (canStep(L, L, pass, x, z, dx, dz) && choke[j] && !done[j]) {
          done[j] = 1;
          q.push(j);
        }
      }
    }
    segs.push(seg);
  }
  return segs;
}

/**
 * Route control: for every corridor that every route must take, the longest wait (s) for a window in which the
 * whole corridor is clear of grown-ups long enough to tiptoe across it (0.6 s per cell + 0.6 s margin).
 * A guard that controls the only route must open such a window regularly (predictable) — the cone is drawn, so it is visible.
 */
export function crossingWaits(L: Level, T = 60, dt = 0.1, phases = 3): { cells: number[]; need: number; maxWait: number }[] {
  const segs = chokeSegments(L);
  const out = segs.map((cells) => ({ cells, need: 0.6 * cells.length + 0.6, maxWait: 0 }));
  if (!segs.length) return out;
  for (let k = 0; k < phases; k++) {
    const clear: boolean[][] = segs.map(() => []);
    guardTimeline(
      L,
      T,
      (w) => {
        segs.forEach((cells, si) => clear[si].push(cells.every((c) => !cellSeen(w, c, false))));
      },
      dt,
      k + 1,
      (k * 10) / phases,
    );
    segs.forEach((_, si) => {
      const need = Math.round(out[si].need / dt);
      const arr = clear[si];
      // for every moment: how long until a window long enough to cross starts
      const n = arr.length;
      const runFrom = new Int32Array(n + 1);
      for (let i = n - 1; i >= 0; i--) runFrom[i] = arr[i] ? runFrom[i + 1] + 1 : 0;
      let next = Infinity,
        worst = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (runFrom[i] >= need) next = i;
        if (i <= n - need) worst = Math.max(worst, (next === Infinity ? n : next) - i);
      }
      out[si].maxWait = Math.max(out[si].maxWait, worst * dt);
    });
  }
  return out;
}
