// Records a gameplay trailer from REAL play (bot on the real game logic), frame by frame, then encodes with ffmpeg.
// usage: node scripts/submission/record.mjs <base> <width> <height> <out.mp4>
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [base = 'http://127.0.0.1:4174/', W = '1920', H = '1080', out = 'submission/videos/trailer.mp4'] = process.argv.slice(2);
const FPS = 30;
const dir = `/tmp/claude-0/frames-${W}x${H}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
mkdirSync('submission/videos', { recursive: true });

// clip list: cover → apartment sneak → family close call (hiding from mum) → snowy chalet → win in bed → end card
const CLIPS = [
  { q: 'view=cover&t=7.2', still: true, dur: 1.3 },
  { q: 'level=0-4&autoplay=good&seed=3', from: 3.0, dur: 3.4 },
  { q: 'level=1-11&autoplay=good&seed=11', from: 38.6, dur: 6.0 },
  { q: 'level=3-1&autoplay=good&seed=2', from: 4.0, dur: 3.0 },
  { q: 'level=1-11&autoplay=good&seed=11', from: 49.6, dur: 3.3 },
  { q: 'view=cover&t=9', still: true, dur: 1.0 },
];

const browser = await chromium.launch({ args: GL_ARGS });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: +W < +H });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
let n = 0;
const shot = async () => {
  await page.screenshot({ path: `${dir}/f${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93, timeout: 180000 });
};
for (const c of CLIPS) {
  const frames = Math.round(c.dur * FPS);
  if (c.still) {
    await page.goto(`${base}?${c.q}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.waitForTimeout(300);
    const first = n;
    await shot();
    for (let i = 1; i < frames; i++) execFileSync('cp', [`${dir}/f${String(first).padStart(4, '0')}.jpg`, `${dir}/f${String(n++).padStart(4, '0')}.jpg`]);
    continue;
  }
  await page.goto(`${base}?capture&nosdk&notips&${c.q}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  // fast-forward (no rendering) to the clip start
  const skip = Math.round(c.from * FPS);
  for (let i = 0; i < skip; i += 60) await page.evaluate((k) => { for (let j = 0; j < k; j++) window.__game.simOnly(1 / 30); }, Math.min(60, skip - i));
  for (let i = 0; i < frames; i++) {
    await page.evaluate(() => window.__game.tick(1 / 30));
    await shot();
  }
  const st = await page.evaluate(() => ({ t: window.__game.run?.world.t, status: window.__game.run?.world.status, mode: window.__game.mode }));
  console.log(c.q, 'end', JSON.stringify(st), 'frames', n);
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/f%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
console.log('wrote', out, (n / FPS).toFixed(1) + 's');
