import * as THREE from 'three';
import { SKINS, makeCharacter, animateRig, Rig, CharKind } from '../render/characters';
import { nightLights } from '../render/stage';
import { cyl } from '../render/geom';
import { toon } from '../render/toon';
import { skyTex, carpetTex, radialTex } from '../render/textures';
import { fitDiorama } from '../render/camera';
import type { View } from './view';

/** Character line-up on little round pedestals. */
export function lineupView(): View {
  const scene = new THREE.Scene();
  scene.background = skyTex(0x0e0a2a, 0x3a2a7a, true, 'lineup');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const entries: { kind: CharKind; skin?: number; name: string; role: string; mode: Rig['mode'] }[] = [
    { kind: 'kid', skin: 0, name: 'Pip', role: 'Starry Night', mode: 'tiptoe' },
    { kind: 'kid', skin: 1, name: 'Pip', role: 'Candy Stripe', mode: 'idle' },
    { kind: 'kid', skin: 2, name: 'Pip', role: 'Little Dino', mode: 'cheer' },
    { kind: 'mum', name: 'Mum', role: 'Flashlight', mode: 'look' },
    { kind: 'dad', name: 'Dad', role: 'Big flashlight', mode: 'idle' },
    { kind: 'grandma', name: 'Nana Rose', role: 'Oil lamp', mode: 'idle' },
    { kind: 'teen', name: 'Jules', role: 'Phone glow', mode: 'phone' },
    { kind: 'cat', name: 'Mochi', role: 'Meows at you', mode: 'sit' },
    { kind: 'vacuum', name: 'Dusty', role: 'Robot vacuum', mode: 'walk' },
  ];

  // floor: a wooden stage
  const ptex = carpetTex(0x4a3a7a, 21).clone();
  ptex.repeat.set(10, 10);
  ptex.needsUpdate = true;
  const floor = cyl(13, 13, 0.4, toon(0xffffff, { map: ptex }), { pos: [0, -0.2, 0], seg: 64, cast: false });
  scene.add(floor);
  scene.fog = new THREE.Fog(0x1a1240, 18, 40);
  const front = new THREE.DirectionalLight(0xffd9b0, 0.9);
  front.position.set(2, 6, 12);
  scene.add(front);
  nightLights(scene, { size: 14, moon: 1.4, fill: 1.0 });
  const warm = new THREE.SpotLight(0xffc98a, 40, 30, 0.7, 0.8, 1.2);
  warm.position.set(0, 9, 7);
  warm.target.position.set(0, 0, 0);
  scene.add(warm, warm.target);

  const rigs: Rig[] = [];
  const peds: THREE.Group[] = [];
  const slots: THREE.Vector3[] = [];
  entries.forEach((e) => {
    const rig = makeCharacter(e.kind, e.skin !== undefined ? SKINS[e.skin] : undefined);
    rig.mode = e.mode;
    rig.speed = 0.6;
    const ped = new THREE.Group();
    ped.add(cyl(0.55, 0.6, 0.16, 0xf3e3c8, { pos: [0, 0.08, 0], seg: 40 }));
    ped.add(cyl(0.6, 0.62, 0.04, 0xd8b98f, { pos: [0, 0.01, 0], seg: 40 }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: radialTex(), color: 0xffcf8a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.005;
    ped.add(glow);
    rig.root.position.y = 0.16;
    ped.add(rig.root);
    scene.add(ped);
    peds.push(ped);
    rigs.push(rig);
    slots.push(ped.position);
    (ped as THREE.Object3D).userData = e;
  });

  const labelsEl = document.createElement('div');
  labelsEl.className = 'labels';
  const labels = entries.map((e) => {
    const d = document.createElement('div');
    d.className = 'label';
    d.innerHTML = `<b>${e.name}</b><span>${e.role}</span>`;
    labelsEl.appendChild(d);
    return d;
  });
  const titleEl = document.createElement('div');
  titleEl.className = 'art-title';
  titleEl.innerHTML = '<b>Cookie Heist</b><span>Cast line-up · art test</span>';

  function layout(aspect: number) {
    const wide = aspect > 1.2;
    const cols = wide ? 9 : 3;
    const rows = Math.ceil(entries.length / cols);
    const gx = wide ? 1.75 : 1.9,
      gz = wide ? 2.2 : 5.0;
    peds.forEach((ped, i) => {
      const c = i % cols,
        r = Math.floor(i / cols);
      ped.position.set((c - (cols - 1) / 2) * gx, 0, (r - (rows - 1) / 2) * gz);
    });
    const hw = ((cols - 1) / 2) * gx + 0.75,
      hd = ((rows - 1) / 2) * gz + 0.9;
    fitDiorama(camera, new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, hd + 0.5), aspect, {
      pitchDeg: wide ? 20 : 52,
      fov: wide ? 26 : 30,
      height: 1.75,
      margin: wide ? [0.03, 0.03, 0.2, 0.2] : [0.02, 0.02, 0.1, 0.16],
    });
  }

  return {
    scene,
    camera,
    overlay: [labelsEl, titleEl],
    resize(w, h) {
      camera.aspect = w / h;
      layout(w / h);
      camera.updateProjectionMatrix();
    },
    update(dt, t, w, h) {
      rigs.forEach((r) => animateRig(r, dt, t));
      const v = new THREE.Vector3();
      peds.forEach((ped, i) => {
          v.copy(ped.position);
          v.z += 0.75;
          v.project(camera);
          labels[i].style.transform = `translate(-50%, 0) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
        });
    },
  };
}
