import { ICONS } from './icons';
import { t } from '../app/i18n';

/**
 * First-visit tutorial on night 1, inside gameplay (no text pages): a hand pointer and one short line per step.
 * drag (to the basket) → hide (in the basket) → stay (mum comes by) → Phew! → cookie → bed. Skippable.
 */
export type TutStep = 'drag' | 'hide' | 'stay' | 'cookie' | 'bed' | 'done';

export interface Pt {
  x: number;
  y: number;
}

export class Tutorial {
  readonly el = document.createElement('div');
  step: TutStep = 'drag';
  /** seconds in the current step */
  stepT = 0;
  onSkip = () => {};
  private line: HTMLElement;
  private hand: HTMLElement;
  private ring: HTMLElement;

  constructor(private touch: boolean) {
    this.el.className = 'tutorial';
    this.el.innerHTML = `<div class="tut-line"></div><div class="tut-ring"></div><div class="tut-hand">${ICONS.hand}</div><button class="tut-skip">${t('tut_skip')} ⏭</button>`;
    this.line = this.el.querySelector('.tut-line')!;
    this.hand = this.el.querySelector('.tut-hand')!;
    this.ring = this.el.querySelector('.tut-ring')!;
    const skip = this.el.querySelector<HTMLButtonElement>('.tut-skip')!;
    skip.addEventListener('pointerdown', (e) => e.stopPropagation());
    skip.addEventListener('click', () => {
      this.set('done');
      this.onSkip();
    });
    this.set('drag');
  }

  set(step: TutStep) {
    if (this.step === 'done') return;
    this.step = step;
    this.stepT = 0;
    const text: Record<TutStep, string> = {
      drag: this.touch ? t('tut_drag') : t('tut_keys'),
      hide: t('tut_hide'),
      stay: t('tut_stay'),
      cookie: t('tut_cookie'),
      bed: t('tut_bed'),
      done: '',
    };
    this.line.textContent = text[step];
    this.line.classList.remove('pop');
    void this.line.offsetWidth;
    this.line.classList.add('pop');
    this.el.dataset.step = step;
    if (step === 'done') this.el.classList.add('gone');
  }

  /** place the pointer: `from` = the kid, `to` = the current target (screen px); dt in s */
  update(dt: number, from: Pt, to: Pt | null) {
    this.stepT += dt;
    if (this.step === 'done' || !to) {
      this.hand.style.opacity = this.ring.style.opacity = '0';
      return;
    }
    let x = to.x,
      y = to.y;
    if (this.step === 'drag') {
      // the hand drags from the kid towards the target, over and over
      const k = (this.stepT % 1.6) / 1.2;
      const e = Math.min(1, k);
      const ease = e * e * (3 - 2 * e);
      x = from.x + (to.x - from.x) * 0.6 * ease;
      y = from.y + 40 + (to.y - from.y) * 0.6 * ease;
      this.hand.style.opacity = k > 1.15 ? '0' : '1';
    } else this.hand.style.opacity = this.step === 'stay' ? '0' : '1';
    this.hand.style.transform = `translate(${x - 14}px, ${y + 6}px)`;
    this.ring.style.transform = `translate(${to.x}px, ${to.y}px)`;
    this.ring.style.opacity = this.step === 'drag' || this.step === 'stay' ? '0' : '1';
  }
}
