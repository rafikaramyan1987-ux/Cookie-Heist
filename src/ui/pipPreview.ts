import * as THREE from 'three';
import { makeCharacter, animateRig, optimizeRig, SKINS, CapId, Rig } from '../render/characters';
import { ball, rbox, cyl, mesh, torusGeo } from '../render/geom';
import { toon } from '../render/toon';

/**
 * Shop visuals: a rotating 3D Pip wearing the tried-on pyjamas / cap / trail, and rendered thumbnails
 * (same models and toon look as the game) for every cosmetic and boost.
 */

export type BoostId = 'toy' | 'peek' | 'hint' | 'pillow';
export interface Look {
  skin: string;
  cap: string;
  trail: string;
}

const TRAIL_COLORS: Record<string, number> = { crumbs: 0xc98b4a, stars: 0xffe066, hearts: 0xff7aa8, bubbles: 0x9fe8ff };

let shared: PipPreview | null = null;
/** one shared offscreen renderer for thumbnails (created on first use) */
export function sharedPreview(): PipPreview | null {
  try {
    if (!shared) shared = new PipPreview();
    return shared;
  } catch {
    return null; // no WebGL: callers fall back to plain icons
  }
}

export class PipPreview {
  readonly canvas = document.createElement('canvas');
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  private holder = new THREE.Group();
  private rig: Rig | null = null;
  private trail: THREE.Mesh[] = [];
  private look: Look = { skin: '', cap: '', trail: '' };
  private raf = 0;
  private last = 0;
  private t = 0;
  private thumbs = new Map<string, string>();

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    // night-time toy lighting, like the game: cool moon fill, warm key, rim
    this.scene.add(new THREE.HemisphereLight(0xa9b6ff, 0x3a2a5a, 1.6));
    const key = new THREE.DirectionalLight(0xffe2b8, 2.4);
    key.position.set(2, 4, 3);
    const rim = new THREE.DirectionalLight(0x8fb4ff, 1.6);
    rim.position.set(-3, 2, -3);
    this.scene.add(key, rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshBasicMaterial({ color: 0x2a1f55, transparent: true, opacity: 0.55 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor, this.holder);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      m.visible = false;
      this.trail.push(m);
      this.scene.add(m);
    }
    this.frame(1.62, 0.66);
  }

  private frame(dist: number, y: number) {
    this.camera.position.set(0, y + 0.28, dist * 1.9);
    this.camera.lookAt(0, y, 0);
  }

  setLook(l: Look) {
    if (l.skin !== this.look.skin || l.cap !== this.look.cap || !this.rig) {
      if (this.rig) this.holder.remove(this.rig.root);
      const skin = SKINS.find((s) => s.id === l.skin) ?? SKINS[0];
      this.rig = makeCharacter('kid', skin, l.cap as CapId);
      optimizeRig(this.rig);
      this.rig.mode = 'idle';
      this.holder.add(this.rig.root);
    }
    this.look = { ...l };
    const col = TRAIL_COLORS[l.trail];
    this.trail.forEach((m) => {
      m.visible = !!col;
      if (col) (m.material as THREE.MeshBasicMaterial).color.setHex(col);
    });
  }

  private place(t: number) {
    // trail particles swirl around Pip from the feet up, like the trail left while sneaking
    const n = this.trail.length;
    this.trail.forEach((m, i) => {
      const k = (i / n + t * 0.3) % 1;
      const a = -Math.PI * 0.9 + k * Math.PI * 2.2;
      const r = 0.36 + k * 0.06;
      const bob = this.look.trail === 'bubbles' ? Math.sin(t * 3 + i) * 0.05 : 0;
      m.position.set(Math.cos(a) * r, 0.06 + k * 0.62 + bob, Math.sin(a) * r);
      const s = (this.look.trail === 'bubbles' ? 0.075 : 0.055) * (1 - k * 0.45);
      m.scale.setScalar(s);
      (m.material as THREE.MeshBasicMaterial).opacity = 1 - k * 0.6;
    });
  }

  /** start the rotating live view */
  start(size: number) {
    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.t += dt;
      this.holder.rotation.y = Math.sin(this.t * 0.6) * 0.9 + 0.35;
      if (this.rig) animateRig(this.rig, dt, this.t);
      this.place(this.t);
      this.renderer.render(this.scene, this.camera);
      if (this.canvas.isConnected) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  /** a still render of Pip wearing `look` (data URL, cached) */
  thumb(l: Look, size = 128): string {
    const key = `${l.skin}|${l.cap}|${l.trail}`;
    const hit = this.thumbs.get(key);
    if (hit) return hit;
    const prev = { ...this.look };
    const rot = this.holder.rotation.y;
    this.setLook(l);
    this.renderer.setSize(size, size, false);
    this.holder.rotation.y = 0.45;
    if (this.rig) animateRig(this.rig, 0.016, 0);
    this.place(0.15);
    this.frame(1.36, 0.62); // thumbnails sit a little closer
    this.renderer.render(this.scene, this.camera);
    this.frame(1.62, 0.66);
    const url = this.canvas.toDataURL('image/png');
    this.thumbs.set(key, url);
    this.holder.rotation.y = rot;
    if (prev.skin) this.setLook(prev);
    return url;
  }

  /** a still render of a boost item */
  boostThumb(id: BoostId, size = 128): string {
    const key = `boost:${id}`;
    const hit = this.thumbs.get(key);
    if (hit) return hit;
    const scene = new THREE.Scene();
    scene.add(...this.scene.children.filter((c) => c instanceof THREE.Light).map((c) => c.clone()));
    const g = boostModel(id);
    scene.add(g);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    cam.position.set(0, 0.62, 1.55);
    cam.lookAt(0, 0.2, 0);
    this.renderer.setSize(size, size, false);
    this.renderer.render(scene, cam);
    const url = this.canvas.toDataURL('image/png');
    this.thumbs.set(key, url);
    return url;
  }

  dispose() {
    this.stop();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/** Small toy-like 3D models for the boosts (same primitives and toon look as the game props). */
function boostModel(id: BoostId): THREE.Group {
  const g = new THREE.Group();
  const ink = 0x2a1a33;
  if (id === 'toy') {
    const s = 2.6;
    g.add(ball(0.09 * s, 0xffd43b, { pos: [0, 0.08 * s, 0], scale: [1.2, 0.9, 1] }));
    g.add(ball(0.06 * s, 0xffd43b, { pos: [0.07 * s, 0.17 * s, 0] }));
    g.add(ball(0.03 * s, 0xff8a3d, { pos: [0.13 * s, 0.16 * s, 0], scale: [1.4, 0.6, 1] }));
    g.add(ball(0.013 * s, ink, { pos: [0.1 * s, 0.19 * s, 0.035 * s] }));
    g.add(ball(0.013 * s, ink, { pos: [0.1 * s, 0.19 * s, -0.035 * s] }));
    g.rotation.y = -0.9;
  } else if (id === 'pillow') {
    g.add(rbox(0.62, 0.17, 0.42, 0xffffff, { pos: [0, 0.12, 0], r: 0.08 }));
    g.add(ball(0.07, 0xffd1dc, { pos: [0, 0.2, 0], scale: [1, 0.3, 1] }));
    for (const x of [-0.2, 0.2]) g.add(ball(0.035, 0xbfd0ff, { pos: [x, 0.21, 0.1], scale: [1, 0.3, 1] }));
    g.rotation.y = 0.5;
  } else if (id === 'hint') {
    // a glowing light bulb
    const glass = toon(0xfff2a8, { emissive: 0xffd25e, emissiveIntensity: 0.9 });
    g.add(ball(0.2, glass, { pos: [0, 0.42, 0] }));
    g.add(cyl(0.1, 0.12, 0.12, glass, { pos: [0, 0.25, 0] }));
    for (let i = 0; i < 3; i++) g.add(mesh(torusGeo(0.085, 0.022, 8, 18), toon(0xb9c2d6), { pos: [0, 0.17 - i * 0.045, 0], rot: [Math.PI / 2, 0, 0] }));
    g.add(ball(0.05, ink, { pos: [0, 0.06, 0], scale: [1, 0.6, 1] }));
  } else {
    // peek: toy binoculars
    for (const x of [-0.12, 0.12]) {
      g.add(cyl(0.085, 0.1, 0.3, 0x3346a8, { pos: [x, 0.25, 0], rot: [Math.PI / 2, 0, 0] }));
      g.add(cyl(0.07, 0.07, 0.02, toon(0x9fdcff, { emissive: 0x5fa8ff, emissiveIntensity: 0.6 }), { pos: [x, 0.25, 0.16], rot: [Math.PI / 2, 0, 0] }));
    }
    g.add(rbox(0.12, 0.08, 0.12, 0xffd45c, { pos: [0, 0.27, -0.02], r: 0.03 }));
    g.rotation.y = -0.5;
  }
  return g;
}
