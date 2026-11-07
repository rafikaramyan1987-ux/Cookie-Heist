import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/** House 3 — Grandma's Cottage: Nana Rose and her lamp, Mochi, and mum visiting. */

const C1: Plan = {
  map: ['KKKKLLLL', 'KKKKLLLL', 'KKKKLLLL', 'KKKKLLLL', 'HHHHHHHH', 'HHHHHHHH', 'BBBGGGGG', 'BBBGGGGG', 'BBBGGGGG', 'BBBGGGGG', 'BBBGGGGG'],
  obj: ['CNOC EKP', '        ', ' TT   G ', ' hh   A ', '        ', 'Q      l', '  W   d ', '    rr  ', '    rr  ', 'b     ZZ', 'bnX   ZZ'],
  doors: '3,4n 5,4n 4,2w 1,6n 5,6n',
  windows: '6,0n 0,1w 0,8w 7,7e',
};

const C2: Plan = {
  map: ['KKKKKDDDDD', 'KKKKKDDDDD', 'KKKKKDDDDD', 'HHHHHHHHHH', 'HHHHHHHHHH', 'LLLLLGGGGG', 'LLLLLGGGGG', 'LLLLLGGGGG', 'LLLLLGGGGG', 'BBBBBCCCCC', 'BBBBBCCCCC', 'BBBBBCCCCC'],
  obj: ['CNOCF P K ', '      hh  ', ' rr  TTTT ', '          ', 'Q        l', '        d ', 'E  G     U', ' A  r ZZ  ', '    r ZZ n', '          ', 'b        Y', 'bnX  Q    '],
  doors: '2,3n 7,3n 5,1w 2,5n 7,5n 2,9n 7,9n 5,10w',
  windows: '3,0n 8,0n 0,6w 9,6e 0,10w',
};

export const COTTAGE: LevelSrc[] = [
  night(C1, {
    name: ["Nana's Lamp", 'La lampe de Mamie'],
    put: 'j 0,0; c 7,2',
    guards: [{ k: 'grandma', p: '6,5 0,5', w: 1.05, speed: 1.1 }],
    par: 30,
    tip: 'grandma',
  }),
  night(C1, {
    name: ['Sleepy Nana', 'Mamie dort'],
    put: 'j 0,0; c 7,7; ~ 5,7 5,5',
    guards: [
      { k: 'grandma', p: '6,9', sleep: true, face: 270 },
      { k: 'cat', p: '7,4', face: 180 },
    ],
    par: 30,
  }),
  night(C1, {
    name: ['Tea Time', "L'heure du thé"],
    put: 'j 3,0; c 7,3',
    guards: [
      { k: 'grandma', p: '1,1 6,1', w: 2, speed: 0.9 },
      { k: 'cat', p: '7,5', face: 180 },
    ],
    par: 35,
  }),
  night(C1, {
    pace: 1.95,
    linger: 0.49,
    sight: 1.3,
    name: ['Moonlit Parlour', 'Salon au clair de lune'],
    boost: 1.3,
    put: 'j 0,0; c 7,3; s 5,3',
    guards: [
      { k: 'grandma', p: '6,1 5,1', w: 2, speed: 0.6, face: 90, look: [90, 45, 60] },
    ],
    par: 30,
  }),
  night(C2, {
    pace: 1.5,
    linger: 0.91,
    name: ["Nana's Pantry Key", 'La clé du garde-manger'],
    boost: 1.6,
    put: 'j 1,0; k 3,7; c 3,2; c 8,3',
    doors: '2,3nL 5,1wL',
    guards: [{ k: 'grandma', p: '0,4 9,4', w: 3, speed: 0.6 }],
    par: 45,
  }),
  night(C2, {
    name: ['Cat Nap Corridor', 'Le couloir du chat'],
    boost: 1.6,
    put: 'j 1,0; c 9,2; Q 4,3; c 6,3',
    guards: [
      { k: 'cat', p: '8,4', face: 180 },
      { k: 'grandma', p: '6,6 8,7', w: 2.5, speed: 0.7 },
    ],
    par: 40,
    toys: 1,
  }),
  night(C2, {
    pace: 1.5,
    name: ['Mum Visits', 'Maman en visite'],
    boost: 1.3,
    put: 'j 1,0; c 9,1; ~ 3,4 6,3; c 4,4',
    guards: [
      { k: 'mum', p: '0,4 9,4', w: 1.8, speed: 0.75 },
      {
        k: 'grandma',
        p: '7,1 7,2',
        w: 2,
        speed: 0.6,
        face: 180,
        look: [180, 135, 225],
      },
    ],
    par: 45,
    toys: 1,
  }),
  night(C2, {
    pace: 1.5,
    name: ['Laundry Day', 'Jour de lessive'],
    boost: 1.6,
    put: 'j 1,0; c 8,11; Q 4,4; Q 0,8; Q 9,3; c 5,6',
    guards: [{ k: 'grandma', p: '1,3 8,3 8,7 1,7 1,3', w: 1, speed: 0.75 }],
    par: 45,
  }),
  night(C1, {
    pace: 1.5,
    name: ['Night Owls', 'Oiseaux de nuit'],
    boost: 1.3,
    put: 'j 0,0; c 7,1; ~ 2,5 6,5',
    guards: [
      { k: 'grandma', p: '6,9', sleep: true, face: 270 },
      { k: 'mum', p: '7,3 0,4', w: 2.5, speed: 0.6 },
    ],
    par: 45,
    toys: 1,
  }),
  night(C1, {
    linger: 0.7,
    sight: 1.3,
    name: ['Two Lamps', 'Deux lampes'],
    put: 'j 2,0; c 4,1; Q 7,4; c 4,5',
    guards: [
      { k: 'grandma', p: '3,6 7,5', w: 2.5, speed: 0.6 },
      { k: 'mum', p: '5,1 7,3', w: 2, speed: 0.75 },
    ],
    par: 50,
    toys: 2,
  }),
  night(C2, {
    name: ['Cosy Chaos', 'Joyeux désordre'],
    put: 'j 1,0; k 3,7; c 9,1; Q 4,3; c 7,4',
    doors: '5,1wL',
    guards: [
      { k: 'grandma', p: '0,4 9,4', w: 1.6, speed: 1 },
      { k: 'mum', p: '6,2 9,2', w: 2, speed: 0.75 },
      { k: 'cat', p: '8,6', face: 180 },
    ],
    par: 55,
    toys: 2,
  }),
  night(C2, {
    linger: 1.3,
    sight: 1.15,
    name: ['Cottage Finale', 'Finale de la chaumière'],
    put: 'j 1,0; k 0,7; g 9,2; c 4,11; s 2,5; Q 4,3; Q 0,3',
    doors: '2,3nL',
    dark: '',
    guards: [
      { k: 'grandma', p: '6,6 8,7', w: 2.5, speed: 0.69 },
      { k: 'mum', p: '0,4 9,4', w: 3.5, speed: 0.69 },
      { k: 'cat', p: '8,1', face: 0 },
    ],
    par: 65,
    toys: 3,
    tip: 'finale',
  }),
];
