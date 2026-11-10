// v3 store covers A / B / C / B2 (3 sizes each) rendered from the real 3D scene, + a contact sheet at real thumbnail
// sizes (200 px and 400 px wide). B2 is the main cover: also copied to submission/cover-<size>.png.
//   node scripts/submission/covers-v3.mjs <base>
// Out: submission/covers-v3/{A,B,C,B2}/cover-{1920x1080,800x1200,800x800}.png, submission/cover-*.png,
// docs/media/covers-v3-sheet.png
import { chromium, GL_ARGS } from '../pw.mjs';
import { mkdirSync, readFileSync, copyFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:4174/';
const SIZES = [
  [1920, 1080],
  [800, 1200],
  [800, 800],
];
const VARIANTS = ['A', 'B', 'C', 'B2'];
const MAIN = 'B2';
const browser = await chromium.launch({ args: GL_ARGS });
for (const v of VARIANTS) {
  mkdirSync(`submission/covers-v3/${v}`, { recursive: true });
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${base}?view=cover3&v=${v}&t=4`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.waitForTimeout(400);
    const out = `submission/covers-v3/${v}/cover-${w}x${h}.png`;
    await page.screenshot({ path: out });
    console.log('saved', out);
    await ctx.close();
  }
}

for (const [w, h] of SIZES) copyFileSync(`submission/covers-v3/${MAIN}/cover-${w}x${h}.png`, `submission/cover-${w}x${h}.png`);
console.log(`main cover ${MAIN} copied to submission/cover-*.png`);

// contact sheet: each cover downscaled (high quality, in steps) to 200 px and 400 px wide, as portals show them
mkdirSync('docs/media', { recursive: true });
const imgs = {};
for (const v of VARIANTS) for (const [w, h] of SIZES) imgs[`${v}-${w}x${h}`] = `data:image/png;base64,${readFileSync(`submission/covers-v3/${v}/cover-${w}x${h}.png`).toString('base64')}`;
const ctx = await browser.newContext({ viewport: { width: 2000, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.setContent(`<!doctype html><html><head><style>
  body { margin: 0; background: #f3f0ea; font: 600 15px system-ui, sans-serif; color: #2a1a33; }
  .sheet { display: inline-block; padding: 24px 28px; }
  h1 { margin: 0 0 4px; font-size: 24px; } p.sub { margin: 0 0 18px; color: #6a5a70; font-weight: 500; }
  .row { display: flex; align-items: flex-start; gap: 18px; margin-bottom: 22px; }
  .lab { width: 150px; flex: none; } .lab b { display: block; font-size: 40px; line-height: 1; } .lab span { font-weight: 500; font-size: 13px; color: #6a5a70; }
  figure { margin: 0; } figcaption { font-size: 11px; color: #6a5a70; margin-top: 4px; font-weight: 500; }
  canvas { display: block; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
  .sep { width: 2px; align-self: stretch; background: #ddd5ca; }
</style></head><body><div class="sheet"><h1>Cookie Heist — covers v3</h1><p class="sub">Each cover at real thumbnail sizes: 200 px and 400 px wide (1920×1080 · 800×1200 · 800×800). Top-left corner kept clear.</p><div id="rows"></div></div></body></html>`);
await page.evaluate(
  async ({ imgs, VARIANTS, SIZES }) => {
    const NOTES = { A: 'Close-up: guilty grin, giant glowing cookie, beam behind', B: 'Under the table: mum’s legs + flashlight, glowing jar', C: 'Top-down: past sleeping dad, beam almost touching', B2: 'MAIN COVER — B with the kid big and clear: guilty grin to camera, cookie at the side, lit by the jar' };
    const shrink = async (src, tw) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      let c = img,
        cw = img.width,
        ch = img.height;
      const th = Math.round((img.height / img.width) * tw);
      while (cw / 2 >= tw) {
        const n = document.createElement('canvas');
        n.width = Math.round(cw / 2);
        n.height = Math.round(ch / 2);
        const g = n.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(c, 0, 0, n.width, n.height);
        c = n;
        cw = n.width;
        ch = n.height;
      }
      const out = document.createElement('canvas');
      out.width = tw;
      out.height = th;
      const g = out.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(c, 0, 0, tw, th);
      return out;
    };
    const rows = document.getElementById('rows');
    for (const v of VARIANTS) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<div class="lab"><b>${v}</b><span>${NOTES[v]}</span></div>`;
      for (const tw of [200, 400]) {
        if (tw === 400) row.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
        for (const [w, h] of SIZES) {
          const fig = document.createElement('figure');
          fig.appendChild(await shrink(imgs[`${v}-${w}x${h}`], tw));
          const cap = document.createElement('figcaption');
          cap.textContent = `${w}×${h} @ ${tw} px`;
          fig.appendChild(cap);
          row.appendChild(fig);
        }
      }
      rows.appendChild(row);
    }
  },
  { imgs, VARIANTS, SIZES },
);
const sheet = await page.locator('.sheet').screenshot({ path: 'docs/media/covers-v3-sheet.png' });
console.log('saved docs/media/covers-v3-sheet.png', sheet.length);
await browser.close();
