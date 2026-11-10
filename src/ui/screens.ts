import { ICONS } from './icons';
import { t, getLang, LANGS, type Lang } from '../app/i18n';
import { SHOP, ShopItem, MISSION_KEY, BOOSTS, BoostId, rewardFor, currentStreak, nextDailyDay, dailyAvailable, type DailyReward } from '../app/meta';
import { preview as sharedPreview } from './previewHandle';
import { adUnavailable } from './adButton';
export { adUnavailable };
import type { Key } from '../app/i18n';
import type { SaveData } from '../app/save';
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
      <div class="house-head"><span class="hnum">${h + 1}</span><b>${t(`house_${id}`)}</b><span class="hstars">${ICONS.star(true)} ${stars}/36</span></div>
      <div class="nights">${Array.from({ length: 12 }, (_, i) => {
        const s = save.stars[levelIds(h, i)];
        const ok = unlocked(h, i);
        const fin = i === 11;
        return `<button class="night ${ok ? '' : 'locked'} ${s !== undefined ? 'done' : ''} ${fin ? 'finale' : ''}" data-h="${h}" data-i="${i}" ${ok ? '' : 'disabled'}><span>${fin ? ICONS.crown : i + 1}</span>${s !== undefined ? starRow(s, 11) : ok ? '' : `<i class="lock-ic">${ICONS.lock}</i>`}</button>`;
      }).join('')}</div>
      ${open ? '' : `<div class="lock-note">${ICONS.lock} ${t('comingSoon')}</div>`}
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
type ShopTab = 'boost' | ShopItem['kind'];

export function shopScreen(save: SaveData, onChange: () => void, onBuy: (item: ShopItem) => boolean, onBuyBoost: (id: BoostId) => boolean): HTMLDivElement {
  const el = modal(
    t('shop'),
    `<div class="coins-line">${ICONS.coin}<b class="coin-val">${save.coins}</b></div>
     <div class="tabs"><button data-k="boost" class="on">${t('boosts')}</button><button data-k="skin">${t('pyjamas')}</button><button data-k="cap">${t('caps')}</button><button data-k="trail">${t('trails')}</button></div>
     <div class="shop-stage"><div class="stage-view"></div><div class="stage-info"><small>${t('tryOn')}</small><b class="try-name"></b><div class="try-act"></div></div></div>
     <div class="shop-grid"></div>`,
    'shop-modal',
  );
  const grid = el.querySelector<HTMLElement>('.shop-grid')!;
  const stage = el.querySelector<HTMLElement>('.shop-stage')!;
  const preview = sharedPreview();
  if (preview) el.querySelector('.stage-view')!.appendChild(preview.canvas);
  let tab: ShopTab = 'boost';
  // try-on: what Pip wears in the preview (equipped items until you tap another one)
  const look = { skin: save.skin, cap: save.cap, trail: save.trail };
  const keyOf = (k: ShopItem['kind']) => (k === 'skin' ? 'skin' : k === 'cap' ? 'cap' : 'trail') as 'skin' | 'cap' | 'trail';
  const equipped = (it: ShopItem) => save[keyOf(it.kind)] === it.key;
  const nameOf = (it: ShopItem) => t(`${it.kind}_${it.key}`);
  const thumbFor = (it: ShopItem) => {
    if (!preview) return '';
    const l = { skin: save.skin, cap: save.cap, trail: 'none' };
    l[keyOf(it.kind)] = it.key;
    return preview.thumb(l, 112);
  };
  const stageSize = () => Math.round(Math.min(200, window.innerHeight * 0.26));
  const renderStage = () => {
    if (tab === 'boost') return;
    const it = SHOP.find((x) => x.kind === tab && x.key === look[keyOf(tab)])!;
    el.querySelector('.try-name')!.textContent = nameOf(it);
    const act = el.querySelector<HTMLElement>('.try-act')!;
    const owned = save.owned.includes(it.id);
    act.innerHTML = equipped(it) ? `<span class="tag on">${t('equipped')}</span>` : owned ? `<button class="mini-btn" data-act="equip">${t('equip')}</button>` : `<button class="mini-btn buy ${save.coins < it.price ? 'poor' : ''}" data-act="buy">${ICONS.coin}${it.price}</button>`;
    act.querySelector('button')?.addEventListener('click', (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      if (b.dataset.act === 'buy') {
        if (!onBuy(it)) {
          b.classList.add('shake');
          setTimeout(() => b.classList.remove('shake'), 400);
          return;
        }
      } else save[keyOf(it.kind)] = it.key;
      onChange();
      render();
    });
    preview?.setLook(look);
  };
  const render = () => {
    el.querySelector('.coin-val')!.textContent = String(save.coins);
    stage.style.display = tab === 'boost' || !preview ? 'none' : '';
    if (tab === 'boost') {
      grid.className = 'shop-grid boost-list';
      grid.innerHTML = BOOSTS.map(
        (b) => `<div class="boost-row" data-id="${b.id}">
          <img alt="" src="${preview?.boostThumb(b.id, 112) ?? ''}">
          <div class="b-text"><b>${t(`b_${b.id}` as Key)}</b><small>${t(`b_${b.id}_d` as Key)}</small><em>${t('owned', { n: save.items[b.id] })}</em></div>
          <button class="mini-btn buy ${save.coins < b.price ? 'poor' : ''}">${ICONS.coin}${b.price}</button>
        </div>`,
      ).join('');
      grid.querySelectorAll<HTMLButtonElement>('.boost-row button').forEach((btn) =>
        btn.addEventListener('click', () => {
          const id = btn.closest<HTMLElement>('.boost-row')!.dataset.id as BoostId;
          if (!onBuyBoost(id)) {
            btn.classList.add('shake');
            setTimeout(() => btn.classList.remove('shake'), 400);
            return;
          }
          onChange();
          render();
        }),
      );
      return;
    }
    grid.className = 'shop-grid';
    grid.innerHTML = SHOP.filter((x) => x.kind === tab)
      .map((it) => {
        const owned = save.owned.includes(it.id);
        const trying = look[keyOf(it.kind)] === it.key;
        const state = equipped(it) ? `<span class="tag on">${t('equipped')}</span>` : owned ? `<span class="tag">${t('equip')}</span>` : `<span class="price">${ICONS.coin}${it.price}</span>`;
        const pic = preview ? `<img alt="" src="${thumbFor(it)}">` : `<div class="swatch"></div>`;
        return `<button class="item ${trying ? 'trying' : ''} ${equipped(it) ? 'eq' : ''}" data-id="${it.id}">${pic}<b>${nameOf(it)}</b>${state}</button>`;
      })
      .join('');
    grid.querySelectorAll<HTMLButtonElement>('.item').forEach((b) =>
      b.addEventListener('click', () => {
        const it = SHOP.find((x) => x.id === b.dataset.id)!;
        look[keyOf(it.kind)] = it.key; // try it on
        render();
      }),
    );
    renderStage();
    preview?.start(stageSize());
  };
  el.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      el.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      tab = b.dataset.k as ShopTab;
      render();
    }),
  );
  el.querySelector('.close')!.addEventListener('click', () => preview?.stop());
  render();
  return el;
}

// ------------------------------------------------------------------ rewarded-ad label
/** every rewarded-ad button: a TV icon + "Ad", then what it gives */
export const adLabel = (text: string) => `<span class="ad-tag">${ICONS.tv}<small>${t('ad')}</small></span><span class="ad-text">${text}</span>`;

// ------------------------------------------------------------------ daily reward calendar
/** picture of a calendar reward: coins, or the day-7 pyjama (rendered Pip) */
export function rewardPic(r: DailyReward, size = 72) {
  if (r.skin) {
    const img = sharedPreview()?.thumb({ skin: r.skin.split(':')[1], cap: 'classic', trail: 'none' }, size * 2);
    return img ? `<img class="pj" alt="" src="${img}">` : ICONS.gift;
  }
  return `${ICONS.coin}<b>${r.coins}</b>`;
}

export function dailyScreen(save: SaveData, onClaim: () => DailyReward | null): HTMLDivElement {
  const avail = dailyAvailable(save);
  const next = nextDailyDay(save);
  const streak = currentStreak(save);
  const days = [1, 2, 3, 4, 5, 6, 7]
    .map((d) => {
      const r = rewardFor(save, d);
      // claimed this week: the days before the next one (a week just completed today shows all 7)
      const got = d < next || (!avail && next === 1);
      const cls = `${got ? 'got' : ''} ${avail && d === next ? 'today' : ''} ${!avail && d === next ? 'tomorrow' : ''} ${d === 7 ? 'big' : ''}`;
      return `<div class="day ${cls}"><small>${t('day', { n: d })}</small>${rewardPic(r)}${d === 7 && r.skin ? `<em>${t('dailySpecial')}</em>` : ''}</div>`;
    })
    .join('');
  const body = `<div class="streak-line">${ICONS.flame}<b>${t('streak')}: ${t('streakDays', { n: streak })}</b></div>
    <p class="sub">${avail ? t('dailyReady') : t('tomorrow')}</p>
    <div class="days">${days}</div>
    <button class="big-btn claim" ${avail ? '' : 'disabled'}>${avail ? t('claim') : t('claimed')}</button>`;
  const el = modal(t('daily'), body, 'daily-modal');
  el.querySelector('.claim')!.addEventListener('click', () => {
    const r = onClaim();
    if (!r) return;
    const btn = el.querySelector<HTMLButtonElement>('.claim')!;
    btn.innerHTML = r.skin ? `✓ ${t('skin_moon')}` : `+${r.coins} ${ICONS.coin}`;
    btn.disabled = true;
    el.querySelector('.today')?.classList.add('got');
    el.querySelector('.streak-line b')!.textContent = `${t('streak')}: ${t('streakDays', { n: currentStreak(save) })}`;
  });
  return el;
}

// ------------------------------------------------------------------ end-screen retention strip
export interface StripInfo {
  /** next unlock: picture, name, "N more nights to unlock" */
  teaser: { img: string; name: string; line: string } | null;
  /** the next daily reward (today's if unclaimed) */
  daily: DailyReward & { today: boolean };
  streak: number;
}

/** next-unlock teaser + "come back tomorrow for X" / "your daily gift is ready" (+ streak) */
export function retentionStrip(o: StripInfo) {
  const tz = o.teaser
    ? `<div class="teaser"><img alt="" src="${o.teaser.img}"><div><small>${t('nextUnlock')}</small><b>${o.teaser.name}</b><span>${o.teaser.line}</span></div></div>`
    : '';
  const d = `<button class="daily-peek ${o.daily.today ? 'ready' : ''}" data-act="daily"><span class="dp-pic">${rewardPic(o.daily, 40)}</span><span class="dp-text"><small>${ICONS.flame}${t('streak')}: ${o.streak}</small><b>${o.daily.today ? t('dailyReady') : t('tomorrow')}</b>${o.daily.skin ? `<em>${t('skin_moon')}</em>` : ''}</span></button>`;
  return `<div class="strip">${tz}${d}</div>`;
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
/** each language's own name (the `langName` string of its JSON file, copied here so the list needs no extra loads) */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', es: 'Español', pt: 'Português', nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe', ru: 'Русский' };

export function settingsScreen(save: SaveData, onChange: () => void, extra = ''): HTMLDivElement {
  const body = `<div class="settings">
    <label class="row"><span>${ICONS.sound}${t('sound')}</span><input type="checkbox" data-k="sound" ${save.sound ? 'checked' : ''}><i class="sw"></i></label>
    <label class="row"><span>${ICONS.music}${t('music')}</span><input type="checkbox" data-k="music" ${save.music ? 'checked' : ''}><i class="sw"></i></label>
    <div class="row lang-row"><span>${ICONS.globe}${t('language')}</span></div>
    <div class="lang-grid">${LANGS.map((l) => `<button data-l="${l}" class="${getLang() === l ? 'on' : ''}">${LANG_NAMES[l]}</button>`).join('')}</div>
  </div>${extra}`;
  const el = modal(t('settings'), body, 'settings-modal');
  el.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((i) =>
    i.addEventListener('change', () => {
      if (i.dataset.k === 'sound') save.sound = i.checked;
      else save.music = i.checked;
      onChange();
    }),
  );
  el.querySelectorAll<HTMLElement>('.lang-grid button').forEach((b) =>
    b.addEventListener('click', () => {
      save.lang = b.dataset.l as Lang;
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
  /** retention strip under the reward */
  strip?: string;
  /** midnight snack: no stars, its own title */
  snack?: { cookies: number };
  /** rewarded ads can be offered (the platform has them) */
  ads?: boolean;
}

export function winScreen(w: WinInfo, onDouble: () => Promise<boolean>, onNext: () => void, onMenu: () => void, onReplay: () => void) {
  const labels = [t('starAll'), t('starSpotted'), t('starTime', { s: w.par })];
  const el = document.createElement('div');
  el.className = 'modal-wrap result win';
  el.innerHTML = `<div class="modal result-card">
    <div class="result-title">${w.snack ? t('snackWin') : w.stars.every(Boolean) ? t('perfect') : w.houseDone ? t('houseDone') : t('winTitle')}</div>
    ${w.snack ? `<div class="snack-got">${ICONS.cookie(true)}<b>${t('snackCookies', { n: w.snack.cookies })}</b></div>` : `<div class="big-stars">${w.stars.map((s, i) => `<div class="bs ${s ? 'on' : ''}" style="--d:${0.25 + i * 0.25}s">${ICONS.star(s)}<small>${labels[i]}</small></div>`).join('')}</div>`}
    <div class="reward">${ICONS.coin}<b class="coin-amt">+${w.coins}</b>${w.newBest ? `<span class="best">${t('newBest')}</span>` : ''}</div>
    ${w.ads === false ? '' : `<button class="ad-btn double">${adLabel(t('double'))}</button>`}
    <div class="row2">
      <button class="mid-btn menu" aria-label="${t('menu')}">⌂</button>
      ${w.snack ? '' : `<button class="mid-btn replay" aria-label="${t('retry')}">↻</button>`}
      <button class="big-btn next">${w.last || w.snack ? '⌂ ' + t('menu') : t('next') + ' ▶'}</button>
    </div>
    ${w.strip ?? ''}
  </div>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  const dbl = el.querySelector<HTMLButtonElement>('.double');
  dbl?.addEventListener('click', async () => {
    if (!dbl) return;
    const label = dbl.innerHTML;
    dbl.disabled = true;
    if (await onDouble()) {
      el.querySelector('.coin-amt')!.textContent = `+${w.coins * 2}`;
      dbl.textContent = '✓ ×2';
    } else adUnavailable(dbl, label);
  });
  el.querySelector('.next')!.addEventListener('click', () => {
    el.remove();
    onNext();
  });
  el.querySelector('.menu')!.addEventListener('click', () => {
    el.remove();
    onMenu();
  });
  el.querySelector('.replay')?.addEventListener('click', () => {
    el.remove();
    onReplay();
  });
  return el;
}

export function failScreen(o: { bedcheck: boolean; fails: number; canSkip: boolean; freeHint?: boolean; strip?: string; ads?: boolean }, onRetry: (extraToy: boolean, hint: boolean) => void, onSkip: () => Promise<boolean>, onToyAd: () => Promise<boolean>, onMenu: () => void) {
  const el = document.createElement('div');
  el.className = 'modal-wrap result fail';
  el.innerHTML = `<div class="modal result-card">
    <div class="result-title">${o.bedcheck ? t('bedCheckTitle') : t('caughtTitle')}</div>
    <p class="sub">${o.bedcheck ? t('bedCheckText') : t('caughtText')}</p>
    <div class="sleepy">${ICONS.moon}</div>
    ${o.freeHint ? `<button class="big-btn hint-retry">${ICONS.bulb}<span>${t('retryHint')}</span></button>` : ''}
    <button class="${o.freeHint ? 'mid-btn' : 'big-btn'} retry">↻ ${t('retry')}</button>
    ${o.ads === false ? '' : `<button class="ad-btn toy">${adLabel(t('extraToyAd'))}</button>`}
    ${o.canSkip && o.ads !== false ? `<button class="ad-btn skip">${adLabel(t('skipAd'))}</button>` : ''}
    <button class="mid-btn menu">⌂ ${t('menu')}</button>
    ${o.strip ?? ''}
  </div>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  let extra = false;
  el.querySelector('.retry')!.addEventListener('click', () => {
    el.remove();
    onRetry(extra, false);
  });
  el.querySelector('.hint-retry')?.addEventListener('click', () => {
    el.remove();
    onRetry(extra, true);
  });
  const toy = el.querySelector<HTMLButtonElement>('.toy');
  toy?.addEventListener('click', async () => {
    if (!toy) return;
    const label = toy.innerHTML;
    toy.disabled = true;
    if (await onToyAd()) {
      extra = true;
      toy.textContent = `✓ ${t('extraToy')}`;
    } else adUnavailable(toy, label);
  });
  const skip = el.querySelector<HTMLButtonElement>('.skip');
  skip?.addEventListener('click', async () => {
    // disabled while the ad is requested (no double requests)
    const label = skip.innerHTML;
    skip.disabled = true;
    if (await onSkip()) el.remove();
    else adUnavailable(skip, label);
  });
  el.querySelector('.menu')!.addEventListener('click', () => {
    el.remove();
    onMenu();
  });
  return el;
}
