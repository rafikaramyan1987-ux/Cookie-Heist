import { test, expect, Page } from '@playwright/test';

declare global {
  interface Window {
    __ready?: boolean;
    __game?: { mode: string; run: { world: { player: { x: number; z: number }; status: string } } | null };
  }
}

/** advance the game deterministically (headless WebGL can be slow) */
async function advance(page: Page, seconds: number) {
  for (let t = 0; t < seconds; t += 1) await page.evaluate(() => { for (let i = 0; i < 30; i++) (window.__game as unknown as { tick(dt: number): void }).tick(1 / 30); });
}

async function boot(page: Page, query: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?nosdk&low&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  return errors;
}

test('loads the title screen', async ({ page }) => {
  const errors = await boot(page, '');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('.play-btn')).toBeVisible();
  await expect(page.locator('.logo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('plays night 1 and wins (title → intro → play → result)', async ({ page }) => {
  const errors = await boot(page, 'autoplay=good');
  await page.locator('.play-btn').click({ force: true });
  // the intro card (level name + goals) shows first
  await page.waitForFunction(() => ['intro', 'play', 'cinematic'].includes(window.__game?.mode ?? ''), null, { timeout: 60_000 });
  // autoplay starts the night after the intro
  await page.waitForFunction(() => window.__game?.mode === 'play' || window.__game?.mode === 'cinematic', null, { timeout: 60_000 });
  await expect(page.locator('.hud.live')).toBeVisible();
  for (let i = 0; i < 60 && !(await page.locator('.result.win').count()); i++) await advance(page, 2);
  await expect(page.locator('.result.win')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.result-title')).toBeVisible();
  expect(await page.evaluate(() => window.__game?.run?.world.status)).toBe('won');
  expect(errors).toEqual([]);
});

test('the kid moves with keyboard / drag input', async ({ page }, info) => {
  await boot(page, 'level=0-0');
  // start the night from the intro
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  const before = await page.evaluate(() => ({ ...window.__game!.run!.world.player }));
  if (info.project.name === 'desktop') {
    await page.keyboard.down('KeyW');
    await advance(page, 1);
    await page.keyboard.up('KeyW');
  } else {
    // drag on the canvas (virtual joystick)
    const box = (await page.locator('canvas#game').boundingBox())!;
    const x = box.width / 2,
      y = box.height * 0.7;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 40, { steps: 4 });
    await advance(page, 1);
    await page.mouse.up();
  }
  const after = await page.evaluate(() => ({ ...window.__game!.run!.world.player }));
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.2);
});

test('tiptoe is the default: a long drag only runs near the edge, held a moment', async ({ page }) => {
  await boot(page, 'level=0-0');
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  const box = (await page.locator('canvas#game').boundingBox())!;
  const x = box.width / 2,
    y = box.height * 0.7;
  const R = await page.evaluate(() => (window.__game as unknown as { input: { radius: number } }).input.radius);
  const mode = () => page.evaluate(() => (window.__game as unknown as { run: { world: { player: { mode: string } } } }).run.world.player.mode);
  await page.mouse.move(x, y);
  await page.mouse.down();
  // 70 % of the drag: still tiptoe
  await page.mouse.move(x, y - R * 0.7, { steps: 4 });
  await advance(page, 1);
  expect(await mode()).toBe('tiptoe');
  // ≥ 85 % held: run
  await page.mouse.move(x, y - R * 0.97, { steps: 2 });
  await page.waitForTimeout(260);
  await advance(page, 1);
  expect(await mode()).toBe('run');
  await expect(page.locator('.joystick.running')).toHaveCount(1);
  await page.mouse.up();
});

test('shop: buy a boost, try a cap on the rotating Pip before buying', async ({ page }) => {
  const errors = await boot(page, '');
  await page.evaluate(() => {
    const g = window.__game as unknown as { save: { coins: number }; showTitle(): void };
    g.save.coins = 200;
    g.showTitle();
  });
  await page.locator('[data-act="shop"]').click({ force: true });
  await expect(page.locator('.boost-row')).toHaveCount(4);
  await page.locator('.boost-row[data-id="toy"] button').click();
  expect(await page.evaluate(() => (window.__game as unknown as { save: { items: { toy: number }; coins: number } }).save.items.toy)).toBe(1);
  await page.locator('.tabs button[data-k="cap"]').click();
  await expect(page.locator('.shop-stage canvas')).toBeVisible();
  await expect(page.locator('.shop-grid .item img').first()).toBeVisible();
  await page.locator('.item[data-id="cap:crown"]').click();
  await expect(page.locator('.try-name')).not.toHaveText('');
  // trying on does not buy or equip
  expect(await page.evaluate(() => (window.__game as unknown as { save: { cap: string } }).save.cap)).toBe('classic');
  expect(errors).toEqual([]);
});
