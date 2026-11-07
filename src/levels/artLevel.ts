import type { LevelDef } from './types';

/** Art-test level: kid's bedroom + hallway + kitchen (+ parents' room). Family house. */
export const ART_LEVEL: LevelDef = {
  id: 'art-family',
  house: 'family',
  name: { en: 'Midnight Snack', fr: 'Petit creux de minuit' },
  w: 9,
  d: 14,
  rooms: [
    { id: 'kitchen', x: 0, z: 0, w: 9, d: 5, floor: 'checker', wall: 'stripesCream' },
    { id: 'hall', x: 0, z: 5, w: 9, d: 2, floor: 'darkwood', wall: 'teal' },
    { id: 'bedroom', x: 0, z: 7, w: 5, d: 7, floor: 'oak', wall: 'starsBlue' },
    { id: 'parents', x: 5, z: 7, w: 4, d: 7, floor: 'carpetRose', wall: 'floral' },
  ],
  doors: [
    { x: 3, z: 5, side: 'n' },
    { x: 4, z: 5, side: 'n' },
    { x: 2, z: 7, side: 'n' },
    { x: 6, z: 7, side: 'n' },
  ],
  windows: [
    { x: 6, z: 0, side: 'n' },
    { x: 0, z: 9, side: 'w' },
    { x: 0, z: 2, side: 'w' },
    { x: 8, z: 9, side: 'e' },
  ],
  props: [
    // kitchen
    { type: 'counter', x: 0.5, z: 0.4 },
    { type: 'sink', x: 1.5, z: 0.4 },
    { type: 'counter', x: 2.5, z: 0.4 },
    { type: 'stove', x: 3.5, z: 0.4 },
    { type: 'counter', x: 4.5, z: 0.4 },
    { type: 'cookieJar', x: 2.5, z: 0.45, y: 0.885 },
    { type: 'fridge', x: 8.45, z: 0.48 },
    { type: 'plant', x: 7.4, z: 0.4, opts: { pot: 0x7fc8b8 } },
    { type: 'table', x: 5.0, z: 2.9 },
    { type: 'chair', x: 4.5, z: 2.05, opts: { color: 0xf3c48e } },
    { type: 'chair', x: 5.5, z: 2.05, opts: { color: 0xf3c48e } },
    { type: 'chair', x: 4.5, z: 3.75, rot: 2, opts: { color: 0xf3c48e } },
    { type: 'chair', x: 5.5, z: 3.75, rot: 2, opts: { color: 0xf3c48e } },
    { type: 'plant', x: 0.45, z: 4.5, opts: { pot: 0xe8845a } },
    { type: 'rug', x: 7.4, z: 3.7, opts: { round: true, w: 1.5, color: 0x6f86d6, inner: 0xb9c6ff } },
    // hallway
    { type: 'rug', x: 4.5, z: 6, opts: { w: 6.6, d: 0.95, color: 0xd9435e, inner: 0xffb3a0 } },
    { type: 'sideTable', x: 8.55, z: 5.4, opts: { light: true, lightPower: 2.4, lightY: 0.95 } },
    { type: 'laundryBasket', x: 0.5, z: 6.4 },
    { type: 'picture', x: 1.6, z: 5.1, opts: { color: 0x7cc7ff } },
    { type: 'picture', x: 6.8, z: 5.1, opts: { color: 0xffb3a0 } },
    // kid's bedroom
    { type: 'nightstand', x: 2.0, z: 11.65, opts: { light: true, lightPower: 1.8, lightY: 0.8, lightColor: 0xffa66b } },
    { type: 'wardrobe', x: 4.25, z: 7.4 },
    { type: 'toyBox', x: 4.4, z: 13.6, rot: 2 },
    { type: 'toys', x: 3.3, z: 12.4 },
    { type: 'teddy', x: 2.6, z: 9.2, rot: 3 },
    { type: 'rug', x: 2.7, z: 10.5, opts: { round: true, w: 2.3, color: 0x9fb3f0, inner: 0xfff1b8 } },
    { type: 'bookshelf', x: 4.75, z: 10.4, rot: 1 },
    { type: 'plant', x: 0.45, z: 7.5, opts: { pot: 0xb197fc } },
    // parents' room
    { type: 'doubleBed', x: 7.35, z: 12.45, opts: { sleeper: true } },
    { type: 'nightstand', x: 5.95, z: 11.7, opts: { lamp: true, shade: 0xffd1dc, glow: 0xff9fb0 } },
    { type: 'nightstand', x: 8.72, z: 11.7, opts: { lamp: false } },
    { type: 'dresser', x: 7.6, z: 7.35 },
    { type: 'curtain', x: 8.78, z: 9.5, rot: 1, opts: { color: 0x8f6fd6 } },
    { type: 'armchair', x: 5.6, z: 9.2, rot: 3, opts: { color: 0xc8607a } },
    { type: 'plant', x: 5.45, z: 13.5 },
  ],
  bed: { x: 1.0, z: 12.45 },
  start: [1.0, 12.4],
  cookies: [
    [7.6, 3.6],
    [1.3, 3.2],
  ],
  creaky: [
    [2, 5],
    [6, 6],
  ],
  guards: [
    { kind: 'mum', path: [[7.5, 6], [1.5, 6]] },
    { kind: 'cat', path: [[7.6, 2.3]], facing: Math.PI * 0.75 },
    { kind: 'dad', path: [[7.35, 12.0]], sleeping: true },
  ],
};
