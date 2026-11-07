// Phone screenshots of the shop (boosts, 3D try-on) and of a hint (intro replay, countdown, GO pulse).
// usage: node scripts/shop-hint-shots.mjs <base> <outDir>
import { chromium, GL_ARGS } from './pw.mjs';
const [base = 'http://127.0.0.1:4174/', out = 'docs/screenshots/shop-hint', only = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: GL_ARGS });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce', locale: 'fr-FR' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });

// ---- shop
if (only !== 'hint') {
await page.goto(`${base}?nosdk`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await page.evaluate(() => {
  const g = window.__game;
  g.save.coins = 640;
  g.save.items = { toy: 2, peek: 1, hint: 0, pillow: 0 };
  g.save.owned.push('skin:candy', 'cap:bunny');
  g.applySettings();
  g.showTitle();
});
await page.waitForTimeout(500);
await page.click('[data-act="shop"]');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/shop-boosts.png` });
for (const [tab, pick, name] of [['skin', 'skin:dino', 'shop-pyjamas'], ['cap', 'cap:classic', 'shop-caps'], ['trail', 'trail:stars', 'shop-trails']]) {
  await page.click(`.tabs button[data-k="${tab}"]`);
  await page.waitForTimeout(400);
  await page.click(`.item[data-id="${pick}"]`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png` });
}

}
// ---- hint (capture mode: deterministic frames)
if (only !== 'shop') {
await page.goto(`${base}?capture&nosdk&notips&introhold&autoplay=hint&level=0-10&hint&seed=3`);
await page.waitForFunction(() => window.__ready === true && !!window.__game.run, null, { timeout: 120000 });
const tick = (n) => page.evaluate((k) => { for (let i = 0; i < k; i++) window.__game.tick(1 / 30); }, n);
await tick(75); // ghost replay in progress over the overview
console.log("intro ticked", Date.now()); await page.screenshot({ path: `${out}/hint-intro.png`, timeout: 180000 }); console.log("intro shot", Date.now());
// start play: Pip follows the hint (?autoplay=hint)
await page.evaluate(() => window.__game.canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
let shot = 0;
for (let f = 0; f < 30 * 60 && shot < 2; f += 3) {
  await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__game.simOnly(1 / 30); });
  const st = await page.evaluate(() => {
    const r = window.__game.run;
    const w = r.world;
    const ws = r.scene.hint ? r.scene.hint['hint'].waits : [];
    const p = w.player;
    const at = ws.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.5);
    return { t: w.t, at: at ? { t1: at.t1 } : null, status: w.status };
  });
  if (st.status !== 'play') break;
  if (st.at && shot === 0 && st.at.t1 - st.t < 1.6 && st.at.t1 - st.t > 1.0) {
    await tick(1);
    await page.screenshot({ path: `${out}/hint-wait.png` });
    shot = 1;
  } else if (st.at && shot === 1 && st.t - st.at.t1 > 0.1 && st.t - st.at.t1 < 0.4) {
    await tick(1);
    await page.screenshot({ path: `${out}/hint-go.png` });
    shot = 2;
  }
}
console.log('hint shots', shot);
}
await browser.close();
