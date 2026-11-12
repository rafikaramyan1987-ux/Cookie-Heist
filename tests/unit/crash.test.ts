// Crash fixes (docs/crash-investigation.md): lazy chunks retry, saves of any shape load, the CrazyGames wrapper
// never throws, never sends gameplayStart before loadingStop, and every ad settles.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { importRetry, failedChunkUrl } from '../../src/app/lazy';
import { parseSave, defaultSave } from '../../src/app/save';
import { CrazyGamesPlatform } from '../../src/app/platform/crazygames';
import { AD_MAX, AD_TIMEOUT } from '../../src/app/platform/types';

describe('lazy chunks', () => {
  it('retries a failed import and resolves once it loads', async () => {
    let n = 0;
    const load = () => (++n < 3 ? Promise.reject(new TypeError('Importing a module script failed.')) : Promise.resolve({ ok: 1 }));
    await expect(importRetry(load, [0, 0, 0])).resolves.toEqual({ ok: 1 });
    expect(n).toBe(3);
  });
  it('rejects only after every retry failed', async () => {
    const load = vi.fn(() => Promise.reject(new Error('offline')));
    await expect(importRetry(load, [0, 0])).rejects.toThrow('offline');
    expect(load).toHaveBeenCalledTimes(3);
  });
  it('finds the chunk URL in Chromium / Firefox messages, none in WebKit', () => {
    expect(failedChunkUrl(new TypeError('Failed to fetch dynamically imported module: https://x.test/a/rest-dG_yk7Ej.js'))).toBe('https://x.test/a/rest-dG_yk7Ej.js');
    expect(failedChunkUrl(new TypeError('error loading dynamically imported module: http://127.0.0.1:4173/assets/titleView-B7DxIQ2E.js'))).toBe('http://127.0.0.1:4173/assets/titleView-B7DxIQ2E.js');
    expect(failedChunkUrl(new TypeError('Importing a module script failed.'))).toBeNull();
  });
});

describe('saves of any shape load', () => {
  it('a v3 / v3.2 save loads unchanged', () => {
    const v3 = {
      v: 1,
      coins: 180,
      stars: { 'apartment-1': 3, 'apartment-2': 2 },
      best: { 'apartment-2': 6.2 },
      fails: { 'apartment-2': 0 },
      skipped: {},
      owned: ['skin:starry', 'cap:classic', 'trail:none', 'skin:dino'],
      skin: 'dino',
      cap: 'classic',
      trail: 'none',
      lang: 'fr',
      sound: false,
      music: true,
      tips: ['cookies'],
      daily: { last: '2026-11-10', streak: 2 },
      missions: { day: '2026-11-10', list: [{ id: 'stars', n: 5, progress: 3, reward: 70, claimed: false }, { id: 'cookies', n: 5, progress: 2, reward: 60, claimed: false }, { id: 'ghost', n: 3, progress: 1, reward: 80, claimed: true }] },
      totals: { cookies: 9, wins: 3 },
      items: { toy: 1, peek: 0, hint: 2, pillow: 0 },
      hinted: {},
      tutorialDone: true,
      snack: '2026-11-10',
    };
    expect(parseSave(JSON.stringify(v3))).toEqual(v3);
  });
  it('a v2 save (before items / hinted / tutorial / snack) gets the defaults', () => {
    const s = parseSave(JSON.stringify({ v: 1, coins: 40, stars: { 'apartment-1': 1 }, owned: ['skin:candy'], skin: 'candy' }));
    expect(s.items).toEqual(defaultSave().items);
    expect(s.tutorialDone).toBe(true);
    expect(s.snack).toBe('');
    expect(s.owned).toContain('skin:candy');
  });
  it('damaged fields never reach the game with the wrong type', () => {
    const s = parseSave(
      JSON.stringify({ v: 1, coins: 'lots', stars: null, best: [1], fails: { a: 'x', b: 2 }, owned: 'skin:dino', tips: [1, 'creaky'], daily: null, missions: { day: 3, list: [null, { id: 'x' }] }, totals: 5, items: { toy: 'two' }, skin: 7, sound: 'yes' }),
    );
    expect(s.coins).toBe(0);
    expect(s.stars).toEqual({});
    expect(s.best).toEqual({});
    expect(s.fails).toEqual({ b: 2 });
    expect(s.owned).toEqual(defaultSave().owned);
    expect(s.tips).toEqual(['creaky']);
    expect(s.daily).toEqual({ last: '', streak: 0 });
    expect(s.missions).toEqual({ day: '', list: [] });
    expect(s.totals).toEqual({ cookies: 0, wins: 0 });
    expect(s.items.toy).toBe(0);
    expect(s.skin).toBe('starry');
    expect(s.sound).toBe(true);
  });
});

type Cb = { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void };
function cgSdk(over: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const game = {
    loadingStart: () => calls.push('loadingStart'),
    loadingStop: () => calls.push('loadingStop'),
    gameplayStart: () => calls.push('gameplayStart'),
    gameplayStop: () => calls.push('gameplayStop'),
    happytime: () => calls.push('happytime'),
  };
  const sdk = { environment: 'crazygames', init: async () => {}, game, ad: { requestAd: (_t: string, _cb: Cb) => {} }, ...over };
  (globalThis as unknown as { window: unknown }).window = { CrazyGames: { SDK: sdk } };
  return { sdk, calls };
}

describe('CrazyGames wrapper', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('gameplayStart waits for loadingStop (first visit: night 1 starts under the loading screen)', async () => {
    const { calls } = cgSdk();
    const p = new CrazyGamesPlatform();
    await p.init();
    p.loadingStart();
    p.gameplayStart();
    expect(calls).toEqual(['loadingStart']);
    p.loadingStop();
    p.loadingStop();
    expect(calls).toEqual(['loadingStart', 'loadingStop', 'gameplayStart']);
  });

  it('a disabled Data Module (dataModuleDisabled) means localStorage saves, never a throw', async () => {
    const boom = () => {
      throw { code: 'dataModuleDisabled', message: 'disabled' };
    };
    cgSdk({ data: { getItem: boom, setItem: boom, removeItem: boom } });
    const p = new CrazyGamesPlatform();
    await p.init();
    expect(p.data()).toBeNull();
  });

  it('a Data Module that throws on write (dataLimitExcedeed) never throws into the game', async () => {
    const m = new Map<string, string>();
    cgSdk({
      data: {
        getItem: (k: string) => m.get(k) ?? null,
        setItem: () => {
          throw { code: 'dataLimitExcedeed' };
        },
        removeItem: () => {},
      },
    });
    const p = new CrazyGamesPlatform();
    await p.init();
    expect(() => p.data()!.setItem('k', 'v')).not.toThrow();
  });

  it('SDK calls that throw never reach the game', async () => {
    const boom = () => {
      throw new Error('sdk');
    };
    cgSdk({ game: { loadingStart: boom, loadingStop: boom, gameplayStart: boom, gameplayStop: boom, happytime: boom } });
    const p = new CrazyGamesPlatform();
    await p.init();
    expect(() => {
      p.loadingStart();
      p.loadingStop();
      p.gameplayStart();
      p.gameplayStop();
      p.happytime();
      p.locale();
    }).not.toThrow();
  });

  it('a started ad that never ends settles after AD_MAX and unpauses; one ad at a time', async () => {
    vi.useFakeTimers();
    let cb: Cb = {};
    cgSdk({ ad: { requestAd: (_t: string, c: Cb) => (cb = c) } });
    const p = new CrazyGamesPlatform();
    await p.init();
    const pauses: boolean[] = [];
    p.onAdPause = (x) => pauses.push(x);
    let r: boolean | undefined;
    void p.rewarded().then((x) => (r = x));
    cb.adStarted?.();
    expect(await p.rewarded()).toBe(false); // a second request while one is running
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT * 2);
    expect(r).toBeUndefined();
    await vi.advanceTimersByTimeAsync(AD_MAX);
    expect(r).toBe(false);
    expect(pauses).toEqual([true, false]);
    cb.adFinished?.();
    expect(pauses).toEqual([true, false]);
  });
});
