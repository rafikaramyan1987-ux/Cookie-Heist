import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/** House 1 — City Apartment: small rooms, mum and the big sibling. */

const A1: Plan = {
  map: ['KKKLLLL', 'KKKLLLL', 'KKKLLLL', 'KKKLLLL', 'BBBBBAA', 'BBBBBAA', 'BBBBBAA', 'BBBBBAA'],
  obj: ['CNO  VP', '       ', 'F      ', '     SS', '  W    ', '  rr  Y', 'b rr Q ', 'bn  X  '],
  doors: '3,1w 4,4n 5,5w',
  windows: '4,0n 0,1w 6,6e',
};

const A2: Plan = {
  map: ['KKKKLLLL', 'KKKKLLLL', 'KKKKLLLL', 'KKKKLLLL', 'HHHHHHHH', 'HHHHHHHH', 'BBBBBAAA', 'BBBBBAAA', 'BBBBBAAA', 'BBBBBAAA'],
  obj: ['CNOF  VP', '       A', ' TT     ', ' hh  SS ', '        ', 'P      P', '    W   ', '  rr    ', 'b rr   Y', 'bn  X Q '],
  doors: '3,4n 6,4n 2,6n 6,6n 4,2w',
  windows: '5,0n 0,2w 0,7w 7,7e',
};

const A3: Plan = {
  map: [
    'KKKKLLLLL',
    'KKKKLLLLL',
    'KKKKLLLLL',
    'KKKKLLLLL',
    'HHHHHHHHH',
    'HHHHHHHHH',
    'BBBTTTPPP',
    'BBBTTTPPP',
    'BBBTTTPPP',
    'BBBTTTPPP',
    'BBBTTTPPP',
    'BBBTTTPPP',
  ],
  obj: ['CNOF  V P', '        A', ' TT      ', '     SS  ', '         ', 'P  l    P', '  W  R   ', '         ', '    rr ZZ', 'b   rr ZZ', 'b   X   d', 'n Q  n   '],
  doors: '2,4n 6,4n 4,2w 1,6n 4,6n 7,6n',
  windows: '5,0n 0,1w 0,8w 8,9e',
};

export const APARTMENT: LevelSrc[] = [
  night(A1, {
    name: ['First Snack', 'Premier goûter'],
    put: 'j 0,0; c 5,1',
    doors: '1,4n',
    guards: [],
    par: 14,
    tip: 'move',
  }),
  night(A1, {
    name: ["Mum's Show", 'La série de Maman'],
    put: 'j 0,0; c 6,2',
    doors: '1,4n',
    guards: [{ k: 'mum', p: '4,2 5,1', w: 2, speed: 0.5, face: 300 }],
    par: 18,
    tip: 'cones',
  }),
  night(A1, {
    name: ['Pacing Mum', 'Maman fait les cent pas'],
    put: 'j 0,0; c 1,2',
    doors: '1,4n',
    guards: [{ k: 'mum', p: '6,1 6,2', w: 2.5, speed: 0.5, look: [0] }],
    par: 22,
    tip: 'cookies',
  }),
  night(A1, {
    name: ['Squeaky Floor', 'Le parquet qui grince'],
    put: 'j 0,0; c 6,2; ~ 4,3 1,3 2,3',
    doors: '1,4n',
    guards: [{ k: 'mum', p: '5,1 4,1', w: 2, speed: 0.5, face: 270 }],
    par: 20,
    tip: 'creaky',
  }),
  night(A2, {
    name: ['Hide and Peek', 'Cache-cache'],
    put: 'j 0,0; c 7,2; Q 5,4; c 3,4',
    guards: [{ k: 'mum', p: '0,5 7,5', w: 1.2, delay: 3 }],
    par: 30,
    tip: 'hide',
  }),
  night(A2, {
    name: ['Night Sprint', 'Sprint de nuit'],
    put: 'j 0,0; c 7,9; c 4,0',
    guards: [{ k: 'mum', p: '6,1 6,2', w: 2, speed: 0.5, face: 270 }],
    par: 18,
    tip: 'run',
  }),
  night(A2, {
    pace: 1.49,
    linger: 0.49,
    sight: 1.15,
    name: ['Rubber Duck', 'Le canard en caoutchouc'],
    put: 'j 1,0; c 2,1; Q 4,4',
    guards: [{ k: 'mum', p: '6,5 7,4', w: 2, speed: 0.5, face: 180 }],
    par: 28,
    toys: 3,
    tip: 'toys',
  }),
  night(A2, {
    name: ['Kitchen Loop', 'La ronde de la cuisine'],
    put: 'j 0,0; c 7,2; c 7,9; Q 0,4; Q 5,4; Q 3,2',
    guards: [{ k: 'mum', p: '6,1 6,5 3,5 3,1 6,1', w: 1.15, speed: 0.75 }],
    par: 40,
    toys: 1,
  }),
  night(A3, {
    name: ['Phone Glow', 'Lueur de téléphone'],
    put: 'j 0,0; c 8,2',
    guards: [{ k: 'teen', p: '6,5 4,5', w: 2, speed: 0.5, face: 180 }],
    par: 26,
    tip: 'teen',
  }),
  night(A3, {
    pace: 1.5,
    name: ['Busy Hallway', 'Couloir animé'],
    put: 'j 0,0; c 7,2; ~ 2,5 3,4; Q 0,4',
    guards: [
      { k: 'mum', p: '2,5 7,5 5,1', w: 1.4, speed: 0.84 },
      { k: 'teen', p: '4,8 4,7', w: 2.5, speed: 0.5, face: 270 },
    ],
    par: 40,
    toys: 1,
  }),
  night(A3, {
    pace: 1.5,
    linger: 0.7,
    name: ['Double Trouble', 'Double ennui'],
    put: 'j 1,0; c 4,9; c 6,11; Q 8,4; Q 2,4; Q 4,5',
    guards: [
      { k: 'teen', p: '5,5 8,5', speed: 0.7, w: 1.5 },
      { k: 'mum', p: '5,2 8,2', w: 2.5 },
    ],
    par: 45,
    toys: 2,
  }),
  night(A3, {
    pace: 1.15,
    name: ['Apartment Finale', 'Finale de l’appartement'],
    put: 'j 0,0; c 8,0; c 6,11; ~ 3,5 5,4 6,5; Q 0,4; t 2,2; Q 7,1',
    guards: [
      { k: 'mum', p: '1,1 6,1 7,5 1,5 1,1', w: 0.8, speed: 1.14 },
      { k: 'teen', p: '8,5 5,5', speed: 0.7, w: 1.6 },
    ],
    par: 55,
    toys: 2,
    tip: 'finale',
  }),
];
