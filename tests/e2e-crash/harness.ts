// Zero-errors harness for the CrazyGames build (docs/crash-investigation.md).
//
// Every crash signal the CrazyGames SDK v3 reports, plus the ones it cannot see, is collected:
// - `error` and `unhandledrejection` on window: the SDK forwards exactly these to CrazyGames (propagateErrors() in
//   crazygames-sdk-v3.js). The stand-in SDK below forwards them the same way, into `window.__cgReported`.
// - Playwright `pageerror`, console errors, the game's own last-resort record (`window.__errors`, src/app/guard.ts)
// - loading that never reaches loadingStop, gameplayStart before loadingStop, WebGL context loss nobody asked for,
//   failed requests nobody injected
import { expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game?: any;
    __ready?: boolean;
    __errors?: string[];
    __cgReported?: string[];
    __cgEvents?: [string, number][];
    __adMode?: AdMode;
    __skew?: number;
    __lost?: number;
    __cgStore?: Map<string, string>;
  }
}

export type AdMode = 'ok' | 'error' | 'blocked' | 'nofill';
export interface Opts {
  /** a save (fixture name in fixtures/, or an object) in localStorage and the Data Module */
  save?: string | object;
  /** the clock runs this many days ahead (a returning player on a later day) */
  days?: number;
  /** stub: CrazyGames SDK stand-in in the `crazygames` environment; official: the real SDK (local mode on 127.0.0.1) */
  sdk?: 'stub' | 'official';
  adMode?: AdMode;
  /** private mode: every localStorage access throws */
  noStorage?: boolean;
  /** Progress Save off for the game: the Data Module throws `dataModuleDisabled` */
  dataDisabled?: boolean;
  /** requests whose URL matches are aborted (`failTimes` times per URL, default always) */
  fail?: RegExp;
  failTimes?: number;
  /** every game asset request waits this long (slow network) */
  delayMs?: number;
  locale?: string;
  /** the browser cannot create a WebGL context */
  noWebgl?: boolean;
  query?: string;
}

export const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

export interface Run {
  /** everything that would have been reported (should stay empty) */
  problems(): Promise<string[]>;
  events(): Promise<[string, number][]>;
  injected: string[];
}

export async function start(page: Page, info: TestInfo, o: Opts = {}): Promise<Run> {
  const console_: string[] = [];
  const pageErrors: string[] = [];
  const failedReq: string[] = [];
  const injected: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // the browser's own line for a request the test aborted (not a script error)
    if (injected.length && /Failed to load resource|NetworkError|Loading (module|failed)|net::ERR_FAILED|error loading dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module/i.test(t)) return;
    // Firefox: a font download the page itself cancelled by reloading (NS_BINDING_ABORTED = 2152398850)
    if (/downloadable font: download failed .*status=2152398850/.test(t)) return;
    // the no-WebGL test: three.js says it could not create a context (expected there)
    if (o.noWebgl && /WebGL|\[cookie-heist\] boot/.test(t)) return;
    console_.push(`console.error: ${t}`);
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    // requests the test aborted, and requests the page itself dropped by reloading (fonts in flight)
    if (injected.includes(u) || !u.startsWith('http://127.0.0.1') || /cancelled|ERR_ABORTED|NS_BINDING_ABORTED/i.test(r.failure()?.errorText ?? '')) return;
    failedReq.push(`requestfailed: ${u} ${r.failure()?.errorText}`);
  });

  if (o.fail || o.delayMs) {
    const n = new Map<string, number>();
    await page.route(/127\.0\.0\.1/, async (route) => {
      const u = route.request().url();
      if (o.delayMs && /\/assets\//.test(u)) await new Promise((r) => setTimeout(r, o.delayMs));
      const k = u.split('?')[0];
      if (o.fail && o.fail.test(k) && (n.get(k) ?? 0) < (o.failTimes ?? Infinity)) {
        n.set(k, (n.get(k) ?? 0) + 1);
        injected.push(u);
        return route.abort('failed');
      }
      return route.continue().catch(() => {});
    });
  }

  await page.addInitScript(
    ({ days, noStorage, noWebgl, sdk, dataDisabled, locale, save }) => {
      // the crash signals, recorded before any game code runs
      window.__cgReported = [];
      window.__lost = 0;
      const RD = Date;
      const off = (days || 0) * 86_400_000;
      window.__skew = 0;
      class D extends RD {
        constructor(...a: ConstructorParameters<DateConstructor> | []) {
          if (a.length) super(...(a as [number]));
          else super(RD.now() + off + (window.__skew ?? 0));
        }
        static now() {
          return RD.now() + off + (window.__skew ?? 0);
        }
      }
      (window as unknown as { Date: DateConstructor }).Date = D as unknown as DateConstructor;
      if (noStorage)
        for (const k of ['localStorage', 'sessionStorage'])
          Object.defineProperty(window, k, {
            configurable: true,
            get() {
              throw new DOMException('The operation is insecure.', 'SecurityError');
            },
          });
      else if (save) localStorage.setItem('cookieheist.save.v1', save);
      const gc = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (noWebgl && /webgl/.test(type)) return null;
        if (/webgl/.test(type) && !(this as unknown as { __w?: 1 }).__w) {
          (this as unknown as { __w?: 1 }).__w = 1;
          this.addEventListener('webglcontextlost', () => (window.__lost = (window.__lost ?? 0) + 1));
        }
        return (gc as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof gc;
      if (sdk !== 'stub') return;
      // CrazyGames SDK v3 stand-in, `crazygames` environment
      const events: [string, number][] = (window.__cgEvents = []);
      const ev = (n: string) => events.push([n, Math.round(performance.now())]);
      const store = (window.__cgStore = new Map<string, string>());
      if (save) store.set('cookieheist.save.v1', save);
      window.__adMode = 'ok';
      const disabled = () => {
        throw { code: 'dataModuleDisabled', message: 'The data module is disabled.' };
      };
      (window as unknown as { CrazyGames: unknown }).CrazyGames = {
        SDK: {
          environment: 'crazygames',
          async init() {
            await new Promise((r) => setTimeout(r, 30));
            // what the real SDK does after init: every uncaught error / unhandled rejection goes to CrazyGames
            addEventListener('error', (e) => window.__cgReported!.push(`error: ${e.message}`));
            addEventListener('unhandledrejection', (e) => window.__cgReported!.push(`unhandledrejection: ${(e.reason && (e.reason.message || e.reason)) ?? ''}`));
          },
          game: {
            gameplayStart: () => ev('gameplayStart'),
            gameplayStop: () => ev('gameplayStop'),
            loadingStart: () => ev('loadingStart'),
            loadingStop: () => ev('loadingStop'),
            happytime: () => ev('happytime'),
            settings: { muteAudio: false },
            addSettingsChangeListener: () => {},
          },
          ad: {
            requestAd(type: string, cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }) {
              ev(`ad:${type}`);
              const m = window.__adMode;
              if (m === 'blocked') throw new Error('adblock');
              if (m === 'nofill') return; // nothing ever comes back
              if (m === 'error') return void setTimeout(() => cb.adError?.({ code: 'unfilled', message: 'No ad available' }), 150);
              setTimeout(() => {
                cb.adStarted?.();
                setTimeout(() => cb.adFinished?.(), 400);
              }, 150);
            },
          },
          data: dataDisabled
            ? { getItem: disabled, setItem: disabled, removeItem: disabled, clear: disabled }
            : { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k), clear: () => store.clear() },
          user: { systemInfo: { locale, countryCode: 'US' } },
        },
      };
    },
    {
      days: o.days ?? 0,
      noStorage: !!o.noStorage,
      noWebgl: !!o.noWebgl,
      sdk: o.sdk ?? 'stub',
      dataDisabled: !!o.dataDisabled,
      locale: o.locale ?? 'en-US',
      save: o.save === undefined ? null : typeof o.save === 'string' ? fixture(o.save) : JSON.stringify(o.save),
    },
  );
  if (o.adMode) await page.addInitScript((m) => (window.__adMode = m), o.adMode);

  const q = ['low', o.query].filter(Boolean).join('&');
  await page.goto(`/?${q}`);
  info.annotations.push({ type: 'scenario', description: JSON.stringify({ ...o, save: typeof o.save === 'string' ? o.save : o.save ? 'object' : undefined }) });

  return {
    injected,
    async problems() {
      const inPage = await page
        .evaluate(() => ({ reported: window.__cgReported ?? [], guard: window.__errors ?? [], lost: window.__lost ?? 0 }))
        .catch(() => ({ reported: [] as string[], guard: [] as string[], lost: 0 }));
      // no WebGL: the game records why it could not start (and says so on the loading screen); nothing else is allowed
      const guard = inPage.guard.filter((g) => !(o.noWebgl && /^boot: .*WebGL/.test(g)));
      return [...pageErrors, ...console_, ...failedReq, ...inPage.reported.map((r) => `reported to CrazyGames: ${r}`), ...guard.map((g) => `guard: ${g}`)];
    },
    events: () => page.evaluate(() => window.__cgEvents ?? []),
  };
}

/** the loading screen is done: __ready, the boot overlay gone, loadingStop sent before any gameplayStart */
export async function loaded(page: Page, run: Run, sdk = true) {
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120_000 });
  await expect(page.locator('#boot')).toHaveCount(0, { timeout: 15_000 });
  if (!sdk) return;
  const ev = (await run.events()).map((e) => e[0]);
  expect(ev[0]).toBe('loadingStart');
  expect(ev).toContain('loadingStop');
  const g = ev.indexOf('gameplayStart');
  if (g >= 0) expect(g).toBeGreaterThan(ev.indexOf('loadingStop'));
}

export const mode = (page: Page) => page.evaluate(() => window.__game.mode as string);

/** advance the game without rendering (software WebGL on CI is slow); `s` game seconds */
export async function sim(page: Page, s: number) {
  for (let t = 0; t < s; t += 2) await page.evaluate(() => { for (let k = 0; k < 60; k++) window.__game.simOnly(1 / 30); });
}

/** a few rendered frames (exercises the renderer, not just the logic) */
export const frames = (page: Page, n = 6) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.tick(1 / 30); }, n);

/** from the title or an intro card into a running night */
export async function intoNight(page: Page) {
  for (let i = 0; i < 40; i++) {
    const m = await mode(page);
    if (m === 'play') return;
    if (m === 'title') await page.locator('.title-ui [data-act="play"]').click({ force: true });
    else if (m === 'intro') await page.locator('.intro-ui').click({ force: true }).catch(() => page.mouse.click(10, 10));
    await page.waitForTimeout(300);
  }
  expect(await mode(page)).toBe('play');
}

/** the bot plays the current night to its result screen (won or caught) */
export async function playNight(page: Page) {
  await intoNight(page);
  await page.evaluate(() => window.__game.autopilot('good'));
  for (let i = 0; i < 60 && (await mode(page)) !== 'result'; i++) await sim(page, 2);
  // a night the bot could not finish in time: end it as a win (the result flow is what is tested here)
  await page.evaluate(() => {
    const g = window.__game;
    if (g.mode !== 'result') {
      g.run.world.status = 'won';
      g.showResult();
    }
  });
  await expect(page.locator('.result')).toBeVisible();
  await frames(page, 3);
}

/** end the running night as a win (the ads test needs the win screen and its ×2 button) */
export async function winNight(page: Page) {
  await intoNight(page);
  await sim(page, 2);
  await page.evaluate(() => {
    const g = window.__game;
    g.run.world.status = 'won';
    g.showResult();
  });
  await expect(page.locator('.result.win')).toBeVisible();
  await frames(page, 3);
}

/** the result screen's Next (with the clock moved past the 2-minute ad gap, so a midgame ad is requested) */
export async function next(page: Page, withAd = true) {
  if (withAd) await page.evaluate(() => (window.__skew = (window.__skew ?? 0) + 130_000));
  await page.locator('.result .next').click({ force: true });
  // a midgame ad that never answers settles after AD_TIMEOUT (8 s), then the next night is built
  await page.waitForFunction(() => window.__game.mode !== 'result', null, { timeout: 40_000 }).catch(async (e) => {
    console.log('next() stuck; sdk events:', JSON.stringify(await page.evaluate(() => [window.__cgEvents, performance.now() | 0, window.__game.mode])));
    throw e;
  });
}

export async function clean(run: Run) {
  expect(await run.problems()).toEqual([]);
}
