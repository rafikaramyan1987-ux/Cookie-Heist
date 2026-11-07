// Menu & flow screenshots for the PR (title, houses map, shop, daily, missions, pause, win, caught).
// usage: node scripts/screens.mjs <base> <outDir>
import { chromium, GL_ARGS } from './pw.mjs';
import { mkdirSync } from 'node:fs';
const [base = 'http://127.0.0.1:4174/', out = 'docs/screenshots/game'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: GL_ARGS });
const sizes = [
  { name: 'desktop', width: 1920, height: 1080, dpr: 1 },
  { name: 'phone', width: 390, height: 844, dpr: 2 },
];
const save = JSON.stringify({ v: 1, coins: 860, stars: Object.fromEntries([...Array(12)].map((_, i) => [`apartment-${i + 1}`, (i % 3) + 1]).concat([['family-1', 3], ['family-2', 2], ['family-3', 3]])), owned: ['skin:starry', 'skin:candy', 'skin:dino', 'cap:classic', 'cap:bunny', 'trail:none', 'trail:stars'], skin: 'dino', cap: 'classic', trail: 'stars', tips: [], daily: { last: '', streak: 2 }, missions: { day: '', list: [] }, totals: { cookies: 30, wins: 15 } });
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.dpr, hasTouch: s.name === 'phone', reducedMotion: 'reduce' });
  await ctx.addInitScript((sv) => localStorage.setItem('cookieheist.save.v1', sv), save);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const tick = (sec) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.simOnly(1 / 30); window.__game.tick(1 / 30); }, Math.round(sec * 30));
  const snap = async (name) => {
    await page.screenshot({ path: `${out}/${name}-${s.name}.png`, timeout: 180000 });
    console.log('saved', name, s.name);
  };
  await page.goto(`${base}?capture&nosdk`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await tick(5);
  await snap('menu-title');
  for (const [act, name] of [['map', 'menu-houses'], ['shop', 'menu-shop'], ['daily', 'menu-daily'], ['missions', 'menu-missions']]) {
    await page.locator(`[data-act="${act}"]`).first().click({ force: true });
    await tick(0.5);
    await snap(name);
    await page.locator('.modal-wrap .close').first().click({ force: true });
  }
  // a win (real bot play)
  await page.goto(`${base}?capture&nosdk&notips&level=1-0&introhold`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await tick(1);
  await snap('intro');
  await page.goto(`${base}?capture&nosdk&notips&level=1-0&autoplay=good&seed=4`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  for (let i = 0; i < 40 && !(await page.locator('.result.win').count()); i++) await page.evaluate(() => { for (let k = 0; k < 60; k++) window.__game.simOnly(1 / 30); });
  await tick(1.5);
  await snap('result-win');
  // caught (beginner bot on a hard night)
  await page.goto(`${base}?capture&nosdk&notips&level=4-11&autoplay=beginner&seed=2`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  for (let i = 0; i < 60 && !(await page.locator('.result.fail').count()); i++) await page.evaluate(() => { for (let k = 0; k < 60; k++) window.__game.simOnly(1 / 30); });
  await tick(1.2);
  await snap('result-caught');
  // pause menu during play
  await page.goto(`${base}?capture&nosdk&notips&level=2-1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await tick(1);
  await page.evaluate(() => window.__game.pause());
  await tick(0.5);
  await snap('pause');
  await ctx.close();
}
await browser.close();
