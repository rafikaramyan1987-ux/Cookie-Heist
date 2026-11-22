import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/**
 * House 8 — Royal Castle (v3.4): the grand finale. Alarm clocks get grown-ups up mid-night; everything from before comes back.
 * Every night has its own floorplan. Generated with scripts/levels/gen.ts and chosen by scripts/levels/tune.ts +
 * freeze.ts (each one passes the strict playtest audit); edit the data here directly from now on.
 */

const R1: Plan = {
  map: ['PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'PPPPPPGGGKKKK', 'HHHHHHHHHHHHH', 'BBBBBBBBHEEEE', 'BBBBBBBBHEEEE', 'BBBBBBBBHEEEE', 'BBBBBBBBHEEEE', 'BBBBBBBBHEEEE'],
  obj: [' m    ZZcjCNO', '      ZZ', '     dd', '          TT', '', '      G', '    ZZ', '   UZZm', '        Q', '', '       W    g', '       X', 'b', 'bn        M o'],
  doors: '1,7s 7,7s 10,7s 1,9n 4,9n 9,12w 9,2w',
  windows: '1,0n 6,0n 9,0n 0,1w 12,1e 0,6w 12,6e 0,10w 12,10e',
};

const R2: Plan = {
  map: ['..PPGGGKKKKKK', 'PPPPGGGKKKKKK', 'PPPPGGGKKKKKK', 'PPPPGGGKKKKKK', 'HHHHHHHHHHHHH', 'DDDDDDDHEEEEE', 'DDDDDDDHEEEEE', 'DDDDDDDHEEEEE', 'DDDDDDDHEEEEE', 'HHHHHHHHHHHHH', 'BBBMMMMMLLLLL', 'BBBMMMMMLLLLL', 'BBBMMMMMLLLLL', 'BBBMMMMMLLLLL'],
  obj: ['  d ZZd FONjC', '    ZZG', 'ZZ   g  TT', 'ZZ', '', '            c', '', 'q TT  m m', '          M o', '  Q', '           SS', 'W   I I  rr', '  b      rr', 'XnbJ   qAV'],
  doors: '2,3s 4,3s 10,3s 6,8e 2,5n 8,8w 8,5n 0,10n 4,10n 8,10n 7,2w 4,2w 2,10e',
  windows: '6,0n 11,0n 0,1w 12,1e 0,6w 12,6e 0,10w 12,10e',
};

const R3: Plan = {
  map: ['GGGGPPPPKKKKK', 'GGGGPPPPKKKKK', 'GGGGPPPPKKKKK', 'GGGGPPPPKKKKK', 'HHHHHHHHHHHHH', 'LLLLLLHYYYYYY', 'LLLLLLHYYYYYY', 'LLLLLLHYYYYYY', 'LLLLLLHYYYYYY', 'HHHHHHHHHHHHH', 'BBBBBDDDDDEEE', 'BBBBBDDDDDEEE', 'BBBBBDDDDDEEE', 'BBBBBDDDDDEEE'],
  obj: ['ZZd    gCjNO', 'ZZ', '    ZZ d  TT', '  G ZZ', '', 'SS        ARR', 'V rr        c', '  rr', '   A        m', '       Q', '          M', 'W           o', '    b TT', '  Xnbq  m'],
  doors: '1,3s 6,3s 11,3s 2,5n 5,8s 7,5n 1,10n 5,10n 9,10n 12,10n 5,11w 3,0e 8,1w',
  windows: '1,0n 5,0n 9,0n 0,1w 12,1e 0,5w 12,5e 0,8w 12,8e',
};

const R4: Plan = {
  map: ['PPPGGGGKKKKKK', 'PPPGGGGKKKKKK', 'PPPGGGGKKKKKK', 'PPPGGGGKKKKKK', 'HHHHHHHHHHHHH', 'DDDDDHEEEEEEE', 'DDDDDHEEEEEEE', 'DDDDDHEEEEEEE', 'BBBBBHEEEEEEE', 'BBBBBHEEEEEEE', 'BBBBBHYYYYYYY', 'BBBBBHYYYYYYY', 'BBBBBHYYYYYYY'],
  obj: ['m   dZZCNOjF', 'd    ZZ', 'ZZ g      TT', 'ZZ    G', '    Q', 'm           c', ' TT q o', '', ' W', '            M', '      RR', 'b   X', 'bn          A'],
  doors: '2,3s 3,3s 11,3s 2,5n 4,10e 9,5n 6,9w 6,12w 7,2w 9,9s 3,1w 4,7s',
  windows: '1,0n 5,0n 8,0n 0,1w 12,1e 0,6w 12,6e 0,11w 12,11e',
};

const R5: Plan = {
  map: ['KKKKKKPPPP..', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'KKKKKKPPPPPP', 'HHHHHHHHHHHH', 'GGGGHBBBBBBB', 'GGGGHBBBBBBB', 'GGGGHBBBBBBB', 'GGGGHBBBBBBB', 'GGGGHBBBBBBB', 'GGGGHBBBBBBB'],
  obj: [' FONjCdm', '', '   TT     g', '', '      ZZ', '      ZZ U', 'PQ   Q', 'ZZ d     X', 'ZZ', 'c  G', '', '           b', '  m  W    nb'],
  doors: '2,5s 11,5s 2,7n 3,11e 8,7n 5,7w 5,2e 6,3w',
  windows: '1,0n 6,0n 0,1w 11,1e 0,5w 11,5e 0,9w 11,9e',
};

const R6: Plan = {
  map: ['KKKKKPPPPPGGG', 'KKKKKPPPPPGGG', 'KKKKKPPPPPGGG', 'KKKKKPPPPPGGG', 'HHHHHHHHHHHHH', 'HHHHHHHHHHHHH', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB', 'LLLLMMMMBBBBB'],
  obj: ['CjNO c Ud  ZZ', ' kTT       ZZ', '        ZZ  G', '        ZZ  d', '', 'Q', '  A', '', '    q       W', '  g     X', '', 'SS', '   VJ       b', 'm   m      nb'],
  doors: '3,3s 0,3s 7,3sL 11,3s 1,6n 6,6n 9,6n 12,6n 8,13w 4,9w 3,7e 4,3e',
  windows: '1,0n 4,0n 7,0n 11,0n 0,1w 12,1e 0,6w 12,6e 0,10w 12,10e',
};

const R7: Plan = {
  map: ['KKKKHHMMMMMM', 'KKKKHHMMMMMM', 'KKKKHHMMMMMM', 'KKKKHHMMMMMM', 'KKKKHHMMMMMM', 'GGGGHHMMMMMM', 'GGGGHHDDDDDD', 'GGGGHHDDDDDD', 'GGGGHHDDDDDD', 'GGGGHHDDDDDD', 'PPPPHHDDDDDD', 'PPPPHHBBBBBB', 'PPPPHHBBBBBB', 'PPPPHHBBBBBB'],
  obj: ['CNOj', '   k   I  I', ' TT        J', '        p  g', '      q', ' cd', '', 'G       TT', 'ZZ      TT', 'ZZ m', 'ZZ       q', 'ZZ       W', '    Q      b', 'dm       Xnb'],
  doors: '3,2e 3,6eL 3,13e 6,5w 6,8w 6,13w 11,11n 2,10n 0,4s 9,5s',
  windows: '1,0n 9,0n 0,1w 11,1e 0,4w 11,4e 0,9w 11,9e',
};

const R8: Plan = {
  map: ['GGGGPPPPPKKKK', 'GGGGPPPPPKKKK', 'GGGGPPPPPKKKK', 'GGGGPPPPPKKKK', 'GGGGPPPPPKKKK', 'GGGGPPPPPKKKK', 'HHHHHHHHHHHHH', 'HHHHHHHHHHHHH', 'BBBYYYYYYLLLL', 'BBBYYYYYYLLLL', 'BBBYYYYYYLLLL', 'BBBYYYYYYLLLL', 'BBBYYYYYYLLLL', 'BBBYYYYYYLLLL'],
  obj: ['ZZm   cZZCjNO', 'ZZ     ZZ', '   d', '', '          TT', ' G    d U', '         Q', '', '   RRA  m', '    k    p', '  W', '', '  b      gSS', 'Xnb       AV'],
  doors: '0,5s 3,5s 5,5sL 10,5s 2,8n 6,8n 11,8n 3,9w 9,4w 3,4e 9,11w',
  windows: '1,0n 6,0n 9,0n 0,1w 12,1e 0,5w 12,5e 0,10w 12,10e',
};

const R9: Plan = {
  map: ['PPPPPGGGKKKKK', 'PPPPPGGGKKKKK', 'PPPPPGGGKKKKK', 'HHHHHHHHHHHHH', 'DDDDDDHMMMMMM', 'DDDDDDHMMMMMM', 'DDDDDDHMMMMMM', 'DDDDDDHMMMMMM', 'DDDDDDHMMMMMM', 'HHHHHHHHHHHHH', 'BBBBLLLLEEEEE', 'BBBBLLLLEEEEE', 'BBBBLLLLEEEEE', 'BBBBLLLLEEEEE'],
  obj: ['ZZ d ZZ  jCNO', 'ZZ   ZZg', '', '', '     q   m  c', ' TT     I  I', ' TT         J', '       q', '   m', '           Q', '  W    A   M', '    SS', '   b', ' Xnb  V    o'],
  doors: '3,2s 5,2s 10,2s 5,7e 12,8s 7,4w 0,10n 4,10n 12,10n 8,13w 7,0e 4,2e',
  windows: '1,0n 5,0n 8,0n 0,1w 12,1e 0,4w 12,4e 0,8w 12,8e 0,12w 12,12e',
};

const R10: Plan = {
  map: ['..GGGGKKKKKK', 'GGGGGGKKKKKK', 'GGGGGGKKKKKK', 'GGGGGGKKKKKK', 'HHHHHHHHHHHH', 'PPPPPPPHLLLL', 'PPPPPPPHLLLL', 'PPPPPPPHLLLL', 'PPPPPPPHLLLL', 'HHHHHHHHHHHH', 'BBBBBBDDDDDD', 'BBBBBBDDDDDD', 'BBBBBBDDDDDD'],
  obj: ['    ZZ FONCj', ' g  ZZ', 'G       TT', 'm d', '       Q', '     m  VSSc', 'd        rr', 'ZZ       rrA', 'ZZ', 'K', '     X k', 'b       TT', 'bnW        q'],
  doors: '1,3s 5,3s 8,3s 11,3s 3,8s 8,7wL 2,10n 6,10n 6,2w 6,11w',
  windows: '6,0n 10,0n 0,1w 11,1e',
};

export const CASTLE: LevelSrc[] = [
  // night 1 (tier 28): score 85, route 37 cells; playtest avg 40% / good 0%, ~44 s
  night(R1, {
    guards: [
      { k: 'mum', p: '1,8 11,8', w: 1.4, speed: 1.07, delay: 4 },
      { k: 'teen', p: '11,6 11,12', w: 1.5, speed: 1.19, delay: 5 },
      { k: 'dad', p: '10,12 7,6', w: 2, speed: 1.15, delay: 5 },
      { k: 'dad', p: '4,6', sleep: true, face: 90, doze: [5.9, 2.8, 2.9] },
      { k: 'grandma', p: '6,0', sleep: true, face: 90, doze: [5.3, 2.4, 2.1] },
      { k: 'vacuum', p: '10,9 9,10', w: 1 },
    ],
    par: 96,
    toys: 3,
    dark: 'GP',
  }),
  // night 2 (tier 20): score 86, route 46 cells; playtest avg 80% / good 90%, ~68 s
  night(R2, {
    guards: [
      { k: 'dad', p: '1,4 11,4', w: 1.5, speed: 1.13, delay: 3 },
      { k: 'mum', p: '11,12 0,5', w: 1.3, speed: 1.14, delay: 5 },
      { k: 'mum', p: '0,2', sleep: true, face: 90, doze: [6.3, 3.5, 2.5] },
      { k: 'cat', p: '5,1', face: 90 },
      { k: 'mum', p: '4,0 1,4 11,4', sleep: true, face: 90, wakeAt: 25, w: 1.5, speed: 0.85 },
    ],
    par: 97,
    toys: 3,
    dark: 'DE',
  }),
  // night 3 (tier 21): score 90, route 46 cells; playtest avg 90% / good 100%, ~57 s
  night(R3, {
    guards: [
      { k: 'mum', p: '11,4 1,4', w: 1.1, speed: 1.15, delay: 3 },
      { k: 'teen', p: '1,2 4,7', w: 1.7, speed: 1.05, delay: 3 },
      { k: 'grandma', p: '2,1 4,1', w: 1.4, speed: 1.12, delay: 6 },
      { k: 'grandma', p: '0,0', sleep: true, face: 90, doze: [5.3, 3.2, 3.1] },
      { k: 'mum', p: '4,2 1,4 11,4', sleep: true, face: 90, wakeAt: 28, w: 1.5, speed: 0.92 },
    ],
    par: 98,
    toys: 3,
    dark: 'DY',
  }),
  // night 4 (tier 22): score 95, route 47 cells; playtest avg 80% / good 100%, ~40 s
  night(R4, {
    guards: [
      { k: 'mum', p: '11,4 1,4', w: 1.1, speed: 0.94, delay: 2 },
      { k: 'teen', p: '12,10 2,2', w: 2.2, speed: 1.03, delay: 5 },
      { k: 'grandma', p: '3,0 2,2', w: 1.9, speed: 1.06, delay: 5 },
      { k: 'mum', p: '0,2', sleep: true, face: 90, doze: [6.5, 2.3, 4.4] },
      { k: 'cat', p: '3,1', face: 90 },
      { k: 'mum', p: '5,0 1,4 11,4', sleep: true, face: 90, wakeAt: 25, w: 1.5, speed: 1.11 },
    ],
    par: 99,
    toys: 3,
    dark: 'DP',
  }),
  // night 5 (tier 20): score 96, route 48 cells; playtest avg 80% / good 60%, ~67 s
  night(R5, {
    guards: [
      { k: 'dad', p: '10,6 1,6', w: 1.2, speed: 1.07, delay: 4 },
      { k: 'teen', p: '11,3 5,1', w: 1.9, speed: 1.09, delay: 3 },
      { k: 'grandma', p: '4,4 8,3', w: 2, speed: 1.04, delay: 5 },
      { k: 'mum', p: '6,4', sleep: true, face: 90, doze: [5, 2, 2.4] },
      { k: 'grandma', p: '0,7', sleep: true, face: 90, doze: [4.5, 2.7, 4.7] },
      { k: 'cat', p: '10,1', face: 90 },
    ],
    par: 100,
    toys: 3,
    dark: 'PG',
  }),
  // night 6 (tier 27): score 97, route 46 cells; playtest avg 40% / good 100%, ~95 s
  night(R6, {
    guards: [
      { k: 'mum', p: '11,4 1,4', w: 1.7, speed: 1.16, delay: 4 },
      { k: 'dad', p: '6,11 9,1', w: 2, speed: 1.15, delay: 3 },
      { k: 'teen', p: '9,0 0,1', w: 1.6, speed: 1.13, delay: 3 },
      { k: 'mum', p: '8,2', sleep: true, face: 90, doze: [7, 2.7, 3.7] },
      { k: 'grandma', p: '11,0', sleep: true, face: 90, doze: [6.9, 2.1, 4.5] },
      { k: 'vacuum', p: '0,6 2,7', w: 1 },
    ],
    par: 101,
    toys: 3,
    dark: 'LM',
  }),
  // night 7 (tier 25): score 100, route 43 cells; playtest avg 70% / good 90%, ~64 s
  night(R7, {
    guards: [
      { k: 'grandma', p: '4,1 4,12', w: 1.2, speed: 1.11, delay: 3 },
      { k: 'dad', p: '3,12 8,6', w: 1.5, speed: 1, delay: 5 },
      { k: 'teen', p: '10,2 7,6', w: 2, speed: 1.05, delay: 3 },
      { k: 'grandma', p: '0,8', sleep: true, face: 90, doze: [6.3, 2.4, 3] },
      { k: 'mum', p: '0,10', sleep: true, face: 90, doze: [4.8, 3, 3.2] },
      { k: 'cat', p: '11,2', face: 90 },
    ],
    par: 102,
    toys: 3,
    dark: 'PG',
    bedCheck: 95,
  }),
  // night 8 (tier 20): score 101, route 44 cells; playtest avg 70% / good 100%, ~66 s
  night(R8, {
    guards: [
      { k: 'teen', p: '11,6 1,6', w: 1.6, speed: 1.11, delay: 2 },
      { k: 'mum', p: '2,3 10,2', w: 1.5, speed: 0.98, delay: 3 },
      { k: 'grandma', p: '7,3 5,11', w: 1.2, speed: 1.2, delay: 6 },
      { k: 'grandma', p: '0,0', sleep: true, face: 90, doze: [5.7, 3.4, 2.2] },
      { k: 'vacuum', p: '12,8 10,10', w: 1 },
      { k: 'dad', p: '7,0 1,6 11,6', sleep: true, face: 90, wakeAt: 18, w: 1.5, speed: 0.94 },
    ],
    par: 103,
    toys: 3,
    dark: 'GY',
    bedCheck: 90,
  }),
  // night 9 (tier 26): score 103, route 63 cells; playtest avg 90% / good 80%, ~78 s
  night(R9, {
    guards: [
      { k: 'mum', p: '1,3 11,3', w: 1.1, speed: 0.96, delay: 3 },
      { k: 'teen', p: '2,7 5,12', w: 1.7, speed: 0.93, delay: 5 },
      { k: 'mum', p: '0,0', sleep: true, face: 90, doze: [6.1, 2.5, 2.1] },
      { k: 'grandma', p: '5,0', sleep: true, face: 90, doze: [5.7, 2.2, 3.6] },
      { k: 'cat', p: '7,0', face: 90 },
    ],
    par: 104,
    toys: 3,
    dark: 'DM',
  }),
  // night 10 (tier 20): score 105, route 54 cells; playtest avg 90% / good 50%, ~60 s
  night(R10, {
    guards: [
      { k: 'grandma', p: '1,4 10,4', w: 1, speed: 1.02, delay: 4 },
      { k: 'mum', p: '2,0 6,1', w: 2.2, speed: 1.09, delay: 6 },
      { k: 'teen', p: '10,2 10,11', w: 1.6, speed: 0.9, delay: 4 },
      { k: 'grandma', p: '4,0', sleep: true, face: 90, doze: [5.3, 3.4, 2.7] },
      { k: 'vacuum', p: '4,2 2,0', w: 1 },
      { k: 'dad', p: '0,7 1,4 10,4', sleep: true, face: 90, wakeAt: 28, w: 1.5, speed: 0.87 },
    ],
    par: 105,
    toys: 3,
    dark: 'PG',
    tip: 'finale',
  }),
];
