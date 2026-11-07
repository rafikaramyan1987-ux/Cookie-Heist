import type { Level, Vec2 } from "./types";

/**
 * Grid helpers on the level's cell / edge representation: exact line-of-sight
 * (grid traversal against wall edges and tall props), ray distance (used for the
 * rendered vision cones so visuals match the rules), A* routing, collision.
 */

export interface Edges {
  eh: Uint8Array;
  ev: Uint8Array;
}

/** edge values that block movement & sight */
export const blocks = (v: number) => v === 1 || v === 3 || v === 4;

export function cellOf(p: Vec2) {
  return { cx: Math.floor(p.x), cz: Math.floor(p.z) };
}

/** Distance along a ray until it hits a wall edge, a tall prop or leaves the level. */
export function rayDist(
  L: Level,
  E: Edges,
  x0: number,
  z0: number,
  dx: number,
  dz: number,
  maxD: number,
): number {
  const w = L.w,
    d = L.d;
  let cx = Math.floor(x0),
    cz = Math.floor(z0);
  const stepX = dx > 0 ? 1 : -1,
    stepZ = dz > 0 ? 1 : -1;
  const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMX = dx !== 0 ? (dx > 0 ? cx + 1 - x0 : x0 - cx) * tDX : Infinity;
  let tMZ = dz !== 0 ? (dz > 0 ? cz + 1 - z0 : z0 - cz) * tDZ : Infinity;
  for (let guard = 0; guard < 64; guard++) {
    if (tMX < tMZ) {
      if (tMX > maxD) return maxD;
      const line = stepX > 0 ? cx + 1 : cx;
      if (cz < 0 || cz >= d) return tMX;
      if (blocks(E.ev[cz * (w + 1) + line])) return tMX;
      cx += stepX;
      if (cx < 0 || cx >= w || L.room[cz * w + cx] < 0) return tMX;
      if (L.tall[cz * w + cx]) return tMX;
      tMX += tDX;
    } else {
      if (tMZ > maxD) return maxD;
      const line = stepZ > 0 ? cz + 1 : cz;
      if (cx < 0 || cx >= w) return tMZ;
      if (blocks(E.eh[line * w + cx])) return tMZ;
      cz += stepZ;
      if (cz < 0 || cz >= d || L.room[cz * w + cx] < 0) return tMZ;
      if (L.tall[cz * w + cx]) return tMZ;
      tMZ += tDZ;
    }
  }
  return maxD;
}

export function los(L: Level, E: Edges, a: Vec2, b: Vec2): boolean {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) return true;
  return rayDist(L, E, a.x, a.z, dx / dist, dz / dist, dist) >= dist - 1e-4;
}

/** Can one step from cell a to orthogonal neighbour b (edges open)? */
function edgeOpen(
  L: Level,
  E: Edges,
  x: number,
  z: number,
  nx: number,
  nz: number,
): boolean {
  if (nx > x) return !blocks(E.ev[z * (L.w + 1) + x + 1]);
  if (nx < x) return !blocks(E.ev[z * (L.w + 1) + x]);
  if (nz > z) return !blocks(E.eh[(z + 1) * L.w + x]);
  return !blocks(E.eh[z * L.w + x]);
}

export type Passable = (i: number) => boolean;

export function walkable(L: Level, forGuard: boolean): Passable {
  return (i) => L.room[i] >= 0 && !L.solid[i] && (!forGuard || !L.hide[i]);
}

export function canStep(
  L: Level,
  E: Edges,
  pass: Passable,
  x: number,
  z: number,
  dx: number,
  dz: number,
  goal = -1,
): boolean {
  const nx = x + dx,
    nz = z + dz;
  if (nx < 0 || nz < 0 || nx >= L.w || nz >= L.d) return false;
  const ni = nz * L.w + nx;
  if (!pass(ni) && ni !== goal) return false;
  if (dx === 0 || dz === 0) return edgeOpen(L, E, x, z, nx, nz);
  // diagonal: both L-paths must be open
  const ia = z * L.w + nx,
    ib = nz * L.w + x;
  if (!pass(ia) || !pass(ib)) return false;
  return (
    edgeOpen(L, E, x, z, nx, z) &&
    edgeOpen(L, E, nx, z, nx, nz) &&
    edgeOpen(L, E, x, z, x, nz) &&
    edgeOpen(L, E, x, nz, nx, nz)
  );
}

const DIRS8: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414],
];

/** A* over cells. Returns cell centres from (excluding) start to goal, or null. */
export function findPath(
  L: Level,
  E: Edges,
  pass: Passable,
  from: Vec2,
  to: Vec2,
  diag = true,
): Vec2[] | null {
  const w = L.w,
    n = w * L.d;
  const s = Math.floor(from.z) * w + Math.floor(from.x);
  const g = Math.floor(to.z) * w + Math.floor(to.x);
  if (s === g) return [];
  if (s < 0 || g < 0 || s >= n || g >= n) return null;
  const gx = g % w,
    gz = (g / w) | 0;
  const cost = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  // binary heap
  const heap: number[] = [];
  const f = new Float32Array(n);
  const push = (i: number) => {
    heap.push(i);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (f[heap[p]] <= f[heap[k]]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1,
          r = l + 1;
        let m = k;
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  cost[s] = 0;
  f[s] = Math.hypot(gx - (s % w), gz - ((s / w) | 0));
  push(s);
  const dirs = diag ? DIRS8 : DIRS8.slice(0, 4);
  while (heap.length) {
    const i = pop();
    if (i === g) break;
    if (closed[i]) continue;
    closed[i] = 1;
    const x = i % w,
      z = (i / w) | 0;
    for (const [dx, dz, c] of dirs) {
      if (!canStep(L, E, pass, x, z, dx, dz, g)) continue;
      const ni = (z + dz) * w + x + dx;
      const nc = cost[i] + c;
      if (nc < cost[ni]) {
        cost[ni] = nc;
        prev[ni] = i;
        f[ni] = nc + Math.hypot(gx - x - dx, gz - z - dz);
        push(ni);
      }
    }
  }
  if (prev[g] < 0) return null;
  const out: Vec2[] = [];
  for (let i = g; i !== s; i = prev[i])
    out.push({ x: (i % w) + 0.5, z: ((i / w) | 0) + 0.5 });
  out.reverse();
  return out;
}

/** BFS distance field (in steps, 4-neighbour) from a cell; Infinity when unreachable. */
export function distanceField(
  L: Level,
  E: Edges,
  pass: Passable,
  from: Vec2,
): Float32Array {
  const w = L.w,
    n = w * L.d;
  const dist = new Float32Array(n).fill(Infinity);
  const s = Math.floor(from.z) * w + Math.floor(from.x);
  if (s < 0 || s >= n) return dist;
  dist[s] = 0;
  const q = [s];
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % w,
      z = (i / w) | 0;
    for (const [dx, dz] of DIRS8.slice(0, 4)) {
      if (!canStep(L, E, pass, x, z, dx, dz)) continue;
      const ni = (z + dz) * w + x + dx;
      if (dist[ni] !== Infinity) continue;
      dist[ni] = dist[i] + 1;
      q.push(ni);
    }
  }
  return dist;
}

/** Push a circle out of solid cells and wall edges. */
export function collide(
  L: Level,
  E: Edges,
  p: Vec2,
  r: number,
  solidFor: (i: number) => boolean,
) {
  const w = L.w;
  const T = 0.08;
  for (let iter = 0; iter < 2; iter++) {
    const cx = Math.floor(p.x),
      cz = Math.floor(p.z);
    for (let z = cz - 1; z <= cz + 1; z++)
      for (let x = cx - 1; x <= cx + 1; x++) {
        const out =
          x < 0 || z < 0 || x >= w || z >= L.d || L.room[z * w + x] < 0;
        if (out || solidFor(z * w + x)) pushBox(p, r, x, z, x + 1, z + 1);
        // edges of this cell
        if (x >= 0 && x < w && z >= 0 && z <= L.d && z >= 0) {
          if (z <= L.d && blocks(E.eh[z * w + x] ?? 0))
            pushBox(p, r, x, z - T, x + 1, z + T);
        }
        if (z >= 0 && z < L.d && x >= 0 && x <= w) {
          if (blocks(E.ev[z * (w + 1) + x] ?? 0))
            pushBox(p, r, x - T, z, x + T, z + 1);
        }
      }
  }
}

function pushBox(
  p: Vec2,
  r: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
) {
  const qx = Math.max(x0, Math.min(p.x, x1));
  const qz = Math.max(z0, Math.min(p.z, z1));
  const dx = p.x - qx,
    dz = p.z - qz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    p.x = qx + (dx / d) * r;
    p.z = qz + (dz / d) * r;
  } else {
    // centre inside the box: push out along the smallest axis
    const l = p.x - x0 + r,
      rr = x1 - p.x + r,
      t = p.z - z0 + r,
      b = z1 - p.z + r;
    const m = Math.min(l, rr, t, b);
    if (m === l) p.x = x0 - r;
    else if (m === rr) p.x = x1 + r;
    else if (m === t) p.z = z0 - r;
    else p.z = z1 + r;
  }
}

export const angleDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
