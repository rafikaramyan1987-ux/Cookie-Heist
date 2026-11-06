import type * as THREE from 'three';

export interface View {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  overlay?: HTMLElement[];
  resize(w: number, h: number): void;
  update(dt: number, t: number, w: number, h: number): void;
}
