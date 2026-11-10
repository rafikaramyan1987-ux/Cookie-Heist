import { ICONS } from './icons';
import { t } from '../app/i18n';

export interface TitleInfo {
  coins?: number;
  sub?: string;
  /** daily reward ready: pulsing badge */
  dailyReady?: boolean;
  streak?: number;
  /** daily missions: done / total, overall progress 0..1, rewards waiting */
  missions?: { done: number; total: number; frac: number; claimable: number };
  soundOn?: boolean;
  /** midnight snack: available today (true), played today (false), not yet unlocked (undefined) */
  snack?: boolean;
}

/** Title screen overlay: logo, play, daily gift (pulsing when ready), missions progress, midnight snack, menus. */
export function buildTitle(o: TitleInfo = {}) {
  const el = document.createElement('div');
  el.className = 'title-ui';
  const m = o.missions ?? { done: 0, total: 3, frac: 0, claimable: 0 };
  el.innerHTML = `
    <div class="title-top">
      <div class="top-left-chips">
        <div class="coins chip">${ICONS.coin}<b>${(o.coins ?? 0).toLocaleString('en-US')}</b></div>
        ${o.streak ? `<div class="chip streak-chip">${ICONS.flame}<b>${o.streak}</b></div>` : ''}
      </div>
      <div class="top-right">
        <button class="round-btn small ${o.soundOn === false ? 'off' : ''}" data-act="sound" aria-label="${t('sound')}">${ICONS.sound}</button>
        <button class="round-btn small" data-act="settings" aria-label="${t('settings')}">${ICONS.gear}</button>
      </div>
    </div>
    <div class="logo">
      <div class="logo-line l1"><span>C</span>${cookieO()}<span>O</span><span>K</span><span>I</span><span>E</span></div>
      <div class="logo-line l2"><span>H</span><span>E</span><span>I</span><span>S</span><span>T</span></div>
      <div class="tagline">${t('tagline')}</div>
    </div>
    <div class="title-bottom">
      <div class="side-row">
        <button class="side-btn daily ${o.dailyReady ? 'ready' : ''}" data-act="daily">${ICONS.gift}<span><b>${t('daily')}</b><small>${o.dailyReady ? t('dailyReady') : `${t('streak')}: ${o.streak ?? 0}`}</small></span>${o.dailyReady ? '<i class="badge pulse">!</i>' : ''}</button>
        ${
          o.snack === undefined
            ? ''
            : `<button class="side-btn snack ${o.snack ? 'ready' : 'used'}" data-act="snack" ${o.snack ? '' : 'disabled'}>${ICONS.moon}<span><b>${t('snackTitle')}</b><small>${o.snack ? t('snackSub') : t('snackDone')}</small></span>${o.snack ? '<i class="badge pulse">★</i>' : ''}</button>`
        }
      </div>
      <button class="play-btn" data-act="play"><span class="pi">${ICONS.play}</span><span><b>${t('play')}</b><small>${o.sub ?? ''}</small></span></button>
      <button class="missions-bar" data-act="missions"><span class="mb-head"><b>${t('missionsTitle')}</b><em>${m.done}/${m.total}</em></span><span class="bar"><i style="width:${Math.round(m.frac * 100)}%"></i></span>${m.claimable ? `<i class="badge pulse">${m.claimable}</i>` : ''}</button>
      <div class="menu-row">
        <button class="menu-btn" data-act="shop"><span class="mi shop">${ICONS.bag}</span><b>${t('shop')}</b></button>
        <button class="menu-btn" data-act="map"><span class="mi map">${ICONS.map}</span><b>${t('houses')}</b></button>
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

/** space kept between the logo, the top bar, the button column and the screen edges (px) */
const FIT_GAP = 14;

/**
 * Fit the logo and the button column on the title screen so they never overlap and every button stays on screen,
 * at any size and aspect. The logo keeps its CSS size and place when there is room; otherwise it shrinks into the
 * space between the top bar and the buttons (the buttons shrink a little too when the logo would get too small). On
 * short landscape screens (phones held sideways) the logo moves beside the button column. Call after the title is in
 * the DOM and on every resize.
 */
export function fitTitle(el: HTMLElement, w: number, h: number) {
  const logo = el.querySelector<HTMLElement>('.logo');
  const top = el.querySelector<HTMLElement>('.title-top');
  const bottom = el.querySelector<HTMLElement>('.title-bottom');
  if (!logo || !top || !bottom) return;
  const portrait = h > w;
  const base = el.getBoundingClientRect();
  // back to the CSS layout, then measure it
  for (const e of [logo, bottom]) e.removeAttribute('style');
  const rel = (r: DOMRect) => ({ l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top, w: r.width, h: r.height });
  const topEnd = rel(top.getBoundingClientRect()).b + FIT_GAP;
  const nb = rel(bottom.getBoundingClientRect());
  const floor = nb.b; // the button column's bottom edge stays where the CSS puts it
  const bw = bottom.offsetWidth,
    bh = bottom.offsetHeight;

  // the button column: never taller than the screen below the top bar, never wider than the screen
  let sB = Math.min(1, (floor - topEnd) / bh, (portrait ? w - 2 * FIT_GAP : w - nb.l - FIT_GAP) / bw);
  const placeBottom = (s: number) => {
    bottom.style.transform = portrait ? `translateX(-50%) scale(${s})` : `scale(${s})`;
    bottom.style.transformOrigin = portrait ? '50% 100%' : '0 100%';
  };
  // the logo, scaled about its own top-left (landscape) / top-centre (portrait) corner, then moved to (x, y)
  const placeLogo = (s: number, x: number | null, y: number) => {
    logo.style.transformOrigin = portrait ? '50% 0' : '0 0';
    logo.style.transform = `${portrait ? 'translateX(-50%) ' : ''}rotate(-4deg) scale(${s})`;
    logo.style.top = `${y}px`;
    if (x !== null) logo.style.left = `${x}px`;
    // the rotated box: shift it so its visible top sits at y
    const r = rel(logo.getBoundingClientRect());
    logo.style.top = `${y + (y - r.t)}px`;
    if (x !== null) logo.style.left = `${x + (x - r.l)}px`;
    return rel(logo.getBoundingClientRect());
  };
  /** the largest logo scale (≤ max) whose box fits the region, with the box's top-left at the region's top-left */
  const fitLogo = (x: number | null, y: number, maxR: number, maxB: number, max = 1) => {
    let s = max;
    let r = placeLogo(s, x, y);
    for (let i = 0; i < 6 && (r.b > maxB + 0.5 || r.r > maxR + 0.5); i++) {
      s *= Math.min((maxB - y) / r.h, (maxR - r.l) / r.w) * 0.995;
      r = placeLogo(s, x, y);
    }
    return { s, r };
  };

  placeBottom(sB);
  let colTop = floor - bh * sB - FIT_GAP;
  const natural = rel(logo.getBoundingClientRect());
  // room as laid out by the CSS: nothing to do
  if (sB === 1 && natural.t >= topEnd && natural.b <= colTop && natural.r <= w - FIT_GAP) return;

  const maxR = w - FIT_GAP;
  let fit = fitLogo(null, Math.max(topEnd, Math.min(natural.t, colTop - natural.h)), maxR, colTop);
  // the logo got small: give it some of the buttons' height (down to 80 %)
  if (fit.s < 0.7 && sB > 0.8) {
    sB = Math.max(0.8, Math.min(sB, (floor - topEnd - FIT_GAP - fit.r.h * (0.7 / fit.s)) / bh));
    placeBottom(sB);
    colTop = floor - bh * sB - FIT_GAP;
    fit = fitLogo(null, topEnd, maxR, colTop);
  }
  if (portrait || fit.s >= 0.45) return;

  // short landscape screen: buttons on the left at full available height, logo centred in the space to their right
  sB = Math.min(1, (floor - topEnd) / bh, (w * 0.55 - nb.l) / bw);
  placeBottom(sB);
  const colRight = nb.l + bw * sB + FIT_GAP;
  const region = { l: colRight, t: topEnd, r: maxR, b: floor };
  // beside the buttons the logo stays modest (it shares the screen with the scene)
  const side = fitLogo(region.l, region.t, region.r, region.b, 0.65);
  // centre it in the region
  const dx = (region.r - side.r.r) / 2;
  const dy = (region.b - side.r.b) / 2;
  logo.style.left = `${parseFloat(logo.style.left) + dx}px`;
  logo.style.top = `${parseFloat(logo.style.top) + dy}px`;
}
