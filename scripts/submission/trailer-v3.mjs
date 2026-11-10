// v3 trailer from REAL play (the game logic + the playtest bot / a scripted hide), frame by frame, no sound.
// usage: node scripts/submission/trailer-v3.mjs <base> <width> <height> <out.mp4>
// 0.0 s cover B2, the main cover (first frame) → night 1: hidden in the basket, mum's flashlight sweeps right past ("Phew!")
// → snowy chalet: a cookie grab (sparkle) → hiding while a grown-up walks by → a 3-star win (star rain) → cover B2
// About 18 s.
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [base = 'http://127.0.0.1:4174/', W = '1920', H = '1080', out = 'submission/videos/trailer-v3-1920x1080.mp4'] = process.argv.slice(2);
const FPS = 30;
const dir = `/tmp/claude-0/frames-v3-${W}x${H}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const CLIPS = [
  { still: 'view=cover3&v=B2&t=4', dur: 0.6 },
  // night 1: the kid is in the basket at once; mum comes by and sweeps over the basket
  { q: 'level=0-0&seed=3', setup: 'basket', from: 1.1, dur: 3.3 },
  // snowy chalet, night 5, seed 9 (scripts/submission/find-clips-v3.ts): cookie grab, close call, 3-star win
  { q: 'level=3-4&autoplay=good&seed=9', from: 8.3, dur: 2.4 },
  { q: 'level=3-4&autoplay=good&seed=9', from: 24.3, dur: 3.2 },
  { q: 'level=3-4&autoplay=good&seed=9', from: 34.6, dur: 6.4 },
  { still: 'view=cover3&v=B2&t=4', dur: 2.1 },
];

const browser = await chromium.launch({ args: GL_ARGS });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: +W < +H });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
let n = 0;
const name = (k) => `${dir}/f${String(k).padStart(4, '0')}.jpg`;
const shot = () => page.screenshot({ path: name(n++), type: 'jpeg', quality: 93, timeout: 180000 });
// CSS animations (toasts, "Phew!", sparkles, star rain) follow the game clock, not the wall clock
const stepCss = (ms) =>
  page.evaluate((ms) => {
    for (const a of document.getAnimations()) {
      if (a.playState !== 'paused') a.pause();
      a.currentTime = (Number(a.currentTime) || 0) + ms;
    }
  }, ms);
for (const c of CLIPS) {
  const frames = Math.round(c.dur * FPS);
  if (c.still) {
    await page.goto(`${base}?${c.still}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.waitForTimeout(400);
    const first = n;
    await shot();
    for (let i = 1; i < frames; i++) execFileSync('cp', [name(first), name(n++)]);
    continue;
  }
  await page.goto(`${base}?capture&nosdk&notips&${c.q}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  if (c.setup === 'basket')
    await page.evaluate(() => {
      const p = window.__game.run.world.player;
      p.x = 4.5;
      p.z = 6.5;
    });
  const skip = Math.round(c.from * FPS);
  for (let i = 0; i < skip; i += 60) await page.evaluate((k) => { for (let j = 0; j < k; j++) window.__game.simOnly(1 / 30); }, Math.min(60, skip - i));
  for (let i = 0; i < frames; i++) {
    await page.evaluate(() => window.__game.tick(1 / 30));
    await stepCss(1000 / FPS);
    await shot();
  }
  const st = await page.evaluate(() => ({ t: window.__game.run?.world.t, status: window.__game.run?.world.status, mode: window.__game.mode }));
  console.log(c.q, 'end', JSON.stringify(st), 'frames', n);
}
await browser.close();
mkdirSync('submission/videos', { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/f%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
console.log('wrote', out, (n / FPS).toFixed(1) + 's');
