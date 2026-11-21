import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/**
 * House 7 — Beach House (v3.4): holidays by the sea. Motion-sensor lamps light dark rooms when you move close by.
 * Every night has its own floorplan. Generated with scripts/levels/gen.ts and chosen by scripts/levels/tune.ts +
 * freeze.ts (each one passes the strict playtest audit); edit the data here directly from now on.
 */

const S1: Plan = {
  map: ['PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'LLLLLHHKKKKK', 'LLLLLHHTTTTT', 'LLLLLHHTTTTT', 'LLLLLHHTTTTT', 'BBBBBHHTTTTT', 'BBBBBHHTTTTT', 'BBBBBHHTTTTT'],
  obj: ['     P  CNjO', 'g   dQ  TT', '', 'ZZ', 'ZZ', '', 'SSrrA     c', '  rr   W', '  mV', '', 'b', 'bnWX    d  A'],
  doors: '4,2e 4,5e 4,9e 7,0w 7,10w 7,6n 4,8s 11,5s',
  windows: '1,0n 10,0n 0,1w 11,1e 0,6w 11,6e',
};

const S2: Plan = {
  map: ['KKKKKPPPPTTT', 'KKKKKPPPPTTT', 'KKKKKPPPPTTT', 'KKKKKPPPPTTT', 'KKKKKPPPPTTT', 'KKKKKPPPPTTT', 'KKKKKPPPPTTT', 'HHHHHHHHHHHH', 'EEEEEHBBBBBB', 'EEEEEHBBBBBB', 'EEEEEHBBBBBB', 'EEEEEHBBBBBB', 'EEEEEHBBBBBB'],
  obj: ['CNOj ZZc   W', '     ZZ    g', '', ' TT        d', '', '           A', '      d', '    Q', '     Q    W', '', '    e', 'm          b', 'o       X nb'],
  doors: '2,6s 8,6s 5,6s 11,6s 0,8n 4,9e 9,8n 6,10w 4,5e 9,4w 8,1e',
  windows: '1,0n 6,0n 9,0n 0,1w 11,1e 0,5w 11,5e 0,8w 11,8e 0,11w 11,11e',
};

const S3: Plan = {
  map: ['..PPDDDDKKK', 'PPPPDDDDKKK', 'PPPPDDDDKKK', 'PPPPDDDDKKK', 'PPPPDDDDKKK', 'HHHHHHHHHHH', 'LLLLHTTTTTT', 'LLLLHTTTTTT', 'LLLLHTTTTTT', 'LLLLHAAAAAA', 'BBBBHAAAAAA', 'BBBBHAAAAAA', 'BBBBHAAAAAA'],
  obj: ['  ZZ g  CNj', 'U ZZ TTR', '     TT', '', ' d', '  Q', 'SS   d  W c', '   m', '     A', '  VA P', '          Y', 'b', 'bnXW'],
  doors: '0,4s 5,4s 9,4s 3,6n 3,11e 5,7w 7,6n 5,10w 8,2w 3,4e 6,8s 1,9s',
  windows: '4,0n 7,0n 0,1w 10,1e 0,6w 10,6e 0,10w 10,10e',
};

const S4: Plan = {
  map: ['PPPPHHKKKKKK', 'PPPPHHKKKKKK', 'PPPPHHKKKKKK', 'PPPPHHKKKKKK', 'PPPPHHKKKKKK', 'DDDDHHKKKKKK', 'DDDDHHLLLLLL', 'DDDDHHLLLLLL', 'DDDDHHLLLLLL', 'DDDDHHLLLLLL', 'DDDDHHTTTTTT', 'BBBBHHTTTTTT', 'BBBBHHTTTTTT', 'BBBBHHTTTTTT'],
  obj: ['       FONjC', 'd g  Q', '    Q', '  ZZ', '  ZZ     TT', '', '   R  SS   V', '           c', ' TT        A', ' TT', 'm          d', '   X', 'b', 'bn WP WA'],
  doors: '3,1e 3,5e 3,8e 3,12e 6,0w 6,8w 6,10w 1,4s 10,9s 1,10s 10,5s',
  windows: '1,0n 8,0n 0,1w 11,1e 0,5w 11,5e 0,8w 11,8e',
};

const S5: Plan = {
  map: ['KKKKKHHTTTTT', 'KKKKKHHTTTTT', 'KKKKKHHTTTTT', 'KKKKKHHTTTTT', 'PPPPPHHTTTTT', 'PPPPPHHAAAAA', 'PPPPPHHAAAAA', 'PPPPPHHAAAAA', 'PPPPPHHBBBBB', 'PPPPPHHBBBBB', 'EEEEEHHBBBBB', 'EEEEEHHBBBBB', 'EEEEEHHBBBBB'],
  obj: ['jCNO    WA', '       c', '  TT   m', '           d', '  dZZ', 'g  ZZQ', '', '         Y P', '         W', '       X', '  o', '           b', '   e      nb'],
  doors: '4,0e 4,8e 4,11e 7,3w 7,0w 7,7w 7,12w 11,4s 7,8n 0,3s',
  windows: '1,0n 10,0n 0,1w 11,1e 0,4w 11,4e 0,8w 11,8e',
};

const S6: Plan = {
  map: ['KKKKKKPPPP..', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'HHHHHHHHHHHH', 'HHHHHHHHHHHH', 'TTTTTDDDBBBB', 'TTTTTDDDBBBB', 'TTTTTDDDBBBB', 'TTTTTDDDBBBB', 'TTTTTDDDBBBB', 'TTTTTDDDBBBB'],
  obj: [' FjONCZZc', '  TT  ZZ', '', '', '      d  U', '       Q', '', '         W', '   gA', 'm       X', '    d', 'W    R  b', '        bn'],
  doors: '3,4s 0,4s 11,4s 8,4s 3,7n 5,7n 11,7n 6,3w 5,9w 4,7e',
  windows: '1,0n 6,0n 0,1w 11,1e 0,8w 11,8e',
};

const S7: Plan = {
  map: ['KKKKKPPPPPP', 'KKKKKPPPPPP', 'KKKKKPPPPPP', 'KKKKKPPPPPP', 'KKKKKPPPPPP', 'KKKKKPPPPPP', 'KKKKKPPPPPP', 'HHHHHHHHHHH', 'HHHHHHHHHHH', 'TTTTTBBBBBB', 'TTTTTBBBBBB', 'TTTTTBBBBBB', 'TTTTTBBBBBB'],
  obj: ['CjNO c   ZZ', '     m   ZZ', '', '', ' TT', '', '     d', '         Q', '', '         W', 'Ag   X', 'd         b', ' W       nb'],
  doors: '1,6s 7,6s 4,9n 10,9n 4,5e',
  windows: '1,0n 5,0n 9,0n 0,1w 10,1e 0,4w 10,4e',
};

const S8: Plan = {
  map: ['..PPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'PPPPPHHKKKKK', 'LLLLLHHTTTTT', 'LLLLLHHTTTTT', 'LLLLLHHTTTTT', 'LLLLLHHAAAAA', 'BBBBBHHAAAAA', 'BBBBBHHAAAAA', 'BBBBBHHAAAAA'],
  obj: ['  g  P CNOj', '', '', '', '   ZZ    TT', '  dZZ', ' mASS      c', '  rr QQW', 'V rr    d A', '', '', 'b   W      P', 'bn X     Y'],
  doors: '4,1e 4,8e 4,10e 7,2w 7,6w 7,12w 8,6n 0,5s 0,9s',
  windows: '4,0n 7,0n 0,1w 11,1e 0,4w 11,4e 0,9w 11,9e',
};

const S9: Plan = {
  map: ['..PPTTTKKKKK', 'PPPPTTTKKKKK', 'PPPPTTTKKKKK', 'PPPPTTTKKKKK', 'HHHHHHHHHHHH', 'AAAAAAAHEEEE', 'AAAAAAAHEEEE', 'AAAAAAAHEEEE', 'HHHHHHHHHHHH', 'BBBDDDDDLLLL', 'BBBDDDDDLLLL', 'BBBDDDDDLLLL', 'BBBDDDDDLLLL'],
  obj: ['  U g   OjNC', 'd     A  TT', 'ZZ  W', 'ZZ   d', '', '    Y   o ec', '', '  P', '        Q', '  W    R   A', '  X     V', 'b   TT', 'bn  m   SS'],
  doors: '2,3s 6,3s 10,3s 7,3s 1,7s 3,5n 11,7s 8,6w 1,9n 3,9n 6,9n 9,9n 7,2w 4,1w',
  windows: '5,0n 8,0n 0,1w 11,1e 0,6w 11,6e 0,9w 11,9e',
};

const S10: Plan = {
  map: ['KKKKKPPPPLLLL', 'KKKKKPPPPLLLL', 'KKKKKPPPPLLLL', 'KKKKKPPPPLLLL', 'KKKKKPPPPLLLL', 'KKKKKPPPPLLLL', 'KKKKKPPPPLLLL', 'HHHHHHHHHHHHH', 'HHHHHHHHHHHHH', 'TTTTTEEEEEBBB', 'TTTTTEEEEEBBB', 'TTTTTEEEEEBBB', 'TTTTTEEEEEBBB', 'TTTTTEEEEEBBB'],
  obj: ['CNOj ZZc', 'p    ZZ  V', '  TT', '        d   A', '          rr', '          rr', '          SS', '', '            Q', '       mo', '    g', 'W        e  X', '            b', 'd   A     Wnb'],
  doors: '2,6s 8,6s 12,6s 1,9n 5,9n 11,9n 10,12w 5,2w 9,0w 4,5e',
  windows: '1,0n 4,0n 8,0n 0,1w 12,1e 0,4w 12,4e 0,9w 12,9e',
};

export const BEACHHOUSE: LevelSrc[] = [
  // night 1 (tier 10): score 71, route 41 cells; playtest avg 60% / good 40%, ~58 s
  night(S1, {
    guards: [
      { k: 'mum', p: '5,10 5,1', w: 1.1, speed: 0.96, delay: 4 },
      { k: 'mum', p: '0,5 11,9', w: 1.3, speed: 1.19, delay: 5 },
      { k: 'mum', p: '0,3', sleep: true, face: 90, doze: [5.9, 2.7, 2.5] },
      { k: 'cat', p: '0,0', face: 90 },
    ],
    par: 86,
    toys: 2,
    dark: 'L',
  }),
  // night 2 (tier 10): score 72, route 42 cells; playtest avg 50% / good 30%, ~76 s
  night(S2, {
    guards: [
      { k: 'teen', p: '1,7 10,7', w: 1.6, speed: 1.17, delay: 2 },
      { k: 'dad', p: '10,4 6,2', w: 2.1, speed: 1.05, delay: 6 },
      { k: 'dad', p: '5,0', sleep: true, face: 90, doze: [6.2, 2.9, 4.9] },
      { k: 'vacuum', p: '9,0 9,2', w: 1 },
    ],
    par: 87,
    toys: 2,
    dark: 'E',
  }),
  // night 3 (tier 10): score 74, route 44 cells; playtest avg 80% / good 80%, ~49 s
  night(S3, {
    guards: [
      { k: 'mum', p: '9,5 1,5', w: 1.8, speed: 0.97, delay: 4 },
      { k: 'mum', p: '10,11 2,2', w: 2.1, speed: 0.85, delay: 5 },
      { k: 'mum', p: '2,0', sleep: true, face: 90, doze: [4.8, 2.8, 3.1] },
      { k: 'vacuum', p: '4,0 6,0', w: 1 },
    ],
    par: 88,
    toys: 2,
    dark: 'L',
  }),
  // night 4 (tier 16): score 75, route 41 cells; playtest avg 90% / good 100%, ~40 s
  night(S4, {
    guards: [
      { k: 'mum', p: '4,1 4,12', w: 1.5, speed: 1.06, delay: 3 },
      { k: 'teen', p: '0,0 11,11', w: 1.5, speed: 0.91, delay: 5 },
      { k: 'mum', p: '9,10 0,8', w: 1.8, speed: 1.08, delay: 3 },
      { k: 'dad', p: '2,3', sleep: true, face: 90, doze: [4.5, 2.8, 4.6] },
    ],
    par: 89,
    toys: 2,
    dark: 'D',
  }),
  // night 5 (tier 10): score 76, route 46 cells; playtest avg 80% / good 100%, ~44 s
  night(S5, {
    guards: [
      { k: 'mum', p: '5,11 5,1', w: 1.5, speed: 1.1, delay: 3 },
      { k: 'teen', p: '0,2 7,5', w: 1.3, speed: 1.06, delay: 5 },
      { k: 'dad', p: '3,4', sleep: true, face: 90, doze: [7, 2.7, 3.3] },
      { k: 'cat', p: '0,4', face: 90 },
    ],
    par: 90,
    toys: 2,
    dark: 'T',
  }),
  // night 6 (tier 13): score 78, route 40 cells; playtest avg 60% / good 70%, ~54 s
  night(S6, {
    guards: [
      { k: 'mum', p: '1,5 10,5', w: 1.7, speed: 1.18, delay: 4 },
      { k: 'mum', p: '0,10 6,7', w: 2, speed: 0.97, delay: 5 },
      { k: 'dad', p: '6,8 1,2', w: 1.6, speed: 0.88, delay: 5 },
      { k: 'dad', p: '6,0', sleep: true, face: 90, doze: [6.3, 3, 3.4] },
      { k: 'vacuum', p: '0,9 4,11', w: 1 },
    ],
    par: 91,
    toys: 2,
    dark: 'T',
  }),
  // night 7 (tier 10): score 79, route 49 cells; playtest avg 80% / good 30%, ~43 s
  night(S7, {
    guards: [
      { k: 'mum', p: '9,7 1,7', w: 1.4, speed: 1.19, delay: 4 },
      { k: 'dad', p: '4,4 0,9', w: 1.9, speed: 0.96, delay: 6 },
      { k: 'dad', p: '9,0', sleep: true, face: 90, doze: [6.7, 3.1, 4.5] },
      { k: 'cat', p: '1,9', face: 90 },
    ],
    par: 92,
    toys: 2,
    dark: 'P',
  }),
  // night 8 (tier 18): score 81, route 43 cells; playtest avg 90% / good 40%, ~37 s
  night(S8, {
    guards: [
      { k: 'mum', p: '5,1 5,11', w: 1.6, speed: 1.03, delay: 3 },
      { k: 'dad', p: '11,4 1,6', w: 2.1, speed: 0.91, delay: 6 },
      { k: 'teen', p: '3,2 8,3', w: 1.8, speed: 1.02, delay: 5 },
      { k: 'dad', p: '3,4', sleep: true, face: 90, doze: [6.8, 3.3, 4.3] },
      { k: 'cat', p: '2,0', face: 90 },
    ],
    par: 93,
    toys: 2,
    dark: 'L',
  }),
  // night 9 (tier 12): score 83, route 45 cells; playtest avg 90% / good 100%, ~39 s
  night(S9, {
    guards: [
      { k: 'mum', p: '10,4 1,4', w: 1.4, speed: 0.88, delay: 2 },
      { k: 'dad', p: '3,2 5,5', w: 1.7, speed: 0.91, delay: 4 },
      { k: 'mum', p: '3,2 11,2', w: 1.4, speed: 0.97, delay: 3 },
      { k: 'dad', p: '0,2', sleep: true, face: 90, doze: [5.6, 2.6, 3.1] },
      { k: 'cat', p: '4,0', face: 90 },
    ],
    par: 94,
    toys: 2,
    dark: 'D',
  }),
  // night 10 (tier 18): score 84, route 40 cells; playtest avg 60% / good 10%, ~69 s
  night(S10, {
    guards: [
      { k: 'mum', p: '11,7 1,7', w: 1.7, speed: 1.04, delay: 4 },
      { k: 'dad', p: '5,4 3,10', w: 1.5, speed: 1.03, delay: 4 },
      { k: 'mum', p: '12,0 0,12', w: 1.5, speed: 1.1, delay: 6 },
      { k: 'cat', p: '4,9', face: 90 },
      { k: 'mum', p: '5,0 1,7 11,7', sleep: true, face: 90, wakeAt: 31, w: 1.5, speed: 0.88 },
    ],
    par: 95,
    toys: 2,
    dark: 'E',
    bedCheck: 88,
    tip: 'alarm',
  }),
];
