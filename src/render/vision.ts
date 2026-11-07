import * as THREE from 'three';

/**
 * Flashlight / vision cone. Three layers:
 *  1. floor sector, ray-cast against walls (this IS the guard's vision),
 *  2. a soft volumetric cone from the lamp to the floor,
 *  3. a real (shadowless) spot light so the beam lights floor & props.
 * Colour blends calm (warm yellow) → suspicious (orange) → chase (red).
 */

export type Seg = [number, number, number, number];
export type Alert = 'calm' | 'suspicious' | 'chase';
export type RayFn = (angle: number, range: number) => number;

export const ALERT_COLORS: Record<Alert, THREE.Color> = {
  calm: new THREE.Color(0xffc861),
  suspicious: new THREE.Color(0xffa040),
  chase: new THREE.Color(0xff3d4f),
};

const RAYS = 48;

/** Distance along a ray to the nearest segment (or maxD). */
export function castRay(ox: number, oz: number, dx: number, dz: number, maxD: number, walls: Seg[]): number {
  let best = maxD;
  for (const [x1, z1, x2, z2] of walls) {
    const ex = x2 - x1,
      ez = z2 - z1;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((x1 - ox) * ez - (z1 - oz) * ex) / den;
    const u = ((x1 - ox) * dz - (z1 - oz) * dx) / den;
    if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

const floorVS = /* glsl */ `
  varying vec2 vW;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const floorFS = /* glsl */ `
  uniform vec2 uO; uniform float uDir; uniform float uHalf; uniform float uRange;
  uniform vec3 uColor; uniform float uTime; uniform float uIntensity;
  varying vec2 vW;
  void main(){
    vec2 d = vW - uO;
    float dist = length(d) / uRange;
    float a = atan(d.y, d.x) - uDir;
    a = atan(sin(a), cos(a));
    float e = abs(a) / uHalf;
    // soft inner body: bright pool, gently fading towards the tip of the cone
    float inside = (1.0 - smoothstep(0.9, 1.0, dist)) * (1.0 - smoothstep(0.86, 1.0, e));
    float pool = inside * mix(1.0, 0.55, dist) * smoothstep(0.0, 0.1, dist);
    // hot centre (where the beam lands)
    float hot = exp(-pow((dist - 0.45) * 2.6, 2.0)) * (1.0 - smoothstep(0.0, 0.6, e)) * 0.45;
    // clear soft outline on the sides and the far arc
    float sideEdge = smoothstep(0.78, 0.92, e) * (1.0 - smoothstep(0.94, 1.02, e)) * (1.0 - smoothstep(0.92, 1.0, dist)) * smoothstep(0.05, 0.15, dist);
    float arcEdge = smoothstep(0.84, 0.93, dist) * (1.0 - smoothstep(0.95, 1.02, dist)) * (1.0 - smoothstep(0.9, 1.02, e));
    float edge = max(sideEdge, arcEdge);
    // slow "sweep" stripes so the danger zone reads even on busy floors
    float stripes = 0.9 + 0.1 * sin(dist * 22.0 - uTime * 4.0);
    float alpha = (pool * 0.85 * stripes + hot + edge * 1.15) * uIntensity;
    vec3 col = mix(uColor, vec3(1.0, 0.95, 0.85), edge * 0.25 + hot * 0.15);
    gl_FragColor = vec4(col * alpha, alpha);
  }`;

const volVS = /* glsl */ `
  varying float vLen; varying vec3 vN; varying vec3 vV;
  void main(){
    vLen = uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const volFS = /* glsl */ `
  uniform vec3 uColor; uniform float uIntensity;
  varying float vLen; varying vec3 vN; varying vec3 vV;
  void main(){
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float soft = mix(0.25, 1.0, pow(facing, 1.4));
    float len = 1.0 - vLen; // 0 at apex (uv.y = 1 at tip for ConeGeometry)
    float fade = smoothstep(0.0, 0.08, 1.0 - len) * pow(1.0 - len, 0.8);
    float a = soft * fade * 0.42 * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }`;

export class VisionCone {
  readonly group = new THREE.Group();
  readonly floor: THREE.Mesh;
  readonly volume: THREE.Mesh;
  readonly spot: THREE.SpotLight;
  readonly color = ALERT_COLORS.calm.clone();
  alert: Alert = 'calm';
  private floorMat: THREE.ShaderMaterial;
  private volMat: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;

  constructor(
    public range = 4,
    public halfAngle = 0.5,
    opts: { volume?: boolean; spot?: boolean; intensity?: number } = {},
  ) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array((RAYS + 2) * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx: number[] = [];
    for (let i = 0; i < RAYS; i++) idx.push(0, i + 2, i + 1);
    this.geo.setIndex(idx);
    this.floorMat = new THREE.ShaderMaterial({
      vertexShader: floorVS,
      fragmentShader: floorFS,
      uniforms: {
        uO: { value: new THREE.Vector2() },
        uDir: { value: 0 },
        uHalf: { value: halfAngle },
        uRange: { value: range },
        uColor: { value: this.color },
        uTime: { value: 0 },
        uIntensity: { value: opts.intensity ?? 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.floor = new THREE.Mesh(this.geo, this.floorMat);
    this.floor.frustumCulled = false;
    this.floor.renderOrder = 2;
    this.group.add(this.floor);

    const cg = new THREE.ConeGeometry(1, 1, 32, 1, true);
    cg.translate(0, -0.5, 0); // apex at origin, opening towards -y
    cg.rotateX(-Math.PI / 2); // opening towards -z ... we orient with lookAt (+z)
    this.volMat = new THREE.ShaderMaterial({
      vertexShader: volVS,
      fragmentShader: volFS,
      uniforms: { uColor: { value: this.color }, uIntensity: { value: opts.intensity ?? 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.volume = new THREE.Mesh(cg, this.volMat);
    this.volume.visible = opts.volume ?? true;
    this.volume.renderOrder = 3;
    this.group.add(this.volume);

    this.spot = new THREE.SpotLight(0xffe2a0, 11, range * 1.6, halfAngle * 1.05, 0.5, 1.1);
    this.spot.visible = opts.spot ?? true;
    this.group.add(this.spot, this.spot.target);
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  setAlert(a: Alert) {
    this.alert = a;
  }

  private baseIntensity = -1;
  /** 0 = normal, 1 = dimmed (e.g. a teen looking at her phone) */
  setDim(k: number) {
    if (this.baseIntensity < 0) this.baseIntensity = this.floorMat.uniforms.uIntensity.value as number;
    const v = this.baseIntensity * (1 - 0.55 * k);
    this.floorMat.uniforms.uIntensity.value = v;
    this.volMat.uniforms.uIntensity.value = v;
  }

  /**
   * @param ox,oz guard position on the floor
   * @param dir facing angle (radians, atan2(dz, dx))
   * @param tip world position of the lamp
   */
  /** base (calm) colour; alert colours override */
  base: THREE.Color | null = null;

  update(ox: number, oz: number, dir: number, tip: THREE.Vector3, walls: Seg[] | RayFn, dt: number, t: number) {
    const want = this.alert === 'calm' && this.base ? this.base : ALERT_COLORS[this.alert];
    this.color.lerp(want, Math.min(1, dt * 6) || 1);
    const ray: RayFn = typeof walls === 'function' ? walls : (a, r) => castRay(ox, oz, Math.cos(a), Math.sin(a), r, walls);
    const p = this.pos;
    p[0] = ox;
    p[1] = 0.025;
    p[2] = oz;
    for (let i = 0; i <= RAYS; i++) {
      const a = dir - this.halfAngle * 1.02 + (i / RAYS) * this.halfAngle * 2.04;
      const dx = Math.cos(a),
        dz = Math.sin(a);
      const d = ray(a, this.range);
      p[(i + 1) * 3] = ox + dx * d;
      p[(i + 1) * 3 + 1] = 0.025;
      p[(i + 1) * 3 + 2] = oz + dz * d;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.geo.computeBoundingSphere();
    const u = this.floorMat.uniforms;
    u.uO.value.set(ox, oz);
    u.uDir.value = dir;
    u.uHalf.value = this.halfAngle;
    u.uRange.value = this.range;
    u.uTime.value = t;

    // volume: from lamp tip to a floor point ~55% down the cone, clipped by walls
    const reach = Math.min(this.range * 0.6, ray(dir, this.range) * 0.95);
    const target = new THREE.Vector3(ox + Math.cos(dir) * reach, 0, oz + Math.sin(dir) * reach);
    const len = tip.distanceTo(target);
    this.volume.position.copy(tip);
    this.volume.lookAt(target);
    const rad = Math.tan(this.halfAngle) * len * 0.75;
    this.volume.scale.set(rad, rad, len);

    this.spot.position.copy(tip);
    this.spot.target.position.set(ox + Math.cos(dir) * this.range * 0.6, 0, oz + Math.sin(dir) * this.range * 0.6);
    this.spot.color.copy(this.color);
    this.spot.angle = Math.min(1.2, this.halfAngle * 1.05);
    this.spot.distance = this.range * 1.5;
  }
}
