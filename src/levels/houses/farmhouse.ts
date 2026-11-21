import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/**
 * House 6 — Farmhouse (v3.4): summer on the farm. Light sleepers sit up now and then; mum and dad walk the long halls.
 * Every night has its own floorplan. Generated with scripts/levels/gen.ts and chosen by scripts/levels/tune.ts +
 * freeze.ts (each one passes the strict playtest audit); edit the data here directly from now on.
 */

const F1: Plan = {
  map: ['GGGPPPKKKK', 'GGGPPPKKKK', 'GGGPPPKKKK', 'GGGPPPKKKK', 'HHHHHHHHHH', 'DDDHLLLLLL', 'DDDHLLLLLL', 'HHHHHHHHHH', 'BBBBCCCCCC', 'BBBBCCCCCC', 'BBBBCCCCCC', 'BBBBCCCCCC'],
  obj: ['GZZUZZONCj', ' ZZ ZZ', '     c TT', 'd  d', '        Q', 'R   gSSV', '         A', 'P   Q', '       d', '', 'b  WQ', 'bnX'],
  doors: '1,3s 4,3s 9,3s 1,5n 9,5n 7,6s 2,8n 6,8n 3,2w',
  windows: '1,0n 5,0n 0,1w 9,1e 0,8w 9,8e',
};

const F2: Plan = {
  map: ['KKKKGGGGGG', 'KKKKGGGGGG', 'KKKKGGGGGG', 'KKKKGGGGGG', 'KKKKGGGGGG', 'KKKKGGGGGG', 'HHHHHHHHHH', 'PPPPPPHBBB', 'PPPPPPHBBB', 'PPPPPPHBBB', 'PPPPPPHBBB', 'PPPPPPHBBB'],
  obj: ['CjN     ZZ', '        ZZ', '        g', ' TT d', '         G', '', '   QQ', 'c    d   X', '', '', '    ZZ b W', '    ZZPbn'],
  doors: '0,5s 7,5s 5,8e 7,7w 3,0e',
  windows: '1,0n 5,0n 8,0n 0,1w 9,1e 0,10w 9,10e',
};

const F3: Plan = {
  map: ['..GGGKKKKK', 'GGGGGKKKKK', 'GGGGGKKKKK', 'GGGGGKKKKK', 'HHHHHHHHHH', 'PPPHDDDDDD', 'PPPHDDDDDD', 'PPPHDDDDDD', 'HHHHHHHHHH', 'BBBBLLLLLL', 'BBBBLLLLLL', 'BBBBLLLLLL'],
  obj: ['   ZZjCNO', ' g ZZ', '    d TT', 'G', '   Q     Q', 'ZZ     R c', 'ZZ    TT', 'd', 'P', '  X', 'b    SS', 'bnW    V A'],
  doors: '1,3s 6,3s 1,7s 2,5e 4,7w 1,9n 8,9n 4,9n 3,11e 4,3e 4,9w',
  windows: '5,0n 8,0n 0,1w 9,1e 0,7w 9,7e',
};

const F4: Plan = {
  map: ['..GGGHHKKK', 'GGGGGHHKKK', 'GGGGGHHKKK', 'GGGGGHHEEE', 'PPPPPHHEEE', 'PPPPPHHEEE', 'PPPPPHHEEE', 'PPPPPHHEEE', 'PPPPPHHLLL', 'BBBBBHHLLL', 'BBBBBHHLLL', 'BBBBBHHLLL'],
  obj: ['        jC', 'g', 'ZZ  G', 'ZZ  d Q  c', '', 'd     Q', '       o e', 'ZZ  U', 'ZZ      SS', 'W  X', 'b', 'bn      VA'],
  doors: '4,0e 4,5e 4,10e 7,0w 7,7w 7,11w 2,9n',
  windows: '0,1w 9,1e 0,5w 9,5e 0,8w 9,8e',
};

const F5: Plan = {
  map: ['GGGPPPKKKKK', 'GGGPPPKKKKK', 'GGGPPPKKKKK', 'GGGPPPKKKKK', 'HHHHHHHHHHH', 'HHHHHHHHHHH', 'BBBEEEEELLL', 'BBBEEEEELLL', 'BBBEEEEELLL', 'BBBEEEEELLL', 'BBBEEEEELLL', 'BBBEEEEELLL'],
  obj: ['dZZ    ONjC', ' ZZU d', '  GgZZ  TT', '    ZZ', '', '  Q  Q', '          c', '          V', 'X W', '       e SS', 'b      o', 'bn      A'],
  doors: '0,3s 3,3s 10,3s 0,6n 4,6n 8,6n 8,7w 2,3e',
  windows: '1,0n 5,0n 8,0n 0,1w 10,1e 0,7w 10,7e 0,10w 10,10e',
};

const F6: Plan = {
  map: ['PPPPHHKKKKK', 'PPPPHHKKKKK', 'PPPPHHKKKKK', 'GGGGHHKKKKK', 'GGGGHHKKKKK', 'GGGGHHKKKKK', 'GGGGHHEEEEE', 'BBBBHHEEEEE', 'BBBBHHEEEEE', 'BBBBHHEEEEE', 'BBBBHHEEEEE', 'BBBBHHEEEEE'],
  obj: ['ZZ   PCNOj', 'ZZ g', '   d    TT', 'ZZ GQ', 'ZZ', '   dQ', '          c', '', 'X         e', '', 'b  W      o', 'bn'],
  doors: '3,0e 3,6e 3,11e 6,3w 6,7w 2,3n',
  windows: '1,0n 9,0n 0,1w 10,1e 0,4w 10,4e 0,7w 10,7e 0,10w 10,10e',
};

const F7: Plan = {
  map: ['KKKHHGGGGGG', 'KKKHHGGGGGG', 'KKKHHGGGGGG', 'KKKHHEEEEEE', 'KKKHHEEEEEE', 'KKKHHEEEEEE', 'PPPHHEEEEEE', 'PPPHHEEEEEE', 'PPPHHBBBBBB', 'PPPHHBBBBBB', 'PPPHHBBBBBB'],
  obj: ['jCN  dcG', '         ZZ', '         ZZ', '       e  o', '    Q', '', ' g', 'd  Q', '        W', ' ZZ       b', ' ZZ     Xnb'],
  doors: '2,3e 2,6e 5,2w 5,6w 5,10w 0,5s 8,3n',
  windows: '1,0n 5,0n 0,1w 10,1e 0,6w 10,6e 0,9w 10,9e',
};

const F8: Plan = {
  map: ['KKKKGGGGPPP', 'KKKKGGGGPPP', 'KKKKGGGGPPP', 'KKKKGGGGPPP', 'KKKKGGGGPPP', 'HHHHHHHHHHH', 'EEEEEHBBBBB', 'EEEEEHBBBBB', 'EEEEEHBBBBB', 'EEEEEHBBBBB', 'EEEEEHBBBBB', 'EEEEEHBBBBB'],
  obj: ['jONCGgZZc', ' TT d ZZU d', '', '        ZZ', '        ZZ', '    Q Q', '   e', '          X', '', '', '      W   b', '  o  P   nb'],
  doors: '0,4s 3,4s 7,4s 10,4s 1,6n 10,6n 6,8w 3,2e',
  windows: '1,0n 4,0n 9,0n 0,1w 10,1e 0,6w 10,6e 0,10w 10,10e',
};

const F9: Plan = {
  map: ['GGGHHKKKKKK', 'GGGHHKKKKKK', 'GGGHHKKKKKK', 'GGGHHDDDDDD', 'PPPHHDDDDDD', 'PPPHHDDDDDD', 'PPPHHDDDDDD', 'PPPHHDDDDDD', 'BBBHHEEEEEE', 'BBBHHEEEEEE', 'BBBHHEEEEEE'],
  obj: ['dZZ P FONCj', 'GZZ', ' g', '   Q      c', '', 'U     TT', 'ZZ    TT', 'ZZd   R', 'W  Q     e', 'b', 'bnX      o'],
  doors: '2,2e 2,6e 2,9e 5,1w 5,3w 5,10w 8,8n 5,7s 1,4n',
  windows: '1,0n 6,0n 0,1w 10,1e 0,6w 10,6e',
};

const F10: Plan = {
  map: ['KKKPPPPPPGGG', 'KKKPPPPPPGGG', 'KKKPPPPPPGGG', 'KKKPPPPPPGGG', 'KKKPPPPPPGGG', 'KKKPPPPPPGGG', 'KKKPPPPPPGGG', 'HHHHHHHHHHHH', 'DDDDHBBBBBBB', 'DDDDHBBBBBBB', 'DDDDHBBBBBBB', 'DDDDHBBBBBBB', 'DDDDHBBBBBBB'],
  obj: ['CNj g     ZZ', '        d ZZ', '', '', '', '       ZZ  d', '       ZZG', '       QQ', 'c        XW', 'mTT', 'RTT', '           b', '          nb'],
  doors: '1,6s 4,6s 11,6s 3,12e 3,8e 6,8n 9,4w',
  windows: '1,0n 4,0n 8,0n 0,1w 11,1e 0,4w 11,4e 0,9w 11,9e',
};

export const FARMHOUSE: LevelSrc[] = [
  // night 1 (tier 5): score 60, route 39 cells; playtest avg 70% / good 100%, ~76 s
  night(F1, {
    guards: [
      { k: 'dad', p: '8,4 1,4', w: 1.2, speed: 1.06, delay: 4 },
      { k: 'mum', p: '2,5 9,9', w: 2, speed: 1.2, delay: 5 },
      { k: 'grandma', p: '1,0', sleep: true, face: 90, doze: [5.7, 2.3, 4.2] },
    ],
    par: 76,
    toys: 1,
    tip: 'doze',
  }),
  // night 2 (tier 1): score 61, route 44 cells; playtest avg 90% / good 100%, ~33 s
  night(F2, {
    guards: [
      { k: 'grandma', p: '1,6 8,6', w: 1.6, speed: 1.06, delay: 2 },
      { k: 'grandma', p: '8,0', sleep: true, face: 90, doze: [4.6, 2.4, 3.4] },
      { k: 'cat', p: '8,1', face: 90 },
    ],
    par: 77,
    toys: 1,
  }),
  // night 3 (tier 2): score 62, route 45 cells; playtest avg 80% / good 50%, ~43 s
  night(F3, {
    guards: [
      { k: 'mum', p: '1,4 8,4', w: 1.7, speed: 0.86, delay: 2 },
      { k: 'grandma', p: '3,0', sleep: true, face: 90, doze: [5.1, 2.6, 2.7] },
      { k: 'vacuum', p: '2,1 0,1', w: 1 },
    ],
    par: 78,
    toys: 1,
  }),
  // night 4 (tier 1): score 63, route 46 cells; playtest avg 90% / good 50%, ~43 s
  night(F4, {
    guards: [
      { k: 'mum', p: '5,1 5,10', w: 1.5, speed: 1.16, delay: 2 },
      { k: 'grandma', p: '0,2', sleep: true, face: 90, doze: [6.6, 2.7, 4.2] },
      { k: 'vacuum', p: '1,1 2,0', w: 1 },
    ],
    par: 79,
    toys: 1,
  }),
  // night 5 (tier 1): score 64, route 47 cells; playtest avg 90% / good 100%, ~52 s
  night(F5, {
    guards: [
      { k: 'grandma', p: '9,4 1,4', w: 1.2, speed: 1.06, delay: 4 },
      { k: 'grandma', p: '1,0', sleep: true, face: 90, doze: [6.6, 3.4, 4.9] },
      { k: 'cat', p: '3,1', face: 90 },
    ],
    par: 80,
    toys: 1,
  }),
  // night 6 (tier 3): score 65, route 52 cells; playtest avg 90% / good 100%, ~55 s
  night(F6, {
    guards: [
      { k: 'grandma', p: '4,10 4,1', w: 1.5, speed: 1, delay: 4 },
      { k: 'mum', p: '0,0', sleep: true, face: 90, doze: [6.3, 3.4, 2.1] },
    ],
    par: 81,
    toys: 1,
  }),
  // night 7 (tier 3): score 66, route 49 cells; playtest avg 90% / good 100%, ~72 s
  night(F7, {
    guards: [
      { k: 'mum', p: '3,1 3,9', w: 1.7, speed: 0.96, delay: 3 },
      { k: 'dad', p: '1,9', sleep: true, face: 90, doze: [5.5, 3.3, 2.9] },
      { k: 'cat', p: '1,6', face: 90 },
    ],
    par: 82,
    toys: 1,
  }),
  // night 8 (tier 3): score 67, route 50 cells; playtest avg 60% / good 10%, ~45 s
  night(F8, {
    guards: [
      { k: 'mum', p: '1,5 9,5', w: 1.4, speed: 1.2, delay: 4 },
      { k: 'grandma', p: '6,0', sleep: true, face: 90, doze: [4.6, 2.3, 2.4] },
      { k: 'cat', p: '5,0', face: 90 },
    ],
    par: 83,
    toys: 1,
  }),
  // night 9 (tier 4): score 69, route 48 cells; playtest avg 60% / good 80%, ~70 s
  night(F9, {
    guards: [
      { k: 'mum', p: '3,9 3,1', w: 1.2, speed: 1.03, delay: 2 },
      { k: 'mum', p: '0,2 1,5', w: 1.4, speed: 0.89, delay: 6 },
      { k: 'grandma', p: '1,0', sleep: true, face: 90, doze: [4.9, 3.2, 3.2] },
    ],
    par: 84,
    toys: 1,
  }),
  // night 10 (tier 9): score 70, route 44 cells; playtest avg 90% / good 100%, ~49 s
  night(F10, {
    guards: [
      { k: 'mum', p: '1,7 10,7', w: 1.7, speed: 1.19, delay: 4 },
      { k: 'mum', p: '3,5 2,1', w: 2.2, speed: 1.18, delay: 3 },
      { k: 'mum', p: '7,5', sleep: true, face: 90, doze: [6.3, 2.4, 4.7] },
    ],
    par: 85,
    toys: 1,
    dark: 'D',
    tip: 'motion',
  }),
];
