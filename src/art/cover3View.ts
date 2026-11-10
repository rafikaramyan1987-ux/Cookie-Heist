import * as THREE from 'three';
import { ART_LEVEL } from '../levels/artLevel';
import { buildHouse } from '../render/house';
import { THEMES } from '../render/themes';
import { nightLights } from '../render/stage';
import { skyTex } from '../render/textures';
import { makeCharacter, animateRig, SKINS, bubble, type Rig } from '../render/characters';
import { VisionCone } from '../render/vision';
import { cookieMesh, buildProp } from '../render/props';
import { Sparkles } from '../render/fx';
import type { View } from './view';

/**
 * v3 store covers, staged like posters from the real 3D scene (same house, characters, toon look as the game):
 *  A: big close-up of the kid's guilty grin and a giant glowing cookie, mum's flashlight beam cutting across behind
 *  B: the kid hiding under the kitchen table, mum's legs and flashlight right next to him, the cookie jar glowing
 *  C: top-down tension: the kid tiptoes past sleeping dad, mum's beam almost touching him
 * The cat watches in each one. Title only ("COOKIE HEIST"), the top-left corner kept clear.
 *  B2 (the main cover): B with the kid big and clear: crouching at the table's front edge, guilty grin to camera,
 *      a cookie held out at the side, lit by the jar's warm glow; mum's legs + beam and the cat stay
 * `?view=cover3&v=A|B|B2|C&t=<s>`
 */
type Variant = 'A' | 'B' | 'B2' | 'C';

/** a soft additive glow disc (sprite) */
function glow(color: number, size: number, opacity = 0.9) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
}

/** the kid's guilty grin: a wide, lopsided smile */
function guiltyGrin(kid: Rig) {
  if (!kid.mouth) return;
  kid.mouth.scale.set(1.75, 1.55, 1);
  kid.mouth.rotation.z = Math.PI + 0.22;
}

/** face (world yaw) for a rig: 0 = facing +z (towards the default camera) */
const face = (r: Rig, x: number, z: number) => (r.root.rotation.y = Math.atan2(x - r.root.position.x, z - r.root.position.z));

export function cover3View(variant: Variant): View {
  const level = ART_LEVEL;
  const theme = THEMES[level.house];
  const scene = new THREE.Scene();
  scene.background = skyTex(0x070b2e, 0x23306e, true, 'cover3');
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  // the art level's own cookie pickups are left out (the staging brings its own cookies)
  const house = buildHouse({ ...level, cookies: [] }, theme);
  scene.add(house.root);
  // cool blue night: the warm cookie light is the only warm thing around
  const rig = nightLights(scene, { size: Math.max(level.w, level.d) + 3, center: house.center, moon: 1.15, fill: 0.62 });
  rig.hemi.color.set(0x6f8dff);
  rig.moon.color.set(0x8fb0ff);

  const kid = makeCharacter('kid', SKINS[0]);
  guiltyGrin(kid);
  scene.add(kid.root);
  const mum = makeCharacter('mum');
  scene.add(mum.root);
  const cat = makeCharacter('cat');
  scene.add(cat.root);
  const cone = new VisionCone(variant === 'B2' ? 1.45 : variant === 'B' ? 1.75 : variant === 'C' ? 3.2 : 6.5, variant === 'B' || variant === 'B2' ? 0.4 : variant === 'A' ? 0.2 : 0.42, { intensity: variant === 'A' ? 1.5 : variant === 'B2' ? 1.7 : 1.1 });
  scene.add(cone.group);
  const sp = new Sparkles(variant === 'C' ? 14 : 26, new THREE.Vector3(0.7, 0.6, 0.7), 0xffe08a, variant === 'A' ? 0.06 : 0.09, 0.5);
  scene.add(sp.points);
  const warm = new THREE.PointLight(0xffa244, 7, 3.2, 1.3);
  scene.add(warm);
  const extras: THREE.Object3D[] = [];
  let mumDir = 0;
  const target = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  let fov = 30;

  // a giant cookie held up in both hands
  const bigCookie = (r: number) => {
    const g = new THREE.Group();
    g.add(cookieMesh(r, [0, 0, 0], [Math.PI / 2, 0, 0]));
    const halo = glow(0xffb347, r * 4.5, 0.45);
    halo.position.z = -0.05;
    g.add(halo);
    return g;
  };

  if (variant === 'A') {
    // kitchen: the kid faces us holding the cookie up, mum's beam crosses the kitchen behind him, the cat watches
    kid.mode = 'idle';
    kid.root.position.set(2.55, 0, 2.75);
    kid.root.rotation.y = 0.18;
    const ck = bigCookie(0.25);
    ck.position.set(0.02, 0.5, 0.3);
    kid.root.add(ck);
    warm.position.set(2.62, 0.62, 3.7);
    warm.intensity = 1.5;
    sp.points.position.set(2.62, 0.35, 3.1);
    mum.mode = 'look';
    mum.root.position.set(6.4, 0, 1.7);
    mumDir = Math.PI + 0.04;
    cat.root.position.set(0.55, 0.9, 0.5);
    face(cat, 2.55, 2.75);
    camPos.set(3.05, 1.12, 4.75);
    target.set(2.55, 0.64, 2.75);
    fov = 34;
  } else if (variant === 'B') {
    // a table in the kitchen: the kid crouches underneath, mum's legs and flashlight right next to him
    const table = buildProp('table');
    table.position.set(1.95, 0, 2.55);
    scene.add(table);
    const jar = buildProp('cookieJar');
    jar.position.set(1.7, 0.8, 2.45);
    jar.scale.setScalar(1.3);
    scene.add(jar);
    extras.push(table, jar);
    const jg = glow(0xffb347, 0.9, 0.45);
    jg.position.set(1.7, 1.05, 2.5);
    scene.add(jg);
    kid.mode = 'idle';
    kid.root.scale.setScalar(0.7);
    kid.root.position.set(1.95, 0, 2.7);
    kid.root.rotation.y = 0.12;
    const ck = bigCookie(0.13);
    ck.position.set(0.05, 0.42, 0.33);
    kid.root.add(ck);
    mum.mode = 'look';
    mum.root.position.set(3.05, 0, 3.55);
    mumDir = Math.PI + 0.62;
    warm.position.set(1.75, 1.25, 2.6);
    warm.intensity = 2.2;
    const warm2 = new THREE.PointLight(0xffa244, 1.6, 1.4, 1.5);
    warm2.position.set(2.0, 0.42, 3.15);
    scene.add(warm2);
    sp.points.position.set(1.7, 0.95, 2.5);
    // the cat sits on the table, peering down at the kid
    cat.root.position.set(1.2, 0.8, 2.3);
    face(cat, 1.7, 4.6);
    camPos.set(1.75, 0.34, 4.85);
    target.set(2.15, 0.5, 2.6);
    fov = 46;
  } else if (variant === 'B2') {
    // the same night kitchen as B, but the kid is the hero: crouched at the front edge of the table, close to us
    const table = buildProp('table');
    table.position.set(1.95, 0, 2.05);
    scene.add(table);
    const jar = buildProp('cookieJar');
    jar.position.set(2.55, 0.8, 2.3);
    jar.scale.setScalar(1.35);
    scene.add(jar);
    extras.push(table, jar);
    const jg = glow(0xffb347, 1.0, 0.5);
    jg.position.set(2.55, 1.05, 2.35);
    scene.add(jg);
    kid.mode = 'idle';
    kid.root.scale.set(0.8, 0.74, 0.8); // crouching
    kid.root.position.set(1.85, 0, 3.3);
    kid.root.rotation.y = 0.22;
    // a cookie held out at the side, never in front of the body
    kid.armR?.add(cookieMesh(0.15, [0, -0.25, 0.04], [1.3, 0, 0.3]));
    const cg = glow(0xffb347, 0.45, 0.55);
    cg.name = 'handGlow';
    scene.add(cg);
    extras.push(cg);
    mum.mode = 'look';
    mum.root.position.set(3.15, 0, 3.15);
    mumDir = Math.PI - 0.05;
    // warm key light from the jar onto the kid's face, a soft fill from the front
    warm.position.set(2.25, 0.95, 3.35);
    warm.intensity = 2.0;
    warm.distance = 2.4;
    const fill = new THREE.PointLight(0xffc27a, 0.9, 2.2, 1.5);
    fill.position.set(1.95, 0.6, 4.0);
    scene.add(fill);
    sp.points.position.set(2.45, 0.95, 2.4);
    // the cat on the table, behind the jar, watching the kid
    cat.root.position.set(1.95, 0.8, 2.0);
    face(cat, 1.85, 3.3);
    camPos.set(2.15, 0.78, 4.55);
    target.set(2.3, 0.55, 2.55);
    fov = 44;
  } else {
    // parents' room: dad asleep in the big bed, the kid tiptoes by with a cookie, mum's beam from the door
    kid.mode = 'tiptoe';
    kid.speed = 0.6;
    kid.root.position.set(5.75, 0, 10.6);
    kid.root.rotation.y = -0.2;
    const ck = cookieMesh(0.17, [0, -0.22, 0.06], [1.2, 0, 0]);
    kid.armR?.add(ck);
    const cg = glow(0xffb347, 0.8, 0.5);
    cg.position.set(5.8, 0.55, 10.8);
    scene.add(cg);
    warm.position.set(5.8, 0.9, 10.85);
    warm.intensity = 2.2;
    sp.points.position.set(5.8, 0.3, 10.8);
    mum.mode = 'look';
    mum.root.position.set(6.2, 0, 7.55);
    mumDir = Math.PI / 2 - 0.3;
    const z = bubble('Zzz', '#cdd8ff');
    z.position.set(6.95, 1.3, 11.5);
    z.scale.multiplyScalar(1.4);
    scene.add(z);
    cat.root.position.set(8.35, 0, 9.0);
    face(cat, 5.75, 10.6);
    camPos.set(6.55, 7.2, 12.55);
    target.set(6.55, 0, 10.15);
    fov = 30;
  }
  mum.root.rotation.y = Math.atan2(Math.cos(mumDir), Math.sin(mumDir));
  cat.mode = 'idle';
  const tip = new THREE.Vector3();
  let portrait = false;
  let aspect = 1;

  return {
    scene,
    camera,
    bloom: 0.28,
    resize(w, h) {
      aspect = w / h;
      portrait = aspect < 0.9;
      camera.aspect = aspect;
      camera.fov = fov * (portrait ? (variant === 'C' ? 1.45 : 1.75) : aspect < 1.2 ? (variant === 'C' ? 1.2 : 1.32) : 1);
      // pull back a little on tall / square formats so the whole staging fits
      // A / B are shot from inside the kitchen (a wall right behind the camera): widen the lens instead of backing up
      const back = variant === 'C' ? (portrait ? 1.35 : aspect < 1.2 ? 1.15 : 1) : 1;
      const p = camPos.clone().sub(target).multiplyScalar(back).add(target);
      const look = target.clone();
      if (variant === 'B2' && aspect < 1.2) {
        // tall / square: the kid in the middle, big, above the title band; mum's beam and the jar around him
        camera.fov = fov * (portrait ? 1.55 : 1.22);
        p.set(portrait ? 2.02 : 2.15, 0.74, 4.6);
        look.set(portrait ? 2.1 : 2.25, 0.5, 2.6);
      }
      camera.position.copy(p);
      camera.lookAt(look);
      // room for the title: wide = bottom-right block, so the scene sits a bit left; tall / square = bottom band
      if (!portrait && aspect >= 1.2) camera.setViewOffset(w, h, w * (variant === 'C' ? 0.1 : variant === 'B2' ? 0 : 0.12), -h * 0.02, w, h);
      else camera.setViewOffset(w, h, 0, variant === 'B2' ? h * (portrait ? 0.07 : 0.05) : -h * (variant === 'C' ? 0.14 : portrait ? 0.08 : 0.06), w, h);
      camera.updateProjectionMatrix();
    },
    update(dt, t) {
      animateRig(kid, dt, t);
      animateRig(mum, dt, t);
      animateRig(cat, dt, t);
      guiltyGrin(kid);
      if (variant === 'A') {
        // arms stay up holding the cookie
        if (kid.armL) kid.armL.rotation.set(-1.25, 0, -0.35);
        if (kid.armR) kid.armR.rotation.set(-1.25, 0, 0.35);
      } else if (variant === 'B') {
        if (kid.armL) kid.armL.rotation.set(-1.1, 0, -0.3);
        if (kid.armR) kid.armR.rotation.set(-1.1, 0, 0.3);
      } else if (variant === 'B2') {
        // cookie arm out to the side, the other hand on the knee
        if (kid.armR) kid.armR.rotation.set(-0.45, 0, 1.15);
        if (kid.armL) kid.armL.rotation.set(-0.35, 0, -0.25);
        const hg = scene.getObjectByName('handGlow');
        if (hg && kid.armR) {
          kid.root.updateMatrixWorld(true);
          kid.armR.localToWorld(hg.position.set(0, -0.25, 0.04));
        }
      }
      mum.root.updateMatrixWorld(true);
      mum.lightTip!.getWorldPosition(tip);
      const sweep = variant === 'A' ? Math.sin(t * 0.6) * 0.06 : 0;
      cone.update(mum.root.position.x, mum.root.position.z, mumDir + sweep, tip, house.walls, dt, t);
      sp.update(t);
      house.update(t, dt);
      void portrait;
      void aspect;
    },
  };
}
