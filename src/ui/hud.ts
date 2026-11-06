import { ICONS } from './icons';

/** In-game HUD (DOM overlay): level chip, cookie slots, timer, pause, toy button, joystick, tips. */
export interface HudState {
  house: number;
  level: number;
  cookies: number;
  total: number;
  time: number;
  toys: number;
  coins: number;
}

export function buildHud(s: HudState) {
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML = `
    <div class="alert-vignette suspicious"></div>
    <div class="hud-top">
      <div class="chip level-chip">${ICONS.moon}<div><small>House ${s.house}</small><b>Night ${s.level}</b></div></div>
      <div class="cookie-bar">
        ${Array.from({ length: s.total }, (_, i) => `<div class="slot ${i < s.cookies ? 'got' : ''}">${ICONS.cookie(i < s.cookies)}</div>`).join('')}
      </div>
      <button class="round-btn pause" aria-label="Pause">${ICONS.pause}</button>
    </div>
    <div class="hud-sub">
      <div class="chip timer"><span class="clock"></span><b>0:${String(Math.floor(s.time)).padStart(2, '0')}</b><i>/ 0:35</i></div>
      <div class="chip stealth">${ICONS.eye}<b>Hmm?</b></div>
    </div>
    <div class="tip-card">
      <div class="tip-icon">${ICONS.creak}</div>
      <div class="tip-text"><small>NEW!</small><b>Creaky boards</b><span>Tiptoe over them — running makes them squeak!</span></div>
    </div>
    <div class="joystick">
      <div class="joy-run"></div>
      <div class="joy-tip"></div>
      <div class="joy-knob"></div>
      <div class="joy-label">tiptoe</div>
    </div>
    <button class="toy-btn" aria-label="Throw toy">
      <div class="toy-ring"></div>
      ${ICONS.duck}
      <span class="toy-count">×${s.toys}</span>
    </button>
  `;
  return {
    el,
    layout(w: number, h: number) {
      el.classList.toggle('portrait', h > w);
    },
    update(t: number) {
      const k = el.querySelector('.joy-knob') as HTMLElement;
      k.style.transform = `translate(${-26 + Math.sin(t) * 2}px, ${-18 + Math.cos(t) * 2}px)`;
    },
  };
}
