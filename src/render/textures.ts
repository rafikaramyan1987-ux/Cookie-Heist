import * as THREE from 'three';

/** Procedural canvas textures (no external image files). */

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
const cache = new Map<string, THREE.CanvasTexture>();

/** Small deterministic PRNG so textures look the same every run. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function canvasTex(key: string, w: number, h: number, draw: Draw, repeat = true, srgb = true): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
function shade(c: number, f: number): string {
  const col = new THREE.Color(c);
  col.multiplyScalar(f);
  return '#' + col.getHexString();
}

/** Wooden planks; one texture tile = 1 world unit with 4 planks. */
export function planksTex(base: number, seed = 1, planks = 4): THREE.CanvasTexture {
  return canvasTex(`planks${base}-${seed}-${planks}`, 256, 256, (g, w, h) => {
    const r = rng(seed);
    const ph = h / planks;
    g.fillStyle = shade(base, 0.95);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < planks; i++) {
      // two staggered boards per row
      const off = r() * w;
      for (let k = -2; k < 2; k++) {
        const x0 = ((off + k * w * 0.75) % w) - (i % 2) * w * 0.3;
        g.fillStyle = shade(base, 0.86 + r() * 0.24);
        g.fillRect(x0, i * ph, w * 0.75, ph);
        // grain
        g.globalAlpha = 0.12;
        for (let j = 0; j < 5; j++) {
          g.strokeStyle = shade(base, 0.6);
          g.lineWidth = 1;
          g.beginPath();
          const y = i * ph + 4 + r() * (ph - 8);
          g.moveTo(x0, y);
          g.bezierCurveTo(x0 + w * 0.2, y + (r() - 0.5) * 6, x0 + w * 0.5, y + (r() - 0.5) * 6, x0 + w * 0.75, y);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.fillStyle = shade(base, 0.55);
        g.fillRect(x0 - 1, i * ph, 2, ph);
      }
      g.fillStyle = shade(base, 0.5);
      g.fillRect(0, i * ph, w, 2);
      // soft highlight on top edge of each plank
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(0, i * ph + 2, w, 3);
    }
  });
}

/** Checker or plain tiles with grout. `n` tiles per world unit. */
export function tilesTex(a: number, b: number, n = 2, grout = 0.8): THREE.CanvasTexture {
  return canvasTex(`tiles${a}-${b}-${n}`, 256, 256, (g, w) => {
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = hex((x + y) % 2 ? a : b);
        g.fillRect(x * s, y * s, s, s);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(x * s + 4, y * s + 4, s - 8, s * 0.18);
      }
    g.strokeStyle = shade(a, grout);
    g.lineWidth = 4;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, w);
      g.moveTo(0, i * s);
      g.lineTo(w, i * s);
      g.stroke();
    }
  });
}

export function carpetTex(base: number, seed = 3): THREE.CanvasTexture {
  return canvasTex(`carpet${base}-${seed}`, 128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

/** Large stone / marble slabs. */
export function marbleTex(a: number, b: number, seed = 5): THREE.CanvasTexture {
  return canvasTex(`marble${a}-${b}-${seed}`, 256, 256, (g, w) => {
    const r = rng(seed);
    const s = w / 2;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = hex((x + y) % 2 ? a : b);
        g.fillRect(x * s, y * s, s, s);
        g.globalAlpha = 0.18;
        g.strokeStyle = '#ffffff';
        for (let k = 0; k < 3; k++) {
          g.lineWidth = 1 + r() * 2;
          g.beginPath();
          g.moveTo(x * s + r() * s, y * s);
          g.bezierCurveTo(x * s + r() * s, y * s + s * 0.3, x * s + r() * s, y * s + s * 0.6, x * s + r() * s, y * s + s);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 3;
    g.strokeRect(0, 0, s, s);
    g.strokeRect(s, s, s, s);
    g.strokeRect(s, 0, s, s);
    g.strokeRect(0, s, s, s);
  });
}

export function stoneTex(base: number, seed = 9): THREE.CanvasTexture {
  return canvasTex(`stone${base}-${seed}`, 256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = shade(base, 0.55);
    g.fillRect(0, 0, w, h);
    const rows = 4;
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 40;
      while (x < w) {
        const bw = 40 + r() * 50;
        g.fillStyle = shade(base, 0.8 + r() * 0.35);
        roundRect(g, x + 3, i * rh + 3, bw - 6, rh - 6, 10);
        g.fill();
        x += bw;
      }
    }
  });
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------- wallpapers (u = along wall in world units, v = 0..1 over wall height) ----------

export function stripesTex(a: number, b: number, n = 4): THREE.CanvasTexture {
  return canvasTex(`stripes${a}-${b}-${n}`, 128, 128, (g, w, h) => {
    g.fillStyle = hex(a);
    g.fillRect(0, 0, w, h);
    g.fillStyle = hex(b);
    const s = w / n;
    for (let i = 0; i < n; i++) g.fillRect(i * s, 0, s * 0.42, h);
  });
}

export function starsWallTex(a: number, b: number): THREE.CanvasTexture {
  return canvasTex(`starswall${a}-${b}`, 256, 256, (g, w, h) => {
    const r = rng(42);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      drawStar(g, r() * w, r() * h, 5 + r() * 7, hex(b));
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = hex(b);
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(r() * w, r() * h, 1.5, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
  });
}

export function drawStar(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

export function floralTex(a: number, b: number, c: number): THREE.CanvasTexture {
  return canvasTex(`floral${a}-${b}-${c}`, 256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = shade(a, 0.93);
      g.fillRect(i * 64 + 28, 0, 8, h);
    }
    for (let i = 0; i < 14; i++) {
      const x = r() * w,
        y = r() * h;
      for (let p = 0; p < 5; p++) {
        const an = (p / 5) * Math.PI * 2;
        g.fillStyle = hex(b);
        g.beginPath();
        g.arc(x + Math.cos(an) * 6, y + Math.sin(an) * 6, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = hex(c);
      g.beginPath();
      g.arc(x, y, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  });
}

export function logsTex(base: number): THREE.CanvasTexture {
  return canvasTex(`logs${base}`, 128, 256, (g, w, h) => {
    const n = 4;
    const s = h / n;
    for (let i = 0; i < n; i++) {
      const grd = g.createLinearGradient(0, i * s, 0, (i + 1) * s);
      grd.addColorStop(0, shade(base, 0.7));
      grd.addColorStop(0.35, shade(base, 1.08));
      grd.addColorStop(0.8, shade(base, 0.95));
      grd.addColorStop(1, shade(base, 0.55));
      g.fillStyle = grd;
      g.fillRect(0, i * s, w, s);
    }
  });
}

export function panelTex(a: number, b: number): THREE.CanvasTexture {
  // mansion wainscot panels
  return canvasTex(`panel${a}-${b}`, 128, 256, (g, w, h) => {
    g.fillStyle = hex(a);
    g.fillRect(0, 0, w, h);
    g.strokeStyle = hex(b);
    g.lineWidth = 6;
    g.strokeRect(14, 20, w - 28, h * 0.42);
    g.strokeRect(14, h * 0.55, w - 28, h * 0.38);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(17, 23, w - 34, 10);
  });
}

export function paintTex(a: number): THREE.CanvasTexture {
  return canvasTex(`paint${a}`, 64, 64, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = hex(a);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}

// ---------- utility sprites ----------

export function radialTex(): THREE.CanvasTexture {
  return canvasTex(
    'radial',
    128,
    128,
    (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      grd.addColorStop(0.7, 'rgba(255,255,255,0.15)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },
    false,
    false,
  );
}

/** Dark soft blob for contact shadows (alpha in texture). */
export function blobTex(): THREE.CanvasTexture {
  return canvasTex(
    'blob',
    128,
    128,
    (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, 'rgba(10,6,30,0.75)');
      grd.addColorStop(0.5, 'rgba(10,6,30,0.4)');
      grd.addColorStop(1, 'rgba(10,6,30,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },
    false,
  );
}

/** Linear AO gradient used along wall bases (dark at v=0). */
export function aoStripTex(): THREE.CanvasTexture {
  return canvasTex(
    'aostrip',
    4,
    64,
    (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(8,4,28,0.6)');
      grd.addColorStop(0.4, 'rgba(8,4,28,0.22)');
      grd.addColorStop(1, 'rgba(8,4,28,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },
    false,
  );
}

export function sparkleTex(): THREE.CanvasTexture {
  return canvasTex(
    'sparkle',
    64,
    64,
    (g, w, h) => {
      const cx = w / 2,
        cy = h / 2;
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.2, 'rgba(255,255,255,0.5)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.moveTo(cx, 2);
      g.quadraticCurveTo(cx, cy, w - 2, cy);
      g.quadraticCurveTo(cx, cy, cx, h - 2);
      g.quadraticCurveTo(cx, cy, 2, cy);
      g.quadraticCurveTo(cx, cy, cx, 2);
      g.fill();
    },
    false,
    false,
  );
}

/** Window-light patch on the floor: 4 panes with soft edges. */
export function windowPatchTex(): THREE.CanvasTexture {
  return canvasTex(
    'windowpatch',
    128,
    128,
    (g, w, h) => {
      g.filter = 'blur(5px)';
      g.fillStyle = 'rgba(255,255,255,0.95)';
      const m = 12,
        gap = 8;
      const pw = (w - 2 * m - gap) / 2,
        phh = (h - 2 * m - gap) / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(m + i * (pw + gap), m + j * (phh + gap), pw, phh);
    },
    false,
    false,
  );
}

/** Sky gradient + stars for scene backgrounds. */
export function skyTex(top: number, bottom: number, stars = true, key = ''): THREE.CanvasTexture {
  return canvasTex(
    `sky${top}-${bottom}-${stars}-${key}`,
    512,
    1024,
    (g, w, h) => {
      const grd = g.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, h * 0.75);
      grd.addColorStop(0, hex(bottom));
      grd.addColorStop(1, hex(top));
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      if (stars) {
        const r = rng(123);
        for (let i = 0; i < 260; i++) {
          const s = r() * 1.6 + 0.3;
          g.globalAlpha = 0.25 + r() * 0.6;
          g.fillStyle = r() > 0.85 ? '#ffe7b0' : '#dfe6ff';
          g.beginPath();
          g.arc(r() * w, r() * h, s, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
    },
    false,
  );
}

/** Pyjama fabric patterns (uv-mapped around capsules). */
export function fabricTex(kind: 'stars' | 'stripes' | 'dino' | 'dots' | 'check', a: number, b: number): THREE.CanvasTexture {
  return canvasTex(`fabric-${kind}-${a}-${b}`, 256, 256, (g, w, h) => {
    g.fillStyle = hex(a);
    g.fillRect(0, 0, w, h);
    const r = rng(77);
    if (kind === 'stars') {
      for (let i = 0; i < 26; i++) drawStar(g, r() * w, r() * h, 7 + r() * 5, hex(b));
    } else if (kind === 'stripes') {
      g.fillStyle = hex(b);
      for (let i = 0; i < 8; i++) g.fillRect(0, i * 32, w, 14);
    } else if (kind === 'dots') {
      g.fillStyle = hex(b);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          g.beginPath();
          g.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 8, 5, 0, Math.PI * 2);
          g.fill();
        }
    } else if (kind === 'check') {
      g.fillStyle = hex(b);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 8; i++) {
        g.fillRect(i * 32, 0, 12, h);
        g.fillRect(0, i * 32, w, 12);
      }
      g.globalAlpha = 1;
    } else {
      // dino scales
      for (let i = 0; i < 40; i++) {
        g.fillStyle = hex(b);
        g.globalAlpha = 0.7;
        g.beginPath();
        g.ellipse(r() * w, r() * h, 8 + r() * 8, 6 + r() * 6, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  });
}
