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
