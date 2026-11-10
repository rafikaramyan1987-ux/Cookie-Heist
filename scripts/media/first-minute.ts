/**
 * Records a brand-new player's first 60 seconds at 390×844: the loading screen (real time, 4G throttling), then
 * night 1 with the in-game tutorial played with real joystick drags, the first end screen (next-unlock teaser +
 * daily reward), claiming day 1 of the calendar, and night 2 (the playtest bot plays it).
 *   npx tsx scripts/media/first-minute.ts <base> <out.mp4>
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium, GL_ARGS } from '../pw.mjs';
import { walk, idle, TUTORIAL } from './driver';
import type { Page } from '@playwright/test';

const [base = 'http://127.0.0.1:4174/', out = 'docs/media/first-minute-v3-390x844.mp4'] = process.argv.slice(2);
const FPS = 30;
const TOTAL = 60;
const dir = '/tmp/claude-0/frames-first-minute';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ args: GL_ARGS });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'en-US' });
const page = (await ctx.newPage()) as unknown as Page;
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
const cdp = await ctx.newCDPSession(page as never);
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });

// frames: [file, seconds]
const frames: [string, number][] = [];
let n = 0;
const shot = async (dur = 1 / FPS) => {
  const f = `${dir}/f${String(n++).padStart(5, '0')}.jpg`;
  await page.screenshot({ path: f, type: 'jpeg', quality: 92 });
  frames.push([f, dur]);
};
const elapsed = () => frames.reduce((a, [, d]) => a + d, 0);

// 1) the loading screen, in real time
const t0 = Date.now();
await page.goto(`${base}?fakeads&manual`, { waitUntil: 'commit' });
let last = Date.now();
let ready = false;
while (!ready) {
  try {
    await page.screenshot({ path: `${dir}/f${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92, timeout: 5000 });
    const now = Date.now();
    if (frames.length) frames[frames.length - 1][1] = (now - last) / 1000;
    frames.push([`${dir}/f${String(n++).padStart(5, '0')}.jpg`, 0.05]);
    last = now;
  } catch {
    /* page not painted yet */
  }
  ready = await page.evaluate(() => window.__ready === true).catch(() => false);
  if (Date.now() - t0 > 30000) throw new Error('load timeout');
}
console.log(`loaded in ${Date.now() - t0} ms (throttled 4G)`);
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

// 2) from here on, deterministic frames: game clock + CSS animations step together
const stepCss = (ms: number) =>
  page.evaluate((ms) => {
    for (const a of document.getAnimations()) {
      if (a.playState !== 'paused') a.pause();
      a.currentTime = (Number(a.currentTime) || 0) + ms;
    }
  }, ms);
const step = async (dt: number) => {
  if (elapsed() >= TOTAL) return;
  await page.evaluate((d) => window.__game.tick(d), dt);
  await stepCss(dt * 1000);
  await shot();
};
const hold = (s: number) => idle(page, s, step);
const mode = () => page.evaluate(() => window.__game.mode as string);
const tutStep = () => page.evaluate(() => window.__game.run?.tut?.step as string);

// a beat to read "Drag to sneak", then the tutorial with real drags
await hold(0.8);
await walk(page, TUTORIAL.basket, step);
for (let i = 0; i < 300 && (await tutStep()) === 'stay'; i++) await step(1 / FPS);
await hold(0.5);
await walk(page, TUTORIAL.cookie, step);
await walk(page, TUTORIAL.bed, step);
for (let i = 0; i < 150 && (await mode()) !== 'result'; i++) await step(1 / FPS);
await hold(2.6);
// the daily reward from the end screen: open the calendar, claim day 1
await page.locator('.daily-peek').click();
await hold(1.6);
await page.locator('.daily-modal .claim').click();
await hold(1.6);
await page.locator('.daily-modal .close').click();
await hold(0.8);
// next night: intro card, then the bot plays it
await page.locator('.result .next').click();
await hold(2.2);
await page.locator('.intro-ui').click({ force: true });
await page.evaluate(() => window.__game.autopilot('good'));
while (elapsed() < TOTAL) await step(1 / FPS);
await browser.close();

const list = frames.map(([f, d]) => `file '${f}'\nduration ${d.toFixed(4)}`).join('\n') + `\nfile '${frames[frames.length - 1][0]}'\n`;
writeFileSync(`${dir}/list.txt`, list);
mkdirSync('docs/media', { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', '-an', out]);
console.log('wrote', out, `${elapsed().toFixed(1)} s, ${frames.length} frames`);
