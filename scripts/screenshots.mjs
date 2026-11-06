// Renders art-test screenshots with Playwright (headless Chromium, SwiftShader WebGL).
// usage: node scripts/screenshots.mjs [baseUrl] [views...]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(require.resolve('playwright', { paths: [process.env.NODE_PATH ?? '', '/opt/node22/lib/node_modules'] })); }
const { chromium } = pw;
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173/';
const views = process.argv.slice(3).length ? process.argv.slice(3) : ['title', 'lineup', 'level', 'hud', 'houses'];
const out = process.env.OUT ?? 'docs/screenshots';
const only = process.env.ONLY; // desktop|phone
mkdirSync(out, { recursive: true });
const sizes = [
  { name: 'desktop', width: 1920, height: 1080, dpr: 1 },
  { name: 'phone', width: 390, height: 844, dpr: 2 },
].filter((s) => !only || s.name === only);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.dpr, hasTouch: s.name === 'phone' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${s.name}] ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`[${s.name}] PAGEERROR ${e.message}`));
  for (const v of views) {
    const [name, extra] = v.split('?');
    const t = process.env.T ?? '6';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto(`${base}?view=${name}&t=${t}${extra ? '&' + extra : ''}`);
        await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
        break;
      } catch (e) {
        console.log('retry', name, s.name, e.message.split('\n')[0]);
      }
    }
    await page.waitForTimeout(400);
    const file = `${out}/${name}${extra ? '-' + extra.replace(/[=&]/g, '') : ''}-${s.name}.png`;
    await page.screenshot({ path: file });
    console.log('saved', file);
  }
  await ctx.close();
}
await browser.close();
