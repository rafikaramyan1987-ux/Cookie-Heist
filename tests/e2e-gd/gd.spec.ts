import { test, expect, Page } from '@playwright/test';

// window.__ready / __game / GD_OPTIONS are declared by tests/e2e/smoke.spec.ts and src/app/platform/gd.ts
declare global {
  interface Window {
    __gd?: { calls: string[]; mode: 'ok' | 'reject' | 'hang'; hold: boolean; finish?: () => void };
    __ctxs?: AudioContext[];
  }
}
/** the game's coins (window.__game.save.coins) */
const coinsOf = () => (window.__game as unknown as { save: { coins: number } }).save.coins;

const GD_SDK = 'https://html5.api.gamedistribution.com/main.min.js';

/** stand-in for the GD SDK: each ad sends SDK_GAME_PAUSE, then (rewarded: SDK_REWARDED_WATCH_COMPLETE) SDK_GAME_START */
const MOCK = `(() => {
  const ev = (name) => window.GD_OPTIONS && window.GD_OPTIONS.onEvent({ name, message: '', status: 'success' });
  const g = (window.__gd = window.__gd || { calls: [], mode: 'ok', hold: false });
  window.gdsdk = {
    showAd(type) {
      g.calls.push(type || 'interstitial');
      if (g.mode === 'reject') return Promise.reject(new Error('no fill'));
      if (g.mode === 'hang') return new Promise(() => {});
      return new Promise((res) => {
        ev('SDK_GAME_PAUSE');
        g.finish = () => { if (type === 'rewarded') ev('SDK_REWARDED_WATCH_COMPLETE'); ev('SDK_GAME_START'); res(); };
        if (!g.hold) setTimeout(g.finish, 300);
      });
    },
  };
  ev('SDK_READY');
})();`;

async function advance(page: Page, seconds: number) {
  for (let t = 0; t < seconds; t += 1) await page.evaluate(() => { for (let i = 0; i < 30; i++) (window.__game as unknown as { tick(dt: number): void }).tick(1 / 30); });
}

async function boot(page: Page, query = '', sdk: 'mock' | 'blocked' = 'mock') {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push(r.url()));
  await page.addInitScript(() => {
    // track AudioContexts to see the game's audio pause during ads
    const AC = window.AudioContext;
    window.__ctxs = [];
    window.AudioContext = class extends AC {
      constructor(o?: AudioContextOptions) {
        super(o);
        window.__ctxs!.push(this);
      }
    } as typeof AudioContext;
  });
  await page.route(GD_SDK, (r) => (sdk === 'mock' ? r.fulfill({ contentType: 'application/javascript', body: MOCK }) : r.abort()));
  // ?menu: the returning-player path (first-time players go straight into the night-1 tutorial)
  await page.goto(`/?low&menu&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  return { errors, requests };
}

test('GD build: loads the GD SDK once at boot, never the CrazyGames SDK', async ({ page }) => {
  const { errors, requests } = await boot(page);
  await expect(page.locator('.play-btn')).toBeVisible();
  expect(await page.evaluate(() => window.GD_OPTIONS?.gameId)).toBe('6aa8020129824d9c9fc5d2cfed7b2d99');
  expect(await page.locator('script#gamedistribution-jssdk').count()).toBe(1);
  expect(requests.filter((u) => u === GD_SDK)).toHaveLength(1);
  expect(requests.some((u) => /crazygames/i.test(u))).toBe(false);
  expect(await page.evaluate(() => window.__gd!.calls)).toEqual([]);
  expect(errors).toEqual([]);
});

test('GD build: Play shows the pre-roll (game paused + muted), then the night opens', async ({ page }) => {
  const { errors } = await boot(page);
  await page.evaluate(() => (window.__gd!.hold = true));
  await page.locator('.play-btn').click();
  await expect.poll(() => page.evaluate(() => window.__gd!.calls)).toEqual(['interstitial']);
  // while the ad runs the game waits on the title with its audio suspended
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__game!.mode)).toBe('title');
  await expect.poll(() => page.evaluate(() => window.__ctxs!.map((c) => c.state))).toEqual(['suspended']);
  // a second click while the ad is up does nothing
  await page.locator('.play-btn').click({ force: true });
  expect(await page.evaluate(() => window.__gd!.calls)).toEqual(['interstitial']);
  await page.evaluate(() => window.__gd!.finish!());
  await page.waitForFunction(() => window.__game?.mode === 'intro');
  await expect.poll(() => page.evaluate(() => window.__ctxs!.map((c) => c.state))).toEqual(['running']);
  expect(errors).toEqual([]);
});

test('GD build: x2 coins pays only after the rewarded ad completes; no ad → message, button back', async ({ page }) => {
  const { errors } = await boot(page, 'autoplay=good');
  await page.locator('.play-btn').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play' || window.__game?.mode === 'cinematic', null, { timeout: 60_000 });
  // autoplay (demo bot) skips interstitials
  expect(await page.evaluate(() => window.__gd!.calls)).toEqual([]);
  for (let i = 0; i < 60 && !(await page.locator('.result.win').count()); i++) await advance(page, 2);
  await expect(page.locator('.result.win')).toBeVisible({ timeout: 30_000 });
  const dbl = page.locator('.ad-btn.double');
  const coins = await page.evaluate(coinsOf);
  // no fill: the button says so for 2.5 s, then can be tried again
  await page.evaluate(() => (window.__gd!.mode = 'reject'));
  await dbl.click();
  await expect(dbl).toHaveText('No ad available right now, try later');
  await expect(dbl).toBeDisabled();
  await expect(dbl).toBeEnabled({ timeout: 5000 });
  expect(await page.evaluate(coinsOf)).toBe(coins);
  // a completed rewarded ad doubles the coins
  await page.evaluate(() => (window.__gd!.mode = 'ok'));
  await dbl.click();
  await expect(dbl).toHaveText('✓ ×2');
  expect(await page.evaluate(() => window.__gd!.calls)).toEqual(['rewarded', 'rewarded']);
  expect(await page.evaluate(coinsOf)).toBeGreaterThan(coins);
  expect(errors).toEqual([]);
});

test('GD build: the game plays without ads when the GD SDK fails to load', async ({ page }) => {
  const { errors } = await boot(page, '', 'blocked');
  await page.locator('.play-btn').click();
  await page.waitForFunction(() => window.__game?.mode === 'intro', null, { timeout: 10_000 });
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  expect(errors).toEqual([]);
});
