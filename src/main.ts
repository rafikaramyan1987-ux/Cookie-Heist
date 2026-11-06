import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './ui/style.css';
import { createStage } from './render/stage';
import type { View } from './art/view';

/**
 * STEP 1 – art test entry. `?view=lineup|level|houses|title|hud`
 * `&t=<seconds>` freezes the clock for deterministic screenshots.
 */
const params = new URLSearchParams(location.search);
const viewName = params.get('view') ?? 'title';
const frozen = params.has('t') ? parseFloat(params.get('t')!) : null;

async function boot() {
  await document.fonts.ready;
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ui = document.getElementById('ui')!;
  const stage = createStage(canvas);
  let view: View;
  switch (viewName) {
    case 'lineup':
      view = (await import('./art/lineup')).lineupView();
      break;
    case 'houses':
      view = (await import('./art/houses')).housesView();
      break;
    case 'level':
    case 'hud':
      view = (await import('./art/levelView')).levelView(viewName === 'hud');
      break;
    default:
      view = (await import('./art/titleView')).titleView();
  }
  document.body.dataset.view = viewName;
  view.overlay?.forEach((el) => ui.appendChild(el));
  stage.setScene(view.scene, view.camera);

  const resize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    document.body.classList.toggle('portrait', h > w);
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
      // simulate up to the frozen time in fixed steps, then hold
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
    // frozen screenshots: stop rendering once ready so captures are cheap and stable
    if (frozen !== null && frames >= 3) return;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
boot();
