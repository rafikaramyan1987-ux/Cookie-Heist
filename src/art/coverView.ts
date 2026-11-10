import { titleView } from './titleView';
import type { View } from './view';

/** Store cover: the title scene at its best moment + logo only (top-left corner kept clear). */
export function coverView(): View {
  const v = titleView();
  const logo = coverLogo();
  return coverWith(v, logo);
}

/** the "COOKIE HEIST" title block of the store covers (no other text) */
export function coverLogo() {
  const logo = document.createElement('div');
  logo.className = 'cover-logo';
  logo.innerHTML = `<div class="logo"><div class="logo-line l1"><span>C</span><span class="cookie-o">${COOKIE}</span><span>O</span><span>K</span><span>I</span><span>E</span></div><div class="logo-line l2"><span>H</span><span>E</span><span>I</span><span>S</span><span>T</span></div></div>`;
  return logo;
}

function coverWith(v: View, logo: HTMLElement): View {
  return {
    ...v,
    overlay: [logo],
    resize(w, h) {
      v.resize(w, h);
      const a = w / h;
      const cam = v.camera;
      cam.fov = a > 1.3 ? 32 : a > 0.9 ? 38 : 42;
      cam.aspect = a;
      const target = { x: a > 1.3 ? 3.6 : 3.0, y: 0.6, z: a > 1.3 ? 7.3 : 7.4 };
      const pitch = (a > 1.3 ? 38 : 44) * (Math.PI / 180);
      const yaw = a > 1.3 ? 0.18 : 0.28;
      const dist = a > 1.3 ? 9.4 : a > 0.9 ? 10.5 : 12.5;
      cam.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
      cam.lookAt(target.x, target.y, target.z);
      // leave room for the logo (bottom / bottom-right), keep the top-left corner clear
      if (a > 1.3) cam.setViewOffset(w, h, w * 0.14, h * 0.05, w, h);
      else cam.setViewOffset(w, h, 0, h * (a > 0.9 ? 0.12 : 0.1), w, h);
      cam.updateProjectionMatrix();
    },
  };
}

const COOKIE = `<svg viewBox="0 0 100 100"><circle cx="50" cy="54" r="42" fill="#5a2e1a"/><circle cx="50" cy="48" r="42" fill="#e9a55a" stroke="#5a2e1a" stroke-width="7"/><path d="M22 34 Q34 16 56 14" stroke="#ffd59a" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="36" cy="44" r="7" fill="#5a2e1a"/><circle cx="62" cy="34" r="6" fill="#5a2e1a"/><circle cx="66" cy="60" r="8" fill="#5a2e1a"/><circle cx="42" cy="68" r="5.5" fill="#5a2e1a"/><circle cx="52" cy="50" r="3.5" fill="#5a2e1a"/></svg>`;
