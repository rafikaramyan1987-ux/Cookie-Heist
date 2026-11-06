import type { HouseId, LevelDef, PropDef, RoomDef, Side, FloorKind, WallKind } from '../levels/types';
import type { GuardSpec, Level, LevelSrc } from './types';

/**
 * Parses the compact ASCII level format into the runtime Level.
 *
 * map layer: one letter per cell = room (K kitchen, H hall, B bedroom, P parents, L living,
 *   A bath, T teen, G grandma, D dining, O study, C laundry, E entrance, M ballroom, Y library)
 * obj layer: see OBJ table below.
 */

export const HOUSES: HouseId[] = ['apartment', 'family', 'cottage', 'chalet', 'mansion'];

type Style = [FloorKind, WallKind];
const BASE_STYLES: Record<string, Style> = {
  K: ['checker', 'stripesCream'],
  H: ['darkwood', 'teal'],
  B: ['oak', 'starsBlue'],
  P: ['carpetRose', 'floral'],
  L: ['parquet', 'paintPeach'],
  A: ['tileBlue', 'paintGrey'],
  T: ['carpetBlue', 'paintSage'],
  G: ['carpetRose', 'floral'],
  D: ['oak', 'stripesCream'],
  O: ['darkwood', 'paintSage'],
  C: ['tileBlue', 'paintGrey'],
  E: ['stone', 'paintPeach'],
  M: ['marble', 'damask'],
  Y: ['parquet', 'panel'],
};
const HOUSE_STYLES: Record<HouseId, Record<string, Style>> = {
  apartment: { K: ['tileBlue', 'paintGrey'], H: ['concrete', 'paintGrey'], L: ['parquet', 'paintGrey'], B: ['oak', 'starsBlue'], P: ['carpetBlue', 'paintPeach'], T: ['carpetBlue', 'paintSage'] },
  family: {},
  cottage: { K: ['stone', 'floral'], H: ['pine', 'floral'], L: ['pine', 'floral'], G: ['carpetRose', 'floral'], B: ['pine', 'starsBlue'], D: ['pine', 'paintPeach'] },
  chalet: { K: ['pine', 'logs'], H: ['pine', 'logs'], L: ['oak', 'logs'], B: ['pine', 'logs'], P: ['carpetRose', 'logs'], E: ['stone', 'logs'], D: ['oak', 'logs'], T: ['carpetBlue', 'logs'] },
  mansion: { K: ['checker', 'panel'], H: ['marble', 'damask'], L: ['parquet', 'panel'], B: ['parquet', 'starsBlue'], P: ['carpetRose', 'damask'], M: ['marble', 'damask'], Y: ['parquet', 'panel'], D: ['marble', 'panel'], E: ['marble', 'damask'] },
};

export const HIDE = { table: 1, basket: 2, wardrobe: 3, curtain: 4 } as const;

interface ObjInfo {
  prop?: string;
  solid?: boolean;
  tall?: boolean;
  hide?: number;
  group?: boolean;
  wall?: boolean; // orient against a wall
  opts?: Record<string, unknown>;
}
const OBJ: Record<string, ObjInfo> = {
  T: { prop: 'table', hide: HIDE.table, group: true },
  W: { prop: 'wardrobe', hide: HIDE.wardrobe, wall: true },
  Q: { prop: 'laundryBasket', hide: HIDE.basket },
  U: { prop: 'curtain', hide: HIDE.curtain, wall: true },
  C: { prop: 'counter', solid: true, wall: true },
  j: { prop: 'counter', solid: true, wall: true },
  N: { prop: 'sink', solid: true, wall: true },
  O: { prop: 'stove', solid: true, wall: true },
  F: { prop: 'fridge', solid: true, tall: true, wall: true },
  R: { prop: 'bookshelf', solid: true, tall: true, wall: true },
  n: { prop: 'nightstand', solid: true, wall: true, opts: { light: true, lightPower: 1.4, lightY: 0.8, lightColor: 0xffa66b } },
  d: { prop: 'dresser', solid: true, wall: true },
  P: { prop: 'plant', solid: true },
  A: { prop: 'armchair', solid: true, wall: true },
  S: { prop: 'sofa', solid: true, group: true, wall: true },
  V: { prop: 'tv', solid: true, wall: true, opts: { light: true, lightColor: 0x6f8cff, lightPower: 1.4, lightY: 0.7 } },
  Z: { prop: 'doubleBed', solid: true, group: true, wall: true },
  E: { prop: 'fireplace', solid: true, wall: true, opts: { light: true, lightColor: 0xff8a3d, lightPower: 2.4, lightY: 0.5 } },
  h: { prop: 'chair', solid: true },
  K: { prop: 'clock', solid: true, tall: true, wall: true },
  I: { prop: 'pillar', solid: true, tall: true },
  J: { prop: 'piano', solid: true, wall: true },
  M: { prop: 'armor', solid: true, tall: true, wall: true },
  X: { prop: 'toyBox', solid: true, wall: true },
  Y: { prop: 'bathtub', solid: true, wall: true },
  G: { prop: 'rockingChair', solid: true },
  l: { prop: 'sideTable', solid: true, wall: true, opts: { light: true, lightPower: 1.6, lightY: 0.95 } },
  e: { prop: 'bench', solid: true, wall: true },
  q: { prop: 'candelabra', solid: true, opts: { light: true, lightColor: 0xffb85c, lightPower: 1.6, lightY: 1.4 } },
  i: { prop: 'skis', solid: true, wall: true },
  o: { prop: 'boots' },
  r: { prop: 'rug', group: true },
  y: { prop: 'teddy' },
  b: { prop: 'bed', solid: true, group: true, wall: true },
};

const sideDelta: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };

export function parseLevel(src: LevelSrc, house: HouseId, index: number): Level {
  const d = src.map.length;
  const w = src.map[0].length;
  const id = `${house}-${index + 1}`;
  const at = (layer: string[], x: number, z: number) => (z >= 0 && z < d && x >= 0 && x < w ? layer[z][x] ?? '.' : '.');
  for (const row of src.map) if (row.length !== w) throw new Error(`${id}: ragged map row "${row}"`);
  for (const row of src.obj) if (row.length > w) throw new Error(`${id}: obj row too long "${row}"`);
  if (src.obj.length !== d) throw new Error(`${id}: obj has ${src.obj.length} rows, map has ${d}`);

  // rooms = connected letter regions
  const room = new Int16Array(w * d).fill(-1);
  const roomLetters: string[] = [];
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const ch = at(src.map, x, z);
      if (ch === '.' || room[z * w + x] >= 0) continue;
      const r = roomLetters.push(ch) - 1;
      const stack = [[x, z]];
      room[z * w + x] = r;
      while (stack.length) {
        const [cx, cz] = stack.pop()!;
        for (const [dx, dz] of Object.values(sideDelta)) {
          const nx = cx + dx,
            nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= w || nz >= d || room[nz * w + nx] >= 0 || at(src.map, nx, nz) !== ch) continue;
          room[nz * w + nx] = r;
          stack.push([nx, nz]);
        }
      }
    }
  const R = (x: number, z: number) => (x < 0 || z < 0 || x >= w || z >= d ? -1 : room[z * w + x]);

  // edges
  const eh = new Uint8Array(w * (d + 1));
  const ev = new Uint8Array((w + 1) * d);
  for (let z = 0; z <= d; z++) for (let x = 0; x < w; x++) if (R(x, z - 1) !== R(x, z)) eh[z * w + x] = 1;
  for (let z = 0; z < d; z++) for (let x = 0; x <= w; x++) if (R(x - 1, z) !== R(x, z)) ev[z * (w + 1) + x] = 1;
  const edgeRef = (tok: string) => {
    const m = /^(\d+),(\d+)([nsew])(L?)$/.exec(tok);
    if (!m) throw new Error(`${id}: bad edge "${tok}"`);
    const x = +m[1],
      z = +m[2],
      s = m[3] as Side;
    return { x, z, side: s, locked: m[4] === 'L' };
  };
  const setEdge = (x: number, z: number, s: Side, v: number) => {
    if (s === 'n') eh[z * w + x] = v;
    else if (s === 's') eh[(z + 1) * w + x] = v;
    else if (s === 'w') ev[z * (w + 1) + x] = v;
    else ev[z * (w + 1) + x + 1] = v;
  };
  const getEdge = (x: number, z: number, s: Side) =>
    s === 'n' ? eh[z * w + x] : s === 's' ? eh[(z + 1) * w + x] : s === 'w' ? ev[z * (w + 1) + x] : ev[z * (w + 1) + x + 1];
  const doors = (src.doors ?? '').split(/\s+/).filter(Boolean).map(edgeRef);
  for (const e of doors) {
    if (getEdge(e.x, e.z, e.side) !== 1) throw new Error(`${id}: door ${e.x},${e.z}${e.side} is not on a wall`);
    setEdge(e.x, e.z, e.side, e.locked ? 3 : 2);
  }
  const windows = (src.windows ?? '').split(/\s+/).filter(Boolean).map(edgeRef);
  for (const e of windows) if (getEdge(e.x, e.z, e.side) === 1) setEdge(e.x, e.z, e.side, 4);
  const isWall = (x: number, z: number, s: Side) => {
    const v = getEdge(x, z, s);
    return v === 1 || v === 4;
  };

  const solid = new Uint8Array(w * d);
  const tall = new Uint8Array(w * d);
  const hide = new Uint8Array(w * d);
  const creaky = new Uint8Array(w * d);
  const floorToy = new Uint8Array(w * d);
  const cookies: Level['cookies'] = [];
  const keys: Level['keys'] = [];
  const switches: Level['switches'] = [];
  const pillows: Level['pillows'] = [];
  const toyPickups: Level['toyPickups'] = [];
  const props: PropDef[] = [];
  let bed: Level['bed'] | null = null;
  let start: { x: number; z: number } | null = null;
  const used = new Uint8Array(w * d);
  const creakyList: [number, number][] = [];

  const wallSide = (x: number, z: number): Side | null => {
    for (const s of ['n', 'w', 'e', 's'] as Side[]) if (isWall(x, z, s)) return s;
    return null;
  };
  const rotFor: Record<Side, number> = { n: 0, s: 2, e: 1, w: 3 };

  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const ch = at(src.obj, x, z);
      const i = z * w + x;
      if (ch === ' ' || ch === '.') continue;
      if (R(x, z) < 0) throw new Error(`${id}: object '${ch}' outside at ${x},${z}`);
      switch (ch) {
        case 'c':
          cookies.push({ x: x + 0.5, z: z + 0.5, onSolid: false });
          continue;
        case '~':
          creaky[i] = 1;
          creakyList.push([x, z]);
          continue;
        case 't':
          floorToy[i] = 1;
          continue;
        case 'k':
          keys.push({ x: x + 0.5, z: z + 0.5 });
          continue;
        case 's':
          switches.push({ x: x + 0.5, z: z + 0.5, room: R(x, z) });
          continue;
        case 'p':
          pillows.push({ x: x + 0.5, z: z + 0.5 });
          continue;
        case 'x':
          toyPickups.push({ x: x + 0.5, z: z + 0.5 });
          continue;
        case '@':
          start = { x: x + 0.5, z: z + 0.5 };
          continue;
      }
      const info = OBJ[ch];
      if (!info) throw new Error(`${id}: unknown object '${ch}' at ${x},${z}`);
      if (used[i]) continue;
      // group rectangle
      let x1 = x,
        z1 = z;
      if (info.group) {
        while (at(src.obj, x1 + 1, z) === ch && !used[z * w + x1 + 1]) x1++;
        let ok = true;
        while (ok) {
          for (let xx = x; xx <= x1; xx++) if (at(src.obj, xx, z1 + 1) !== ch) ok = false;
          if (ok) z1++;
        }
      }
      for (let zz = z; zz <= z1; zz++)
        for (let xx = x; xx <= x1; xx++) {
          const k = zz * w + xx;
          used[k] = 1;
          if (info.solid) solid[k] = 1;
          if (info.tall) tall[k] = 1;
          if (info.hide) hide[k] = info.hide;
        }
      const gw = x1 - x + 1,
        gd = z1 - z + 1;
      const cx = x + gw / 2,
        cz = z + gd / 2;
      const opts: Record<string, unknown> = { ...(info.opts ?? {}) };
      let rot = 0;
      let px = cx,
        pz = cz;
      if (ch === 'b') {
        bed = { x0: x, z0: z, x1: x1 + 1, z1: z1 + 1 };
        // headboard against the wall at one end of the long axis
        if (gd >= gw) rot = isWall(x, z, 'n') ? 0 : 2;
        else rot = isWall(x, z, 'w') ? 3 : 1;
        if (gd === gw) rot = rotFor[wallSide(x, z) ?? 'n'];
        props.push({ type: 'bed', x: cx, z: cz, rot, opts: { blanket: 0x6c8cff } });
        continue;
      }
      if (ch === 'Z') {
        rot = isWall(x, z, 'n') ? 0 : isWall(x, z1, 's') ? 2 : isWall(x, z, 'w') ? 3 : 1;
        props.push({ type: 'doubleBed', x: cx, z: cz, rot, opts: { sleeper: false } });
        continue;
      }
      if (ch === 'r') {
        props.push({ type: 'rug', x: cx, z: cz, opts: { w: gw - 0.15, d: gd - 0.15, color: 0xd9435e, inner: 0xffb3a0, round: gw === gd && gw > 1 } });
        continue;
      }
      if (ch === 'T') {
        props.push({ type: 'table', x: cx, z: cz, rot: gw >= gd ? 0 : 1, opts: { scaleTo: gw >= gd ? [gw, gd] : [gd, gw] } });
        continue;
      }
      if (ch === 'h') {
        // face a neighbouring table if any
        let face: Side | null = null;
        for (const s of ['n', 's', 'e', 'w'] as Side[]) {
          const [dx, dz] = sideDelta[s];
          if (at(src.obj, x + dx, z + dz) === 'T') face = s;
        }
        const r = face === 's' ? 0 : face === 'n' ? 2 : face === 'e' ? 3 : face === 'w' ? 1 : 0;
        props.push({ type: 'chair', x: cx, z: cz, rot: r });
        continue;
      }
      if (info.wall) {
        if (ch === 'S' && gw !== gd) {
          // sofa: back against the wall along its long side
          const s = gw > gd ? (isWall(x, z, 'n') ? 'n' : 's') : isWall(x, z, 'w') ? 'w' : 'e';
          rot = rotFor[s as Side];
        } else {
          const s = wallSide(x, z);
          if (s) {
            rot = rotFor[s];
            const meta = propDepth[info.prop!] ?? 0.6;
            const off = (1 - meta) / 2 - 0.02;
            const [dx, dz] = sideDelta[s];
            px += dx * off;
            pz += dz * off;
          }
        }
      }
      if (ch === 'j') props.push({ type: 'cookieJar', x: px, z: pz, y: 0.885 });
      if (ch === 'j') cookies.push({ x: x + 0.5, z: z + 0.5, onSolid: true });
      props.push({ type: info.prop!, x: px, z: pz, rot, opts });
    }

  if (!bed) throw new Error(`${id}: no bed`);
  const b = bed as Level['bed'];
  if (!start) {
    // first free cell next to the bed
    outer: for (let r = 1; r < 3; r++)
      for (let zz = b.z0 - r; zz < b.z1 + r; zz++)
        for (let xx = b.x0 - r; xx < b.x1 + r; xx++) {
          if (R(xx, zz) < 0 || solid[zz * w + xx]) continue;
          start = { x: xx + 0.5, z: zz + 0.5 };
          break outer;
        }
  }
  if (!cookies.length) throw new Error(`${id}: no cookies`);

  const guards: GuardSpec[] = src.guards.map((g) => {
    const path = g.p
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => {
        const [a, c] = t.split(',').map(Number);
        return { x: a + 0.5, z: c + 0.5 };
      });
    for (const p of path) if (R(Math.floor(p.x), Math.floor(p.z)) < 0) throw new Error(`${id}: guard path outside at ${p.x},${p.z}`);
    return {
      kind: g.k,
      path,
      wait: g.w ?? 1.2,
      look: g.look ?? null,
      sleep: !!g.sleep,
      face: ((g.face ?? 90) * Math.PI) / 180,
      speed: g.speed ?? 1,
      delay: g.delay ?? 0,
    };
  });

  // render description: rooms as rects (row runs), grouped by room id
  const styles = { ...BASE_STYLES, ...HOUSE_STYLES[house], ...(src.styles ?? {}) };
  const rooms: RoomDef[] = [];
  for (let z = 0; z < d; z++) {
    let x = 0;
    while (x < w) {
      const r = R(x, z);
      if (r < 0) {
        x++;
        continue;
      }
      let x2 = x;
      while (x2 + 1 < w && R(x2 + 1, z) === r) x2++;
      const letter = roomLetters[r];
      const [floor, wall] = styles[letter] ?? BASE_STYLES.L;
      rooms.push({ id: `${letter}${r}`, group: `g${r}`, x, z, w: x2 - x + 1, d: 1, floor, wall });
      x = x2 + 1;
    }
  }
  const dark = new Set((src.dark ?? '').split(''));
  const roomDark = roomLetters.map((l) => dark.has(l));
  const def: LevelDef = {
    id,
    house,
    name: { en: src.name[0], fr: src.name[1] },
    w,
    d,
    rooms,
    doors: doors.map(({ x, z, side }) => ({ x, z, side })),
    windows: windows.map(({ x, z, side }) => ({ x, z, side })),
    props: props.filter((p) => p.type !== 'bed'),
    bed: (() => {
      const bp = props.find((p) => p.type === 'bed')!;
      return { x: bp.x, z: bp.z, rot: bp.rot };
    })(),
    start: [start!.x, start!.z],
    cookies: cookies.filter((c) => !c.onSolid).map((c) => [c.x, c.z]),
    creaky: creakyList,
    guards: [],
  };
  // locked doors render as walls with a door panel (handled by renderer via level.eh/ev)

  const n = cookies.length;
  return {
    id,
    house,
    houseIndex: HOUSES.indexOf(house),
    index,
    name: src.name,
    w,
    d,
    room,
    roomLetters,
    roomDark,
    eh,
    ev,
    solid,
    tall,
    hide,
    creaky,
    floorToy,
    cookies,
    need: n >= 2 ? n - 1 : n,
    keys,
    switches,
    pillows,
    toyPickups,
    bed: b,
    start: start!,
    guards,
    par: src.par,
    toys: src.toys ?? 0,
    bedCheck: src.bedCheck ?? 0,
    tip: src.tip ?? null,
    finale: index === 11,
    def,
    props,
  };
}

const propDepth: Record<string, number> = {
  wardrobe: 0.6,
  counter: 0.7,
  sink: 0.7,
  stove: 0.7,
  fridge: 0.75,
  bookshelf: 0.4,
  nightstand: 0.45,
  dresser: 0.5,
  armchair: 0.85,
  tv: 0.45,
  fireplace: 0.6,
  clock: 0.35,
  piano: 0.7,
  armor: 0.6,
  toyBox: 0.5,
  bathtub: 0.8,
  sideTable: 0.45,
  bench: 0.5,
  skis: 0.3,
  curtain: 0.3,
};
