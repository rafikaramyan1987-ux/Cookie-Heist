// Game-specific settings for the Playgama zip (scripts/playgama/zip.mjs) and its tests (scripts/playgama/test.mjs).
import web from '../web/game.mjs';

export default {
  slug: web.slug,
  title: 'Cookie Heist',
  dist: 'dist-playgama',
  /** the submission zip's version: submission-playgama/<slug>-playgama-v<version>.zip (v1 kept for reference) */
  version: 2,
  exclude: web.exclude,
  /** the game's query for the tests: night 1 played by the built-in bot (as in scripts/web/check.mjs) */
  query: 'autoplay=good&low',
  ready: web.ready,
  /** play night 1 to its result screen */
  play: web.play,
  /** the labelled rewarded button on the win screen ("×2 coins" with the TV + "Ad" tag) and what it gives */
  reward: {
    selector: '.result.win .ad-btn.double',
    /** the value the reward changes: the player's coins */
    value: (frame) => frame.evaluate(() => window.__game.save.coins),
  },
  /** after the result screen: Next (the between-levels interstitial slot), then the next night opens */
  async next(frame) {
    // the bot skips ad slots (app.ts `between`): hand the next click back to the normal player flow
    await frame.evaluate(() => (window.__game.autoplay = null));
    await frame.locator('.result .next').click({ force: true });
  },
  async nextLevelOpened(frame) {
    await frame.waitForFunction(() => window.__game?.run && window.__game.run.i === 1 && window.__game.mode !== 'result', null, { timeout: 60_000 });
  },
  /** the game's own audio state: muted for the platform (sdkMuted) and the AudioContext suspended */
  audio: (frame) => frame.evaluate(() => ({ muted: window.__playgama.muted, paused: window.__playgama.paused })),
};
