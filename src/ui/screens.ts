import { ICONS } from './icons';
import { t, getLang } from '../app/i18n';
import { SHOP, ShopItem, TRAIL_NAMES, DAILY, MISSION_KEY, dailyAvailable } from '../app/meta';
import type { SaveData } from '../app/save';
import { SKINS, CAPS } from '../render/characters';
import { THEMES } from '../render/themes';
import { HOUSES } from '../game/level';

/** Menu screens & modals (DOM). */

export function modal(title: string, body: string, cls = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `modal-wrap ${cls}`;
  el.innerHTML = `<div class="modal"><div class="modal-head"><b>${title}</b><button class="round-btn small close" aria-label="${t('close')}">✕</button></div><div class="modal-body">${body}</div></div>`;
  el.querySelector('.close')!.addEventListener('click', () => el.remove());
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  return el;
}

const starRow = (n: number, size = 20) => `<span class="stars" style="--s:${size}px">${[0, 1, 2].map((i) => ICONS.star(i < n)).join('')}</span>`;

// ------------------------------------------------------------------ house map
export function houseMap(save: SaveData, onPlay: (h: number, i: number) => void, levelIds: (h: number, i: number) => string, unlocked: (h: number, i: number) => boolean): HTMLDivElement {
  const lang = getLang();
  let body = '<div class="houses">';
  HOUSES.forEach((id, h) => {
    const th = THEMES[id];
    let stars = 0,
      done = 0;
    for (let i = 0; i < 12; i++) {
      const s = save.stars[levelIds(h, i)];
      if (s !== undefined) {
        stars += s;
        done++;
      }
    }
    const open = unlocked(h, 0);
    body += `<div class="house-card ${open ? '' : 'locked'}" style="--c1:#${th.slabTop.toString(16).padStart(6, '0')};--c2:#${th.skyBottom.toString(16).padStart(6, '0')}">
      <div class="house-head"><span class="hnum">${h + 1}</span><b>${th.name[lang]}</b><span class="hstars">${ICONS.star(true)} ${stars}/36</span></div>
      <div class="nights">${Array.from({ length: 12 }, (_, i) => {
        const s = save.stars[levelIds(h, i)];
        const ok = unlocked(h, i);
        const fin = i === 11;
        return `<button class="night ${ok ? '' : 'locked'} ${s !== undefined ? 'done' : ''} ${fin ? 'finale' : ''}" data-h="${h}" data-i="${i}" ${ok ? '' : 'disabled'}><span>${fin ? '👑' : i + 1}</span>${s !== undefined ? starRow(s, 11) : ok ? '' : '🔒'}</button>`;
      }).join('')}</div>
      ${open ? '' : `<div class="lock-note">🔒 ${t('comingSoon')}</div>`}
      <div class="progress"><i style="width:${(done / 12) * 100}%"></i></div>
    </div>`;
  });
  body += '</div>';
  const el = modal(t('houses'), body, 'map-modal');
  el.querySelectorAll<HTMLButtonElement>('.night').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.disabled) return;
      el.remove();
      onPlay(+b.dataset.h!, +b.dataset.i!);
    }),
  );
  return el;
}

// ------------------------------------------------------------------ shop
export function shopScreen(save: SaveData, onChange: () => void, onBuy: (item: ShopItem) => boolean): HTMLDivElement {
  const lang = getLang();
  const el = modal(t('shop'), `<div class="coins-line">${ICONS.coin}<b class="coin-val">${save.coins}</b></div><div class="tabs"><button data-k="skin" class="on">${t('pyjamas')}</button><button data-k="cap">${t('caps')}</button><button data-k="trail">${t('trails')}</button></div><div class="shop-grid"></div>`, 'shop-modal');
  const grid = el.querySelector('.shop-grid')!;
  let kind: ShopItem['kind'] = 'skin';
  const render = () => {
    el.querySelector('.coin-val')!.textContent = String(save.coins);
    grid.innerHTML = SHOP.filter((s) => s.kind === kind)
      .map((s) => {
        const owned = save.owned.includes(s.id);
        const eq = (s.kind === 'skin' && save.skin === s.key) || (s.kind === 'cap' && save.cap === s.key) || (s.kind === 'trail' && save.trail === s.key);
        let name = '',
          swatch = '';
        if (s.kind === 'skin') {
          const sk = SKINS.find((k) => k.id === s.key)!;
          name = sk.name[lang];
          swatch = `<div class="swatch" style="background:radial-gradient(circle at 30% 30%, #${sk.b.toString(16).padStart(6, '0')} 0 18%, transparent 19%), radial-gradient(circle at 70% 65%, #${sk.b.toString(16).padStart(6, '0')} 0 14%, transparent 15%), #${sk.a.toString(16).padStart(6, '0')}"></div>`;
        } else if (s.kind === 'cap') {
          name = CAPS.find((c) => c.id === s.key)!.name[lang];
          swatch = `<div class="swatch cap">${{ classic: '🧢', bunny: '🐰', crown: '👑', propeller: '🚁', chef: '👨‍🍳' }[s.key] ?? '🧢'}</div>`;
        } else {
          name = TRAIL_NAMES[s.key][lang];
          swatch = `<div class="swatch cap">${{ none: '∅', crumbs: '🍪', stars: '✨', hearts: '💖', bubbles: '🫧' }[s.key]}</div>`;
        }
        const btn = eq ? `<span class="tag on">${t('equipped')}</span>` : owned ? `<button class="mini-btn" data-act="equip">${t('equip')}</button>` : `<button class="mini-btn buy ${save.coins < s.price ? 'poor' : ''}" data-act="buy">${ICONS.coin}${s.price}</button>`;
        return `<div class="item ${eq ? 'eq' : ''}" data-id="${s.id}">${swatch}<b>${name}</b>${btn}</div>`;
      })
      .join('');
    grid.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.closest<HTMLElement>('.item')!.dataset.id!;
        const item = SHOP.find((s) => s.id === id)!;
        if (b.dataset.act === 'buy') {
          if (!onBuy(item)) {
            b.classList.add('shake');
            setTimeout(() => b.classList.remove('shake'), 400);
            return;
          }
        } else {
          if (item.kind === 'skin') save.skin = item.key;
          else if (item.kind === 'cap') save.cap = item.key;
          else save.trail = item.key;
        }
        onChange();
        render();
      }),
    );
  };
  el.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      el.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      kind = b.dataset.k as ShopItem['kind'];
      render();
    }),
  );
  render();
  return el;
}

// ------------------------------------------------------------------ daily reward
export function dailyScreen(save: SaveData, onClaim: () => number): HTMLDivElement {
  const avail = dailyAvailable(save);
  const next = avail ? (save.daily.streak % 7) + 1 : ((save.daily.streak - 1) % 7) + 1;
  const body = `<p class="sub">${t('dailyText')}</p><div class="days">${DAILY.map(
    (c, i) => `<div class="day ${i + 1 < next || (!avail && i + 1 === next) ? 'got' : ''} ${avail && i + 1 === next ? 'today' : ''}"><small>${t('day', { n: i + 1 })}</small>${ICONS.coin}<b>${c}</b></div>`,
  ).join('')}</div><button class="big-btn claim" ${avail ? '' : 'disabled'}>${avail ? t('claim') : t('claimed')}</button>`;
  const el = modal(t('daily'), body, 'daily-modal');
  el.querySelector('.claim')!.addEventListener('click', () => {
    const c = onClaim();
    if (c > 0) {
      el.querySelector('.claim')!.textContent = `+${c}`;
      (el.querySelector('.claim') as HTMLButtonElement).disabled = true;
      el.querySelector('.today')?.classList.add('got');
    }
  });
  return el;
}

// ------------------------------------------------------------------ missions
export function missionsScreen(save: SaveData, onClaim: (i: number) => number): HTMLDivElement {
  const render = () =>
    save.missions.list
      .map((m, i) => {
        const done = m.progress >= m.n;
        return `<div class="mission ${m.claimed ? 'claimed' : done ? 'done' : ''}"><div class="m-text"><b>${t(MISSION_KEY[m.id as keyof typeof MISSION_KEY], { n: m.n })}</b><div class="bar"><i style="width:${(m.progress / m.n) * 100}%"></i></div><small>${m.progress}/${m.n}</small></div><button class="mini-btn" data-i="${i}" ${done && !m.claimed ? '' : 'disabled'}>${m.claimed ? '✓' : `${ICONS.coin}${m.reward}`}</button></div>`;
      })
      .join('');
  const el = modal(t('missionsTitle'), `<div class="missions">${render()}</div>`, 'missions-modal');
  const wire = () =>
    el.querySelectorAll<HTMLButtonElement>('.mission button').forEach((b) =>
      b.addEventListener('click', () => {
        if (onClaim(+b.dataset.i!) > 0) {
          el.querySelector('.missions')!.innerHTML = render();
          wire();
        }
      }),
    );
  wire();
  return el;
}

// ------------------------------------------------------------------ settings / pause
export function settingsScreen(save: SaveData, onChange: () => void, extra = ''): HTMLDivElement {
  const body = `<div class="settings">
    <label class="row"><span>${ICONS.sound}${t('sound')}</span><input type="checkbox" data-k="sound" ${save.sound ? 'checked' : ''}><i class="sw"></i></label>
    <label class="row"><span>🎵 ${t('music')}</span><input type="checkbox" data-k="music" ${save.music ? 'checked' : ''}><i class="sw"></i></label>
    <div class="row"><span>🌐 ${t('language')}</span><div class="lang"><b data-l="en" class="${getLang() === 'en' ? 'on' : ''}">EN</b><b data-l="fr" class="${getLang() === 'fr' ? 'on' : ''}">FR</b></div></div>
  </div>${extra}`;
  const el = modal(t('settings'), body, 'settings-modal');
  el.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((i) =>
    i.addEventListener('change', () => {
      if (i.dataset.k === 'sound') save.sound = i.checked;
      else save.music = i.checked;
      onChange();
    }),
  );
  el.querySelectorAll<HTMLElement>('.lang b').forEach((b) =>
    b.addEventListener('click', () => {
      save.lang = b.dataset.l as 'en' | 'fr';
      onChange();
    }),
  );
  return el;
}

export function pauseScreen(save: SaveData, onResume: () => void, onRestart: () => void, onMenu: () => void, onChange: () => void) {
  const el = settingsScreen(save, onChange, `<div class="pause-btns"><button class="big-btn resume">${ICONS.play} ${t('resume')}</button><div class="row2"><button class="mid-btn restart">↻ ${t('restart')}</button><button class="mid-btn menu">⌂ ${t('menu')}</button></div></div>`);
  el.classList.add('pause-modal');
  el.querySelector('.modal-head b')!.textContent = t('pause');
  el.querySelector('.close')!.addEventListener('click', onResume);
  el.querySelector('.resume')!.addEventListener('click', () => {
    el.remove();
    onResume();
  });
  el.querySelector('.restart')!.addEventListener('click', () => {
    el.remove();
    onRestart();
  });
  el.querySelector('.menu')!.addEventListener('click', () => {
    el.remove();
    onMenu();
  });
  return el;
}

// ------------------------------------------------------------------ results
export interface WinInfo {
  stars: [boolean, boolean, boolean];
  coins: number;
  time: number;
  par: number;
  newBest: boolean;
  houseDone: boolean;
  last: boolean;
}

export function winScreen(w: WinInfo, onDouble: () => Promise<boolean>, onNext: () => void, onMenu: () => void, onReplay: () => void) {
  const labels = [t('starAll'), t('starSpotted'), t('starTime', { s: w.par })];
  const el = document.createElement('div');
  el.className = 'modal-wrap result win';
  el.innerHTML = `<div class="modal result-card">
    <div class="result-title">${w.houseDone ? t('houseDone') : t('winTitle')}</div>
    <div class="big-stars">${w.stars.map((s, i) => `<div class="bs ${s ? 'on' : ''}" style="--d:${0.25 + i * 0.25}s">${ICONS.star(s)}<small>${labels[i]}</small></div>`).join('')}</div>
    <div class="reward">${ICONS.coin}<b class="coin-amt">+${w.coins}</b>${w.newBest ? `<span class="best">${t('newBest')}</span>` : ''}</div>
    <button class="ad-btn double">▶ ${t('double')}</button>
    <div class="row2">
      <button class="mid-btn menu">⌂</button>
      <button class="mid-btn replay">↻</button>
      <button class="big-btn next">${w.last ? '⌂ ' + t('menu') : t('next') + ' ▶'}</button>
    </div>
  </div>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  const dbl = el.querySelector<HTMLButtonElement>('.double')!;
  dbl.addEventListener('click', async () => {
    dbl.disabled = true;
    if (await onDouble()) {
      el.querySelector('.coin-amt')!.textContent = `+${w.coins * 2}`;
      dbl.textContent = '✓ ×2';
    } else dbl.disabled = false;
  });
  el.querySelector('.next')!.addEventListener('click', () => {
    el.remove();
    onNext();
  });
  el.querySelector('.menu')!.addEventListener('click', () => {
    el.remove();
    onMenu();
  });
  el.querySelector('.replay')!.addEventListener('click', () => {
    el.remove();
    onReplay();
  });
  return el;
}

export function failScreen(o: { bedcheck: boolean; fails: number; canSkip: boolean }, onRetry: (extraToy: boolean) => void, onSkip: () => Promise<boolean>, onToyAd: () => Promise<boolean>, onMenu: () => void) {
  const el = document.createElement('div');
  el.className = 'modal-wrap result fail';
  el.innerHTML = `<div class="modal result-card">
    <div class="result-title">${o.bedcheck ? t('bedCheckTitle') : t('caughtTitle')}</div>
    <p class="sub">${o.bedcheck ? t('bedCheckText') : t('caughtText')}</p>
    <div class="sleepy">😴</div>
    <button class="big-btn retry">↻ ${t('retry')}</button>
    <button class="ad-btn toy">▶ ${t('extraToyAd')}</button>
    ${o.canSkip ? `<button class="ad-btn skip">▶ ${t('skipAd')}</button>` : ''}
    <button class="mid-btn menu">⌂ ${t('menu')}</button>
  </div>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  let extra = false;
  el.querySelector('.retry')!.addEventListener('click', () => {
    el.remove();
    onRetry(extra);
  });
  const toy = el.querySelector<HTMLButtonElement>('.toy')!;
  toy.addEventListener('click', async () => {
    toy.disabled = true;
    if (await onToyAd()) {
      extra = true;
      toy.textContent = `✓ ${t('extraToy')}`;
    } else toy.disabled = false;
  });
  el.querySelector('.skip')?.addEventListener('click', async () => {
    if (await onSkip()) el.remove();
  });
  el.querySelector('.menu')!.addEventListener('click', () => {
    el.remove();
    onMenu();
  });
  return el;
}
