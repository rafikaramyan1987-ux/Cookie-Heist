// Game-specific settings for the open-portal web zip (scripts/web/zip.mjs) and its checker (scripts/web/check.mjs).
export default {
  slug: 'cookie-heist',
  /** the ad-free web build: no portal SDK, `sdk.available === false`, so no rewarded-ad buttons and no interstitials */
  build: 'npm run build:web',
  dist: 'dist-web',
  /** .woff fallbacks of the bundled Fredoka font: never fetched by browsers that run WebGL 2 (woff2 is there) */
  exclude: ['*.woff'],
  /** the only localStorage key the game writes (src/app/save.ts); `__t` is a write probe removed straight away */
  storageKeys: ['cookieheist.save.v1'],
  /** the checker plays night 1 with the game's built-in bot (the same one the playtest and e2e tests use) */
  query: '?autoplay=good&low',
  canvasSelector: 'canvas#game',
  adSelector: '.ad-btn',
  async ready(frame) {
    await frame.waitForFunction(() => window.__ready === true && window.__game, null, { timeout: 120_000 });
  },
  /** night 1: the bot sneaks to the cookie and back to bed; frames are advanced in bulk (software WebGL is slow) */
  async play(frame) {
    await frame.waitForFunction(() => ['play', 'cinematic'].includes(window.__game?.mode), null, { timeout: 60_000 });
    for (let i = 0; i < 90; i++) {
      if (await frame.locator('.result.win').count()) break;
      await frame.evaluate(() => { for (let k = 0; k < 60; k++) window.__game.tick(1 / 30); });
    }
    const won = (await frame.evaluate(() => window.__game?.run?.world.status)) === 'won';
    await frame.locator('.result.win').waitFor({ timeout: 15_000 }).catch(() => {});
    await frame.waitForTimeout(1500);
    return { won, note: 'night 1 won by the built-in bot' };
  },
  // ---------------------------------------------------------------- store images (scripts/web/store.mjs)
  /** the main cover (B2), cropped to 630:500 around the kid and the title */
  cover: { src: 'submission/cover-800x800.png', crop: '800x635+0+165' },
  icon: 'submission-gamepix/icon-512x512.png',
  /** 1280x720 shots of the web build; nights played by the built-in bot, the player's save is a returning player's */
  shots: [
    { name: 'start: night 1 for a new player, with the in-game tutorial', query: '', run: async (f) => { await f.waitForFunction(() => window.__game?.mode === 'play'); await f.locator('.tutorial .tut-line').waitFor(); await f.waitForTimeout(3500); } },
    { name: 'mid-level: Family House, night 3', query: '?level=1-2&autoplay=good&notips&manual', save: returning, run: (f) => sim(f, 9) },
    { name: 'a mechanic: hiding in a laundry basket while a grown-up walks past', query: '?level=0-3&autoplay=good&notips&manual', save: returning, run: (f) => sim(f, 60, () => window.__game.run.world.player.hidden) },
    { name: 'win screen: night 1, three stars', query: '?level=0-0&autoplay=good&notips&manual', save: returning, run: async (f) => { await sim(f, 90, () => !!document.querySelector('.result.win')); await f.waitForTimeout(2600); } },
  ],
};

/** a returning player: tutorial done, a few nights won (so the title screen shows, not the first-visit tutorial) */
function returning() {
  localStorage.setItem('cookieheist.save.v1', JSON.stringify({ v: 1, tutorialDone: true, coins: 240, stars: { 'apartment-1': 3, 'apartment-2': 3, 'apartment-3': 2 } }));
}

/** advance the game up to `seconds` of game time (30 fps, simulated without rendering every frame, like the e2e
 * tests), stopping as soon as `until()` is true in the page; then one rendered frame */
async function sim(frame, seconds, until) {
  await frame.waitForFunction(() => ['play', 'cinematic'].includes(window.__game?.mode), null, { timeout: 60_000 });
  for (let t = 0; t < seconds; t += 1) {
    const done = await frame.evaluate((u) => {
      const stop = u ? (0, eval)(`(${u})`) : () => false;
      for (let k = 0; k < 30; k++) {
        window.__game.simOnly(1 / 30);
        if (stop()) return true;
      }
      return false;
    }, until ? String(until) : null);
    if (done) break;
  }
  await frame.evaluate(() => window.__game.tick(1 / 60));
  await frame.waitForTimeout(400);
}
