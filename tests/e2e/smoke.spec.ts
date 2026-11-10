import { test, expect, Page } from '@playwright/test';
import { walk, idle, TUTORIAL } from '../../scripts/media/driver';

/** advance the game deterministically (headless WebGL can be slow) */
async function advance(page: Page, seconds: number) {
  for (let t = 0; t < seconds; t += 1) await page.evaluate(() => { for (let i = 0; i < 30; i++) window.__game.tick(1 / 30); });
}
/** one game frame without rendering (same logic and camera; software WebGL makes rendering every frame slow on CI) */
const step = (page: Page) => (dt: number) => page.evaluate((d) => window.__game.simOnly(d), dt);

/** a returning player (tutorial done): the menu shows */
async function returning(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript((save) => localStorage.setItem('cookieheist.save.v1', JSON.stringify(save)), { v: 1, tutorialDone: true, stars: { 'apartment-1': 3 }, ...extra });
}

async function boot(page: Page, query: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?nosdk&low&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  return errors;
}

/** no text sticks out of its button / card */
async function overflowing(page: Page, sel: string) {
  return page.evaluate((s) => {
    // decorative corner badges stick out on purpose: measure without them
    document.querySelectorAll<HTMLElement>('.badge').forEach((b) => (b.style.display = 'none'));
    return [...document.querySelectorAll<HTMLElement>(s)]
      .filter((e) => e.offsetParent && (e.scrollWidth > e.clientWidth + 2 || e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1))
      .map((e) => `${e.className}: ${e.textContent?.trim().slice(0, 40)}`);
  }, sel);
}

test('first visit: the loading screen, then straight into night 1 with the in-game tutorial (no menu)', async ({ page }) => {
  const errors = await boot(page, '');
  expect(await page.evaluate(() => window.__game.mode)).toBe('play');
  await expect(page.locator('.tutorial .tut-line')).toBeVisible();
  await expect(page.locator('.tut-skip')).toBeVisible();
  await expect(page.locator('.title-ui')).toHaveCount(0);
  await expect(page.locator('#boot')).toHaveCount(0, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('tutorial: sneak to the basket, mum sweeps past ("Phew!"), grab the cookie, back to bed → result with teaser + daily', async ({ page }) => {
  test.setTimeout(480_000);
  // ?manual: no internal frame loop, the test drives every frame
  const errors = await boot(page, 'fakeads&manual');
  const s = step(page);
  await walk(page, TUTORIAL.basket, s);
  await idle(page, 1, s);
  expect(await page.evaluate(() => window.__game.run.tut.step)).toBe('stay');
  for (let i = 0; i < 300 && (await page.evaluate(() => window.__game.run.tut.step)) === 'stay'; i++) await s(1 / 30);
  expect(await page.evaluate(() => window.__game.run.tut.step)).toBe('cookie');
  await walk(page, TUTORIAL.cookie, s);
  await walk(page, TUTORIAL.bed, s);
  for (let i = 0; i < 150 && !(await page.locator('.result.win').count()); i++) await s(1 / 30);
  await expect(page.locator('.result.win')).toBeVisible();
  expect(await page.evaluate(() => window.__game.run.world.stats.spotted)).toBe(0);
  await expect(page.locator('.result .teaser')).toBeVisible();
  await expect(page.locator('.result .daily-peek')).toBeVisible();
  // rewarded button: TV icon + "Ad" label
  await expect(page.locator('.result .ad-btn .ad-tag svg')).toBeVisible();
  expect(await page.evaluate(() => window.__game.save.tutorialDone)).toBe(true);
  // the daily calendar from the end screen: claim day 1
  await page.locator('.daily-peek').click();
  await expect(page.locator('.daily-modal .day')).toHaveCount(7);
  await page.locator('.daily-modal .claim').click();
  expect(await page.evaluate(() => window.__game.save.daily.streak)).toBe(1);
  expect(errors).toEqual([]);
});

test('retry is instant: one tap, straight back into play (no intro card)', async ({ page }) => {
  await returning(page);
  await boot(page, 'level=0-1');
  await page.locator('.intro-ui').click({ force: true });
  await page.evaluate(() => window.__game.retry());
  expect(await page.evaluate(() => window.__game.mode)).toBe('play');
  await expect(page.locator('.intro-ui')).toHaveCount(0);
});

test('returning player: menu with daily gift (pulsing), missions progress, midnight snack', async ({ page }) => {
  await returning(page);
  const errors = await boot(page, '');
  await expect(page.locator('.play-btn')).toBeVisible();
  await expect(page.locator('.logo')).toBeVisible();
  await expect(page.locator('.side-btn.daily .badge.pulse')).toBeVisible();
  await expect(page.locator('.missions-bar .bar')).toBeVisible();
  await expect(page.locator('.side-btn.snack.ready')).toBeVisible();
  await page.locator('.side-btn.snack').click();
  expect(await page.evaluate(() => window.__game.run.kind)).toBe('snack');
  expect(errors).toEqual([]);
});

test('plays night 1 and wins (menu → intro → play → result); no rewarded buttons without an ad SDK', async ({ page }) => {
  await returning(page, { stars: {} });
  const errors = await boot(page, 'autoplay=good');
  await page.locator('.play-btn').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play' || window.__game?.mode === 'cinematic', null, { timeout: 60_000 });
  await expect(page.locator('.hud.live')).toBeVisible();
  await expect(page.locator('.goal-line')).toBeVisible();
  for (let i = 0; i < 60 && !(await page.locator('.result.win').count()); i++) await advance(page, 2);
  await expect(page.locator('.result.win')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => window.__game?.run?.world.status)).toBe('won');
  await expect(page.locator('.result .ad-btn')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the kid moves with keyboard (KeyboardEvent.code) / drag input', async ({ page }, info) => {
  await returning(page);
  await boot(page, 'level=0-1');
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  const before = await page.evaluate(() => ({ ...window.__game.run.world.player }));
  if (info.project.name === 'desktop') {
    await page.keyboard.down('KeyW');
    await advance(page, 1);
    await page.keyboard.up('KeyW');
  } else {
    const box = (await page.locator('canvas#game').boundingBox())!;
    const x = box.width / 2,
      y = box.height * 0.7;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 40, { steps: 4 });
    await advance(page, 1);
    await page.mouse.up();
  }
  const after = await page.evaluate(() => ({ ...window.__game.run.world.player }));
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.2);
});

test('tiptoe is the default: a long drag only runs near the edge, held a moment', async ({ page }) => {
  await returning(page);
  await boot(page, 'level=0-1');
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  const box = (await page.locator('canvas#game').boundingBox())!;
  const x = box.width / 2,
    y = box.height * 0.7;
  const R = await page.evaluate(() => window.__game.input.radius);
  const mode = () => page.evaluate(() => window.__game.run.world.player.mode);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - R * 0.7, { steps: 4 });
  await advance(page, 1);
  expect(await mode()).toBe('tiptoe');
  await page.mouse.move(x, y - R * 0.97, { steps: 2 });
  await page.waitForTimeout(260);
  await advance(page, 1);
  expect(await mode()).toBe('run');
  await expect(page.locator('.joystick.running')).toHaveCount(1);
  await page.mouse.up();
});

test('shop: buy a boost, try a cap on the rotating Pip before buying', async ({ page }) => {
  await returning(page, { coins: 200 });
  const errors = await boot(page, '');
  await page.locator('[data-act="shop"]').click({ force: true });
  await expect(page.locator('.boost-row')).toHaveCount(4);
  await page.locator('.boost-row[data-id="toy"] button').click();
  expect(await page.evaluate(() => window.__game.save.items.toy)).toBe(1);
  await page.locator('.tabs button[data-k="cap"]').click();
  await expect(page.locator('.shop-stage canvas')).toBeVisible();
  await expect(page.locator('.shop-grid .item img').first()).toBeVisible();
  await page.locator('.item[data-id="cap:crown"]').click();
  await expect(page.locator('.try-name')).not.toHaveText('');
  expect(await page.evaluate(() => window.__game.save.cap)).toBe('classic');
  expect(errors).toEqual([]);
});

for (const lang of ['de', 'ru'])
  test(`${lang}: menu, settings, HUD and end screen texts fit`, async ({ page }) => {
    await returning(page, { lang, stars: {} });
    const errors = await boot(page, 'fakeads');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
    expect(await overflowing(page, '.title-ui button, .title-ui .chip')).toEqual([]);
    await page.locator('[data-act="settings"]').click();
    expect(await overflowing(page, '.settings-modal .modal, .settings-modal button')).toEqual([]);
    await page.locator('.settings-modal .close').click();
    await page.locator('[data-act="daily"]').click();
    expect(await overflowing(page, '.daily-modal .modal, .daily-modal button')).toEqual([]);
    await page.locator('.daily-modal .close').click();
    await page.evaluate(() => window.__game.openLevel(0, 1, { quick: true }));
    expect(await overflowing(page, '.hud .chip, .hud button')).toEqual([]);
    // the end screen (layout only: force a win instead of playing the night)
    await page.evaluate(() => {
      window.__game.run.world.status = 'won';
      window.__game.showResult();
    });
    await page.waitForTimeout(800);
    expect(await overflowing(page, '.result-card, .result-card button, .result-card .teaser')).toEqual([]);
    expect(errors).toEqual([]);
  });
