import { ICONS } from './icons';
import { t } from '../app/i18n';

/** Level intro card shown over the full-level overview before the camera zooms to the kid. */
export function buildIntro(o: { house: string; night: number; name: string; cookies: number; par: number; touch?: boolean }) {
  const el = document.createElement('div');
  el.className = 'intro-ui';
  el.innerHTML = `
    <div class="intro-head">
      <div class="intro-house">${o.house} · ${t('night')} ${o.night}</div>
      <div class="intro-name">${o.name}</div>
    </div>
    <div class="intro-goals">
      <div class="goal">${ICONS.cookie(true)}<span>${t('grab', { n: o.cookies }).replace(String(o.cookies), `<b>${o.cookies}</b>`)}</span></div>
      <div class="goal arrow">➜</div>
      <div class="goal"><span class="bed-ic">🛏</span><span><b>${t('backToBed')}</b></span></div>
    </div>
    <div class="intro-stars">
      <div>${ICONS.star(true)}<span>${t('starAll')}</span></div>
      <div>${ICONS.star(true)}<span>${t('starSpotted')}</span></div>
      <div>${ICONS.star(true)}<span>${t('starTime', { s: o.par })}</span></div>
    </div>
    <div class="intro-tap">${o.touch === false ? t('clickToStart') : t('tapToStart')}</div>
  `;
  return el;
}
