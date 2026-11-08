import * as THREE from 'three';
import type { Hint } from '../game/hint';
import { makeCharacter, animateRig, Rig, SKINS } from '../render/characters';
import { canvasTex } from '../render/textures';

/**
 * Hint visuals: a dotted safe route, "wait here" markers with a countdown that turns into a green "GO" pulse
 * when the safe window opens, and a ghost Pip that replays the route quickly during the intro.
 */
const DOT_STEP = 0.32;
const COUNTDOWN = 3; // s of countdown fill before each window

function labelTex(text: string, bg: string) {
  return canvasTex(`hintlabel-${text}-${bg}`, 256, 96, (g) => {
    g.fillStyle = bg;
    g.strokeStyle = '#2a1a33';
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(8, 8, 240, 80, 38);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    let size = 50;
    const font = () => `bold ${size}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
    g.font = font();
    while (size > 24 && g.measureText(text).width > 206) {
      size -= 2;
      g.font = font();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 52);
  }, false);
}

interface Marker {
  t1: number;
  group: THREE.Group;
  ring: THREE.Mesh;
  fill: THREE.Mesh;
  label: THREE.Sprite;
  go: THREE.Sprite;
  pulsed: boolean;
}

export class HintView {
  readonly group = new THREE.Group();
  private dots: THREE.InstancedMesh;
  private dotMat: THREE.MeshBasicMaterial;
  private markers: Marker[] = [];
  private ghost: Rig;
  private times: number[] = [];
  private pts: THREE.Vector2[] = [];
  /** replay progress (s of hint time), < 0 = no replay */
  replayT = -1;
  private playT = 0;
  onGo: (i: number, x: number, z: number) => void = () => {};

  constructor(
    private hint: Hint,
    labels: { wait: string; go: string } = { wait: 'WAIT', go: 'GO!' },
  ) {
    // resample the path into evenly spaced dots
    const P = hint.path;
    const dots: THREE.Vector2[] = [];
    let carry = 0;
    for (let i = 1; i < P.length; i++) {
      const a = new THREE.Vector2(P[i - 1].x, P[i - 1].z),
        b = new THREE.Vector2(P[i].x, P[i].z);
      const len = a.distanceTo(b);
      let d = DOT_STEP - carry;
      while (d <= len) {
        dots.push(a.clone().lerp(b, d / len));
        d += DOT_STEP;
      }
      carry = len - (d - DOT_STEP);
    }
    this.dotMat = new THREE.MeshBasicMaterial({ color: 0x6ff0c8, transparent: true, opacity: 0.9, depthWrite: false });
    this.dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.055, 12), this.dotMat, Math.max(1, dots.length));
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    dots.forEach((d, i) => this.dots.setMatrixAt(i, m.compose(new THREE.Vector3(d.x, 0.035, d.y), q, new THREE.Vector3(1, 1, 1))));
    this.dots.count = dots.length;
    this.dots.renderOrder = 4;
    this.group.add(this.dots);

    // wait markers
    for (const w of hint.waits) {
      const g = new THREE.Group();
      g.position.set(w.x, 0.04, w.z);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      const fill = new THREE.Mesh(new THREE.CircleGeometry(0.29, 36), new THREE.MeshBasicMaterial({ color: 0xffb03b, transparent: true, opacity: 0.55, depthWrite: false }));
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.002;
      fill.scale.setScalar(0.001);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(labels.wait, '#7a5cff'), transparent: true, depthTest: false }));
      label.scale.set(1.2, 0.45, 1);
      label.position.y = 0.95;
      label.renderOrder = 21;
      const go = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(labels.go, '#27c26c'), transparent: true, depthTest: false }));
      go.scale.set(1.45, 0.55, 1);
      go.position.y = 0.95;
      go.renderOrder = 21;
      go.visible = false;
      g.add(ring, fill, label, go);
      this.group.add(g);
      this.markers.push({ t1: w.t1, group: g, ring, fill, label, go, pulsed: false });
    }

    // ghost Pip for the replay
    this.ghost = makeCharacter('kid', SKINS[0]);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.5, depthWrite: false });
    this.ghost.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).material = ghostMat;
        o.castShadow = false;
      }
    });
    this.ghost.root.visible = false;
    this.group.add(this.ghost.root);
    // time-stamped samples for the replay
    let t = 0;
    for (const p of P) {
      if (p.item || p.key) continue;
      this.pts.push(new THREE.Vector2(p.x, p.z));
      this.times.push(t);
      t += 0.2;
    }
  }

  /** replay length in real seconds (time-compressed) */
  get replayDuration() {
    return Math.min(8, Math.max(3, this.hint.time / 3));
  }

  private ghostAt(ht: number): THREE.Vector2 {
    const i = Math.min(this.times.length - 1, Math.max(0, Math.floor(ht / 0.2)));
    const j = Math.min(this.times.length - 1, i + 1);
    const k = Math.min(1, Math.max(0, ht / 0.2 - i));
    return this.pts[i].clone().lerp(this.pts[j], k);
  }

  /**
   * @param worldT current world time (drives countdowns / GO pulses during play)
   * @param replay true while the intro replay is running
   */
  update(dt: number, t: number, worldT: number, replay: boolean, kid: { x: number; z: number }) {
    // replay: the ghost walks the route fast, markers light up as it passes
    if (replay && this.pts.length > 1) {
      const speed = this.hint.time / this.replayDuration;
      this.replayT = Math.min(this.hint.time, (this.replayT < 0 ? 0 : this.replayT) + dt * speed);
      const a = this.ghostAt(this.replayT),
        b = this.ghostAt(this.replayT + 0.2);
      this.ghost.root.visible = true;
      this.ghost.root.position.set(a.x, 0, a.y);
      if (b.distanceTo(a) > 0.01) this.ghost.root.rotation.y = Math.atan2(b.x - a.x, b.y - a.y);
      this.ghost.mode = b.distanceTo(a) > 0.02 ? 'tiptoe' : 'idle';
      animateRig(this.ghost, dt * Math.min(3, speed), t);
      this.dotMat.opacity = 0.9;
      for (const m of this.markers) {
        // only the marker the ghost is waiting at gets a label
        const near = this.replayT >= m.t1 - 0.8 && this.replayT <= m.t1 + 0.3;
        m.go.visible = near && this.replayT >= m.t1 - 0.1;
        m.label.visible = near && !m.go.visible;
        m.fill.scale.setScalar(near ? 1 : 0.001);
        (m.ring.material as THREE.MeshBasicMaterial).opacity = near ? 0.95 : 0.4;
      }
      return;
    }
    this.ghost.root.visible = false;
    this.playT += dt;
    // the dotted path fades after a few seconds of play; the markers stay
    this.dotMat.opacity = Math.max(0, 0.9 - Math.max(0, this.playT - 6) * 0.45);
    // the next marker is the active one (label, countdown, GO); later ones are faint rings
    const active = this.markers.findIndex((m) => worldT <= m.t1 + 1.4);
    this.markers.forEach((m, i) => {
      const k = Math.min(1, Math.max(0, (worldT - (m.t1 - COUNTDOWN)) / COUNTDOWN));
      const done = worldT > m.t1 + 1.4;
      m.group.visible = !done;
      if (done) return;
      if (i !== active) {
        m.label.visible = false;
        m.go.visible = false;
        m.fill.scale.setScalar(0.001);
        (m.ring.material as THREE.MeshBasicMaterial).opacity = 0.35;
        m.ring.scale.setScalar(0.8);
        return;
      }
      m.ring.scale.setScalar(1);
      (m.ring.material as THREE.MeshBasicMaterial).opacity = 0.95;
      const fillMat = m.fill.material as THREE.MeshBasicMaterial;
      if (worldT < m.t1) {
        m.fill.scale.setScalar(Math.max(0.001, k));
        fillMat.color.setHex(0xffb03b);
        m.label.visible = true;
        m.go.visible = false;
      } else {
        if (!m.pulsed) {
          m.pulsed = true;
          this.onGo(i, m.group.position.x, m.group.position.z);
        }
        const p = (worldT - m.t1) / 1.4;
        fillMat.color.setHex(0x27c26c);
        m.fill.scale.setScalar(1 + Math.sin(p * Math.PI * 4) * 0.12);
        m.ring.scale.setScalar(1 + p * 0.8);
        (m.ring.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - p);
        m.label.visible = false;
        m.go.visible = true;
      }
      // highlight the marker the kid is standing on
      const near = Math.hypot(kid.x - m.group.position.x, kid.z - m.group.position.z) < 0.6;
      m.label.scale.set(near ? 1.35 : 1.2, near ? 0.5 : 0.45, 1);
      m.label.position.y = 0.95 + Math.sin(t * 3 + i) * 0.03;
    });
  }
}
