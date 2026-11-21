/**
 * Layout generator for the v3.4 nights (houses 6–8). Builds one floorplan per call from a seed and a difficulty tier
 * (0 = first new night … 29 = last): a hall spine with rooms around it, doors, furniture placed by room type, the
 * cookie jar, a required cookie and a golden bonus cookie, the grown-ups, pets and the v3.4 mechanics. Only the
 * game's existing rooms, furniture and rules are used. The output is a plain `night(plan, opts)` source that is
 * frozen into src/levels/houses/*.ts (scripts/levels/tune.ts picks the candidates that pass every audit).
 */
import { makeRng, type Rng } from '../../src/game/rng';
import type { GuardSrc } from '../../src/game/types';
import type { Plan, NightOpts } from '../../src/levels/helpers';
import type { HouseId } from '../../src/levels/types';

export interface Candidate {
  plan: Plan;
  opts: NightOpts;
  /** generator knobs, for the report */
  knobs: Record<string, unknown>;
}

/** room letters a house uses besides the kitchen (K), the kid's bedroom (B) and the hall (H) */
const HOUSE_ROOMS: Record<string, string[]> = {
  farmhouse: ['L', 'D', 'P', 'G', 'C', 'E'],
  beachhouse: ['L', 'D', 'P', 'T', 'A', 'E'],
  castle: ['M', 'Y', 'D', 'P', 'G', 'L', 'E'],
};

type Cell = { x: number; z: number };
interface Room {
  letter: string;
  x0: number;
  z0: number;
  x1: number; // inclusive
  z1: number;
}

export function generate(house: HouseId, tier: number, seed: number, variant = 0): Candidate | null {
  let rng = makeRng(seed * 7919 + tier * 104729 + 13);
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const pick = <T>(a: T[]): T => a[Math.floor(rng() * a.length)];
  const shuffle = <T>(a: T[]): T[] => {
    const o = a.slice();
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  };

  // ---------------------------------------------------------------- size and spine
  const W = Math.min(13, 10 + Math.floor(tier / 9) + ri(0, 1));
  const D = Math.min(14, 11 + Math.floor(tier / 8) + ri(0, 1));
  const map: string[][] = Array.from({ length: D }, () => Array(W).fill('?'));
  const rooms: Room[] = [];
  const kind = pick(['H', 'H2', 'V', 'U'] as const);
  const hall: Cell[] = [];
  const setHall = (x: number, z: number) => {
    map[z][x] = 'H';
    hall.push({ x, z });
  };
  // bands of rooms around the hall: [x0, z0, x1, z1, split axis]
  const bands: [number, number, number, number, 'x' | 'z'][] = [];
  if (kind === 'H' || kind === 'H2') {
    // horizontal hall, 2 rows (H) or 1 row + a side column (H2)
    const r = ri(3, D - 6);
    const tall = kind === 'H' ? 2 : 1;
    for (let z = r; z < r + tall; z++) for (let x = 0; x < W; x++) setHall(x, z);
    if (kind === 'H2') {
      const c = ri(3, W - 4);
      for (let z = r + 1; z < D; z++) setHall(c, z);
      bands.push([0, 0, W - 1, r - 1, 'x'], [0, r + 1, c - 1, D - 1, 'z'], [c + 1, r + 1, W - 1, D - 1, 'z']);
    } else bands.push([0, 0, W - 1, r - 1, 'x'], [0, r + 2, W - 1, D - 1, 'x']);
  } else if (kind === 'V') {
    const c = ri(3, W - 5);
    for (let z = 0; z < D; z++) for (let x = c; x < c + 2; x++) setHall(x, z);
    bands.push([0, 0, c - 1, D - 1, 'z'], [c + 2, 0, W - 1, D - 1, 'z']);
  } else {
    // U: two 1-row halls joined by a column
    const r1 = ri(3, 4);
    const r2 = ri(D - 5, D - 4);
    const c = ri(3, W - 4);
    for (let x = 0; x < W; x++) {
      setHall(x, r1);
      setHall(x, r2);
    }
    for (let z = r1 + 1; z < r2; z++) setHall(c, z);
    bands.push([0, 0, W - 1, r1 - 1, 'x'], [0, r1 + 1, c - 1, r2 - 1, 'z'], [c + 1, r1 + 1, W - 1, r2 - 1, 'z'], [0, r2 + 1, W - 1, D - 1, 'x']);
  }
  // split each band into rooms of 3..6 cells along its split axis
  for (const [x0, z0, x1, z1, ax] of bands) {
    if (x1 < x0 || z1 < z0) return null;
    const len = ax === 'x' ? x1 - x0 + 1 : z1 - z0 + 1;
    const cuts: number[] = [];
    let at = 0;
    while (len - at > 6) {
      const step = ri(3, Math.min(6, len - at - 3));
      at += step;
      cuts.push(at);
    }
    const edges = [0, ...cuts, len];
    for (let k = 0; k + 1 < edges.length; k++) {
      const a = edges[k],
        b = edges[k + 1] - 1;
      rooms.push(ax === 'x' ? { letter: '?', x0: x0 + a, z0, x1: x0 + b, z1 } : { letter: '?', x0, z0: z0 + a, x1, z1: z0 + b });
    }
  }
  if (rooms.length < 4) return null;
  // ---------------------------------------------------------------- room letters
  // the kid's bedroom: a room in a bottom corner; the kitchen: the room farthest from it
  const centre = (r: Room) => ({ x: (r.x0 + r.x1 + 1) / 2, z: (r.z0 + r.z1 + 1) / 2 });
  const bottom = rooms.filter((r) => r.z1 === D - 1 && (r.x0 === 0 || r.x1 === W - 1));
  if (!bottom.length) return null;
  const bed = pick(bottom);
  bed.letter = 'B';
  const far = rooms
    .filter((r) => r !== bed)
    .sort((a, b) => Math.hypot(centre(b).x - centre(bed).x, centre(b).z - centre(bed).z) - Math.hypot(centre(a).x - centre(bed).x, centre(a).z - centre(bed).z));
  const kitchen = far.find((r) => r.x1 - r.x0 >= 2 && r.z1 - r.z0 >= 2) ?? far[0];
  kitchen.letter = 'K';
  // a bedroom for a light sleeper first (grandma's or the parents'), then the house's other rooms
  const sleeperRoom = house === 'beachhouse' ? ['P'] : shuffle(['G', 'P']);
  const pool = [...sleeperRoom, ...shuffle(HOUSE_ROOMS[house].filter((l) => !sleeperRoom.includes(l)))];
  for (const r of rooms) if (r.letter === '?') r.letter = pool.length ? pool.shift()! : pick(HOUSE_ROOMS[house]);
  // neighbouring rooms must differ (same letter = one merged room)
  for (const r of rooms)
    for (const q of rooms) if (r !== q && r.letter === q.letter && touching(r, q)) q.letter = HOUSE_ROOMS[house].find((l) => !rooms.some((o) => o.letter === l && touching(o, q))) ?? q.letter;
  for (const r of rooms) for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) map[z][x] = r.letter;
  // a notch cut out of one top corner room (silhouette variety), never the kitchen or the bedroom
  const notch = rng() < 0.5 ? rooms.find((r) => r.z0 === 0 && (r.x0 === 0 || r.x1 === W - 1) && r !== kitchen && r !== bed && r.x1 - r.x0 >= 3 && r.z1 - r.z0 >= 3) : undefined;
  if (notch) {
    const nx = notch.x0 === 0 ? [notch.x0, notch.x0 + 1] : [notch.x1 - 1, notch.x1];
    for (const x of nx) map[0][x] = '.';
  }
  // ---------------------------------------------------------------- doors
  const doors: string[] = [];
  const doorCells = new Set<string>();
  const key = (x: number, z: number) => `${x},${z}`;
  const addDoor = (a: Cell, b: Cell) => {
    // edge between neighbouring cells a and b, written from a
    const side = b.x > a.x ? 'e' : b.x < a.x ? 'w' : b.z > a.z ? 's' : 'n';
    doors.push(`${a.x},${a.z}${side}`);
    doorCells.add(key(a.x, a.z));
    doorCells.add(key(b.x, b.z));
    return doors.length - 1;
  };
  const roomDoor: Record<string, number> = {};
  for (const r of rooms) {
    // cells of the room next to the hall
    const opts: [Cell, Cell][] = [];
    for (let z = r.z0; z <= r.z1; z++)
      for (let x = r.x0; x <= r.x1; x++)
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx,
            nz = z + dz;
          if (nx >= 0 && nz >= 0 && nx < W && nz < D && map[nz][nx] === 'H' && map[z][x] !== '.') opts.push([{ x, z }, { x: nx, z: nz }]);
        }
    if (!opts.length) return null;
    const n = r === bed || rng() < 0.7 ? 2 : 1;
    const used = new Set<number>();
    for (let k = 0; k < n; k++) {
      let i = Math.floor(rng() * opts.length);
      if (used.has(i) || [...used].some((u) => Math.abs(opts[u][0].x - opts[i][0].x) + Math.abs(opts[u][0].z - opts[i][0].z) < 3)) {
        if (k > 0) continue;
      }
      used.add(i);
      roomDoor[r.letter + k] = addDoor(opts[i][0], opts[i][1]);
      i++;
    }
  }
  // room ↔ room doors
  for (const r of shuffle(rooms).slice(0, ri(2, 4))) {
    const nb = rooms.filter((q) => q !== r && touching(r, q));
    if (!nb.length) continue;
    const q = pick(nb);
    const pairs: [Cell, Cell][] = [];
    for (let z = r.z0; z <= r.z1; z++)
      for (let x = r.x0; x <= r.x1; x++)
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx,
            nz = z + dz;
          if (nx >= q.x0 && nx <= q.x1 && nz >= q.z0 && nz <= q.z1 && map[z][x] !== '.' && map[nz][nx] !== '.') pairs.push([{ x, z }, { x: nx, z: nz }]);
        }
    if (pairs.length) addDoor(...pick(pairs));
  }
  // ---------------------------------------------------------------- furniture
  const obj: string[][] = Array.from({ length: D }, () => Array(W).fill(' '));
  const free = (x: number, z: number) => x >= 0 && z >= 0 && x < W && z < D && map[z][x] !== '.' && obj[z][x] === ' ' && !doorCells.has(key(x, z));
  const SOLID = new Set('CjNOFRndPASVZEhKIJMXYGleqibm'.split(''));
  const roomOf = (x: number, z: number) => rooms.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  /** every walkable cell of the room is still connected (furniture never cuts a room in two) */
  const roomConnected = (r: Room) => {
    const cells: Cell[] = [];
    for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if (map[z][x] !== '.' && !SOLID.has(obj[z][x])) cells.push({ x, z });
    if (!cells.length) return false;
    const seen = new Set([key(cells[0].x, cells[0].z)]);
    const q = [cells[0]];
    while (q.length) {
      const c = q.pop()!;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = c.x + dx,
          nz = c.z + dz;
        if (nx < r.x0 || nx > r.x1 || nz < r.z0 || nz > r.z1 || seen.has(key(nx, nz)) || map[nz][nx] === '.' || SOLID.has(obj[nz][nx])) continue;
        seen.add(key(nx, nz));
        q.push({ x: nx, z: nz });
      }
    }
    return seen.size === cells.length;
  };
  /** put `ch` on the cells, or undo when the room would be cut in two */
  const hallConnected = () => {
    const cells = hall.filter((c) => !SOLID.has(obj[c.z][c.x]));
    if (!cells.length) return false;
    const seen = new Set([key(cells[0].x, cells[0].z)]);
    const q = [cells[0]];
    while (q.length) {
      const c = q.pop()!;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = c.x + dx,
          nz = c.z + dz;
        if (map[nz]?.[nx] !== 'H' || seen.has(key(nx, nz)) || SOLID.has(obj[nz][nx])) continue;
        seen.add(key(nx, nz));
        q.push({ x: nx, z: nz });
      }
    }
    return seen.size === cells.length;
  };
  const tryPut = (cells: Cell[], ch: string): boolean => {
    for (const c of cells) obj[c.z][c.x] = ch;
    const r = roomOf(cells[0].x, cells[0].z);
    if ((r && !roomConnected(r)) || (!r && !hallConnected())) {
      for (const c of cells) obj[c.z][c.x] = ' ';
      return false;
    }
    return true;
  };
  const placeRow = (r: Room, items: string, z: number, fromLeft: boolean): Cell[] => {
    const out: Cell[] = [];
    let x = fromLeft ? r.x0 : r.x1;
    for (const ch of items) {
      while (x >= r.x0 && x <= r.x1 && !free(x, z)) x += fromLeft ? 1 : -1;
      if (x < r.x0 || x > r.x1) break;
      if (tryPut([{ x, z }], ch)) out.push({ x, z });
      x += fromLeft ? 1 : -1;
    }
    return out;
  };
  const rect = (r: Room, ch: string, w: number, d: number, where: 'corner' | 'mid' | 'any'): Cell | null => {
    const spots: Cell[] = [];
    for (let z = r.z0; z + d - 1 <= r.z1; z++)
      for (let x = r.x0; x + w - 1 <= r.x1; x++) {
        let ok = true;
        for (let zz = z; zz < z + d && ok; zz++) for (let xx = x; xx < x + w && ok; xx++) if (!free(xx, zz)) ok = false;
        // keep a free ring around the rectangle inside the room's interior except along walls
        const corner = (x === r.x0 || x + w - 1 === r.x1) && (z === r.z0 || z + d - 1 === r.z1);
        const mid = x > r.x0 && x + w - 1 < r.x1 && z > r.z0 && z + d - 1 < r.z1;
        if (ok && (where === 'any' || (where === 'corner' && corner) || (where === 'mid' && mid))) spots.push({ x, z });
      }
    for (const s of shuffle(spots)) {
      const cells: Cell[] = [];
      for (let zz = s.z; zz < s.z + d; zz++) for (let xx = s.x; xx < s.x + w; xx++) cells.push({ x: xx, z: zz });
      if (tryPut(cells, ch)) return s;
    }
    return null;
  };
  const along = (r: Room, ch: string): Cell | null => {
    // a single item against a wall of the room
    const spots: Cell[] = [];
    for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if ((x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1) && free(x, z)) spots.push({ x, z });
    for (const s of shuffle(spots)) if (tryPut([s], ch)) return s;
    return null;
  };
  let jar: Cell | null = null;
  const sleepSpots: { room: Room; at: Cell }[] = [];
  for (const r of rooms) {
    const w = r.x1 - r.x0 + 1,
      d = r.z1 - r.z0 + 1;
    switch (r.letter) {
      case 'K': {
        const row = placeRow(r, pick(['CjNO', 'CNjO', 'jCNO', 'CNOj']) + (w >= 6 ? 'F' : ''), r.z0, rng() < 0.5);
        jar = row.find((c) => obj[c.z][c.x] === 'j') ?? null;
        if (d >= 4 && w >= 4) rect(r, 'T', 2, 1, 'mid');
        break;
      }
      case 'B': {
        // the kid's bed: 2 cells along the west or east wall, at the bottom
        const x = rng() < 0.5 ? r.x0 : r.x1;
        const z = r.z1 - 1;
        if (!free(x, z) || !free(x, z + 1)) return null;
        obj[z][x] = 'b';
        obj[z + 1][x] = 'b';
        const nx = x === r.x0 ? x + 1 : x - 1;
        if (free(nx, z + 1)) obj[z + 1][nx] = 'n';
        along(r, 'W');
        along(r, 'X');
        break;
      }
      case 'P':
      case 'G': {
        const s = rect(r, 'Z', 2, 2, 'corner');
        if (s) sleepSpots.push({ room: r, at: s });
        along(r, 'd');
        if (r.letter === 'G') along(r, 'G');
        else if (rng() < 0.5) along(r, 'U');
        break;
      }
      case 'L':
        rect(r, 'S', 2, 1, 'any');
        along(r, 'V');
        along(r, 'A');
        if (rng() < 0.6) rect(r, 'r', 2, 2, 'mid');
        break;
      case 'D':
        rect(r, 'T', 2, d >= 5 ? 2 : 1, 'mid');
        along(r, house === 'castle' ? 'q' : 'R');
        break;
      case 'C':
        along(r, 'Q');
        along(r, 'd');
        break;
      case 'A':
        along(r, 'Y');
        along(r, 'P');
        break;
      case 'T':
        along(r, 'd');
        along(r, 'A');
        along(r, 'W');
        break;
      case 'E':
        along(r, house === 'castle' ? 'M' : 'e');
        along(r, 'o');
        break;
      case 'M':
        if (w >= 5 && d >= 4) {
          obj[r.z0 + 1][r.x0 + 1] = free(r.x0 + 1, r.z0 + 1) ? 'I' : obj[r.z0 + 1][r.x0 + 1];
          obj[r.z0 + 1][r.x1 - 1] = free(r.x1 - 1, r.z0 + 1) ? 'I' : obj[r.z0 + 1][r.x1 - 1];
        }
        along(r, 'J');
        along(r, 'q');
        break;
      case 'Y':
        placeRow(r, 'RR', r.z0, rng() < 0.5);
        along(r, 'A');
        break;
    }
  }
  // hall decoration and hiding spots
  const hallFree = hall.filter((c) => free(c.x, c.z));
  for (let k = 0; k < Math.min(2, hallFree.length); k++) {
    const c = pick(hallFree);
    if (free(c.x, c.z) && hallNeighbours(map, c) <= 2) tryPut([c], house === 'castle' && rng() < 0.4 ? 'K' : 'P');
  }
  const baskets = tier < 10 ? 2 : ri(1, 2);
  for (let k = 0; k < baskets; k++) {
    const c = pick(hallFree);
    if (free(c.x, c.z)) obj[c.z][c.x] = 'Q';
  }
  if (!jar) return null;
  // ---------------------------------------------------------------- cookies
  const start: Cell = { x: bed.x0 + (obj[bed.z1][bed.x0] === 'b' ? 1 : bed.x1 - bed.x0 - 1), z: bed.z1 - 1 };
  const roomCells = (r: Room) => {
    const out: Cell[] = [];
    for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if (free(x, z) && z < r.z1) out.push({ x, z });
    return out;
  };
  const dist = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  const others = rooms.filter((r) => r !== bed && r !== kitchen).sort((a, b) => dist(centre(b) as Cell, start) - dist(centre(a) as Cell, start));
  if (others.length < 2) return null;
  const cRoom = others[ri(0, Math.min(1, others.length - 1))];
  const gRoom = others.filter((r) => r !== cRoom)[0];
  const cc = roomCells(cRoom).sort((a, b) => dist(b, start) - dist(a, start))[0];
  const gc = pick(roomCells(gRoom));
  if (!cc || !gc) return null;
  obj[cc.z][cc.x] = 'c';
  obj[gc.z][gc.x] = 'g';

  // ---------------------------------------------------------------- guards, pets, mechanics
  // a separate random stream per variant: the same layout with other patrols / mechanics
  rng = makeRng(seed * 31 + variant * 977 + tier * 7 + 5);
  const guards: GuardSrc[] = [];
  const knobs: Record<string, unknown> = { kind, W, D };
  // at most 3 awake grown-ups: later nights get harder through size, route length and the mechanics instead
  const adults = tier < 4 ? 1 : tier < 12 ? 2 : 3;
  const kinds = shuffle(house === 'beachhouse' ? ['mum', 'dad', 'teen', 'mum'] : house === 'castle' ? ['dad', 'mum', 'grandma', 'teen'] : ['mum', 'dad', 'grandma', 'mum']) as GuardSrc['k'][];
  // a hall sweep for the first adult, room loops for the others
  const hallRows = [...new Set(hall.map((c) => c.z))];
  const hallCols = [...new Set(hall.map((c) => c.x))];
  const longest = (): [Cell, Cell] => {
    let best: [Cell, Cell] = [hall[0], hall[0]];
    for (const z of hallRows) {
      const xs = hall.filter((c) => c.z === z).map((c) => c.x);
      const a = { x: Math.min(...xs) + 1, z },
        b = { x: Math.max(...xs) - 1, z };
      if (dist(a, b) > dist(...best)) best = [a, b];
    }
    for (const x of hallCols) {
      const zs = hall.filter((c) => c.x === x).map((c) => c.z);
      const a = { x, z: Math.min(...zs) + 1 },
        b = { x, z: Math.max(...zs) - 1 };
      if (dist(a, b) > dist(...best)) best = [a, b];
    }
    return best;
  };
  const speed = () => +(0.85 + rng() * 0.35).toFixed(2);
  for (let k = 0; k < adults; k++) {
    const kk = kinds[k % kinds.length];
    if (k === 0) {
      const [a, b] = longest();
      // half the hall: the far half from the bedroom door first
      const seg = rng() < 0.5 ? [a, b] : [b, a];
      guards.push({ k: kk, p: `${seg[0].x},${seg[0].z} ${seg[1].x},${seg[1].z}`, w: +(1 + rng() * 0.8).toFixed(1), speed: speed(), delay: ri(2, 4) });
    } else {
      // walk between two rooms through the hall
      const rs = shuffle(rooms.filter((r) => r !== bed));
      const p1 = pick(roomCells(rs[0])),
        p2 = pick(roomCells(rs[1]));
      if (!p1 || !p2) continue;
      guards.push({ k: kk, p: `${p1.x},${p1.z} ${p2.x},${p2.z}`, w: +(1.2 + rng() * 1).toFixed(1), speed: speed(), delay: ri(3, 6) });
    }
  }
  // light sleepers on the double beds
  // alarm tiers with a single double bed give it to the alarm clock (light sleepers are on the other nights)
  const dozers = tier >= 18 && sleepSpots.length === 1 ? 0 : Math.min(sleepSpots.length - (tier >= 18 ? 1 : 0), tier < 10 ? 1 : ri(1, 2));
  for (let k = 0; k < dozers; k++) {
    const s = sleepSpots[k];
    const asleep = +(4.5 + rng() * 2.5).toFixed(1),
      awake = +(2 + rng() * 1.5).toFixed(1);
    guards.push({ k: s.room.letter === 'G' ? 'grandma' : pick(['mum', 'dad'] as const), p: `${s.at.x},${s.at.z}`, sleep: true, face: 90, doze: [asleep, awake, +(2 + rng() * 3).toFixed(1)] });
  }
  // a pet near the golden cookie
  const pet = pick(['cat', 'cat', 'vacuum'] as const);
  if (pet === 'cat') guards.push({ k: 'cat', p: `${gc.x},${Math.max(gRoom.z0, gc.z - 1)}`, face: 90 });
  else {
    const a = pick(roomCells(gRoom)),
      b = pick(roomCells(gRoom));
    if (a && b && dist(a, b) >= 2) guards.push({ k: 'vacuum', p: `${a.x},${a.z} ${b.x},${b.z}`, w: 1 });
  }
  // the alarm clock (castle tiers): a sleeper who gets up mid-night and walks the hall
  let alarm = false;
  if (tier >= 18 && sleepSpots.length > dozers) {
    const s = sleepSpots[dozers];
    const [a, b] = longest();
    guards.push({ k: pick(['mum', 'dad'] as const), p: `${s.at.x},${s.at.z} ${a.x},${a.z} ${b.x},${b.z}`, sleep: true, face: 90, wakeAt: ri(18, 35), w: 1.5, speed: speed() });
    alarm = true;
  }
  // motion lamps (beach house and later): a dark room with a sensor lamp on a wall
  let dark = '';
  if (tier >= 8) {
    const cand = rooms.filter((r) => r !== bed && r !== kitchen && r.letter !== 'H');
    const lamps = tier >= 20 ? 2 : 1;
    for (const r of shuffle(cand).slice(0, lamps)) {
      const s = along(r, 'm');
      if (s) dark += r.letter;
    }
  }
  // bed check with a pillow decoy, locked door with a key (later tiers)
  let bedCheck: number | undefined;
  if (tier >= 14 && rng() < 0.5) {
    const pr = pick(rooms.filter((r) => r !== bed));
    const pc = pick(roomCells(pr));
    if (pc) {
      obj[pc.z][pc.x] = 'p';
      bedCheck = 70 + tier;
    }
  }
  let locked = 0;
  if (tier >= 16 && rng() < 0.5) {
    const d0 = roomDoor[cRoom.letter + '0'];
    if (d0 !== undefined && roomDoor[cRoom.letter + '1'] === undefined) {
      const kr = pick(rooms.filter((r) => r !== cRoom && r !== bed));
      const kc = pick(roomCells(kr));
      if (kc) {
        doors[d0] += 'L';
        obj[kc.z][kc.x] = 'k';
        locked = 1;
      }
    }
  }
  Object.assign(knobs, { adults, dozers, pet, alarm, dark, bedCheck: !!bedCheck, locked });
  const plan: Plan = {
    map: map.map((r) => r.join('')),
    obj: obj.map((r) => r.join('').replace(/\s+$/, '')),
    doors: doors.join(' '),
    windows: windowsFor(map, W, D, rng),
  };
  const opts: NightOpts = { guards, par: 60, toys: tier < 10 ? 1 : tier < 20 ? 2 : 3, ...(dark ? { dark } : {}), ...(bedCheck ? { bedCheck } : {}) };
  return { plan, opts, knobs };
}

function touching(a: Room, b: Room) {
  const xo = a.x0 <= b.x1 && b.x0 <= a.x1;
  const zo = a.z0 <= b.z1 && b.z0 <= a.z1;
  return (xo && (a.z1 + 1 === b.z0 || b.z1 + 1 === a.z0)) || (zo && (a.x1 + 1 === b.x0 || b.x1 + 1 === a.x0));
}

function hallNeighbours(map: string[][], c: Cell) {
  let n = 0;
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    if (map[c.z + dz]?.[c.x + dx] === 'H') n++;
  return n;
}

/** a few windows on the outside walls */
function windowsFor(map: string[][], W: number, D: number, rng: Rng) {
  const out: string[] = [];
  for (let x = 1; x < W - 1; x += 3 + Math.floor(rng() * 3)) if (map[0][x] !== '.' && map[0][x] !== 'H') out.push(`${x},0n`);
  for (let z = 1; z < D - 1; z += 3 + Math.floor(rng() * 3)) {
    if (map[z][0] !== '.' && map[z][0] !== 'H') out.push(`0,${z}w`);
    if (map[z][W - 1] !== '.' && map[z][W - 1] !== 'H') out.push(`${W - 1},${z}e`);
  }
  return out.join(' ');
}
