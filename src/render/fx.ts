import * as THREE from 'three';
import { sparkleTex, radialTex } from './textures';

/** Small juicy effects: sparkles, noise rings, dust motes, snow, Zzz. */

const sparkVS = /* glsl */ `
  attribute float aSeed; uniform float uTime; uniform float uSize; uniform float uRise;
  varying float vA;
  void main(){
    vec3 p = position;
    float t = fract(uTime * 0.35 + aSeed);
    p.y += t * uRise;
    p.x += sin(uTime * 1.3 + aSeed * 20.0) * 0.05;
    vA = sin(t * 3.14159) * (0.6 + 0.4 * sin(uTime * 6.0 + aSeed * 40.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + 0.6 * fract(aSeed * 7.0)) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const sparkFS = /* glsl */ `
  uniform sampler2D uTex; uniform vec3 uColor; varying float vA;
  void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor * t.a * vA, t.a * vA); }`;

export class Sparkles {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  constructor(count: number, spread: THREE.Vector3, color = 0xffe08a, size = 0.06, rise = 0.6) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread.x;
      pos[i * 3 + 1] = Math.random() * spread.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: sparkVS,
      fragmentShader: sparkFS,
      uniforms: { uTime: { value: 0 }, uSize: { value: size }, uRise: { value: rise }, uTex: { value: sparkleTex() }, uColor: { value: new THREE.Color(color) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  update(t: number) {
    this.mat.uniforms.uTime.value = t;
  }
}

/** Expanding ring on the floor showing how far a noise carries. */
export class NoiseRing {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  age = 99;
  constructor(public radius = 2, color = 0xbfe3ff) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uT; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          float r = length(vUv - 0.5) * 2.0;
          float a = 0.0;
          for (int i = 0; i < 3; i++) {
            float k = fract(uT * 0.9 - float(i) * 0.28);
            a += smoothstep(0.06, 0.0, abs(r - k)) * (1.0 - k) * 1.2;
          }
          a += smoothstep(1.0, 0.97, r) * smoothstep(0.92, 0.97, r) * 0.35;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.03;
    this.mesh.scale.setScalar(radius);
    this.mesh.renderOrder = 4;
  }
  update(t: number) {
    this.mat.uniforms.uT.value = t;
  }
}

/** Slow drifting particles (dust in moonbeams, fireflies, snow). */
export class Drift {
  readonly points: THREE.Points;
  private base: Float32Array;
  constructor(
    count: number,
    box: THREE.Box3,
    color: number,
    size: number,
    private mode: 'dust' | 'snow' | 'firefly',
  ) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random());
      pos[i * 3 + 1] = THREE.MathUtils.lerp(box.min.y, box.max.y, Math.random());
      pos[i * 3 + 2] = THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random());
    }
    this.base = pos.slice();
    this.box = box;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color,
      size,
      map: radialTex(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: mode === 'snow' ? 0.9 : 0.7,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
  }
  private box: THREE.Box3;
  update(t: number) {
    const p = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    const b = this.base;
    const h = this.box.max.y - this.box.min.y;
    for (let i = 0; i < a.length; i += 3) {
      const s = i * 0.37;
      if (this.mode === 'snow') {
        a[i] = b[i] + Math.sin(t * 0.7 + s) * 0.15;
        a[i + 1] = this.box.min.y + ((((b[i + 1] - this.box.min.y - t * 0.35) % h) + h) % h);
        a[i + 2] = b[i + 2] + Math.cos(t * 0.5 + s) * 0.1;
      } else {
        const amp = this.mode === 'firefly' ? 0.25 : 0.08;
        a[i] = b[i] + Math.sin(t * 0.3 + s) * amp;
        a[i + 1] = b[i + 1] + Math.sin(t * 0.2 + s * 2) * amp;
        a[i + 2] = b[i + 2] + Math.cos(t * 0.25 + s) * amp;
      }
    }
    p.needsUpdate = true;
  }
}

/** CPU particle bursts on an InstancedMesh (crumbs, confetti, trails, dust puffs). */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private pos: Float32Array;
  private vel: Float32Array;
  private rot: Float32Array;
  private spin: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size: Float32Array;
  private grav: Float32Array;
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private v = new THREE.Vector3();
  private col = new THREE.Color();

  constructor(
    private max = 300,
    geo: THREE.BufferGeometry = new THREE.BoxGeometry(1, 1, 1),
  ) {
    const mat = new THREE.MeshBasicMaterial({ vertexColors: false, toneMapped: false, transparent: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.rot = new Float32Array(max * 3);
    this.spin = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size = new Float32Array(max);
    this.grav = new Float32Array(max);
    for (let i = 0; i < max; i++) {
      this.mesh.setColorAt(i, this.col.set(0xffffff));
      this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.m);
    }
  }

  emit(x: number, y: number, z: number, o: { vx?: number; vy?: number; vz?: number; spread?: number; up?: number; color: number; size: number; life: number; gravity?: number; spin?: number }) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const sp = o.spread ?? 1;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([(o.vx ?? 0) + (Math.random() - 0.5) * sp, (o.vy ?? 0) + (o.up ?? 0) * (0.6 + Math.random() * 0.6), (o.vz ?? 0) + (Math.random() - 0.5) * sp], i * 3);
    this.rot.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], i * 3);
    const s = o.spin ?? 8;
    this.spin.set([(Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s], i * 3);
    this.life[i] = o.life;
    this.maxLife[i] = o.life;
    this.size[i] = o.size;
    this.grav[i] = o.gravity ?? 9;
    this.mesh.setColorAt(i, this.col.set(o.color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k + 1] -= this.grav[i] * dt;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      if (this.pos[k + 1] < 0.02) {
        this.pos[k + 1] = 0.02;
        this.vel[k + 1] *= -0.3;
        this.vel[k] *= 0.6;
        this.vel[k + 2] *= 0.6;
      }
      this.rot[k] += this.spin[k] * dt;
      this.rot[k + 1] += this.spin[k + 1] * dt;
      this.rot[k + 2] += this.spin[k + 2] * dt;
      const a = Math.max(0, this.life[i] / this.maxLife[i]);
      const sz = this.life[i] <= 0 ? 0 : this.size[i] * Math.min(1, a * 3);
      this.q.setFromEuler(this.e.set(this.rot[k], this.rot[k + 1], this.rot[k + 2]));
      this.m.compose(this.v.set(this.pos[k], this.pos[k + 1], this.pos[k + 2]), this.q, this.s.set(sz, sz, sz));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
