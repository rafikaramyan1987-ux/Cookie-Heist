import { night, Plan } from '../helpers';
import type { LevelSrc } from '../../game/types';

/** House 5 — Grand Mansion: everyone, keys, switches, bed checks and long galleries. */

const M1: Plan = {
  map: [
    'KKKKMMMMMMM',
    'KKKKMMMMMMM',
    'KKKKMMMMMMM',
    'KKKKMMMMMMM',
    'EEEEEEEEEEE',
    'EEEEEEEEEEE',
    'YYYYLLLLPPP',
    'YYYYLLLLPPP',
    'YYYYLLLLPPP',
    'BBBBLLLLPPP',
    'BBBBLLLLPPP',
    'BBBBLLLLPPP',
    'BBBBLLLLPPP',
  ],
  obj: ['CNOF  q J q', '           ', ' rr  I   I ', '           ', 'M         M', '           ', 'RR  q    d ', '    SS     ', 'A        ZZ', '         ZZ', '  W  r    U', 'b    r   n ', 'bnX       q'],
  doors: '2,4n 6,4n 8,4n 4,1w 1,6n 5,6n 9,6n 1,9n 4,10w 8,8w',
  windows: '7,0n 0,1w 10,8e 0,11w',
};

const M2: Plan = {
  map: [
    'KKKKKDDDDDDD',
    'KKKKKDDDDDDD',
    'KKKKKDDDDDDD',
    'EEEEEEEEEEEE',
    'EEEEEEEEEEEE',
    'MMMMMMMYYYYY',
    'MMMMMMMYYYYY',
    'MMMMMMMYYYYY',
    'MMMMMMMYYYYY',
    'HHHHHHHHHHHH',
    'BBBBTTTTPPPP',
    'BBBBTTTTPPPP',
    'BBBBTTTTPPPP',
    'BBBBTTTTPPPP',
  ],
  obj: ['CNOFC  q  qK', '       hh   ', '  rr  TTTT  ', '            ', 'M    q     M', ' I   I  R R ', '            ', ' I   I      ', '    J      d', '            ', '  W   R    U', '         ZZ ', 'b   r    ZZ ', 'bn X  n   q '],
  doors: '2,3n 8,3n 5,1w 3,5n 9,5n 7,7w 2,9n 9,9n 1,10n 5,10n 10,10n',
  windows: '3,0n 9,0n 0,6w 11,6e 0,12w 11,12e',
};

export const MANSION: LevelSrc[] = [
  night(M1, {
    name: ['Welcome to the Manor', 'Bienvenue au manoir'],
    put: 'j 0,0; c 9,3',
    guards: [{ k: 'vacuum', p: '1,4 9,5', w: 1 }],
    par: 35,
  }),
  night(M1, {
    name: ['The Butler’s Night Off', 'Le soir de congé du majordome'],
    boost: 1.3,
    put: 'j 0,0; c 7,1; Q 3,5',
    guards: [
      { k: 'mum', p: '0,5 10,5', w: 2, speed: 0.75 },
      { k: 'cat', p: '6,11', face: 0 },
    ],
    par: 45,
  }),
  night(M1, {
    pace: 0.85,
    name: ['Library Shadows', 'Ombres de la bibliothèque'],
    boost: 1.3,
    put: 'j 0,0; c 3,8; s 5,6; c 8,5',
    guards: [
      { k: 'grandma', p: '5,9 6,11', w: 2.5, speed: 0.7 },
      { k: 'teen', p: '6,1 7,1', w: 2.5, speed: 0.5, face: 180 },
    ],
    par: 45,
  }),
  night(M1, {
    name: ['Ballroom Dash', 'Course dans la salle de bal'],
    put: 'j 1,0; c 10,1; c 6,3; Q 8,5',
    guards: [
      { k: 'dad', p: '5,1 9,3', w: 2.5, speed: 0.6 },
      { k: 'mum', p: '4,4 10,4', w: 2.5, speed: 0.65 },
    ],
    par: 50,
    toys: 1,
  }),
  night(M2, {
    name: ['Grand Gallery', 'La grande galerie'],
    boost: 1.3,
    put: 'j 1,0; c 11,1; Q 6,3',
    guards: [
      { k: 'dad', p: '0,4 11,4', w: 2.5, speed: 0.6 },
      { k: 'vacuum', p: '1,6 5,7', w: 1 },
    ],
    par: 50,
  }),
  night(M2, {
    name: ['The Silver Key', "La clé d'argent"],
    boost: 1.3,
    put: 'j 1,0; k 10,7; c 3,2',
    doors: '2,3nL 5,1wL',
    guards: [
      { k: 'mum', p: '11,9 0,9', w: 2, speed: 0.75 },
      { k: 'cat', p: '6,6', face: 0 },
    ],
    par: 55,
  }),
  night(M2, {
    name: ['Midnight Bell', 'La cloche de minuit'],
    put: 'j 1,0; c 11,2; p 9,6; Q 6,4',
    bedCheck: 50,
    guards: [
      { k: 'grandma', p: '0,3 11,2', w: 2, speed: 0.7 },
      { k: 'teen', p: '3,8 3,7', w: 2.5, speed: 0.5, face: 0 },
    ],
    par: 55,
    toys: 1,
  }),
  night(M2, {
    name: ['Chandelier Glow', 'La lueur du lustre'],
    boost: 1.4,
    put: 'j 1,0; c 11,1; s 3,4; Q 9,4; c 6,4',
    guards: [
      { k: 'dad', p: '5,1 11,2', w: 2, speed: 0.7 },
      { k: 'mum', p: '0,4 11,4', w: 2.2, speed: 0.7 },
    ],
    par: 55,
    toys: 2,
  }),
  night(M1, {
    pace: 1.15,
    linger: 1.3,
    name: ['Everyone’s Awake', 'Tout le monde est debout'],
    put: 'j 0,0; c 10,3; Q 5,5; ~ 3,4 7,5',
    guards: [
      { k: 'mum', p: '0,5 10,5', w: 2, speed: 0.75 },
      { k: 'teen', p: '6,2 7,2', w: 2.5, speed: 0.5, face: 0 },
      { k: 'cat', p: '2,7', face: 0 },
    ],
    par: 55,
    toys: 2,
  }),
  night(M1, {
    linger: 0.7,
    name: ['Secret Passage', 'Passage secret'],
    put: 'j 0,0; k 9,11; g 10,1; c 6,3; Q 5,5',
    doors: '4,1wL',
    guards: [
      { k: 'dad', p: '6,1 9,2', w: 1.6, speed: 0.7 },
      { k: 'grandma', p: '0,4 10,4', w: 1.6, speed: 1 },
      { k: 'vacuum', p: '5,7 6,11', w: 1 },
    ],
    par: 60,
    toys: 2,
  }),
  night(M2, {
    linger: 1.3,
    name: ['Masquerade', 'Bal masqué'],
    boost: 1.3,
    put: 'j 1,0; k 10,7; c 11,2; p 0,6; Q 6,4',
    doors: '5,1wL',
    bedCheck: 60,
    guards: [
      { k: 'mum', p: '0,4 11,4', w: 2, speed: 0.75 },
      { k: 'teen', p: '9,1 10,1', w: 2.5, speed: 0.5, face: 180 },
      { k: 'cat', p: '4,7', face: 0 },
    ],
    par: 65,
    toys: 2,
  }),
  night(M2, {
    pace: 1.5,
    name: ['Grand Finale', 'La grande finale'],
    put: 'j 1,0; c 11,2; c 0,7; p 6,8; s 3,5; Q 6,4; Q 0,4; ~ 9,3',
    bedCheck: 100,
    guards: [
      { k: 'mum', p: '2,4 11,4', w: 1.75, speed: 0.9 },
      { k: 'dad', p: '6,1 11,1', w: 1.54, speed: 0.69 },
      { k: 'cat', p: '11,6', face: 180 },
    ],
    par: 75,
    toys: 3,
    tip: 'finale',
  }),
];
