// GameMonetize thumbnails: the B2 cover scene (submission/covers-v3/B2, `?view=cover3&v=B2&t=4`) re-rendered at the
// three GameMonetize ratios WITHOUT the title logo overlay (GameMonetize: no text or logo on the images), at 2x, then
// downscaled to JPG under 300 KB.
//   npx vite --host 127.0.0.1 --port 4174 &   node scripts/gamemonetize/images.mjs http://127.0.0.1:4174/
// Out: submission-gamemonetize/cookie-heist-{512x384,512x512,512x340}.jpg
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const base = process.argv[2] ?? 'http://127.0.0.1:4174/';
const SIZES = [
  [512, 384],
  [512, 512],
  [512, 340],
];
const OUT = 'submission-gamemonetize';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: GL_ARGS });
for (const [w, h] of SIZES) {
  // rendered at 2x the CSS size of a 1024-wide viewport, so the scene framing matches the big covers
  const ctx = await browser.newContext({ viewport: { width: w * 2, height: h * 2 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}?view=cover3&v=B2&t=4`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  // no text or logo: drop every overlay element above the 3D canvas
  await page.evaluate(() => document.querySelectorAll('#ui > *').forEach((e) => e.remove()));
  await page.waitForTimeout(400);
  const png = `${OUT}/.tmp-${w}x${h}.png`;
  await page.screenshot({ path: png });
  await ctx.close();
  const jpg = `${OUT}/cookie-heist-${w}x${h}.jpg`;
  execFileSync('convert', [png, '-filter', 'Lanczos', '-resize', `${w}x${h}!`, '-strip', '-sampling-factor', '4:2:0', '-quality', '88', '-interlace', 'JPEG', jpg]);
  rmSync(png);
  const size = statSync(jpg).size;
  if (size >= 300 * 1024) throw new Error(`${jpg}: ${size} bytes (limit 300 KB)`);
  console.log(`saved ${jpg} (${(size / 1024).toFixed(0)} KB)`);
}
await browser.close();
