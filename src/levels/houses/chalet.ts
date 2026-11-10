import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/** House 4 — Snowy Chalet: the robot vacuum, bed checks, dad and the big sibling. */

const H1: Plan = {
  map: ['KKKLLLLLL', 'KKKLLLLLL', 'KKKLLLLLL', 'KKKLLLLLL', 'EEEEEEEEE', 'EEEEEEEEE', 'BBBBTTPPP', 'BBBBTTPPP', 'BBBBTTPPP', 'BBBBTTPPP', 'BBBBTTPPP', 'BBBBTTPPP'],
  obj: ['CNO E  iP', '        A', 'F   rr   ', '     SS  ', 'o       e', 'Q       l', '   W  d  ', '         ', '    R    ', '      ZZ ', 'b  r  ZZ ', 'bn X n  U'],
  doors: '1,4n 6,4n 3,2w 1,6n 4,6n 7,6n',
  windows: '6,0n 0,2w 0,8w 8,8e',
};

const H2: Plan = {
  map: ['KKKKDDDDDD', 'KKKKDDDDDD', 'KKKKDDDDDD', 'EEEEEEEEEE', 'EEEEEEEEEE', 'LLLLLLTTTT', 'LLLLLLTTTT', 'LLLLLLTTTT', 'LLLLLLTTTT', 'BBBBHHPPPP', 'BBBBHHPPPP', 'BBBBHHPPPP', 'BBBBHHPPPP'],
  obj: ['CNOF  P  K', '      hh  ', '     TTTT ', '          ', 'o  e    Qi', 'E      R  ', '         n', '  SS   W  ', '         d', '          ', 'b      ZZ ', 'b      ZZ ', 'nX  Q  A U'],
  doors: '2,3n 7,3n 4,1w 2,5n 8,5n 4,9n 5,9n 8,9n 4,10w 6,10w',
  windows: '2,0n 8,0n 0,6w 9,6e 0,11w',
};

export const CHALET: LevelSrc[] = [
  night(H1, {
    put: 'j 0,0; c 8,2',
    guards: [{ k: 'vacuum', p: '0,5 8,5', w: 0.6 }],
    par: 30,
    tip: 'vacuum',
  }),
  night(H1, {
    boost: 1.5,
    put: 'j 0,0; c 8,3; Q 4,4',
    guards: [
      { k: 'dad', p: '4,1 5,1', w: 2, speed: 0.6, face: 0, look: [0, 330, 30] },
      { k: 'vacuum', p: '7,5 1,5', w: 1 },
    ],
    par: 35,
  }),
  night(H1, {
    boost: 1.3,
    put: 'j 1,0; c 8,1; Q 1,5',
    guards: [
      { k: 'teen', p: '5,1 6,1', w: 2.5, speed: 0.5, face: 90 },
      { k: 'vacuum', p: '0,4 8,4', w: 1.5 },
      { k: 'mum', p: '8,6 0,5', w: 2.5, speed: 0.84 },
    ],
    par: 35,
  }),
  night(H1, {
    put: 'j 0,0; c 8,2; p 8,10; Q 1,5',
    bedCheck: 40,
    guards: [{ k: 'dad', p: '8,6 0,5', w: 1.6, speed: 1.27 }],
    par: 35,
    tip: 'pillow',
  }),
  night(H2, {
    pace: 1.3,
    sight: 1.3,
    boost: 1.3,
    put: 'j 1,0; c 9,1',
    guards: [
      { k: 'dad', p: '0,4 9,4', w: 2, speed: 0.9 },
      { k: 'vacuum', p: '1,6 5,8', w: 1 },
    ],
    par: 45,
  }),
  night(H2, {
    put: 'j 1,0; c 6,2; Q 5,3; c 8,3',
    guards: [
      { k: 'mum', p: '5,1 9,1', w: 1.8, speed: 0.75 },
      { k: 'teen', p: '8,7 8,8', w: 2.5, speed: 0.5, face: 180 },
    ],
    par: 45,
    toys: 1,
  }),
  night(H2, {
    pace: 1.5,
    linger: 0.7,
    put: 'j 1,0; k 9,7; c 0,2',
    doors: '2,3nL 4,1wL',
    bedCheck: 70,
    guards: [
      { k: 'dad', p: '7,4 0,4', w: 2, speed: 0.6 },
      { k: 'vacuum', p: '6,6 9,8', w: 1 },
    ],
    par: 50,
  }),
  night(H2, {
    boost: 1.4,
    put: 'j 1,0; c 9,2; p 1,7; Q 5,4',
    bedCheck: 40,
    guards: [
      { k: 'mum', p: '0,3 9,3', w: 2.5, speed: 0.65 },
      { k: 'teen', p: '5,6 4,6', w: 2.5, speed: 0.5, face: 0 },
    ],
    par: 50,
    toys: 1,
  }),
  night(H1, {
    boost: 1.3,
    put: 'j 0,0; c 8,1; ~ 2,4 5,5 6,4; Q 3,5; c 7,3; Q 1,5',
    guards: [
      { k: 'dad', p: '8,5 0,4', w: 2, speed: 0.75 },
      { k: 'vacuum', p: '4,1 7,3', w: 1 },
    ],
    par: 45,
    toys: 1,
  }),
  night(H1, {
    put: 'j 0,0; c 8,3; p 5,10; Q 4,5; c 5,4; Q 1,5',
    bedCheck: 45,
    guards: [
      { k: 'teen', p: '6,2 7,2', w: 2.5, speed: 0.58, face: 180 },
      { k: 'mum', p: '8,5 2,5', w: 2.2, speed: 0.8 },
    ],
    par: 45,
    toys: 1,
  }),
  night(H2, {
    pace: 1.3,
    linger: 1.3,
    put: 'j 1,0; k 0,7; c 9,1; Q 5,3; c 5,4',
    doors: '4,1wL',
    guards: [
      { k: 'dad', p: '0,3 9,4', w: 2, speed: 0.97 },
      { k: 'teen', p: '7,7 8,7', w: 2.5, speed: 0.58, face: 180 },
      { k: 'vacuum', p: '6,1 9,2', w: 1 },
    ],
    par: 55,
    toys: 2,
  }),
  night(H2, {
    pace: 1.15,
    put: 'j 1,0; c 9,2; g 0,8; p 8,7; Q 5,3; ~ 3,4 6,3',
    bedCheck: 60,
    guards: [
      { k: 'dad', p: '0,3 9,4', w: 2.08, speed: 0.72 },
      { k: 'mum', p: '7,1 9,1', w: 2, speed: 0.75 },
      { k: 'vacuum', p: '1,6 4,8', w: 1 },
    ],
    par: 65,
    toys: 2,
    tip: 'finale',
  }),
];
