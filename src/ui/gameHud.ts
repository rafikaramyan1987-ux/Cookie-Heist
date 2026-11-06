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
        <div class="cookie-bar">${Array.from({ length: o.total }, (_, i) => `<div class="slot ${i >= o.need ? 'bonus' : ''}">${ICONS.cookie(false)}</div>`).join('')}</div>
        <button class="round-btn pause" aria-label="Pause">${ICONS.pause}</button>
      </div>
      <div class="hud-sub">
        <div class="chip timer"><span class="clock"></span><b>0:00</b><i>/ ${fmt(o.par)}</i></div>
        <div class="chip stealth calm">${ICONS.eye}<b></b></div>
        <div class="chip key-chip hidden-chip">🔑<b>${t('key')}</b></div>
        <div class="chip bed-chip ${o.bedCheck ? '' : 'hidden-chip'}">⏰<b></b></div>
      </div>
      <div class="tip-card hidden-tip"><div class="tip-icon"></div><div class="tip-text"><small>NEW!</small><b></b><span></span></div></div>
      <div class="toast"></div>
      <div class="shout"></div>
      <div class="aim-hint">${t('aim')}</div>
      <div class="joystick hidden-joy"><div class="joy-run"></div><div class="joy-tip"></div><div class="joy-knob"></div><div class="joy-label">${t('tiptoe')}</div></div>
      <button class="round-btn zoom" aria-label="Map">${ICONS.map}</button>
      <button class="toy-btn ${o.toys > 0 || o.toyPickups ? '' : 'no-toys'}" aria-label="Throw toy"><div class="toy-ring"></div>${ICONS.duck}<span class="toy-count">×0</span></button>
      ${o.touch ? '' : `<div class="kb-hint">WASD / ← ↑ → ↓ · Shift = run · Space = toy</div>`}
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
    zoom.addEventListener('pointerdown', () => this.onZoom(true));
    zoom.addEventListener('pointerup', () => this.onZoom(false));
    zoom.addEventListener('pointerleave', () => this.onZoom(false));
    this.tipEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.tipEl.classList.add('hidden-tip');
    });
  }

  layout(w: number, h: number) {
    this.el.classList.toggle('portrait', h > w);
  }

  update(f: HudFrame, dt: number) {
    this.timerEl.textContent = fmt(f.time);
    this.timerEl.parentElement!.classList.toggle('over', f.time > this.o.par);
    const got = f.cookies.filter(Boolean).length;
    if (got !== this.lastCookies) {
      let k = 0;
      this.slots.forEach((s) => {
        const on = k < got;
        if (on && !s.classList.contains('got')) s.innerHTML = ICONS.cookie(true);
        s.classList.toggle('got', on);
        k++;
      });
      this.lastCookies = got;
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
      if (d > R) {
        dx *= R / d;
        dy *= R / d;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joyLabel.textContent = f.running ? t('running') : t('tiptoe');
      this.joyEl.classList.toggle('running', f.running);
    } else this.joyEl.classList.add('hidden-joy');
    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) this.tipEl.classList.add('hidden-tip');
    }
  }

  showTip(id: string, icon = '') {
    const tip = TIPS[id];
    if (!tip) return;
    const [title, text] = tip[getLang()];
    this.tipEl.querySelector('b')!.textContent = title;
    this.tipEl.querySelector('span')!.textContent = text;
    this.tipEl.querySelector('.tip-icon')!.innerHTML = icon || TIP_ICONS[id] || ICONS.cookie(true);
    this.tipEl.classList.remove('hidden-tip');
    this.tipTimer = 7;
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
