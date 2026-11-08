import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sdk, AD_TIMEOUT } from '../../src/app/sdk';
import { adUnavailable, AD_UNAVAILABLE_MS } from '../../src/ui/adButton';

type Cb = { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void };
/** a CrazyGames SDK stand-in; `behave` decides what the "ad" does */
function mockSdk(behave: (cb: Cb) => void) {
  const requestAd = vi.fn((_type: string, cb: Cb) => behave(cb));
  (sdk as unknown as { s: unknown }).s = { ad: { requestAd }, game: {} };
  return requestAd;
}

describe('ads never hang the game', () => {
  let pauses: boolean[];
  beforeEach(() => {
    vi.useFakeTimers();
    pauses = [];
    sdk.onAdPause = (p) => pauses.push(p);
    (sdk as unknown as { lastMidgame: number }).lastMidgame = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    (sdk as unknown as { s: unknown }).s = null;
  });

  it('rewarded(): an SDK that never calls back resolves false after 8 s and unpauses', async () => {
    mockSdk(() => {});
    let result: boolean | undefined;
    sdk.rewarded().then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT - 1);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toBe(false);
    expect(pauses).toEqual([false]);
  });

  it('rewarded(): a late callback after the timeout is ignored (no double resolve)', async () => {
    let cb: Cb = {};
    mockSdk((c) => (cb = c));
    const results: boolean[] = [];
    sdk.rewarded().then((r) => results.push(r));
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT);
    cb.adStarted?.();
    cb.adFinished?.();
    await vi.advanceTimersByTimeAsync(10);
    expect(results).toEqual([false]);
    expect(pauses).toEqual([false]);
  });

  it('rewarded(): a started ad may run longer than 8 s; only a finished one pays and resets the midgame clock', async () => {
    let cb: Cb = {};
    mockSdk((c) => (cb = c));
    let result: boolean | undefined;
    sdk.rewarded().then((r) => (result = r));
    cb.adStarted?.();
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT * 3);
    expect(result).toBeUndefined();
    cb.adFinished?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(true);
    expect(pauses).toEqual([true, false]);
    expect((sdk as unknown as { lastMidgame: number }).lastMidgame).toBeGreaterThan(0);
  });

  it('rewarded(): requestAd throwing resolves false right away', async () => {
    mockSdk(() => {
      throw new Error('boom');
    });
    let result: boolean | undefined;
    sdk.rewarded().then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(false);
  });

  it('midgame(): an SDK that never calls back resolves after 8 s', async () => {
    mockSdk(() => {});
    let done = false;
    sdk.midgame().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT);
    expect(done).toBe(true);
    expect(pauses).toEqual([false]);
  });

  it('the button says "no ad", then is restored and re-enabled', async () => {
    mockSdk(() => {});
    const btn = { disabled: false, innerHTML: '▶ Watch an ad: ×2', textContent: '▶ Watch an ad: ×2' as string | null };
    const label = btn.innerHTML;
    btn.disabled = true;
    const p = sdk.rewarded().then((ok) => {
      if (!ok) adUnavailable(btn, label);
    });
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT);
    await p;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('No ad available right now, try later');
    await vi.advanceTimersByTimeAsync(AD_UNAVAILABLE_MS);
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toBe(label);
  });
});
