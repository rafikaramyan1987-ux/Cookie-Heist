import * as THREE from 'three';
import type { FloorKind, HouseId, WallKind } from '../levels/types';
import {
  planksTex,
  tilesTex,
  carpetTex,
  marbleTex,
  stoneTex,
  stripesTex,
  starsWallTex,
  floralTex,
  logsTex,
  panelTex,
  paintTex,
} from './textures';

/** Per-house look: diorama base, exterior, outside decoration, sky. */
export interface HouseTheme {
  id: HouseId;
  slabTop: number;
  slabSide: number;
  slabEdge: number;
  exterior: number;
  cap: number;
  skyTop: number;
  skyBottom: number;
  outside: 'lawn' | 'city' | 'garden' | 'snow' | 'estate';
  baseboard: number;
}

export const THEMES: Record<HouseId, HouseTheme> = {
  apartment: {
    id: 'apartment',
    slabTop: 0x6c6f8f,
    slabSide: 0x3b3d5c,
    slabEdge: 0x8a8db0,
    exterior: 0xa7aed0,
    cap: 0xf1eef8,
    skyTop: 0x0c0b26,
    skyBottom: 0x3a2f78,
    outside: 'city',
    baseboard: 0xe9e6f2,
  },
  family: {
    id: 'family',
    slabTop: 0x3f8f6a,
    slabSide: 0x6b4434,
    slabEdge: 0x56a77d,
    exterior: 0x9fc2e6,
    cap: 0xfff1da,
    skyTop: 0x0e0a2a,
    skyBottom: 0x3a2a7a,
    outside: 'lawn',
    baseboard: 0xfff6e8,
  },
  cottage: {
    id: 'cottage',
    slabTop: 0x5a9a54,
    slabSide: 0x6b4a34,
    slabEdge: 0x77b46a,
    exterior: 0xe8d6b8,
    cap: 0xf6ead2,
    skyTop: 0x120c2a,
    skyBottom: 0x46306e,
    outside: 'garden',
    baseboard: 0x8a5434,
  },
  chalet: {
    id: 'chalet',
    slabTop: 0xeef4ff,
    slabSide: 0x5d6a8a,
    slabEdge: 0xffffff,
    exterior: 0x8a5a3a,
    cap: 0xf4f8ff,
    skyTop: 0x0a1030,
    skyBottom: 0x2c4a8a,
    outside: 'snow',
    baseboard: 0x6b4226,
  },
  mansion: {
    id: 'mansion',
    slabTop: 0x3b7a52,
    slabSide: 0x4a4458,
    slabEdge: 0xd8d0c0,
    exterior: 0xe8e0d4,
    cap: 0xfaf4e8,
    skyTop: 0x100a24,
    skyBottom: 0x4a2a5a,
    outside: 'estate',
    baseboard: 0xf2ece4,
  },
};

const clone = (t: THREE.Texture, rx = 1, ry = 1) => {
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
};

/** Floor textures are mapped in world units (1 repeat per unit). */
export function floorTexture(k: FloorKind): THREE.Texture {
  switch (k) {
    case 'oak':
      return planksTex(0xc98b5a, 1);
    case 'darkwood':
      return planksTex(0x8f5a3c, 2);
    case 'pine':
      return planksTex(0xd9a46a, 4, 3);
    case 'parquet':
      return planksTex(0xb5763f, 6, 6);
    case 'checker':
      return tilesTex(0xf4ead8, 0x7fc8b8, 2);
    case 'tileBlue':
      return tilesTex(0xe8f1ff, 0xc9dcf5, 3);
    case 'carpetBlue':
      return carpetTex(0x6f86d6);
    case 'carpetRose':
      return carpetTex(0xd98aa0);
    case 'marble':
      return marbleTex(0xf2ece4, 0x6a5a7e);
    case 'stone':
      return stoneTex(0xb5a48f);
    case 'concrete':
      return carpetTex(0xa9adc4, 8);
  }
}

/** Wall textures: u = world units along the wall, v = 0..1 over height. */
export function wallTexture(k: WallKind): THREE.Texture {
  switch (k) {
    case 'stripesCream':
      return clone(stripesTex(0xfde9c8, 0xf6d7a7, 4), 1, 1);
    case 'starsBlue':
      return clone(starsWallTex(0x9fb3f0, 0xfff1b8), 1, 1);
    case 'teal':
      return clone(stripesTex(0x8fd6c6, 0x80c9b9, 3), 1, 1);
    case 'floral':
      return clone(floralTex(0xf6d6d6, 0xff9fb0, 0xfff1b8), 1, 1);
    case 'logs':
      return clone(logsTex(0xb87a4b), 1, 1);
    case 'panel':
      return clone(panelTex(0x7a3a4a, 0x5a2433), 1, 1);
    case 'damask':
      return clone(floralTex(0x2f5a52, 0x3f7468, 0xe6c46a), 1, 1);
    case 'paintGrey':
      return paintTex(0xc8cde6);
    case 'paintPeach':
      return paintTex(0xffc9a8);
    case 'paintSage':
      return paintTex(0xb9d8b0);
    case 'stone':
      return stoneTex(0xc9b8a0, 12);
  }
}
