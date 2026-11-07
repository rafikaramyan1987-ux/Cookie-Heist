// Deterministic in-game screenshots: node scripts/shot-game.mjs <base> <out.png> <query> <seconds> [w h dpr]
import { chromium, GL_ARGS } from './pw.mjs';
const [base, out, query, secs, W = '1920', H = '1080', DPR = '1'] = process.argv.slice(2);
const browser = await chromium.launch({ args: GL_ARGS });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DPR, hasTouch: +W < 800 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
await page.goto(`${base}?capture&nosdk&notips&${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const steps = Math.round(+secs * 30);
for (let i = 0; i < steps; i += 30) await page.evaluate((n) => { for (let k = 0; k < n; k++) (window.__game.simOnly ?? window.__game.tick).call(window.__game, 1 / 30); }, Math.min(30, steps - i));
await page.evaluate(() => window.__game.tick(1 / 30));
await page.screenshot({ path: out });
console.log('saved', out);
await browser.close();
