// Renders the 3 store covers from the real 3D title scene: node scripts/submission/covers.mjs <base>
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] ?? 'http://127.0.0.1:4174/';
mkdirSync('submission/covers', { recursive: true });
const browser = await chromium.launch({ args: GL_ARGS });
for (const [w, h] of [[1920, 1080], [800, 1200], [800, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}?view=cover&t=7.2`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.waitForTimeout(300);
  const out = `submission/covers/cover-${w}x${h}.png`;
  await page.screenshot({ path: out });
  console.log('saved', out);
  await ctx.close();
}
await browser.close();
