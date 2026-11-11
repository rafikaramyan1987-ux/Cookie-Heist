import { test, expect, Page } from '@playwright/test';

// window.__ready / __game / y8 are declared by tests/e2e/smoke.spec.ts and src/app/platform/y8.ts
declare global {
  interface Window {
    __y8?: { calls: string[]; mode: 'viewed' | 'noAd' | 'dismissed'; hold: boolean; finish?: () => void };
    __ctxs?: AudioContext[];
  }
}
/** the game's coins (window.__game.save.coins) */
const coinsOf = () => (window.__game as unknown as { save: { coins: number } }).save.coins;

const Y8_SDK = 'https://cdn.y8.com/minimal-sdk/2-0/y8.min.js';

/**
 * stand-in for y8.min.js: fires `y8sdk.ready` on load (and again on emitReadyEvent); showAd() records the call (and
 * whether init() came first), then plays the documented callbacks: beforeAd → (reward: adViewed / adDismissed) →
 * afterAd → adBreakDone, or only adBreakDone({ breakStatus: 'noAdPreloaded' })
 */
const STUB = `(() => {
  const g = (window.__y8 = window.__y8 || { calls: [], mode: 'viewed', hold: false });
  let inited = false;
  const sdk = {
    init(app, ad) { g.calls.push('init:' + app.appId + ':' + ad.gameId); inited = true; setTimeout(() => ad.onReady && ad.onReady(), 0); },
    onAuth(cb) { setTimeout(() => cb(null, null), 0); },
    showAd(o) {
      g.calls.push((inited ? '' : 'BEFORE-INIT:') + o.type);
      return new Promise((res) => {
        if (g.mode === 'noAd') { o.adBreakDone && o.adBreakDone({ breakStatus: 'noAdPreloaded' }); return res(); }
        const play = () => {
          o.beforeAd && o.beforeAd();
          g.finish = () => {
            if (o.type === 'reward') (g.mode === 'viewed' ? o.adViewed : o.adDismissed)();
            o.afterAd && o.afterAd();
            o.adBreakDone && o.adBreakDone({ breakStatus: g.mode });
            res();
          };
          if (!g.hold) setTimeout(g.finish, 300);
        };
        if (o.type === 'reward') o.beforeReward(play); else play();
      });
    },
  };
  const ready = () => window.dispatchEvent(new Event('y8sdk.ready'));
  window.y8 = { sdk: () => sdk, emitReadyEvent: ready };
  ready();
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
  await page.route(Y8_SDK, (r) => (sdk === 'stub' ? r.fulfill({ contentType: 'application/javascript', body: STUB }) : r.abort()));
  await page.goto(`/?low&menu&${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  return { errors, requests };
}

test('Y8 build: y8.min.js from the CDN once, initialized with the App ID + Game ID, no ad before Play, no other portal', async ({ page }) => {
  const { errors, requests } = await boot(page);
  await expect(page.locator('.play-btn')).toBeVisible();
  expect(await page.locator(`script[src="${Y8_SDK}"][async]`).count()).toBe(1);
  expect(requests.filter((u) => u === Y8_SDK)).toHaveLength(1);
  expect(requests.some((u) => /crazygames|gamedistribution|gamepix|playgama|gamemonetize/i.test(u))).toBe(false);
  expect(await page.evaluate(() => window.__y8!.calls)).toEqual(['init:6af4a2c63c0f1c5e7ad8dc57:292539']);
  expect(errors).toEqual([]);
});

test('Y8 build: Play shows the start ad (paused + muted in beforeAd), afterAd resumes, the night plays; a second Play during the ad does nothing', async ({ page }) => {
  const { errors } = await boot(page);
  await page.evaluate(() => (window.__y8!.hold = true));
  await page.locator('.play-btn').click();
  await expect.poll(() => page.evaluate(() => window.__y8!.calls.slice(1))).toEqual(['start']);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__game!.mode)).toBe('title');
  await expect.poll(() => page.evaluate(() => window.__ctxs!.map((c) => c.state))).toEqual(['suspended']);
  await page.locator('.play-btn').click({ force: true });
  expect(await page.evaluate(() => window.__y8!.calls.slice(1))).toEqual(['start']);
  await page.evaluate(() => window.__y8!.finish!());
  await page.waitForFunction(() => window.__game?.mode === 'intro');
  await expect.poll(() => page.evaluate(() => window.__ctxs!.map((c) => c.state))).toEqual(['running']);
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  expect(await page.evaluate(() => window.__y8!.calls.some((c) => c.startsWith('BEFORE-INIT')))).toBe(false);
  expect(errors).toEqual([]);
});

test('Y8 build: x2 coins pays only after adViewed; no ad → "No ad available", dismissed → nothing', async ({ page }) => {
  const { errors } = await boot(page, 'autoplay=good');
  await page.locator('.play-btn').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play' || window.__game?.mode === 'cinematic', null, { timeout: 60_000 });
  for (let i = 0; i < 60 && !(await page.locator('.result.win').count()); i++) await advance(page, 2);
  await expect(page.locator('.result.win')).toBeVisible({ timeout: 30_000 });
  const dbl = page.locator('.ad-btn.double');
  await expect(dbl).toBeVisible();
  const coins = await page.evaluate(coinsOf);
  await page.evaluate(() => (window.__y8!.mode = 'noAd'));
  await dbl.click();
  await expect(dbl).toHaveText('No ad available right now, try later');
  await expect(dbl).toBeEnabled({ timeout: 5000 });
  await page.evaluate(() => (window.__y8!.mode = 'dismissed'));
  await dbl.click();
  await expect(dbl).toHaveText('No ad available right now, try later');
  await expect(dbl).toBeEnabled({ timeout: 5000 });
  expect(await page.evaluate(coinsOf)).toBe(coins);
  await page.evaluate(() => (window.__y8!.mode = 'viewed'));
  await dbl.click();
  await expect(dbl).toHaveText('✓ ×2');
  expect(await page.evaluate(coinsOf)).toBeGreaterThan(coins);
  expect(await page.evaluate(() => window.__y8!.calls.filter((c) => c === 'reward'))).toHaveLength(3);
  expect(errors).toEqual([]);
});

test('Y8 build: with the SDK blocked (ad blocker) the game plays, without rewarded buttons', async ({ page }) => {
  const { errors } = await boot(page, '', 'blocked');
  expect(await page.evaluate(() => (window.__game as unknown as { adsOn: boolean }).adsOn)).toBe(false);
  await page.locator('.play-btn').click();
  await page.waitForFunction(() => window.__game?.mode === 'intro', null, { timeout: 10_000 });
  await page.locator('.intro-ui').click({ force: true });
  await page.waitForFunction(() => window.__game?.mode === 'play');
  expect(errors).toEqual([]);
});
