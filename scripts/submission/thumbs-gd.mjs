// GameDistribution thumbnails (JPG) rendered from the real 3D title scene (title + characters only):
//   node scripts/submission/thumbs-gd.mjs <base>
// Each one is rendered at a large viewport with the same aspect ratio, then downscaled in the browser.
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://127.0.0.1:4175/';
const out = 'submission-gd/thumbnails';
mkdirSync(out, { recursive: true });
// [width, height, render width, render height]
const SIZES = [
  [512, 384, 1024, 768],
  [512, 512, 800, 800],
  [200, 120, 1000, 600],
  [1280, 720, 1920, 1080],
  [1280, 550, 1920, 825],
];
const browser = await chromium.launch({ args: GL_ARGS });
const shrink = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
for (const [w, h, rw, rh] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: rw, height: rh }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}?view=cover&t=7.2`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.waitForTimeout(300);
  const png = (await page.screenshot()).toString('base64');
  await ctx.close();
  // high-quality downscale (halving steps) and JPG encode
  const jpg = await shrink.evaluate(
    async ({ png, w, h }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      let src = img,
        sw = img.width,
        sh = img.height;
      while (sw / 2 >= w && sh / 2 >= h) {
        const c = document.createElement('canvas');
        c.width = Math.round(sw / 2);
        c.height = Math.round(sh / 2);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(src, 0, 0, c.width, c.height);
        src = c;
        sw = c.width;
        sh = c.height;
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.9).split(',')[1];
    },
    { png, w, h },
  );
  const file = `${out}/thumb-${w}x${h}.jpg`;
  writeFileSync(file, Buffer.from(jpg, 'base64'));
  console.log('saved', file);
}
await browser.close();
