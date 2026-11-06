import * as THREE from 'three';

/**
 * Shared toon material system: soft 3-band gradient ramp + a cool moonlit rim
 * light injected into MeshToonMaterial. Materials are cached by key so the
 * whole game uses a small number of shader programs.
 */

let ramp: THREE.DataTexture | null = null;

/** 3 soft bands (shadow / mid / lit) with smooth transitions. */
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const n = 64;
  const data = new Uint8Array(n * 4);
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const v = 0.42 + 0.3 * smooth(0.36, 0.44, x) + 0.28 * smooth(0.6, 0.68, x);
    const b = Math.round(v * 255);
    data.set([b, b, b, 255], i * 4);
  }
  ramp = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.LinearFilter;
  ramp.magFilter = THREE.LinearFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export const rimUniforms = {
  uRimColor: { value: new THREE.Color(0x7f9cff) },
  uRimPower: { value: 2.6 },
};

export interface ToonOpts {
  map?: THREE.Texture | null;
  emissive?: number;
  emissiveIntensity?: number;
  rim?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  key?: string;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: number | string, opts: ToonOpts = {}): THREE.MeshToonMaterial {
  const key =
    opts.key ??
    `${color}|${opts.map?.uuid ?? ''}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.rim ?? ''}|${opts.transparent ?? ''}|${opts.opacity ?? ''}|${opts.side ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshToonMaterial({
    color: new THREE.Color(color as THREE.ColorRepresentation),
    gradientMap: toonRamp(),
    map: opts.map ?? null,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  if (opts.emissive !== undefined) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  const rim = opts.rim ?? 0.35;
  m.userData.rim = rim;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = rimUniforms.uRimColor;
    shader.uniforms.uRimPower = rimUniforms.uRimPower;
    shader.uniforms.uRimStrength = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimPower;\nuniform float uRimStrength;',
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          vec3 vdir = normalize(vViewPosition);
          float fr = pow(1.0 - saturate(dot(normalize(normal), vdir)), uRimPower);
          // rim mostly on upper-facing edges (moonlight from above)
          float up = saturate(normal.y * 0.6 + 0.6);
          outgoingLight += uRimColor * fr * uRimStrength * up;
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => `toonrim${rim}`;
  cache.set(key, m);
  return m;
}

/** Unlit, additive glow material (for halos, cones, light shafts). */
export function glowBasic(color: number, opacity = 1, map?: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    map: map ?? null,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}
