import { ICONS } from './icons';
import { t } from '../app/i18n';

/** Level intro card shown over the full-level overview before the camera zooms to the kid. */
export interface IntroBoost {
  id: string;
  name: string;
  count: number;
  img: string;
  on: boolean;
}

export function buildIntro(o: { house: string; night: number; name: string; cookies: number; bonus?: boolean; par: number; touch?: boolean; boosts?: IntroBoost[]; hint?: boolean; onBoost?: (id: string, chip: HTMLElement) => void }) {
  const el = document.createElement('div');
  el.className = 'intro-ui';
  el.innerHTML = `
    <div class="intro-head">
      <div class="intro-house">${o.house} · ${t('night')} ${o.night}</div>
      <div class="intro-name">${o.name}</div>
      ${o.hint ? `<div class="intro-hint">${ICONS.bulb}<span>${t('hintTitle')}</span></div>` : ''}
      ${
        o.boosts && o.boosts.length
          ? `<div class="intro-boosts"><small>${t('useBoost')}</small><div class="chips">${o.boosts
              .map((b) => `<button class="boost-chip ${b.on ? 'on' : ''}" data-b="${b.id}"><img alt="" src="${b.img}"><span>${b.name}</span><i>×${b.count}</i></button>`)
              .join('')}</div></div>`
          : ''
      }
    </div>
    <div class="intro-goals">
      <div class="goal">${ICONS.cookie(true)}<span>${t('grab', { n: o.cookies }).replace(String(o.cookies), `<b>${o.cookies}</b>`)}${o.bonus ? ` <em class="bonus-tag">${t('plusBonus')}</em>` : ''}</span></div>
      <div class="goal arrow">➜</div>
      <div class="goal"><span class="bed-ic">${ICONS.bed}</span><span><b>${t('backToBed')}</b></span></div>
    </div>
    <div class="intro-stars">
      <div>${ICONS.star(true)}<span>${t('starAll')}</span></div>
      <div>${ICONS.star(true)}<span>${t('starSpotted')}</span></div>
      <div>${ICONS.star(true)}<span>${t('starTime', { s: o.par })}</span></div>
    </div>
    <div class="intro-tap">${o.touch === false ? t('clickToStart') : t('tapToStart')}</div>
  `;
  el.querySelectorAll<HTMLElement>('.boost-chip').forEach((c) => {
    c.addEventListener('pointerdown', (e) => e.stopPropagation());
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      o.onBoost?.(c.dataset.b!, c);
    });
  });
  return el;
}
