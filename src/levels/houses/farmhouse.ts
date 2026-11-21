import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/**
 * House 6 — Farmhouse (v3.4): summer on the farm. Grandma is a light sleeper (she sits up now and then), mum walks the
 * long halls, Mochi came along. Every night has its own floorplan.
 */

const F1: Plan = {
  map: ['LLLLLLKKKKK', 'LLLLLLKKKKK', 'LLLLLLKKKKK', 'HHHHHHHHHHH', 'HHHHHHHHHHH', 'BBBBBHGGGGG', 'BBBBBHGGGGG', 'BBBBBHGGGGG', 'BBBBBHGGGGG', 'BBBBBHGGGGG', 'BBBBBHGGGGG'],
  obj: [' SS  A NOCj', '           ', ' rr    TT  ', '           ', 'P         P', 'W   l     d', '         ZZ', '         ZZ', '           ', 'b X        ', 'bn       Q '],
  doors: '2,3n 8,3n 6,1w 5,9w 6,8w 2,5n',
  windows: '2,0n 8,0n 0,1w 10,2e 0,7w 10,8e',
};

const F2: Plan = {
  map: ['DDDDKKKKKK', 'DDDDKKKKKK', 'DDDDKKKKKK', 'HHHHHHHHHH', 'LLLLLHGGGG', 'LLLLLHGGGG', 'LLLLLHGGGG', 'LLLLLHGGGG', 'HHHHHHHHHH', 'BBBBBBCCCC', 'BBBBBBCCCC', 'BBBBBBCCCC'],
  obj: ['R  hCNOjCF', '  T       ', '  T  TT   ', '          ', 'SS       W', '        d ', 'A r    ZZ ', '       ZZ ', '          ', '  W    Q  ', 'b   X     ', 'bn     Y  '],
  doors: '2,3n 7,3n 5,9n 2,4n 4,6e 5,5e 8,8s 2,7s 1,9n',
  windows: '1,0n 6,0n 0,5w 9,5e 0,10w 9,10e',
};

const F3: Plan = {
  map: ['KKKKCCCLLLL', 'KKKKCCCLLLL', 'KKKKCCCLLLL', 'HHHHHHHHHHH', 'HHHHHHHHHHH', 'PPPPHHHGGGG', 'PPPPHHHGGGG', 'PPPPHHHGGGG', 'BBBBHHHGGGG', 'BBBBHHHGGGG', 'BBBBHHHGGGG'],
  obj: ['CjNO  Q  SS', '           ', ' TT    r   ', '   Q       ', 'P          ', 'ZZ l      d', 'ZZ        U', '         ZZ', 'W        ZZ', 'b       n  ', 'b n        '],
  doors: '1,3n 5,3n 9,3n 4,1w 7,1w 2,5n 4,5w 4,8w 6,6e',
  windows: '2,0n 8,0n 0,1w 10,1e 0,6w 10,8e',
};

const F4: Plan = {
  map: ['....LLLLKKKK', '....LLLLKKKK', '....LLLLKKKK', 'GGGGHHHHHHHH', 'GGGGHHHHHHHH', 'GGGGHHPPPPPP', 'GGGGHHPPPPPP', 'CCCCHHPPPPPP', 'CCCCHHBBBBBB', 'CCCCHHBBBBBB', 'CCCCHHBBBBBB', 'CCCCHHBBBBBB'],
  obj: ['    S  VCjNO', '            ', '    A      F', 'ZZ          ', 'ZZ          ', '  W       ZZ', '          ZZ', 'Q          d', '        X   ', ' Y          ', '           b', 'd  Q      nb'],
  doors: '6,9w 6,6w 4,4w 4,9w 5,3n 9,3n 8,1w 7,8n',
  windows: '6,0n 10,0n 11,1e 0,4w 0,9w 11,6e 11,9e',
};

const F5: Plan = {
  map: ['KKKKK...LLLL', 'KKKKK...LLLL', 'KKKKK...LLLL', 'HHHHHHHHHHHH', 'HHHHHHHHHHHH', 'DDDD....PPPP', 'DDDD....PPPP', 'DDDD....PPPP', 'EEEEEEEEEEEE', 'GGGGG..BBBBB', 'GGGGG..BBBBB', 'GGGGG..BBBBB'],
  obj: ['CjNOF   SS V', '            ', ' TT     r  A', '       Q    ', 'P          P', ' TT        d', ' hh       ZZ', '          ZZ', 'o          i', 'ZZ      W   ', 'ZZ         b', 'n  Q    X  b'],
  doors: '3,3n 8,3n 2,5n 9,5n 2,7s 9,7s 2,9n 9,9n',
  windows: '2,0n 9,0n 0,1w 11,1e 0,6w 11,6e 0,10w 11,10e',
};

export const FARMHOUSE: LevelSrc[] = [
  night(F1, {
    put: 'c 8,9; g 1,0',
    guards: [
      { k: 'grandma', p: '9,6', sleep: true, face: 180, doze: [5, 3, 4], look: [180, 140] },
      { k: 'mum', p: '0,4 10,4', w: 1.5, speed: 1, delay: 2 },
      { k: 'cat', p: '3,1', face: 90 },
    ],
    par: 76,
    toys: 1,
    tip: 'doze',
  }),
  night(F2, {
    put: 'c 1,1; g 8,10',
    guards: [
      { k: 'grandma', p: '7,6', sleep: true, face: 270, doze: [6, 3, 3], look: [270, 210] },
      { k: 'dad', p: '9,8 0,8', w: 1.5, speed: 1, delay: 4 },
      { k: 'teen', p: '0,5 4,7', w: 2, speed: 0.6, delay: 3 },
      { k: 'cat', p: '6,10', face: 0 },
    ],
    par: 77,
    toys: 1,
  }),
  night(F3, {
    put: 'g 8,10; c 8,1',
    guards: [
      { k: 'dad', p: '0,5', sleep: true, face: 0 },
      { k: 'grandma', p: '9,7', sleep: true, face: 180, doze: [5, 3, 2], look: [180, 220] },
      { k: 'mum', p: '9,4 9,1 5,1 5,4 9,4', w: 1.2, speed: 0.9, delay: 2 },
      { k: 'cat', p: '5,1', face: 90 },
    ],
    par: 78,
    toys: 1,
  }),
  night(F4, {
    put: 'c 2,10; g 2,4',
    guards: [
      { k: 'grandma', p: '0,3', sleep: true, face: 0, doze: [5, 3, 2], look: [0, 60] },
      { k: 'mum', p: '4,4 5,11', w: 1.2, speed: 1, delay: 2 },
      { k: 'dad', p: '10,5', sleep: true, face: 180 },
      { k: 'cat', p: '5,1', face: 90 },
    ],
    par: 79,
    toys: 1,
  }),
  night(F5, {
    put: 'c 11,1; g 3,10',
    guards: [
      { k: 'dad', p: '6,3 11,4', w: 1.2, speed: 1.2, delay: 2 },
      { k: 'teen', p: '0,5 3,7', w: 2, speed: 0.6, delay: 3 },
      { k: 'grandma', p: '0,9', sleep: true, face: 0, doze: [6, 3, 3] },
      { k: 'cat', p: '2,9', face: 90 },
    ],
    par: 80,
    toys: 2,
  }),
];
