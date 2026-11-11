// Title screen layout check for any build: opens the menu (a returning player's, with every button: daily reward,
// midnight snack, play, missions, shop, houses) at 1280x720, 1366x768, 1920x1080, 844x390 and 390x844 and fails if a
// piece of the logo (each letter, the cookie, the tagline) overlaps a button or the top bar, or if any button is not
// fully on screen. External requests are blocked (portal SDKs are not needed for the menu).
// Usage: node scripts/title-layout.mjs <build dir> [--sizes 1280x720,...] [--shots <dir>]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { serve } from './web/serve.mjs';

const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dir = resolve(args[0] ?? 'dist');
const SIZES = (opt('--sizes') ?? '1280x720,1366x768,1920x1080,844x390,390x844').split(',').map((s) => s.split('x').map(Number));
const shots = opt('--shots');
if (shots) mkdirSync(shots, { recursive: true });
const server = await serve(dir);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
console.log(`title layout: ${dir}`);
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: h > w });
  const page = await ctx.newPage();
  // Playgama's build loads Bridge from Playgama's CDN (its mock platform keeps the save below in localStorage); nothing else goes out
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => (r.request().url().startsWith('https://bridge.playgama.com/') ? r.continue() : r.abort()));
  await page.addInitScript(() =>
    localStorage.setItem('cookieheist.save.v1', JSON.stringify({ v: 1, tutorialDone: true, coins: 240, stars: { 'apartment-1': 3, 'apartment-2': 3, 'apartment-3': 2 } })),
  );
  await page.goto(`${server.origin}/game/index.html?nosdk&low`);
  await page.locator('.title-ui .play-btn').waitFor({ timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const res = await page.evaluate(() => {
    const R = (e) => {
      const r = e.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, name: (e.className.baseVal ?? e.className) || e.tagName };
    };
    const ui = document.querySelector('.title-ui');
    const logoParts = [...ui.querySelectorAll('.logo-line > span, .logo .tagline')].map(R);
    const buttons = [...ui.querySelectorAll('.title-bottom button, .title-top .chip, .title-top button')].filter((b) => b.getClientRects().length).map(R);
    const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
    const overlaps = [];
    for (const p of logoParts) for (const b of buttons) if (hit(p, b)) overlaps.push(`logo ${p.name} × ${b.name}`);
    const offscreen = buttons.filter((b) => b.l < -0.5 || b.t < -0.5 || b.r > innerWidth + 0.5 || b.b > innerHeight + 0.5).map((b) => `${b.name} at ${Math.round(b.l)},${Math.round(b.t)}–${Math.round(b.r)},${Math.round(b.b)}`);
    const logoOff = logoParts.filter((b) => b.l < -0.5 || b.t < -0.5 || b.r > innerWidth + 0.5 || b.b > innerHeight + 0.5).map((b) => b.name);
    const lr = logoParts.reduce((a, p) => ({ l: Math.min(a.l, p.l), t: Math.min(a.t, p.t), r: Math.max(a.r, p.r), b: Math.max(a.b, p.b) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
    return { overlaps, offscreen, logoOff, logo: `${Math.round(lr.r - lr.l)}x${Math.round(lr.b - lr.t)}`, buttons: buttons.length };
  });
  const bad = [...res.overlaps, ...res.offscreen.map((o) => `off screen: ${o}`), ...res.logoOff.map((o) => `logo off screen: ${o}`)];
  if (shots) await page.screenshot({ path: join(shots, `title-${w}x${h}.png`), timeout: 180_000 });
  console.log(`  ${bad.length ? '✗' : '✓'} ${w}x${h}: logo ${res.logo}, ${res.buttons} buttons${bad.length ? ': ' + bad.join('; ') : ', no overlap, all on screen'}`);
  failed += bad.length ? 1 : 0;
  await ctx.close();
}
await browser.close();
server.close();
console.log(failed ? `FAILED at ${failed} size(s)` : 'title layout ok');
process.exit(failed ? 1 : 0);
