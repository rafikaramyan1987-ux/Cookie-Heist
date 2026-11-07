import { ICONS } from './icons';
import { t, TIPS, getLang } from '../app/i18n';
import type { Joy } from '../app/input';

export interface HudInit {
  houseName: string;
  night: number;
  total: number;
  need: number;
  par: number;
  toys: number;
  bedCheck: number;
  hasKeys: boolean;
  hasPillow: boolean;
  touch: boolean;
  toyPickups?: number;
  /** index of the golden bonus cookie, -1 if none */
  bonus: number;
}

export interface HudFrame {
  time: number;
  cookies: boolean[];
  alert: 'calm' | 'sus' | 'chase';
  hidden: boolean;
  toys: number;
  keys: number;
  decoy: boolean;
  joy: Joy;
  joyRadius: number;
  aiming: boolean;
  running: boolean;
  moving: boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Live in-game HUD. */
export class GameHud {
  readonly el = document.createElement('div');
  onPause = () => {};
  onToy = () => {};
  onZoom = (_on: boolean) => {};
  private slots: HTMLElement[] = [];
  private timerEl: HTMLElement;
  private alertEl: HTMLElement;
  private vign: HTMLElement;
  private toyBtn: HTMLButtonElement;
  private toyCount: HTMLElement;
  private joyEl: HTMLElement;
  private knob: HTMLElement;
  private joyLabel: HTMLElement;
  private tipEl: HTMLElement;
  private keyChip: HTMLElement;
  private bedChip: HTMLElement;
  private toastEl: HTMLElement;
  private shoutEl: HTMLElement;
  private aimHint: HTMLElement;
  private lastCookies = 0;
  private tipTimer = 0;

  constructor(private o: HudInit) {
    const el = this.el;
    el.className = 'hud live';
    el.innerHTML = `
      <div class="alert-vignette"></div>
      <div class="hud-top">
        <div class="chip level-chip">${ICONS.moon}<div><small>${o.houseName}</small><b>${t('night')} ${o.night}</b></div></div>
        <div class="cookie-bar">${Array.from({ length: o.need }, () => `<div class="slot">${ICONS.cookie(false)}</div>`).join('')}${o.bonus >= 0 ? `<div class="slot bonus-slot">${ICONS.goldCookie(false)}</div>` : ''}</div>
        <button class="round-btn pause" aria-label="Pause">${ICONS.pause}</button>
      </div>
      <div class="hud-sub">
        <div class="chip timer"><span class="clock"></span><b>0:00</b><i>/ ${fmt(o.par)}</i></div>
        <div class="chip stealth calm">${ICONS.eye}<b></b></div>
        <div class="chip key-chip hidden-chip">🔑<b>${t('key')}</b></div>
        <div class="chip bed-chip ${o.bedCheck ? '' : 'hidden-chip'}">⏰<b></b></div>
      </div>
      <div class="tip-card hidden-tip"><div class="tip-icon"></div><div class="tip-text"><small>${t('newTip')}</small><b></b><span></span></div></div>
      <div class="edge-arrows"></div>
      <div class="toast"></div>
      <div class="shout"></div>
      <div class="aim-hint">${t('aim')}</div>
      <div class="joystick hidden-joy"><div class="joy-run"></div><div class="joy-tip"></div><div class="joy-knob"></div><div class="joy-label">${t('tiptoe')}</div></div>
      <button class="round-btn zoom" aria-label="Map">${ICONS.map}</button>
      <button class="toy-btn ${o.toys > 0 || o.toyPickups ? '' : 'no-toys'}" aria-label="Throw toy"><div class="toy-ring"></div>${ICONS.duck}<span class="toy-count">×0</span></button>
      ${o.touch ? '' : `<div class="kb-hint">${t('kbHint')}</div>`}
    `;
    this.slots = [...el.querySelectorAll<HTMLElement>('.cookie-bar .slot')];
    this.timerEl = el.querySelector('.timer b')!;
    this.alertEl = el.querySelector('.stealth')!;
    this.vign = el.querySelector('.alert-vignette')!;
    this.toyBtn = el.querySelector('.toy-btn')!;
    this.toyCount = el.querySelector('.toy-count')!;
    this.joyEl = el.querySelector('.joystick')!;
    this.knob = el.querySelector('.joy-knob')!;
    this.joyLabel = el.querySelector('.joy-label')!;
    this.tipEl = el.querySelector('.tip-card')!;
    this.keyChip = el.querySelector('.key-chip')!;
    this.bedChip = el.querySelector('.bed-chip')!;
    this.toastEl = el.querySelector('.toast')!;
    this.shoutEl = el.querySelector('.shout')!;
    this.aimHint = el.querySelector('.aim-hint')!;
    const stop = (e: Event) => e.stopPropagation();
    for (const b of el.querySelectorAll('button')) b.addEventListener('pointerdown', stop);
    el.querySelector('.pause')!.addEventListener('click', () => this.onPause());
    this.toyBtn.addEventListener('click', () => this.onToy());
    const zoom = el.querySelector<HTMLButtonElement>('.zoom')!;
    // tap = toggle the overview, press & hold = peek while held
    let downAt = 0,
      wasOn = false;
    zoom.addEventListener('pointerdown', () => {
      downAt = performance.now();
      wasOn = this.zoomOn;
      this.setZoom(true);
    });
    const release = () => {
      if (!downAt) return;
      const tap = performance.now() - downAt < 300;
      downAt = 0;
      this.setZoom(tap ? !wasOn : false);
    };
    zoom.addEventListener('pointerup', release);
    zoom.addEventListener('pointercancel', release);
    this.tipEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hideTip();
    });
    this.tipEl.style.display = 'none';
  }

  private arrows: HTMLElement[] = [];
  /** off-screen pointers to the remaining goals; positions are screen pixels (may be outside) */
  setTargets(list: { x: number; y: number; kind: 'cookie' | 'bonus' | 'bed'; behind: boolean }[], w: number, h: number) {
    const box = this.el.querySelector('.edge-arrows')!;
    while (this.arrows.length < list.length) {
      const a = document.createElement('div');
      a.className = 'edge-arrow';
      a.innerHTML = '<i class="tri"></i><span class="ic"></span>';
      box.appendChild(a);
      this.arrows.push(a);
    }
    const top = h > w ? 128 : 96,
      bottom = h > w ? 120 : 110,
      side = 34;
    this.arrows.forEach((a, i) => {
      const t = list[i];
      if (!t) {
        a.style.display = 'none';
        return;
      }
      let { x, y } = t;
      if (t.behind) {
        x = w - x;
        y = h * 2;
      }
      const inside = x > side && x < w - side && y > top && y < h - bottom;
      if (inside) {
        a.style.display = 'none';
        return;
      }
      const cx = w / 2,
        cy = (top + h - bottom) / 2;
      const dx = x - cx,
        dy = y - cy;
      const sx = (w / 2 - side) / Math.max(1e-3, Math.abs(dx)),
        sy = ((h - bottom - top) / 2) / Math.max(1e-3, Math.abs(dy));
      const s = Math.min(sx, sy);
      const ex = cx + dx * s,
        ey = cy + dy * s;
      a.style.display = '';
      a.className = `edge-arrow ${t.kind}`;
      a.style.transform = `translate(${ex}px, ${ey}px)`;
      (a.querySelector('.tri') as HTMLElement).style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      const ic = a.querySelector('.ic') as HTMLElement;
      if (ic.dataset.k !== t.kind) {
        ic.dataset.k = t.kind;
        ic.innerHTML = t.kind === 'bed' ? ICONS.bed : t.kind === 'bonus' ? ICONS.goldCookie(true) : ICONS.cookie(true);
      }
    });
  }

  zoomOn = false;
  setZoom(on: boolean) {
    this.zoomOn = on;
    this.el.querySelector('.zoom')?.classList.toggle('on', on);
    this.onZoom(on);
  }

  layout(w: number, h: number) {
    this.el.classList.toggle('portrait', h > w);
  }

  update(f: HudFrame, dt: number) {
    this.timerEl.textContent = fmt(f.time);
    this.timerEl.parentElement!.classList.toggle('over', f.time > this.o.par);
    const got = f.cookies.filter((c, i) => c && i !== this.o.bonus).length;
    const gotBonus = this.o.bonus >= 0 && f.cookies[this.o.bonus];
    const key = got * 2 + (gotBonus ? 1 : 0);
    if (key !== this.lastCookies) {
      this.slots.forEach((s, k) => {
        const isBonus = s.classList.contains('bonus-slot');
        const on = isBonus ? !!gotBonus : k < got;
        if (on && !s.classList.contains('got')) s.innerHTML = isBonus ? ICONS.goldCookie(true) : ICONS.cookie(true);
        s.classList.toggle('got', on);
      });
      this.lastCookies = key;
    }
    const a = f.hidden ? 'hidden' : f.alert;
    this.alertEl.className = `chip stealth ${a}`;
    this.alertEl.querySelector('b')!.textContent = a === 'hidden' ? t('hidden') : a === 'chase' ? t('run') : a === 'sus' ? t('hmm') : '';
    this.vign.className = `alert-vignette ${f.alert === 'chase' ? 'chase' : f.alert === 'sus' ? 'suspicious' : ''}`;
    this.toyCount.textContent = `×${f.toys}`;
    this.toyBtn.classList.toggle('empty', f.toys <= 0);
    if (f.toys > 0) this.toyBtn.classList.remove('no-toys');
    this.toyBtn.classList.toggle('aiming', f.aiming);
    this.aimHint.classList.toggle('show', f.aiming);
    this.keyChip.classList.toggle('hidden-chip', f.keys <= 0);
    if (this.o.bedCheck) {
      const left = Math.max(0, this.o.bedCheck - f.time);
      this.bedChip.querySelector('b')!.textContent = f.decoy ? '✓' : `${t('bedCheckIn')} ${fmt(left)}`;
      this.bedChip.classList.toggle('urgent', !f.decoy && left < 10);
    }
    // joystick
    if (f.joy.active && !f.aiming) {
      this.joyEl.classList.remove('hidden-joy');
      this.joyEl.style.left = `${f.joy.ox}px`;
      this.joyEl.style.top = `${f.joy.oy}px`;
      let dx = f.joy.x - f.joy.ox,
        dy = f.joy.y - f.joy.oy;
      const d = Math.hypot(dx, dy);
      const R = f.joyRadius;
      if (this.lastR !== R) {
        this.lastR = R;
        const run = this.joyEl.querySelector<HTMLElement>('.joy-run')!,
          tip = this.joyEl.querySelector<HTMLElement>('.joy-tip')!;
        run.style.width = run.style.height = `${2 * R + 16}px`;
        tip.style.width = tip.style.height = `${2 * R * 0.8}px`;
        this.joyLabel.style.top = `${R + 18}px`;
      }
      if (d > R) {
        dx *= R / d;
        dy *= R / d;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joyLabel.textContent = f.running ? t('running') : t('tiptoe');
      // run zone starts at 80% of the full drag (matches RUN_THRESHOLD)
      const mag = Math.min(1, d / R);
      this.joyEl.classList.toggle('near-run', !f.running && mag > 0.65);
      this.joyEl.classList.toggle('running', f.running);
    } else this.joyEl.classList.add('hidden-joy');
    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      // the tip goes away after a few seconds, or soon after the kid starts moving
      if (f.moving) this.movedT += dt;
      if (this.tipTimer <= 0 || this.movedT > 1.2) this.hideTip();
    }
  }

  showTip(id: string, icon = '') {
    const tip = TIPS[id];
    if (!tip) return;
    const [title, text] = tip[getLang()];
    this.tipEl.querySelector('b')!.textContent = title;
    this.tipEl.querySelector('span')!.textContent = text;
    this.tipEl.querySelector('.tip-icon')!.innerHTML = icon || TIP_ICONS[id] || ICONS.cookie(true);
    this.tipEl.style.display = '';
    void this.tipEl.offsetWidth;
    this.tipEl.classList.remove('hidden-tip');
    this.tipTimer = 5;
    this.movedT = 0;
    clearTimeout(this.tipKill);
    this.tipKill = window.setTimeout(() => this.hideTip(), 6000);
  }

  private lastR = 0;
  private movedT = 0;
  private tipKill = 0;
  hideTip() {
    this.tipTimer = 0;
    clearTimeout(this.tipKill);
    this.tipEl.classList.add('hidden-tip');
    window.setTimeout(() => {
      if (this.tipEl.classList.contains('hidden-tip')) this.tipEl.style.display = 'none';
    }, 350);
  }

  toast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
  }

  shout(text: string, x: number, y: number) {
    this.shoutEl.textContent = text;
    this.shoutEl.style.left = `${x}px`;
    this.shoutEl.style.top = `${y}px`;
    this.shoutEl.classList.remove('show');
    void this.shoutEl.offsetWidth;
    this.shoutEl.classList.add('show');
  }
}

const TIP_ICONS: Record<string, string> = {
  creaky: ICONS.creak,
  toys: ICONS.duck,
  cones: `<svg viewBox="0 0 64 64"><path d="M14 30 L58 12 L58 50 Z" fill="#ffe2a0" opacity=".85"/><rect x="6" y="25" width="14" height="10" rx="3" fill="#2e3446"/></svg>`,
  hide: ICONS.hide,
  move: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="none" stroke="#6ff0c8" stroke-width="4" stroke-dasharray="6 5"/><circle cx="40" cy="26" r="10" fill="#fff4dc" stroke="#2a1a33" stroke-width="3"/></svg>`,
  key: '<span style="font-size:36px">🔑</span>',
  switch: '<span style="font-size:36px">💡</span>',
  sleep: '<span style="font-size:32px;color:#cdd8ff;font-weight:700">Zzz</span>',
  cat: '<span style="font-size:36px">🐱</span>',
  vacuum: '<span style="font-size:36px">🤖</span>',
  teen: '<span style="font-size:36px">📱</span>',
  grandma: '<span style="font-size:36px">🏮</span>',
  dad: '<span style="font-size:36px">🔦</span>',
  pillow: '<span style="font-size:36px">⏰</span>',
  finale: '<span style="font-size:36px">⭐</span>',
  run: '<span style="font-size:36px">💨</span>',
};
