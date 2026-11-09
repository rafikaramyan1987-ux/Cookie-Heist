import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GDPlatform, GD_GAME_ID, GD_SDK_URL, GD_SCRIPT_ID, REWARD_GRACE } from '../../src/app/platform/gd';
import { AD_TIMEOUT, MIDGAME_GAP } from '../../src/app/platform/types';
import { adUnavailable, AD_UNAVAILABLE_MS } from '../../src/ui/adButton';

/** a gdsdk stand-in: `behave` decides what the "ad" does with the SDK's event callback */
type Emit = (name: string) => void;
function setup(behave: (type: string | undefined, emit: Emit) => Promise<unknown> | void) {
  const gd = new GDPlatform();
  const emit: Emit = (name) => gd.onEvent({ name });
  const showAd = vi.fn((type?: string) => behave(type, emit));
  vi.stubGlobal('window', { gdsdk: { showAd } });
  const log: string[] = [];
  gd.onAdPause = (p) => log.push(p ? 'pause' : 'resume');
  gd.onMute = (m) => log.push(m ? 'mute' : 'unmute');
  return { gd, emit, showAd, log };
}
const never = () => new Promise<unknown>(() => {});

describe('GameDistribution ads', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rewarded: granted only after SDK_REWARDED_WATCH_COMPLETE; pauses + mutes, then resumes', async () => {
    let emit: Emit = () => {};
    const { gd, showAd, log } = setup((_t, e) => {
      emit = e;
      return never();
    });
    let result: boolean | undefined;
    gd.rewarded().then((r) => (result = r));
    expect(showAd).toHaveBeenCalledWith('rewarded');
    emit('SDK_GAME_PAUSE');
    expect(log).toEqual(['mute', 'pause']);
    expect(gd.muted).toBe(true);
    // a started ad may run longer than the 8 s "not started" timeout
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT * 3);
    expect(result).toBeUndefined();
    emit('SDK_REWARDED_WATCH_COMPLETE');
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(true);
    expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
    expect(gd.muted).toBe(false);
    // the SDK's own SDK_GAME_START afterwards changes nothing
    emit('SDK_GAME_START');
    expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
  });

  it('rewarded: a closed ad without the watch-complete event pays nothing', async () => {
    let emit: Emit = () => {};
    const { gd } = setup((_t, e) => {
      emit = e;
      return never();
    });
    let result: boolean | undefined;
    gd.rewarded().then((r) => (result = r));
    emit('SDK_GAME_PAUSE');
    emit('SDK_GAME_START');
    await vi.advanceTimersByTimeAsync(REWARD_GRACE);
    expect(result).toBe(false);
  });

  it('rewarded: AD_ERROR, AD_SDK_CANCELED and a rejected showAd() settle false right away', async () => {
    for (const how of ['AD_ERROR', 'AD_SDK_CANCELED', 'reject', 'throw']) {
      const { gd, log } = setup((_t, e) => {
        if (how === 'throw') throw new Error('boom');
        if (how === 'reject') return Promise.reject(new Error('no fill'));
        e('SDK_GAME_PAUSE');
        e(how);
        return never();
      });
      let result: boolean | undefined;
      gd.rewarded().then((r) => (result = r));
      await vi.advanceTimersByTimeAsync(0);
      expect(result, how).toBe(false);
      expect(gd.muted, how).toBe(false);
      if (how.startsWith('AD_')) expect(log, how).toEqual(['mute', 'pause', 'unmute', 'resume']);
    }
  });

  it('rewarded: nothing started within 8 s settles false (and later callbacks are ignored)', async () => {
    let emit: Emit = () => {};
    const { gd, log } = setup((_t, e) => {
      emit = e;
      return never();
    });
    const results: boolean[] = [];
    gd.rewarded().then((r) => results.push(r));
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT - 1);
    expect(results).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(results).toEqual([false]);
    // a late ad: it still pauses / resumes the game, but cannot grant the reward or settle again
    emit('SDK_GAME_PAUSE');
    emit('SDK_REWARDED_WATCH_COMPLETE');
    emit('SDK_GAME_START');
    await vi.advanceTimersByTimeAsync(REWARD_GRACE);
    expect(results).toEqual([false]);
    expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
  });

  it('a double callback settles once', async () => {
    let emit: Emit = () => {};
    let resolve: (v?: unknown) => void = () => {};
    const { gd } = setup((_t, e) => {
      emit = e;
      return new Promise((r) => (resolve = r));
    });
    const results: boolean[] = [];
    gd.rewarded().then((r) => results.push(r));
    emit('SDK_GAME_PAUSE');
    emit('SDK_REWARDED_WATCH_COMPLETE');
    emit('SDK_REWARDED_WATCH_COMPLETE');
    emit('AD_ERROR');
    resolve();
    emit('SDK_GAME_START');
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT * 2);
    expect(results).toEqual([true]);
  });

  it('a second request while one is pending is refused', async () => {
    const { gd, showAd } = setup(() => never());
    const a = gd.rewarded();
    expect(await gd.rewarded()).toBe(false);
    expect(showAd).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT);
    expect(await a).toBe(false);
  });

  it('interstitial: pre-roll on the first Play, then at most once per 2 minutes, never during a level', async () => {
    const { gd, showAd } = setup((_t, e) => {
      e('SDK_GAME_PAUSE');
      e('SDK_GAME_START');
      return Promise.resolve();
    });
    await gd.midgame('preroll');
    expect(showAd).toHaveBeenCalledTimes(1);
    expect(showAd).toHaveBeenLastCalledWith();
    await gd.midgame('between');
    await gd.midgame('menu');
    await gd.midgame('preroll');
    expect(showAd).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + MIDGAME_GAP);
    gd.gameplayStart();
    await gd.midgame('between');
    expect(showAd).toHaveBeenCalledTimes(1);
    gd.gameplayStop();
    await gd.midgame('menu');
    expect(showAd).toHaveBeenCalledTimes(2);
  });

  it('interstitial: an SDK that never answers resolves after 8 s', async () => {
    const { gd, log } = setup(() => never());
    let done = false;
    gd.midgame('preroll').then(() => (done = true));
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    expect(log).toEqual([]);
  });

  it('SDK pause / start events outside a request still pause, mute and resume', () => {
    const { gd, emit, log } = setup(() => never());
    emit('SDK_GAME_PAUSE');
    emit('SDK_GAME_PAUSE');
    expect(gd.muted).toBe(true);
    emit('SDK_GAME_START');
    emit('SDK_GAME_START');
    expect(gd.muted).toBe(false);
    expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
  });

  it('without the SDK: no ads, no reward, the button says "no ad" and is re-enabled', async () => {
    vi.stubGlobal('window', {});
    const gd = new GDPlatform();
    expect(gd.available).toBe(false);
    await gd.midgame('preroll');
    const btn = { disabled: true, innerHTML: '▶ Watch an ad: ×2', textContent: '▶ Watch an ad: ×2' as string | null };
    const label = btn.innerHTML;
    if (!(await gd.rewarded())) adUnavailable(btn, label);
    expect(btn.textContent).toBe('No ad available right now, try later');
    expect(btn.disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(AD_UNAVAILABLE_MS);
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toBe(label);
  });

  it('init: sets GD_OPTIONS and adds the SDK script once; a failed load leaves the game ad-free', async () => {
    const scripts: { id: string; src: string; onerror?: () => void }[] = [];
    const win: Record<string, unknown> = {};
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', {
      createElement: () => ({}),
      getElementById: (id: string) => scripts.find((s) => s.id === id) ?? null,
      head: { appendChild: (s: (typeof scripts)[number]) => scripts.push(s) },
    });
    const gd = new GDPlatform();
    const p = gd.init();
    const opts = win.GD_OPTIONS as { gameId: string; onEvent: (e: { name: string }) => void };
    expect(opts.gameId).toBe(GD_GAME_ID);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ id: GD_SCRIPT_ID, src: GD_SDK_URL });
    scripts[0].onerror?.();
    await p;
    expect(gd.available).toBe(false);
    await gd.init();
    expect(scripts).toHaveLength(1);
    // the SDK's events reach the wrapper
    const log: boolean[] = [];
    gd.onMute = (m) => log.push(m);
    opts.onEvent({ name: 'SDK_GAME_PAUSE' });
    expect(log).toEqual([true]);
  });
});
