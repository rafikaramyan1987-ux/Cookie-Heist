import type { GuardSrc, LevelSrc, TipId } from '../game/types';
import type { FloorKind, WallKind } from './types';

/** A house floorplan: room map + base furniture, shared by several nights. */
export interface Plan {
  map: string[];
  obj: string[];
  doors: string;
  windows?: string;
  styles?: Record<string, [FloorKind, WallKind]>;
}

export interface NightOpts {
  name: [string, string];
  /** cell overrides: "c 3,4 5,1; ~ 2,5 2,6; . 4,4" (char then cells; '.' clears) */
  put?: string;
  /** extra door edges, e.g. locked "4,6nL" */
  doors?: string;
  guards: GuardSrc[];
  par: number;
  toys?: number;
  tip?: TipId;
  dark?: string;
  bedCheck?: number;
  /** difficulty tweak: guards move this much faster and wait less */
  boost?: number;
  /** patrol speed multiplier for the awake grown-ups (faster sweeps, shorter looks) */
  pace?: number;
  /** wait-time multiplier at patrol points for the awake grown-ups */
  linger?: number;
  /** vision range multiplier for the awake grown-ups */
  sight?: number;
}

const PETS = new Set(['cat', 'vacuum']);

export function night(plan: Plan, o: NightOpts): LevelSrc {
  const obj = plan.obj.map((r) => r.padEnd(plan.map[0].length, ' ').split(''));
  for (const part of (o.put ?? '').split(';')) {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    const ch = toks[0] === '_' ? ' ' : toks[0];
    for (const c of toks.slice(1)) {
      const [x, z] = c.split(',').map(Number);
      if (!obj[z] || x >= obj[z].length) throw new Error(`put ${ch} ${c} out of range in "${o.name[0]}"`);
      obj[z][x] = ch === '.' ? ' ' : ch;
    }
  }
  const doors = [plan.doors, o.doors ?? ''].join(' ').trim();
  // a locked door replaces a plain door on the same edge
  const toks = doors.split(/\s+/).filter(Boolean);
  const locked = new Set(toks.filter((t) => t.endsWith('L')).map((t) => t.slice(0, -1)));
  const finalDoors = toks.filter((t) => t.endsWith('L') || !locked.has(t)).join(' ');
  return {
    name: o.name,
    map: plan.map,
    obj: obj.map((r) => r.join('')),
    doors: finalDoors,
    windows: plan.windows,
    styles: plan.styles,
    guards: o.guards.map((g) => {
      let speed = (g.speed ?? 1) * (o.boost ?? 1),
        w = (g.w ?? 1.2) / (o.boost ?? 1);
      const sight = (g.sight ?? 1) * (!PETS.has(g.k) && !g.sleep ? (o.sight ?? 1) : 1);
      if (!PETS.has(g.k) && !g.sleep) {
        speed *= o.pace ?? 1;
        w *= o.linger ?? 1;
      }
      return o.boost || o.pace || o.linger || o.sight ? { ...g, speed, w, ...(sight !== 1 ? { sight } : {}) } : g;
    }),
    par: o.par,
    toys: o.toys,
    tip: o.tip,
    dark: o.dark,
    bedCheck: o.bedCheck,
  };
}
