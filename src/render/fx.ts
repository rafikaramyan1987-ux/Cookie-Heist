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
