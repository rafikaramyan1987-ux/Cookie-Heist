import * as THREE from 'three';
import { ART_LEVEL } from '../levels/artLevel';
import { buildHouse } from '../render/house';
import { THEMES } from '../render/themes';
import { nightLights } from '../render/stage';
import { skyTex } from '../render/textures';
import { makeCharacter, animateRig, SKINS, bubble } from '../render/characters';
import { VisionCone } from '../render/vision';
import { cookieMesh } from '../render/props';
import { Sparkles } from '../render/fx';
import { buildTitle } from '../ui/title';
import type { View } from './view';

/** Title screen: close-up of the kid sneaking out with a cookie, mum's beam behind. */
export function titleView(): View {
  const level = ART_LEVEL;
  const theme = THEMES[level.house];
  const scene = new THREE.Scene();
  scene.background = skyTex(theme.skyTop, theme.skyBottom, true, 'title');
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  const house = buildHouse(level, theme);
  scene.add(house.root);
  nightLights(scene, { size: Math.max(level.w, level.d) + 3, center: house.center, moon: 1.0, fill: 0.68 });

  const kid = makeCharacter('kid', SKINS[0]);
  kid.mode = 'tiptoe';
  kid.speed = 0.55;
  kid.root.position.set(2.2, 0, 8.25);
  kid.root.rotation.y = 0.25;
  scene.add(kid.root);
  const ck = cookieMesh(0.13, [0, -0.22, 0.06], [1.2, 0, 0]);
  kid.armR!.add(ck);
  const sp = new Sparkles(16, new THREE.Vector3(0.5, 0.4, 0.5), 0xffe08a, 0.08, 0.6);
  sp.points.position.set(2.35, 0.5, 8.45);
  scene.add(sp.points);

  const mum = makeCharacter('mum');
  mum.mode = 'walk';
  mum.speed = 0.4;
  mum.root.position.set(6.0, 0, 6.0);
  let dir = Math.PI + 0.12; // facing west, sweeping the hallway
  let mumX = 6.0;
  mum.root.rotation.y = Math.atan2(Math.cos(dir), Math.sin(dir));
  scene.add(mum.root);
  const cone = new VisionCone(3.6, 0.5);
  scene.add(cone.group);
  const q = bubble('?', '#ff8a2f');
  scene.add(q);
  const key = new THREE.PointLight(0xffd2a0, 3.5, 4, 1.4);
  key.position.set(3.0, 1.6, 9.6);
  scene.add(key);
  const dad = bubble('Zzz', '#cdd8ff');
  dad.position.set(7.75, 1.25, 11.6);
  scene.add(dad);

  const ui = buildTitle();
  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let portrait = false;
  return {
    scene,
    camera,
    overlay: [ui],
    resize(w, h) {
      portrait = h > w;
      // portrait: mum comes from the left end of the hall, kid by the door
      mumX = portrait ? 1.35 : 6.0;
      dir = portrait ? 0.15 : Math.PI + 0.12;
      mum.root.rotation.y = Math.atan2(Math.cos(dir), Math.sin(dir));
      kid.root.position.set(portrait ? 2.75 : 2.2, 0, portrait ? 8.35 : 8.25);
      sp.points.position.set(kid.root.position.x + 0.15, 0.5, kid.root.position.z + 0.2);
      camera.aspect = w / h;
      camera.fov = portrait ? 42 : 30;
      target.set(portrait ? 2.3 : 3.9, 0.5, portrait ? 7.3 : 7.1);
      const pitch = THREE.MathUtils.degToRad(portrait ? 46 : 40);
      const yaw = portrait ? 0.12 : 0.1;
      const dist = portrait ? 11.5 : 9.6;
      camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(target);
      // landscape: push the scene to the right so the logo has room on the left
      if (!portrait) camera.setViewOffset(w, h, -w * 0.13, h * 0.03, w, h);
      else camera.setViewOffset(w, h, 0, -h * 0.06, w, h);
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      animateRig(kid, dt, t);
      animateRig(mum, dt, t);
      mum.root.position.x = mumX + Math.sin(t * 0.3) * 0.2;
      q.position.set(mum.root.position.x, 2.0 + Math.sin(t * 3) * 0.04, mum.root.position.z);
      mum.root.updateMatrixWorld(true);
      mum.lightTip!.getWorldPosition(tmp);
      const sweep = Math.sin(t * 0.7) * 0.3;
      cone.update(mum.root.position.x, mum.root.position.z, dir + sweep, tmp, house.walls, dt, t);
      mum.lookYaw = -sweep;
      sp.update(t);
      dad.position.y = 1.2 + Math.sin(t * 1.5) * 0.06;
      house.update(t, dt);
      // slow camera drift
      camera.position.x += Math.sin(t * 0.25) * 0.0008;
    },
  };
}
