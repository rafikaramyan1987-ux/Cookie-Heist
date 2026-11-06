import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Renderer + post-processing (soft bloom on lights, vignette and a gentle
 * night colour grade). DPR is capped at 2; bloom runs at half resolution.
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.42 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVignette; uniform float uAspect; uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; d.x *= mix(1.0, uAspect, 0.5);
      float v = smoothstep(0.85, 0.2, length(d));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      // lift shadows towards indigo, keep highlights warm
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(c.rgb, c.rgb + vec3(0.025,0.015,0.06), 1.0 - smoothstep(0.0, 0.35, l));
      c.rgb += (hash(vUv * 900.0 + uTime) - 0.5) * 0.012;
      gl_FragColor = c;
    }`,
};

export interface Stage {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  renderPass: RenderPass;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  setScene(scene: THREE.Scene, camera: THREE.Camera): void;
  resize(w: number, h: number): void;
  render(t: number): void;
}

export function createStage(canvas: HTMLCanvasElement, opts: { bloom?: boolean } = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.5, 0.86);
  bloom.enabled = opts.bloom ?? true;
  composer.addPass(bloom);
  const output = new OutputPass();
  composer.addPass(output);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  const stage: Stage = {
    renderer,
    composer,
    renderPass,
    bloom,
    grade,
    setScene(scene, camera) {
      renderPass.scene = scene;
      renderPass.camera = camera;
    },
    resize(w, h) {
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      bloom.resolution.set((w * pr) / 2, (h * pr) / 2);
      grade.uniforms.uAspect.value = w / h;
    },
    render(t) {
      grade.uniforms.uTime.value = t % 10;
      composer.render();
    },
  };
  return stage;
}

/** Standard night lighting rig: hemisphere fill + moon directional with soft shadows. */
export function nightLights(scene: THREE.Scene, opts: { size?: number; center?: THREE.Vector3; moon?: number; fill?: number } = {}) {
  const size = opts.size ?? 12;
  const c = opts.center ?? new THREE.Vector3();
  const hemi = new THREE.HemisphereLight(0x8fa2ff, 0x2a1c4a, opts.fill ?? 1.25);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xb9c8ff, opts.moon ?? 1.6);
  moon.position.set(c.x - size * 0.45, c.y + size * 1.1, c.z - size * 0.35);
  moon.target.position.copy(c);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera;
  sc.left = -size * 0.75;
  sc.right = size * 0.75;
  sc.top = size * 0.75;
  sc.bottom = -size * 0.75;
  sc.near = 0.5;
  sc.far = size * 3;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.02;
  moon.shadow.radius = 4;
  scene.add(moon, moon.target);
  return { hemi, moon };
}
