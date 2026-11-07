import type {
  FloorKind,
  GuardKind,
  HouseId,
  PropDef,
  WallKind,
  LevelDef,
} from "../levels/types";

/** Compact hand-authored level source (see docs/levels.md). */
export interface LevelSrc {
  name: [string, string];
  /** room letters per cell, '.' = outside */
  map: string[];
  /** objects per cell (same size), ' ' or '.' = nothing */
  obj: string[];
  /** door edges: "x,zS" with S in n/s/e/w, suffix L = locked. Space separated. */
  doors?: string;
  windows?: string;
  guards: GuardSrc[];
  par: number;
  toys?: number;
  /** seconds until a bed check (lose unless back in bed or pillow decoy found) */
  bedCheck?: number;
  /** room letters that start with the lights off */
  dark?: string;
  /** first-time tip shown on this level */
  tip?: TipId;
  styles?: Record<string, [FloorKind, WallKind]>;
}

export interface GuardSrc {
  k: GuardKind;
  /** patrol points "x,z x,z" (cells) */
  p: string;
  /** wait time at each point (s) */
  w?: number;
  /** look-around angles while waiting (deg, absolute) */
  look?: number[];
  sleep?: boolean;
  /** initial facing (deg; 0 = east, 90 = south) */
  face?: number;
  speed?: number;
  /** patrol phase offset (s) */
  delay?: number;
}

export type TipId =
  | "move"
  | "cookies"
  | "cones"
  | "creaky"
  | "hide"
  | "run"
  | "toys"
  | "cat"
  | "switch"
  | "key"
  | "sleep"
  | "vacuum"
  | "teen"
  | "grandma"
  | "dad"
  | "pillow"
  | "finale";

export interface Vec2 {
  x: number;
  z: number;
}

export type HideKind = 0 | 1 | 2 | 3 | 4; // none, table, basket, wardrobe, curtain

export interface GuardSpec {
  kind: GuardKind;
  path: Vec2[];
  wait: number;
  look: number[] | null;
  sleep: boolean;
  face: number;
  speed: number;
  delay: number;
}

/** Runtime level, shared by game logic, bot and renderer. */
export interface Level {
  id: string;
  house: HouseId;
  houseIndex: number;
  index: number; // 0..11 within house
  name: [string, string];
  w: number;
  d: number;
  /** room group per cell (-1 outside) */
  room: Int16Array;
  roomLetters: string[];
  roomDark: boolean[];
  /** horizontal edges (w × (d+1)): 0 open, 1 wall, 2 door, 3 locked door, 4 window */
  eh: Uint8Array;
  /** vertical edges ((w+1) × d) */
  ev: Uint8Array;
  solid: Uint8Array;
  tall: Uint8Array;
  hide: Uint8Array;
  creaky: Uint8Array;
  floorToy: Uint8Array;
  cookies: (Vec2 & { onSolid: boolean })[];
  need: number;
  /** index of the golden bonus cookie (optional), -1 if none */
  bonus: number;
  keys: Vec2[];
  switches: (Vec2 & { room: number })[];
  pillows: Vec2[];
  toyPickups: Vec2[];
  bed: { x0: number; z0: number; x1: number; z1: number };
  start: Vec2;
  guards: GuardSpec[];
  par: number;
  toys: number;
  bedCheck: number;
  tip: TipId | null;
  finale: boolean;
  /** render description */
  def: LevelDef;
  props: PropDef[];
}
