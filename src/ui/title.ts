import { ICONS } from './icons';

/** Title screen overlay: logo, play, meta buttons, language switch. */
export function buildTitle() {
  const el = document.createElement('div');
  el.className = 'title-ui';
  el.innerHTML = `
    <div class="title-top">
      <div class="coins chip">${ICONS.coin}<b>1,250</b><span class="plus">+</span></div>
      <div class="top-right">
        <button class="round-btn small gift" aria-label="Daily reward">${ICONS.gift}<i class="dot"></i></button>
        <button class="round-btn small" aria-label="Sound">${ICONS.sound}</button>
        <button class="round-btn small" aria-label="Settings">${ICONS.gear}</button>
        <div class="lang"><b class="on">EN</b><b>FR</b></div>
      </div>
    </div>
    <div class="logo">
      <div class="logo-line l1"><span>C</span>${cookieO()}<span>O</span><span>K</span><span>I</span><span>E</span></div>
      <div class="logo-line l2"><span>H</span><span>E</span><span>I</span><span>S</span><span>T</span></div>
      <div class="tagline">Sneak · Snack · Snooze</div>
    </div>
    <div class="title-bottom">
      <button class="play-btn"><span class="pi">${ICONS.play}</span><span><b>PLAY</b><small>Family House · Night 3</small></span></button>
      <div class="menu-row">
        <button class="menu-btn"><span class="mi shop">${ICONS.bag}</span><b>Shop</b></button>
        <button class="menu-btn"><span class="mi map">${ICONS.map}</span><b>Houses</b></button>
        <button class="menu-btn"><span class="mi missions"><svg viewBox="0 0 48 48"><rect x="9" y="6" width="30" height="36" rx="5" fill="currentColor"/><path d="M15 17l3 3 5-6M15 28l3 3 5-6" stroke="#2a1a33" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 18h7M27 29h7" stroke="#2a1a33" stroke-width="3.5" stroke-linecap="round"/></svg></span><b>Missions</b><i class="badge">2</i></button>
      </div>
    </div>
  `;
  return el;
}

function cookieO() {
  return `<span class="cookie-o"><svg viewBox="0 0 100 100">
    <circle cx="50" cy="54" r="42" fill="#5a2e1a"/>
    <circle cx="50" cy="48" r="42" fill="#e9a55a" stroke="#5a2e1a" stroke-width="7"/>
    <path d="M22 34 Q34 16 56 14" stroke="#ffd59a" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="36" cy="44" r="7" fill="#5a2e1a"/><circle cx="62" cy="34" r="6" fill="#5a2e1a"/>
    <circle cx="66" cy="60" r="8" fill="#5a2e1a"/><circle cx="42" cy="68" r="5.5" fill="#5a2e1a"/><circle cx="52" cy="50" r="3.5" fill="#5a2e1a"/>
    <path d="M86 30 l8 -4 M88 44 l9 0" stroke="#fff4dc" stroke-width="5" stroke-linecap="round"/>
  </svg></span>`;
}
