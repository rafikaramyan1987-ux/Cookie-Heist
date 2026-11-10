import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
// Polish / Turkish letters (downloaded only when such text is on screen: unicode-range)
import '@fontsource/fredoka/latin-ext-400.css';
import '@fontsource/fredoka/latin-ext-600.css';
import '@fontsource/fredoka/latin-ext-700.css';
import './ui/style.css';
import { createStage } from './render/stage';
import type { View } from './art/view';
import { App } from './app/app';

/**
 * Entry. `?view=lineup|level|hud|houses|title` shows the art-test views
 * (`&t=<s>` freezes time for screenshots); otherwise the game boots.
 */
const params = new URLSearchParams(location.search);
const viewName = params.get('view');

if (viewName) void artView(viewName);
else void new App().boot();

async function artView(name: string) {
  document.getElementById('boot')?.remove();
  const frozen = params.has('t') ? parseFloat(params.get('t')!) : null;
  await document.fonts.ready;
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ui = document.getElementById('ui')!;
  const stage = createStage(canvas);
  let view: View;
  switch (name) {
    case 'lineup':
      view = (await import('./art/lineup')).lineupView();
      break;
    case 'houses':
      view = (await import('./art/houses')).housesView();
      break;
    case 'cover':
      view = (await import('./art/coverView')).coverView();
      break;
    case 'cover3': {
      const v = (params.get('v') ?? 'A').toUpperCase() as 'A' | 'B' | 'C';
      view = { ...(await import('./art/cover3View')).cover3View(v), overlay: [(await import('./art/coverView')).coverLogo()] };
      document.body.dataset.variant = v;
      break;
    }
    case 'level':
    case 'hud':
      view = (await import('./art/levelView')).levelView(name === 'hud');
      break;
    default:
      view = (await import('./art/titleView')).titleView();
  }
  document.body.dataset.view = name;
  view.overlay?.forEach((el) => ui.appendChild(el));
  if (view.bloom !== undefined) stage.bloom.strength = view.bloom;
  stage.setScene(view.scene, view.camera);
  const resize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    document.body.classList.toggle('portrait', h > w);
    const cl = document.querySelector('.cover-logo');
    if (cl) {
      cl.classList.toggle('square', Math.abs(w / h - 1) < 0.1);
      cl.classList.toggle('tall', w / h < 0.9);
      cl.classList.toggle('small', w < 1200 && w / h > 1.1);
    }
    stage.resize(w, h);
    view.resize(w, h);
  };
  window.addEventListener('resize', resize);
  resize();
  let last = performance.now();
  let t = 0;
  let frames = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (frozen !== null) {
      if (frames === 0) {
        const step = 1 / 30;
        for (let s = 0; s < frozen; s += step) view.update(step, s, window.innerWidth, window.innerHeight);
        t = frozen;
      }
      view.update(0, t, window.innerWidth, window.innerHeight);
    } else {
      t += dt;
      view.update(dt, t, window.innerWidth, window.innerHeight);
    }
    stage.render(t);
    frames++;
    if (frames === 3) (window as unknown as { __ready: boolean }).__ready = true;
    if (frozen !== null && frames >= 3) return;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
