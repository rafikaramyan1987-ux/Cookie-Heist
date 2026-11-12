// "Zero errors" for the CrazyGames build, on Chromium, WebKit and Firefox, desktop and phone
// (playwright.crash.config.ts). Each scenario fails on any error the CrazyGames SDK would report as a crash
// (uncaught error, unhandled rejection), any console error, the game's last-resort record, loading that never
// reaches loadingStop, gameplayStart before loadingStop, or an unexpected WebGL context loss.
// See docs/crash-investigation.md for what each scenario reproduced on v3.2.
import { test, expect } from '@playwright/test';
import { start, loaded, mode, playNight, winNight, next, clean, frames, sim, intoNight } from './harness';

test('first visit: loading → night 1 (tutorial) → three more nights with midgame ads', async ({ page }, info) => {
  const run = await start(page, info);
  await loaded(page, run);
  expect(await mode(page)).toBe('play');
  for (let n = 0; n < 4; n++) {
    await playNight(page);
    await next(page);
  }
  const ev = (await run.events()).map((e) => e[0]);
  expect(ev).toContain('ad:midgame');
  await clean(run);
});

for (const [save, days] of [
  ['save-v2.json', 1],
  ['save-v3.json', 1],
  ['save-v3.2.json', 8],
] as const) {
  test(`returning player, ${save.replace('.json', '')} save, ${days} day(s) later: menu, daily reward, two nights`, async ({ page }, info) => {
    const run = await start(page, info, { save, days });
    await loaded(page, run);
    await expect(page.locator('.title-ui')).toBeVisible();
    const coins = await page.evaluate(() => window.__game.save.coins);
    expect(coins).toBeGreaterThan(0); // the old progress is there
    // the day changed: the daily reward can be claimed, the missions are new
    await page.locator('.title-ui [data-act="daily"]').click({ force: true });
    // a real click once the modal has finished popping in (a forced click mid-animation can land beside the button)
    await page.locator('.daily-modal .claim').click();
    await expect.poll(() => page.evaluate(() => window.__game.save.coins)).toBeGreaterThan(coins);
    await page.locator('.daily-modal .close, .daily-modal [data-act="close"]').first().click({ force: true }).catch(() => page.keyboard.press('Escape'));
    await page.evaluate(() => document.querySelectorAll('.modal-wrap').forEach((m) => m.remove()));
    for (let n = 0; n < 2; n++) {
      await playNight(page);
      await next(page);
    }
    await clean(run);
  });
}

test('ads: rewarded and midgame — success, error, blocked (requestAd throws), no fill (never answers)', async ({ page }, info) => {
  test.setTimeout(420_000);
  const run = await start(page, info, { save: 'save-v3.2.json' });
  await loaded(page, run);
  for (const m of ['ok', 'error', 'blocked', 'nofill'] as const)
    await test.step(`ad mode: ${m}`, async () => {
      await page.evaluate((m) => (window.__adMode = m), m);
      await winNight(page);
      const dbl = page.locator('.result .ad-btn.double');
      await expect(dbl).toBeVisible();
      await dbl.click({ force: true });
      // every request settles: paid (✓) or "no ad", and the button is usable again — never stuck
      await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.result .ad-btn.double')?.disabled || /✓/.test(document.querySelector('.result .ad-btn.double')?.textContent ?? ''), null, { timeout: 20_000 });
      if (m === 'ok') await expect(dbl).toContainText('✓');
      await next(page);
      expect(['intro', 'play']).toContain(await mode(page));
      expect(await page.evaluate(() => window.__game.adPausedPlay)).toBe(false);
    });
  await clean(run);
});

test('pause / resume, tab hidden / shown, resize and rotate', async ({ page }, info) => {
  const run = await start(page, info, { save: 'save-v3.json' });
  await loaded(page, run);
  await intoNight(page);
  const hide = (h: boolean) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, h);
  for (let i = 0; i < 2; i++) {
    await hide(true);
    expect(await mode(page)).toBe('paused');
    await hide(false);
    await page.evaluate(() => window.__game.resume());
    expect(await mode(page)).toBe('play');
  }
  await page.evaluate(() => window.__game.pause());
  await page.locator('.pause-modal button').first().click({ force: true });
  const vp = page.viewportSize()!;
  for (const [w, h] of [
    [vp.height, vp.width],
    [1366, 768],
    [640, 480],
    [390, 844],
    [vp.width, vp.height],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    await frames(page, 2);
  }
  await page.evaluate(() => window.__game.showTitle());
  for (const [w, h] of [
    [844, 390],
    [vp.width, vp.height],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    await frames(page, 2);
  }
  await clean(run);
});

test('WebGL context lost and restored (menu and during a night), then play on', async ({ page }, info) => {
  const run = await start(page, info, { save: 'save-v3.json' });
  await loaded(page, run);
  await frames(page, 3);
  const lose = () => page.evaluate(() => (window as unknown as { __lc: WEBGL_lose_context }).__lc.loseContext());
  const restore = () => page.evaluate(() => (window as unknown as { __lc: WEBGL_lose_context }).__lc.restoreContext());
  await page.evaluate(() => ((window as unknown as { __lc: unknown }).__lc = window.__game.stage.renderer.getContext().getExtension('WEBGL_lose_context')));
  await lose();
  await page.waitForFunction(() => (window.__lost ?? 0) >= 1);
  await frames(page, 3);
  await restore();
  await page.waitForFunction(() => !window.__game.stage.renderer.getContext().isContextLost());
  await frames(page, 3);
  await intoNight(page);
  await lose();
  await page.waitForFunction(() => (window.__lost ?? 0) >= 2);
  expect(await mode(page)).toBe('paused'); // the night waits while the screen is black
  await frames(page, 3);
  await restore();
  await page.waitForFunction(() => !window.__game.stage.renderer.getContext().isContextLost());
  await page.evaluate(() => window.__game.resume());
  await frames(page, 3);
  await playNight(page);
  await clean(run);
});

test('low memory: many nights and retries in a row keep GPU memory flat', async ({ page }, info) => {
  test.setTimeout(420_000);
  const run = await start(page, info, { save: 'save-v3.2.json' });
  await loaded(page, run);
  const geos: number[] = [];
  for (let n = 0; n < 10; n++) {
    geos.push(
      await page.evaluate((n) => {
        const g = window.__game;
        if (n % 3 === 2) g.retry();
        else g.openLevel(n % 5, (n * 5) % 12, { quick: true });
        for (let i = 0; i < 2; i++) g.tick(1 / 30);
        return g.stage.renderer.info.memory.geometries as number;
      }, n),
    );
  }
  // v3.2: +~100 geometries per night, never freed (269 → 1345 after 12 nights). Now: one night's worth.
  expect(Math.max(...geos) - geos[0]).toBeLessThan(200);
  await clean(run);
});

test('slow network, and every lazy download failing once: houses, title scene, language, shop, three.js', async ({ page }, info) => {
  const run = await start(page, info, { save: 'save-v3.json', delayMs: 250, fail: /\/assets\/(rest|titleView|fr|pipPreview|audioExtra|three)-[\w-]+\.js$/, failTimes: 1, locale: 'fr-FR' });
  await loaded(page, run);
  await expect(page.locator('.title-ui')).toBeVisible();
  await sim(page, 2);
  await playNight(page);
  await next(page);
  expect(run.injected.length).toBeGreaterThan(0);
  await clean(run);
});

test('offline after loading: houses 2–5 never arrive — the menu still shows and house 1 plays', async ({ page }, info) => {
  const run = await start(page, info, { save: 'save-v3.json', fail: /\/assets\/rest-[\w-]+\.js$/ });
  await loaded(page, run);
  await expect(page.locator('.title-ui')).toBeVisible();
  await playNight(page);
  await next(page);
  await clean(run);
});

test('private mode: no localStorage / sessionStorage and the Data Module disabled — first visit plays, progress kept for the session', async ({ page }, info) => {
  const run = await start(page, info, { noStorage: true, dataDisabled: true });
  await loaded(page, run);
  await playNight(page);
  await next(page);
  await playNight(page);
  expect(Object.keys(await page.evaluate(() => window.__game.save.stars)).length).toBeGreaterThan(0);
  await clean(run);
});

test('the CrazyGames Data Module holds the save: a returning player finds it even with localStorage blocked', async ({ page }, info) => {
  const run = await start(page, info, { noStorage: true, save: 'save-v3.2.json' });
  await loaded(page, run);
  await expect(page.locator('.title-ui')).toBeVisible();
  expect(await page.evaluate(() => window.__game.save.coins)).toBe(345);
  await playNight(page);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => JSON.parse(window.__cgStore!.get('cookieheist.save.v1')!).coins)).toBeGreaterThan(345);
  await clean(run);
});

test('the game script itself fails to download once: one reload, then the game loads', async ({ page }, info) => {
  const run = await start(page, info, { fail: /\/assets\/index-[\w-]+\.js$/, failTimes: 1 });
  await loaded(page, run);
  expect(await mode(page)).toBe('play');
  await clean(run);
});

test('no WebGL: the loading screen says so (with Retry), nothing uncaught', async ({ page }, info) => {
  const run = await start(page, info, { noWebgl: true });
  await expect(page.locator('#boot[data-failed="webgl"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#boot-retry')).toBeVisible();
  expect((await run.events()).map((e) => e[0])).not.toContain('gameplayStart');
  await clean(run);
});

test('official CrazyGames SDK (local mode on 127.0.0.1): load, a night, a rewarded ad request', async ({ page }, info) => {
  const run = await start(page, info, { sdk: 'official' });
  await loaded(page, run, false);
  const env = await page.evaluate(() => (window as unknown as { CrazyGames?: { SDK: { environment: string } } }).CrazyGames?.SDK.environment ?? 'not loaded (offline)');
  info.annotations.push({ type: 'sdk environment', description: env });
  await playNight(page);
  const dbl = page.locator('.result .ad-btn.double');
  if (await dbl.count()) {
    await dbl.click({ force: true });
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.result .ad-btn.double')?.disabled || /✓/.test(document.querySelector('.result .ad-btn.double')?.textContent ?? ''), null, { timeout: 30_000 });
  }
  await next(page);
  await clean(run);
});
