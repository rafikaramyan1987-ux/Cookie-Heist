import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/** House 2 — Family House: mum, dad (awake or snoring) and Mochi the cat. */

const F1: Plan = {
  map: ['KKKKKKKKK', 'KKKKKKKKK', 'KKKKKKKKK', 'KKKKKKKKK', 'KKKKKKKKK', 'HHHHHHHHH', 'HHHHHHHHH', 'BBBBBPPPP', 'BBBBBPPPP', 'BBBBBPPPP', 'BBBBBPPPP', 'BBBBBPPPP', 'BBBBBPPPP', 'BBBBBPPPP'],
  obj: ['CNCOC  PF', '         ', '     hh  ', '    TTT  ', 'P    hh  ', '         ', 'Q       l', 'P   W  d ', '         ', '        U', '    R    ', '  r   n n', 'bn r  ZZ ', 'b   X ZZ '],
  doors: '3,5n 4,5n 2,7n 6,7n',
  windows: '6,0n 0,9w 0,2w 8,9e',
};

const F2: Plan = {
  map: ['KKKKDDDDDD', 'KKKKDDDDDD', 'KKKKDDDDDD', 'KKKKDDDDDD', 'HHHHHHHHHH', 'HHHHHHHHHH', 'BBBBLLLPPP', 'BBBBLLLPPP', 'BBBBLLLPPP', 'BBBBLLLPPP', 'BBBBLLLPPP', 'BBBBLLLPPP'],
  obj: ['CNOF P  PK', '      hh  ', '     TTTT ', '      hh  ', '          ', 'Q        l', ' W  V    d', '          ', '    SS    ', '         U', 'bn      ZZ', 'b  X  A ZZ'],
  doors: '1,4n 5,4n 4,1w 3,6n 6,6n 7,6n 7,8w',
  windows: '7,0n 0,1w 0,8w 9,9e 2,0n',
};

export const FAMILY: LevelSrc[] = [
  night(F1, {
    name: ['Meet Mochi', 'Voici Mochi'],
    put: 'j 2,0; c 8,2',
    guards: [{ k: 'cat', p: '7,3', face: 200 }],
    par: 25,
    tip: 'cat',
  }),
  night(F1, {
    name: ['Snoring Dad', 'Papa ronfle'],
    put: 'c 5,12; c 8,8; ~ 5,8 7,10',
    guards: [{ k: 'dad', p: '6,12', sleep: true, face: 270 }],
    par: 25,
    tip: 'sleep',
  }),
  night(F1, {
    name: ['Kitchen Watch', 'Surveillance en cuisine'],
    put: 'j 2,0; c 7,1',
    guards: [
      { k: 'mum', p: '1,2 8,2', w: 1.8, speed: 0.8 },
      { k: 'cat', p: '8,6', face: 180 },
    ],
    par: 35,
  }),
  night(F1, {
    name: ['Lights Out', 'Extinction des feux'],
    put: 's 3,4; P 4,4; j 1,0; c 8,3',
    guards: [{ k: 'mum', p: '5,1', face: 90, look: [90, 120, 70] }],
    par: 30,
    tip: 'switch',
  }),
  night(F2, {
    name: ["Dad's Rounds", 'La ronde de Papa'],
    put: 'j 2,0; c 8,1',
    guards: [{ k: 'dad', p: '5,5 9,5', w: 3, speed: 0.6 }],
    par: 35,
    tip: 'dad',
  }),
  night(F2, {
    name: ['Dinner Leftovers', 'Les restes du dîner'],
    put: 'j 1,0; c 9,3',
    guards: [
      { k: 'mum', p: '5,1 8,1 8,3 5,3 5,1', w: 1, speed: 0.75 },
      { k: 'cat', p: '6,10', face: 270 },
    ],
    par: 40,
  }),
  night(F2, {
    name: ['The Locked Pantry', 'Le garde-manger fermé'],
    put: 'j 2,0; k 6,10; c 3,3',
    doors: '1,4nL 4,1wL',
    guards: [{ k: 'mum', p: '0,5 9,5', w: 2, speed: 0.75 }],
    par: 45,
    tip: 'key',
  }),
  night(F2, {
    name: ['Movie Night', 'Soirée film'],
    put: 'j 2,0; c 4,11; Q 9,4',
    guards: [
      { k: 'teen', p: '5,9', face: 270 },
      { k: 'dad', p: '5,2 9,2', w: 2, speed: 0.7 },
    ],
    par: 40,
  }),
  night(F1, {
    name: ['Full House', 'Maison pleine'],
    put: 'j 2,0; c 8,4; ~ 2,6 6,5',
    guards: [
      { k: 'mum', p: '0,6 8,6', w: 1.8, speed: 0.75 },
      { k: 'cat', p: '7,1', face: 160 },
      { k: 'dad', p: '6,12', sleep: true, face: 270 },
    ],
    par: 45,
    toys: 1,
  }),
  night(F1, {
    name: ['Dark Hallway', 'Couloir sombre'],
    put: 'j 1,0; c 7,4; s 3,4; P 4,4',
    dark: 'H',
    guards: [
      { k: 'dad', p: '1,6 7,6', w: 2, speed: 0.7 },
      { k: 'mum', p: '5,1', face: 90, look: [90, 120, 70] },
    ],
    par: 45,
    toys: 1,
  }),
  night(F2, {
    name: ['Key Trouble', 'Histoire de clé'],
    put: 'j 2,0; k 9,7; c 6,1; Q 4,5',
    doors: '1,4nL',
    guards: [
      { k: 'mum', p: '5,1 9,3', w: 2.2, speed: 0.65 },
      { k: 'dad', p: '0,4 4,5', w: 2.5, speed: 0.6 },
    ],
    par: 55,
    toys: 2,
  }),
  night(F2, {
    name: ['Family Finale', 'Finale en famille'],
    put: 'j 1,0; k 9,8; c 0,2; c 5,11; Q 4,5; Q 0,4; ~ 7,5',
    doors: '1,4nL',
    guards: [
      { k: 'mum', p: '4,5 9,5', w: 2.5, speed: 0.65 },
      { k: 'dad', p: '5,3 9,1', w: 2.5, speed: 0.6 },
      { k: 'cat', p: '6,10', face: 270 },
    ],
    par: 60,
    toys: 3,
    tip: 'finale',
  }),
];
