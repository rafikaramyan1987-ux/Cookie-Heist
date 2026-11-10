/** Small DOM effects on top of the 3D view: cookie sparkle, "Phew!" pop, comic catch burst, star rain. */

function burst(parent: HTMLElement, cls: string, html: string, ms: number) {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  parent.appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

/** sparkles flying out of a grabbed cookie (screen px) */
export function sparkle(parent: HTMLElement, x: number, y: number) {
  const parts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
    const d = 40 + Math.random() * 46;
    return `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--d:${Math.random() * 0.08}s;--s:${0.6 + Math.random() * 0.7}"></i>`;
  }).join('');
  const el = burst(parent, 'fx-sparkle', `<b></b>${parts}`, 900);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

/** the big relieved "Phew!" after a near miss */
export function phew(parent: HTMLElement, text: string) {
  burst(parent, 'fx-phew', `<span>${text}</span>`, 1500);
}

/** comic "Back to bed!" burst with a screen shake */
export function catchBurst(parent: HTMLElement, text: string, x: number, y: number) {
  const el = burst(parent, 'fx-catch', `<svg viewBox="0 0 200 120"><path d="M100 4l14 26 30-14-6 30 34 2-26 20 24 22-34-2 4 30-26-18-14 28-14-28-26 18 4-30-34 2 24-22-26-20 34-2-6-30 30 14z" fill="#ffd25e" stroke="#2a1a33" stroke-width="6" stroke-linejoin="round"/></svg><span>${text}</span>`, 2400);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 600);
}

/** a rain of golden stars over the result card (3-star wins) */
export function starRain(parent: HTMLElement) {
  const star = '<svg viewBox="0 0 48 48"><path d="M24 4l5.9 12.6 13.6 1.7-10 9.4 2.6 13.5L24 34.6 11.9 41.2l2.6-13.5-10-9.4 13.6-1.7z" fill="#ffd25e" stroke="#2a1a33" stroke-width="3" stroke-linejoin="round"/></svg>';
  const html = Array.from({ length: 36 }, () => `<i style="left:${Math.random() * 100}%;--d:${Math.random() * 1.4}s;--t:${1.8 + Math.random() * 1.4}s;--s:${0.5 + Math.random() * 0.9};--r:${Math.random() * 720 - 360}deg">${star}</i>`).join('');
  burst(parent, 'fx-stars', html, 5000);
}
