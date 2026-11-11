// Y8 media (docs.y8.com/studio/media), all into submission-y8/media/, from the real game and the B2 cover art:
//  - screenshot-760x570-{1..4}.jpg (Standard Screenshot) and screenshot-1280x720-{1..4}.jpg (Widescreen Screenshot):
//    four gameplay moments (no menus / title screens), each rendered natively at both sizes
//  - promo-landscape-1920x1080.jpg (Landscape Promo): submission/covers-v3/B2/cover-1920x1080.png
//  - promo-portrait-1080x1920.jpg (Portrait Promo) and promo-card-760x570.jpg (Game Card Promo): the B2 cover scene +
//    logo (`?view=cover3&v=B2&t=4`, as scripts/submission/covers-v3.mjs) rendered at those sizes
//  - gameplay-1280x720.mp4 and gameplay-960x720.mp4: ONE continuous recording of real play (Snowy Chalet night 5,
//    the built-in bot, seed 9: cookie grab at once, a close call, a 3-star win), no edits, no intro, no sound
// Run against the dev server:  npx vite --host 127.0.0.1 --port 4174 &  node scripts/y8/media.mjs http://127.0.0.1:4174/ [--only shots,promos,video] [--shot 3]
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const base = args[0] && !args[0].startsWith('--') ? args[0] : 'http://127.0.0.1:4174/';
const pick = args.includes('--shot') ? +args[args.indexOf('--shot') + 1] : 0;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : ['shots', 'promos', 'video'];
const OUT = 'submission-y8/media';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: GL_ARGS });
const MB = 1024 * 1024;
const jpg = (png, out, limit, size) => {
  execFileSync('convert', [png, ...(size ? ['-filter', 'Lanczos', '-resize', `${size}!`] : []), '-strip', '-sampling-factor', '4:2:0', '-quality', '90', '-interlace', 'JPEG', out]);
  const s = statSync(out).size;
  if (s >= limit) throw new Error(`${out}: ${s} bytes, limit ${limit}`);
  console.log(`${out} (${(s / 1024).toFixed(0)} KB)`);
};
/** a returning player: tutorial done (so levels open straight away) */
const returning = () => localStorage.setItem('cookieheist.save.v1', JSON.stringify({ v: 1, tutorialDone: true, coins: 240, stars: { 'apartment-1': 3, 'apartment-2': 3, 'apartment-3': 2 } }));

async function open(w, h, q) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.addInitScript(returning);
  await page.goto(`${base}?${q}`);
  await page.waitForFunction(() => window.__ready === true && window.__game !== undefined, null, { timeout: 120000 });
  return { ctx, page };
}
/** simulate up to `seconds` of game time, stopping when `until` holds; then one rendered frame */
async function sim(page, seconds, until) {
  await page.waitForFunction(() => ['play', 'cinematic'].includes(window.__game?.mode), null, { timeout: 60000 });
  for (let t = 0; t < seconds; t += 1) {
    const done = await page.evaluate((u) => {
      const stop = u ? (0, eval)(`(${u})`) : () => false;
      for (let k = 0; k < 30; k++) {
        window.__game.simOnly(1 / 30);
        if (stop()) return true;
      }
      return false;
    }, until ? String(until) : null);
    if (done) break;
  }
  for (let i = 0; i < 3; i++) await page.evaluate(() => window.__game.tick(1 / 60));
  await page.waitForTimeout(500);
}

const SHOTS = [
  { name: 'Family House, night 3: sneaking past a grown-up', q: 'level=1-2&autoplay=good&notips&manual&nosdk', run: (p) => sim(p, 9) },
  { name: 'Hiding in a laundry basket while a grown-up walks past', q: 'level=0-3&autoplay=good&notips&manual&nosdk', run: (p) => sim(p, 60, () => window.__game.run.world.player.hidden) },
  { name: 'Snowy Chalet, night 5: a close call with the flashlight', q: 'level=3-4&autoplay=good&seed=9&notips&manual&nosdk', run: (p) => sim(p, 23) },
  { name: 'Grand Mansion, night 2: the cookie run', q: 'level=4-1&autoplay=good&seed=3&notips&manual&nosdk', run: (p) => sim(p, 14) },
];
if (only.includes('shots')) {
  for (const [w, h, limit] of [
    [1280, 720, 5 * MB],
    [760, 570, 2 * MB],
  ]) {
    for (const [i, s] of SHOTS.entries()) {
      if (pick && pick !== i + 1) continue;
      const { ctx, page } = await open(w, h, s.q);
      await s.run(page);
      const png = `${OUT}/.tmp.png`;
      await page.screenshot({ path: png, timeout: 180000 });
      await ctx.close();
      jpg(png, `${OUT}/screenshot-${w}x${h}-${i + 1}.jpg`, limit);
      rmSync(png);
      console.log(`  ${s.name}`);
    }
  }
}
if (only.includes('promos')) {
  jpg('submission/covers-v3/B2/cover-1920x1080.png', `${OUT}/promo-landscape-1920x1080.jpg`, 5 * MB);
  for (const [w, h, file, limit] of [
    [1080, 1920, 'promo-portrait-1080x1920.jpg', 5 * MB],
    [760, 570, 'promo-card-760x570.jpg', 2 * MB],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${base}?view=cover3&v=B2&t=4`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.waitForTimeout(400);
    const png = `${OUT}/.tmp.png`;
    await page.screenshot({ path: png });
    await ctx.close();
    jpg(png, `${OUT}/${file}`, limit);
    rmSync(png);
  }
}

/** one continuous take: `from` seconds into the night (the bot starts at once), `dur` seconds, 30 fps, every frame rendered */
const TAKE = { q: 'capture&nosdk&notips&level=3-4&autoplay=good&seed=9', from: 7.5, dur: 28 };
if (only.includes('video')) {
  const FPS = 30;
  for (const [w, h] of [
    [1280, 720],
    [960, 720],
  ]) {
    const dir = `${OUT}/.frames-${w}x${h}`;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const { ctx, page } = await open(w, h, TAKE.q);
    // CSS animations (toasts, sparkles, star rain) follow the game clock
    const stepCss = (ms) =>
      page.evaluate((ms) => {
        for (const a of document.getAnimations()) {
          if (a.playState !== 'paused') a.pause();
          a.currentTime = (Number(a.currentTime) || 0) + ms;
        }
      }, ms);
    await page.waitForFunction(() => ['play', 'cinematic'].includes(window.__game?.mode), null, { timeout: 60000 });
    const skip = Math.round(TAKE.from * FPS);
    for (let i = 0; i < skip; i += 60) await page.evaluate((k) => { for (let j = 0; j < k; j++) window.__game.simOnly(1 / 30); }, Math.min(60, skip - i));
    const n = Math.round(TAKE.dur * FPS);
    for (let i = 0; i < n; i++) {
      await page.evaluate(() => window.__game.tick(1 / 30));
      await stepCss(1000 / FPS);
      await page.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93, timeout: 180000 });
      if (i % 150 === 0) console.log(`  ${w}x${h} t=${(TAKE.from + i / FPS).toFixed(1)}s`, JSON.stringify(await page.evaluate(() => ({ status: window.__game.run?.world.status, mode: window.__game.mode }))));
    }
    await ctx.close();
    const out = `${OUT}/gameplay-${w}x${h}.mp4`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/f%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
    rmSync(dir, { recursive: true, force: true });
    const s = statSync(out).size;
    if (s >= 50 * MB) throw new Error(`${out}: ${s} bytes (limit 50 MB)`);
    console.log(`${out} (${(s / MB).toFixed(1)} MB, ${TAKE.dur}s)`);
  }
}
await browser.close();
