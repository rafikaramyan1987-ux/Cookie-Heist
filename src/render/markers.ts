import * as THREE from 'three';
import { canvasTex } from './textures';

/** Dashed teal ring + "eye closed" glyph showing a hiding spot. */
export function hideMarker(size = 1.05): THREE.Mesh {
  const tex = canvasTex(
    'hidemarker',
    256,
    256,
    (g, w, h) => {
      g.translate(w / 2, h / 2);
      g.strokeStyle = 'rgba(120,255,214,0.95)';
      g.lineWidth = 9;
      g.lineCap = 'round';
      const n = 14;
      for (let i = 0; i < n; i++) {
        g.beginPath();
        g.arc(0, 0, 108, (i / n) * Math.PI * 2, ((i + 0.55) / n) * Math.PI * 2);
        g.stroke();
      }
      const grd = g.createRadialGradient(0, 0, 10, 0, 0, 110);
      grd.addColorStop(0, 'rgba(120,255,214,0.0)');
      grd.addColorStop(1, 'rgba(120,255,214,0.28)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(0, 0, 104, 0, Math.PI * 2);
      g.fill();
    },
    false,
  );
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 3;
  return m;
}
