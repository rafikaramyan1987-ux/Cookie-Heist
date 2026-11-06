import * as THREE from 'three';
import { ART_LEVEL } from '../levels/artLevel';
import { buildHouse } from '../render/house';
import { THEMES } from '../render/themes';
import { nightLights } from '../render/stage';
import { skyTex } from '../render/textures';
import { makeCharacter, animateRig, SKINS, bubble, Rig } from '../render/characters';
import { VisionCone } from '../render/vision';
import { NoiseRing } from '../render/fx';
import { fitDiorama, autoYaw } from '../render/camera';
import { hideMarker } from '../render/markers';
import { buildHud } from '../ui/hud';
import { buildIntro } from '../ui/intro';
import type { View } from './view';

/** One complete level at final quality (+ optional HUD overlay). */
export function levelView(withHud: boolean): View {
  const level = ART_LEVEL;
  const theme = THEMES[level.house];
  const scene = new THREE.Scene();
  scene.background = skyTex(theme.skyTop, theme.skyBottom, true, level.house);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  const house = buildHouse(level, theme);
  scene.add(house.root);
  const { moon } = nightLights(scene, { size: Math.max(level.w, level.d) + 3, center: house.center, moon: 1.05, fill: 0.72 });
  void moon;

  // --- cast
  const kid = makeCharacter('kid', SKINS[0]);
  kid.mode = 'tiptoe';
  kid.speed = 0.5;
  const kidPos = withHud ? new THREE.Vector3(2.35, 0, 6.35) : new THREE.Vector3(2.5, 0, 6.25);
  kid.root.position.copy(kidPos);
  kid.root.rotation.y = withHud ? Math.PI * 0.62 : Math.PI * 0.75;
  scene.add(kid.root);

  const mum = makeCharacter('mum');
  mum.mode = withHud ? 'idle' : 'walk';
  mum.speed = 0.5;
  mum.root.position.set(5.9, 0, 5.95);
  const mumDir = Math.PI; // facing west (atan2 space)
  mum.root.rotation.y = Math.atan2(Math.cos(mumDir), Math.sin(mumDir));
  scene.add(mum.root);

  const cat = makeCharacter('cat');
  cat.root.position.set(7.4, 0, 2.2);
  cat.root.rotation.y = -0.6;
  scene.add(cat.root);

  const vac = makeCharacter('vacuum');
  vac.mode = 'walk';
  vac.root.position.set(2.0, 0, 2.6);
  vac.root.rotation.y = 0.9;
  scene.add(vac.root);

  // --- vision cones
  const mumCone = new VisionCone(3.9, 0.5);
  if (withHud) mumCone.setAlert('suspicious');
  scene.add(mumCone.group);
  const catCone = new VisionCone(1.9, 0.62, { volume: false, spot: false, intensity: 0.7 });
  scene.add(catCone.group);
  const vacCone = new VisionCone(1.3, 0.45, { volume: false, spot: false, intensity: 0.6 });
  vacCone.color.set(0x5ef0ff);
  scene.add(vacCone.group);

  // --- bubbles
  const zzz = bubble('Zzz', '#cdd8ff');
  zzz.position.set(7.75, 1.25, 11.6);
  scene.add(zzz);
  const q = bubble(withHud ? '?' : '…', '#ff8a2f');
  q.visible = withHud;
  scene.add(q);

  // --- hide marker on the laundry basket, noise ring under the kid in HUD mode
  const hm = hideMarker();
  hm.position.set(0.55, 0.03, 6.4);
  scene.add(hm);
  const ring = new NoiseRing(1.6);
  ring.mesh.position.set(kidPos.x, 0.03, kidPos.z);
  ring.mesh.visible = withHud;
  scene.add(ring.mesh);

  const overlay: HTMLElement[] = [];
  let hud: ReturnType<typeof buildHud> | null = null;
  if (withHud) {
    hud = buildHud({ house: 1, level: 3, cookies: 1, total: 3, time: 23.4, toys: 2, coins: 125 });
    overlay.push(hud.el);
  } else overlay.push(buildIntro({ house: theme.name.en, night: 3, name: level.name.en, cookies: 2, par: 35 }));

  const tmp = new THREE.Vector3();
  const rigs: Rig[] = [kid, mum, cat, vac];
  let aspect = 1;
  const view: View = {
    scene,
    camera,
    overlay,
    resize(w, h) {
      aspect = w / h;
      const yaw = autoYaw(aspect, level.w, level.d);
      const portrait = aspect < 0.9;
      const margin: [number, number, number, number] = portrait ? [0.01, 0.01, 0.1, 0.07] : [0.04, 0.04, 0.1, 0.08];
      if (withHud) {
        // gameplay camera: follows the kid, shows a ~8×9 cell window
        const c = new THREE.Vector3(3.6, 0, 6.6);
        const ex = yaw ? new THREE.Vector3(3.2, 0, 5.8) : new THREE.Vector3(4.3, 0, 4.6);
        fitDiorama(camera, c.clone().sub(ex), c.clone().add(ex), aspect, { yaw: yaw ? -yaw : 0, margin: [0, 0, 0, 0], pitchDeg: 55, fov: portrait ? 34 : 28, height: 0 });
      } else
        fitDiorama(camera, new THREE.Vector3(-0.9, 0, -0.9), new THREE.Vector3(level.w + 0.9, 0, level.d + 0.9), aspect, { yaw: yaw ? -yaw : 0, margin, pitchDeg: 55, fov: portrait ? 34 : 28 });
      hud?.layout(w, h);
    },
    update(dt, t) {
      // mum walks a little patrol in level view
      if (!withHud) {
        const x = 5.2 + Math.sin(t * 0.35) * 0.6;
        mum.root.position.x = x;
      }
      for (const r of rigs) animateRig(r, dt, t);
      // kid tiptoes on the spot (art test)
      mum.root.updateMatrixWorld(true);
      mum.lightTip!.getWorldPosition(tmp);
      const sweep = withHud ? -0.18 : Math.sin(t * 0.8) * 0.25;
      mumCone.update(mum.root.position.x, mum.root.position.z, mumDir + sweep, tmp, house.walls, dt, t);
      mum.lookYaw = -sweep;
      cat.root.updateMatrixWorld(true);
      catCone.update(cat.root.position.x, cat.root.position.z, Math.PI * 0.62 + Math.sin(t * 0.6) * 0.35, tmp.set(cat.root.position.x, 0.3, cat.root.position.z), house.walls, dt, t);
      vac.root.position.set(2.0 + Math.sin(t * 0.4) * 0.5, 0, 2.6 + Math.cos(t * 0.4) * 0.3);
      vacCone.update(vac.root.position.x, vac.root.position.z, Math.atan2(Math.cos(vac.root.rotation.y), Math.sin(vac.root.rotation.y)), tmp.set(vac.root.position.x, 0.1, vac.root.position.z), house.walls, dt, t);
      zzz.position.y = 1.2 + Math.sin(t * 1.5) * 0.06;
      (zzz.material as THREE.SpriteMaterial).opacity = 0.75 + Math.sin(t * 1.5) * 0.25;
      q.position.set(mum.root.position.x, 2.05 + Math.sin(t * 4) * 0.04, mum.root.position.z);
      ring.update(t);
      hm.rotation.z = t * 0.4;
      house.update(t, dt);
      hud?.update(t);
    },
  };
  return view;
}

