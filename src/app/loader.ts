/**
 * The loading screen is plain HTML/CSS inside index.html (logo, progress bar, a tip), painted before any script
 * or 3D asset loads. The game only moves its bar and fades it out.
 */
const el = () => document.getElementById('boot');

export const loader = {
  progress(p: number) {
    const bar = document.querySelector<HTMLElement>('#boot .bar i');
    if (bar) bar.style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
  },
  done() {
    const b = el();
    if (!b) return;
    loader.progress(1);
    b.classList.add('gone');
    setTimeout(() => b.remove(), 450);
  },
};
