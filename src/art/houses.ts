import { t } from '../app/i18n';
import * as THREE from 'three';
import { PREVIEWS } from '../levels/previews';
import { buildHouse, BuiltHouse } from '../render/house';
import { THEMES } from '../render/themes';
import { nightLights } from '../render/stage';
import { skyTex } from '../render/textures';
import { makeCharacter, animateRig, Rig, SKINS, bubble } from '../render/characters';
import { VisionCone } from '../render/vision';
import { fitDiorama } from '../render/camera';
import type { HouseId } from '../levels/types';
import type { View } from './view';

/** Five corner dioramas, one per house, laid out as a board. */
export function housesView(): View {
  const scene = new THREE.Scene();
  scene.background = skyTex(0x0c0a26, 0x35286e, true, 'houses');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
  const ids: HouseId[] = ['apartment', 'family', 'cottage', 'chalet', 'mansion'];

  interface Slot {
    id: HouseId;
    group: THREE.Group;
    house: BuiltHouse;
    rigs: Rig[];
    cones: { cone: VisionCone; rig: Rig; dir: number; sweep: number }[];
    label: HTMLDivElement;
  }
  const slots: Slot[] = [];
  const labels = document.createElement('div');
  labels.className = 'labels';

  const cast: Record<HouseId, { kind: Parameters<typeof makeCharacter>[0]; x: number; z: number; dir?: number; mode?: Rig['mode']; skin?: number; cone?: [number, number] }[]> = {
    apartment: [
      { kind: 'teen', x: 3.9, z: 2.0, dir: Math.PI * 0.95, mode: 'phone', cone: [2.2, 0.45] },
      { kind: 'kid', x: 1.5, z: 3.2, dir: -0.3, mode: 'tiptoe', skin: 1 },
    ],
    family: [
      { kind: 'mum', x: 1.2, z: 2.6, dir: -0.2, mode: 'look', cone: [3, 0.5] },
      { kind: 'cat', x: 4.2, z: 1.6, dir: Math.PI * 0.8 },
    ],
    cottage: [
      { kind: 'grandma', x: 2.3, z: 2.4, dir: 0.3, mode: 'idle', cone: [2.4, 0.75] },
      { kind: 'kid', x: 4.2, z: 3.1, dir: Math.PI * 0.9, mode: 'tiptoe', skin: 2 },
    ],
    chalet: [
      { kind: 'dad', x: 1.8, z: 2.2, dir: 0.1, mode: 'walk', cone: [3.2, 0.48] },
      { kind: 'kid', x: 4.1, z: 3.2, dir: Math.PI, mode: 'tiptoe', skin: 0 },
    ],
    mansion: [
      { kind: 'vacuum', x: 2.5, z: 2.6, dir: Math.PI / 2, mode: 'walk', cone: [1.5, 0.45] },
      { kind: 'mum', x: 4.0, z: 2.8, dir: Math.PI * 0.85, mode: 'walk', cone: [3, 0.5] },
    ],
  };

  for (const id of ids) {
    const lvl = PREVIEWS[id];
    const theme = THEMES[id];
    const house = buildHouse(lvl, theme, { outside: true });
    const group = new THREE.Group();
    group.add(house.root);
    scene.add(group);
    const rigs: Rig[] = [];
    const cones: Slot['cones'] = [];
    for (const c of cast[id]) {
      const r = makeCharacter(c.kind, c.skin !== undefined ? SKINS[c.skin] : undefined);
      r.mode = c.mode ?? 'idle';
      r.speed = 0.5;
      r.root.position.set(c.x, 0, c.z);
      const dir = c.dir ?? 0;
      r.root.rotation.y = Math.atan2(Math.cos(dir), Math.sin(dir));
      group.add(r.root);
      rigs.push(r);
      if (c.cone) {
        const cone = new VisionCone(c.cone[0], c.cone[1], { spot: c.kind !== 'vacuum', volume: c.kind !== 'vacuum' && c.kind !== 'teen' });
        if (c.kind === 'vacuum') cone.color.set(0x5ef0ff);
        if (c.kind === 'teen') cone.color.set(0x8fd8ff);
        if (id === 'mansion' && c.kind === 'mum') cone.setAlert('chase');
        group.add(cone.group);
        cones.push({ cone, rig: r, dir, sweep: Math.random() * 6 });
      }
    }
    if (id === 'mansion') {
      const b = bubble('!', '#ff3d4f');
      b.position.set(4.0, 2.05, 2.8);
      group.add(b);
    }
    if (id === 'cottage') {
      const b = bubble('?', '#ff8a2f');
      b.position.set(2.3, 1.75, 2.4);
      group.add(b);
    }
    const label = document.createElement('div');
    label.className = 'label house-label';
    label.innerHTML = `<b>${t(`house_${id}`)}</b><span>${t('house')} ${ids.indexOf(id) + 1} · 12 ${t('night')}</span>`;
    labels.appendChild(label);
    slots.push({ id, group, house, rigs, cones, label });
  }

  nightLights(scene, { size: 30, center: new THREE.Vector3(0, 0, 0), moon: 1.0, fill: 0.75 }).moon.shadow.mapSize.set(2048, 2048);

  const title = document.createElement('div');
  title.className = 'art-title';
  title.innerHTML = '<b>Five houses</b><span>12 nights each + a finale</span>';

  const tmp = new THREE.Vector3();
  const min = new THREE.Vector3(),
    max = new THREE.Vector3();
  let portrait = false;
  return {
    scene,
    camera,
    overlay: [labels, title],
    resize(w, h) {
      const aspect = w / h;
      portrait = aspect < 1;
      const gx = 8.4,
        gz = portrait ? 10.6 : 8.6;
      const pos: [number, number][] = portrait
        ? [
            [-0.5, 0],
            [0.5, 0],
            [-0.5, 1],
            [0.5, 1],
            [0, 2],
          ]
        : [
            [-1, 0],
            [0, 0],
            [1, 0],
            [-0.5, 1],
            [0.5, 1],
          ];
      min.set(1e9, 0, 1e9);
      max.set(-1e9, 0, -1e9);
      slots.forEach((s, i) => {
        const [cx, cz] = pos[i];
        s.group.position.set(cx * gx - 2.5, 0, cz * gz - 2);
        min.x = Math.min(min.x, s.group.position.x - 1.2);
        min.z = Math.min(min.z, s.group.position.z - 1.2);
        max.x = Math.max(max.x, s.group.position.x + 6.2);
        max.z = Math.max(max.z, s.group.position.z + 5.6);
      });
      fitDiorama(camera, min, max, aspect, { pitchDeg: 52, fov: 30, margin: portrait ? [0.02, 0.02, 0.05, 0.1] : [0.05, 0.05, 0.08, 0.12], height: 1.6 });
    },
    update(dt, t, w, h) {
      for (const s of slots) {
        for (const r of s.rigs) animateRig(r, dt, t);
        s.group.updateMatrixWorld(true);
        for (const c of s.cones) {
          const p = c.rig.root.position;
          if (c.rig.lightTip) c.rig.lightTip.getWorldPosition(tmp);
          else tmp.set(p.x, 0.3, p.z);
          s.group.worldToLocal(tmp);
          const sweep = Math.sin(t * 0.7 + c.sweep) * 0.25;
          c.cone.update(p.x, p.z, c.dir + sweep, tmp, s.house.walls, dt, t);
          c.rig.lookYaw = -sweep;
        }
        s.house.update(t, dt);
        tmp.set(s.group.position.x + 2.5, 0, s.group.position.z + 5.3);
        tmp.project(camera);
        s.label.style.transform = `translate(-50%, 0) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      }
    },
  };
}
