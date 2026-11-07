import { parseLevel } from '../../src/game/level';
import type { LevelSrc, GuardSrc } from '../../src/game/types';

/** A small test room: kitchen on top, hallway, bedroom at the bottom. */
export function testLevel(guards: GuardSrc[], extra: Partial<LevelSrc> = {}) {
  const src: LevelSrc = {
    name: ['Test', 'Test'],
    map: ['KKKKKKK', 'KKKKKKK', 'KKKKKKK', 'HHHHHHH', 'HHHHHHH', 'BBBBBBB', 'BBBBBBB'],
    obj: ['C j    ', '       ', '       ', '       ', '   Q   ', '       ', 'b      '],
    doors: '1,3n 5,3n 1,5n',
    guards,
    par: 30,
    ...extra,
  };
  return parseLevel(src, 'family', 0);
}
