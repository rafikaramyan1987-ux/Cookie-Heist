import { test, expect, Page } from '@playwright/test';

// window.__ready / __game / SDK_OPTIONS are declared by tests/e2e/smoke.spec.ts and src/app/platform/gamemonetize.ts
declare global {
  interface Window {
    __gm?: { calls: number; hold: boolean; finish?: () => void };
    __ctxs?: AudioContext[];
  }
}
type Game = { mode: string; tick(dt: number): void };
const game = () => window.__game as unknown as Game;

const GM_SDK = 'https://api.gamemonetize.com/sdk.js';

/** stand-in for GameMonetize's sdk.js: SDK_READY at load; showBanner() sends SDK_GAME_PAUSE, then SDK_GAME_START */
const STUB = `(() => {
  const ev = (name) => window.SDK_OPTIONS && window.SDK_OPTIONS.onEvent({ name });
  const g = (window.__gm = window.__gm || { calls: 0, hold: false });
  window.sdk = {
    showBanner() {
      g.calls++;
      ev('SDK_GAME_PAUSE');
      g.finish = () => ev('SDK_GAME_START');
      if (!g.hold) setTimeout(g.finish, 300);
    },
  };
  ev('SDK_READY');
})();`;

async function advance(page: Page, seconds: number) {
  for (let t = 0; t < seconds; t += 1)
    await page.evaluate(() => {
      for (let i = 0; i < 30; i++) (window.__game as unknown as { tick(dt: number): void }).tick(1 / 30);
    });
}

async function boot(page: Page, query = '', sdk: 'stub' | 'blocked' = 'stub') {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    // a blocked SDK shows up as a failed resource load: that is the case under test, not a game error
    if (m.type() === 'error' && !(sdk === 'blocked' && /Failed to load resource/.test(m.text()))) errors.push(m.text());
  });
  page.on('request', (r) => requests.push(r.url()));
  await page.addInitScript(() => {
    const AC = window.AudioContext;
    window.__ctxs = [];
    window.AudioContext = class extends AC {
      constructor(o?: AudioContextOptions) {
        super(o);
        window.__ctxs!.push(this);
      }
    } as typeof AudioContext;
  });
  await page.route(GM_SDK, (r) => (sdk === 'stub' ? r.fulfill({ contentType: 'application/javascript', body: STUB }) : r.abort()));
  await page.goto(`/?low&menu&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  return { errors, requests };
}

test('GameMonetize build: loads sdk.js once at boot with SDK_OPTIONS, no other portal SDK, no ad before Play', async ({ page }) => {
  const { errors, requests } = await boot(page);
  await expect(page.locator('.play-btn')).toBeVisible();
  expect(await page.evaluate(() => window.SDK_OPTIONS?.gameId)).toBe('p4y3j0gzsj1efndrh21up9ji7ykxjyo8');
  expect(await page.locator('script#gamemonetize-sdk').count()).toBe(1);
  expect(requests.filter((u) => u === GM_SDK)).toHaveLength(1);
  expect(requests.some((u) => /crazygames|gamedistribution|gamepix|playgama/i.test(u))).toBe(false);
  expect(await page.evaluate(() => window.__gm!.calls)).toBe(0);
  expect(errors).toEqual([]);
});

test('GameMonetize build: Play shows one interstitial (game waits, audio suspended), then the night opens and plays', async ({ page }) => {
  const { errors } = await boot(page);
  await page.evaluate(() => (window.__gm!.hold = true));
  await page.locator('.play-btn').click();
  await expect.poll(() => page.evaluate(() => window.__gm!.calls)).toBe(1);
  await page.waitForTimeout(300);
  expect(await page.evaluate(game)).toMatchObject({ mode: 'title' });
  await expect.poll(() => page.evaluate(() => window.__ctxs!.map((c) => c.state))).toEqual(['suspended']);
  await page.locator('.play-btn').click({ force: true });
  expect(await page.evaluate(() => window.__gm!.calls)).toBe(1);
  await page.evaluate(() => window.__gm!.finish!());
  await page.waitForFunction(() => window.__game?.mode === 'intro');
  await expect.poll(() => page.evaluate(() => window.__ctxs!.map((c) => c.state))).toEqual(['running']);
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  expect(errors).toEqual([]);
});

test('GameMonetize build: no rewarded-ad buttons on the result screen (the SDK has no rewarded API)', async ({ page }) => {
  const { errors } = await boot(page, 'autoplay=good');
  await page.locator('.play-btn').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play' || window.__game?.mode === 'cinematic', null, { timeout: 60_000 });
  for (let i = 0; i < 60 && !(await page.locator('.result.win').count()); i++) await advance(page, 2);
  await expect(page.locator('.result.win')).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('.ad-btn').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('GameMonetize build: the game plays without ads when sdk.js fails to load', async ({ page }) => {
  const { errors } = await boot(page, '', 'blocked');
  await page.locator('.play-btn').click();
  await page.waitForFunction(() => window.__game?.mode === 'intro', null, { timeout: 10_000 });
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  expect(errors).toEqual([]);
});
