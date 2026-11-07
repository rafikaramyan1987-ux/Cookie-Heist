/** Data-driven level format. 1 world unit = 1 grid cell. x → east, z → south (towards camera). */

export type HouseId = 'apartment' | 'family' | 'cottage' | 'chalet' | 'mansion';

export type FloorKind =
  | 'oak'
  | 'darkwood'
  | 'checker'
  | 'carpetBlue'
  | 'carpetRose'
  | 'marble'
  | 'stone'
  | 'concrete'
  | 'pine'
  | 'tileBlue'
  | 'parquet';

export type WallKind =
  | 'stripesCream'
  | 'starsBlue'
  | 'teal'
  | 'floral'
  | 'logs'
  | 'panel'
  | 'paintGrey'
  | 'paintPeach'
  | 'paintSage'
  | 'stone'
  | 'damask';

export type Side = 'n' | 's' | 'e' | 'w';

export interface RoomDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floor: FloorKind;
  wall: WallKind;
  dark?: boolean;
  /** rects sharing a group form one room (no walls between them) */
  group?: string;
}

/** An edge of cell (x,z) on the given side. */
export interface EdgeRef {
  x: number;
  z: number;
  side: Side;
}

export interface PropDef {
  type: string;
  x: number;
  z: number;
  /** quarter turns; 0 = facing south (+z, towards camera) */
  rot?: number;
  y?: number;
  opts?: Record<string, unknown>;
}

export type GuardKind = 'mum' | 'dad' | 'grandma' | 'teen' | 'cat' | 'vacuum';

export interface GuardDef {
  kind: GuardKind;
  path: [number, number][];
  /** idle look angle (radians) when standing */
  facing?: number;
  sleeping?: boolean;
}

export interface LevelDef {
  id: string;
  house: HouseId;
  name: { en: string; fr: string };
  w: number;
  d: number;
  rooms: RoomDef[];
  doors: EdgeRef[];
  windows: EdgeRef[];
  props: PropDef[];
  bed: { x: number; z: number; rot?: number };
  start: [number, number];
  cookies: [number, number, number?][];
  creaky: [number, number][];
  guards: GuardDef[];
  /** exterior sides left open (corner previews) */
  open?: Side[];
}
