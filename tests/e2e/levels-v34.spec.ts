// v3.4: a returning player who had finished the 60 old nights sees all 90 nights in the house map, the new
// Farmhouse unlocked in order, and plays a new night to the end — desktop (1280×720) and phone (390×844, touch),
// with no console error.
import { test, expect, type Page } from '@playwright/test';

/** every old night won: as a v3.3 save */
const OLD_IDS = [
  ...['apartment', 'family', 'cottage', 'chalet', 'mansion'].flatMap((h) => Array.from({ length: 12 }, (_, i) => `${h}-${i + 1}`)),
];

async function boot(page: Page, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  await page.addInitScript((ids) => {
    const stars: Record<string, number> = {};
    ids.forEach((id, k) => (stars[id] = (k % 3) + 1));
    localStorage.setItem('cookieheist.save.v1', JSON.stringify({ v: 1, coins: 999, tutorialDone: true, stars }));
  }, OLD_IDS);
  await page.goto(`/?nosdk&low&seed=7${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  await expect(page.locator('#boot')).toHaveCount(0, { timeout: 15_000 });
  return errors;
}

const openMap = async (page: Page) => {
  await page.locator('.title-ui [data-act="map"]').click({ force: true });
  await expect(page.locator('.map-modal .house-card')).toHaveCount(8);
};

test('the house map lists all 8 houses and 90 nights; the old 60 are done, Farmhouse night 1 is the next one', async ({ page }) => {
  const errors = await boot(page);
  await expect(page.locator('.title-ui')).toBeVisible();
  // the Play button leads to the first new night
  expect(await page.evaluate(() => window.__game.nextLevel())).toEqual([5, 0]);
  await openMap(page);
  await expect(page.locator('.map-modal .night')).toHaveCount(90);
  await expect(page.locator('.map-modal .night.done')).toHaveCount(60);
  const names = await page.locator('.map-modal .house-head b').allTextContents();
  expect(names.slice(5)).toEqual(['Farmhouse', 'Beach House', 'Royal Castle']);
  await expect(page.locator('.night[data-h="5"][data-i="0"]')).toBeEnabled();
  await expect(page.locator('.night[data-h="5"][data-i="1"]')).toBeDisabled();
  await expect(page.locator('.night[data-h="6"][data-i="0"]')).toBeDisabled();
  await expect(page.locator('.night[data-h="7"][data-i="9"]')).toBeDisabled();
  // each new house shows 10 nights, its finale last
  for (const h of [5, 6, 7]) {
    await expect(page.locator(`.night[data-h="${h}"]`)).toHaveCount(10);
    await expect(page.locator(`.night[data-h="${h}"][data-i="9"]`)).toHaveClass(/finale/);
  }
  // the last card scrolls into view on a phone
  await page.locator('.map-modal .house-card').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.map-modal .house-card').last()).toBeInViewport();
  expect(errors).toEqual([]);
});

test('a new night (Farmhouse 1) can be played and won; the save keeps the old stars and opens night 2', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await boot(page, '&manual');
  await openMap(page);
  await page.locator('.night[data-h="5"][data-i="0"]').click({ force: true });
  // the intro card, then into the night
  await expect(page.locator('.intro-ui')).toBeVisible();
  expect(await page.evaluate(() => window.__game.run.level.id)).toBe('farmhouse-1');
  await page.locator('.intro-ui').click({ force: true });
  expect(await page.evaluate(() => window.__game.mode)).toBe('play');
  // a few rendered frames of the new house (renderer, sensor rings, sleepers), then the bot plays it out
  await page.evaluate(() => {
    for (let k = 0; k < 10; k++) window.__game.tick(1 / 30);
  });
  let won = false;
  for (let attempt = 0; attempt < 4 && !won; attempt++) {
    await page.evaluate(() => window.__game.autopilot('good'));
    for (let k = 0; k < 120 && (await page.evaluate(() => window.__game.mode)) !== 'result'; k++)
      await page.evaluate(() => {
        for (let s = 0; s < 45; s++) window.__game.simOnly(1 / 30);
      });
    won = (await page.evaluate(() => window.__game.run?.world.status)) === 'won';
    if (!won) await page.evaluate(() => window.__game.retry());
  }
  expect(won).toBe(true);
  await expect(page.locator('.result.win')).toBeVisible();
  const save = await page.evaluate(() => window.__game.save);
  expect(save.stars['farmhouse-1']).toBeGreaterThanOrEqual(1);
  expect(Object.keys(save.stars).filter((k: string) => !k.startsWith('farmhouse'))).toHaveLength(60);
  expect(await page.evaluate(() => window.__game.unlocked(5, 1))).toBe(true);
  expect(errors).toEqual([]);
});
