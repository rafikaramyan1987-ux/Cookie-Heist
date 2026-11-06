import { ICONS } from './icons';

/** Level intro card shown over the full-level overview before the camera zooms to the kid. */
export function buildIntro(o: { house: string; night: number; name: string; cookies: number; par: number }) {
  const el = document.createElement('div');
  el.className = 'intro-ui';
  el.innerHTML = `
    <div class="intro-head">
      <div class="intro-house">${o.house} · Night ${o.night}</div>
      <div class="intro-name">${o.name}</div>
    </div>
    <div class="intro-goals">
      <div class="goal">${ICONS.cookie(true)}<span>Grab <b>${o.cookies}</b> cookies</span></div>
      <div class="goal arrow">➜</div>
      <div class="goal"><span class="bed-ic">🛏</span><span>Back to <b>bed</b></span></div>
    </div>
    <div class="intro-stars">
      <div>${ICONS.star(true)}<span>All cookies</span></div>
      <div>${ICONS.star(true)}<span>Never spotted</span></div>
      <div>${ICONS.star(false)}<span>Under ${o.par}s</span></div>
    </div>
    <div class="intro-tap">Tap to start</div>
  `;
  return el;
}
