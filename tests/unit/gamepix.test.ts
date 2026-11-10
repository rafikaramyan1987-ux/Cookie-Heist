import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GamePixPlatform, REWARD_GRACE, type GamePixAdResult } from '../../src/app/platform/gamepix';
import { AD_TIMEOUT, MIDGAME_GAP } from '../../src/app/platform/types';

/** a GamePix SDK stand-in: `ad` decides what an ad does (it may emit the SDK's pause / resume events) */
type Signal = 'pause' | 'resume' | 'soundOff' | 'soundOn';
type Emit = (name: Signal) => void;
async function setup(ad: (kind: 'interstitial' | 'reward', emit: Emit) => Promise<GamePixAdResult>) {
  const handlers: Record<string, (() => void)[]> = {};
  const emit: Emit = (n) => handlers[n]?.forEach((f) => f());
  const docListeners: (() => void)[] = [];
  const doc = { hidden: false, addEventListener: (_n: string, f: () => void) => docListeners.push(f) };
  const calls: string[] = [];
  const GamePix: {
    lifecycle: { loading: (p: number) => void; loaded: () => Promise<unknown>; gameStart: () => void };
    events: { on: (n: string, f: () => void) => void };
    ads: { interstitial: () => Promise<GamePixAdResult>; reward: () => Promise<GamePixAdResult> };
    lang: ReturnType<typeof vi.fn<() => string>>;
    happyMoment: (n: string) => void;
    sadMoment: (n: string) => void;
    soundOff?: () => void;
    soundOn?: () => void;
    pause?: () => void;
    resume?: () => void;
  } & Record<string, unknown> = {
    lifecycle: {
      loading: vi.fn((p: number) => calls.push(`loading ${p}`)),
      loaded: vi.fn(async () => calls.push('loaded')),
      gameStart: vi.fn(() => calls.push('gameStart')),
    },
    events: { on: (n: string, f: () => void) => (handlers[n] ??= []).push(f) },
    ads: { interstitial: vi.fn(() => ad('interstitial', emit)), reward: vi.fn(() => ad('reward', emit)) },
    lang: vi.fn(() => 'fr'),
    happyMoment: vi.fn((n: string) => calls.push(`happy ${n}`)),
    sadMoment: vi.fn((n: string) => calls.push(`sad ${n}`)),
  };
  vi.stubGlobal('window', { GamePix });
  vi.stubGlobal('document', doc);
  const gp = new GamePixPlatform();
  const log: string[] = [];
  gp.onAdPause = (p) => log.push(p ? 'pause' : 'resume');
  gp.onMute = (m) => log.push(m ? 'mute' : 'unmute');
  await gp.init();
  const visibility = (hidden: boolean) => {
    doc.hidden = hidden;
    docListeners.forEach((f) => f());
  };
  /** the legacy property the GamePix player calls (GamePix.soundOff() etc.) */
  const legacy = (n: Signal) => (GamePix[n] as () => void)();
  return { gp, GamePix, emit, legacy, log, calls, visibility };
}
const never = () => new Promise<GamePixAdResult>(() => {});

describe('GamePix platform', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lifecycle: increasing integer progress, loaded() before ads, gameStart() only once', async () => {
    const { gp, GamePix, calls } = await setup(async () => ({ success: true }));
    gp.loadingStart();
    // no ads before loaded()
    expect(await gp.rewarded()).toBe(false);
    expect(GamePix.ads.reward).not.toHaveBeenCalled();
    await gp.ready();
    gp.loadingStop();
    gp.gameplayStart();
    gp.gameplayStop();
    gp.gameplayStart();
    expect(calls).toEqual(['loading 10', 'loading 30', 'loading 100', 'loaded', 'gameStart']);
    expect(gp.locale()).toBe('fr');
    expect(gp.data()).toBeNull();
    expect(gp.muted).toBe(false);
  });

  it('signals: happyMoment / sadMoment with stable names', async () => {
    const { gp, calls } = await setup(async () => ({ success: true }));
    await gp.ready();
    gp.happytime();
    gp.sadMoment('game_over');
    expect(calls.slice(-2)).toEqual(['happy level_complete', 'sad game_over']);
  });

  it('rewarded: granted only on success === true; pauses + mutes, then resumes', async () => {
    let result: GamePixAdResult = { success: true };
    const { gp, log } = await setup(async (_k, emit) => {
      emit('pause');
      emit('resume');
      return result;
    });
    await gp.ready();
    expect(await gp.rewarded()).toBe(true);
    expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
    for (const r of [{ success: false }, { success: false, message: 'cancel' }, { success: 'yes' }, undefined, null]) {
      result = r as GamePixAdResult;
      expect(await gp.rewarded(), JSON.stringify(r)).toBe(false);
    }
    expect(gp.muted).toBe(false);
  });

  it('rewarded: a rejected or throwing reward() settles false; a stuck SDK settles false after 8 s', async () => {
    let how = 'reject';
    const { gp, log } = await setup(() => {
      if (how === 'throw') throw new Error('boom');
      if (how === 'reject') return Promise.reject(new Error('no fill'));
      return never();
    });
    await gp.ready();
    expect(await gp.rewarded()).toBe(false);
    how = 'throw';
    expect(await gp.rewarded()).toBe(false);
    how = 'never';
    let result: boolean | undefined;
    gp.rewarded().then((r) => (result = r));
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT - 1);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(result).toBe(false);
    expect(log).toEqual([]);
  });

  it('a started ad may run longer than 8 s; a resume without a result pays nothing; late results are ignored', async () => {
    let emit: Emit = () => {};
    let resolve: (r: GamePixAdResult) => void = () => {};
    const { gp } = await setup((_k, e) => {
      emit = e;
      return new Promise((r) => (resolve = r));
    });
    await gp.ready();
    let result: boolean | undefined;
    gp.rewarded().then((r) => (result = r));
    emit('pause');
    await vi.advanceTimersByTimeAsync(AD_TIMEOUT * 3);
    expect(result).toBeUndefined();
    emit('resume');
    await vi.advanceTimersByTimeAsync(REWARD_GRACE);
    expect(result).toBe(false);
    resolve({ success: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(false);
  });

  it('interstitial: only at breaks, never during a level, never two at once, no pre-roll', async () => {
    let resolve: (r: GamePixAdResult) => void = () => {};
    const { gp, GamePix } = await setup(() => new Promise((r) => (resolve = r)));
    await gp.ready();
    expect(gp.adSlot('preroll')).toBe(false);
    await gp.midgame('preroll');
    gp.gameplayStart();
    await gp.midgame('between');
    expect(GamePix.ads.interstitial).not.toHaveBeenCalled();
    gp.gameplayStop();
    await vi.advanceTimersByTimeAsync(MIDGAME_GAP);
    let done = false;
    gp.midgame('between').then(() => (done = true));
    // a second request while one is showing is dropped (and the reward is not granted)
    await gp.midgame('menu');
    expect(await gp.rewarded()).toBe(false);
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(1);
    resolve({ success: false, message: 'No ad available' });
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });

  it('interstitial: none in the first ~2 minutes, then at most one per MIDGAME_GAP; preroll never', async () => {
    const { gp, GamePix } = await setup(async () => ({ success: true }));
    await gp.ready();
    await gp.midgame('between');
    await gp.midgame('menu');
    expect(GamePix.ads.interstitial).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(MIDGAME_GAP);
    await gp.midgame('between');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(1);
    // the next break within the gap: no ad, the caller continues at once
    await vi.advanceTimersByTimeAsync(MIDGAME_GAP - 1000);
    await gp.midgame('between');
    await gp.midgame('menu');
    await gp.midgame('preroll');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    await gp.midgame('menu');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(MIDGAME_GAP * 5);
    await gp.midgame('preroll');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(2);
  });

  it('rewarded is not limited by the gap; a completed one counts as the interstitial break (as in GD)', async () => {
    let reward: GamePixAdResult = { success: true };
    const { gp, GamePix } = await setup(async (kind) => (kind === 'reward' ? reward : { success: true }));
    await gp.ready();
    await vi.advanceTimersByTimeAsync(MIDGAME_GAP);
    await gp.midgame('between');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(1);
    // right after an interstitial, rewarded ads still work, several in a row
    expect(await gp.rewarded()).toBe(true);
    expect(await gp.rewarded()).toBe(true);
    expect(GamePix.ads.reward).toHaveBeenCalledTimes(2);
    // a completed reward restarts the gap
    await vi.advanceTimersByTimeAsync(MIDGAME_GAP - 1000);
    await gp.midgame('between');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(1);
    // a cancelled reward does not
    reward = { success: false };
    await vi.advanceTimersByTimeAsync(1000);
    expect(await gp.rewarded()).toBe(false);
    await gp.midgame('between');
    expect(GamePix.ads.interstitial).toHaveBeenCalledTimes(2);
  });

  it('pause / resume and visibility are idempotent and tracked separately', async () => {
    const { gp, emit, log, visibility } = await setup(never);
    emit('pause');
    emit('pause');
    visibility(true);
    expect(log).toEqual(['mute', 'pause']);
    emit('resume');
    emit('resume');
    // still hidden: stays paused and muted
    expect(log).toEqual(['mute', 'pause']);
    expect(gp.muted).toBe(true);
    visibility(false);
    visibility(false);
    expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
    expect(gp.muted).toBe(false);
  });

  it('assigns the legacy GamePix.soundOff / soundOn / pause / resume properties', async () => {
    const { GamePix } = await setup(never);
    for (const n of ['soundOff', 'soundOn', 'pause', 'resume'] as const) expect(typeof GamePix[n], n).toBe('function');
  });

  it('lang() is called once during init and returned as the locale', async () => {
    const { gp, GamePix } = await setup(never);
    expect(GamePix.lang).toHaveBeenCalledTimes(1);
    expect(gp.locale()).toBe('fr');
    expect(gp.locale()).toBe('fr');
    await gp.ready();
    expect(gp.locale()).toBe('fr');
    expect(GamePix.lang).toHaveBeenCalledTimes(1);
  });

  it('a throwing or non-string lang() gives no locale', async () => {
    for (const impl of [() => { throw new Error('x'); }, () => undefined, () => '']) {
      vi.stubGlobal('document', { hidden: false, addEventListener: () => {} });
      vi.stubGlobal('window', { GamePix: { lifecycle: {}, events: { on: () => {} }, ads: {}, lang: impl } });
      const gp = new GamePixPlatform();
      await gp.init();
      expect(gp.locale()).toBeNull();
    }
  });

  describe('event + legacy property: idempotent in any order', () => {
    type Src = 'emit' | 'legacy';
    const orders: Src[][] = [['emit', 'legacy'], ['legacy', 'emit'], ['emit', 'emit'], ['legacy', 'legacy']];
    for (const order of orders) {
      it(`soundOff / soundOn: ${order.join(' then ')}`, async () => {
        const { gp, emit, legacy, log } = await setup(never);
        const fire = (n: Signal) => order.forEach((src) => (src === 'emit' ? emit(n) : legacy(n)));
        fire('soundOff');
        expect(log).toEqual(['mute']);
        expect(gp.muted).toBe(true);
        fire('soundOn');
        expect(log).toEqual(['mute', 'unmute']);
        expect(gp.muted).toBe(false);
      });

      it(`pause / resume: ${order.join(' then ')}`, async () => {
        const { gp, emit, legacy, log } = await setup(never);
        const fire = (n: Signal) => order.forEach((src) => (src === 'emit' ? emit(n) : legacy(n)));
        fire('pause');
        expect(log).toEqual(['mute', 'pause']);
        expect(gp.muted).toBe(true);
        fire('resume');
        expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
        expect(gp.muted).toBe(false);
      });
    }

    it('interleaved: pause, soundOff, a portal soundOn does not unmute while still paused', async () => {
      const { gp, emit, legacy, log } = await setup(never);
      emit('pause');
      legacy('soundOff');
      legacy('pause');
      emit('soundOff');
      expect(log).toEqual(['mute', 'pause']);
      emit('soundOn');
      legacy('soundOn');
      // still paused: stays muted, no callback
      expect(log).toEqual(['mute', 'pause']);
      expect(gp.muted).toBe(true);
      legacy('resume');
      emit('resume');
      expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
      expect(gp.muted).toBe(false);
    });

    it('interleaved: soundOff outlives a pause / resume; soundOn then unmutes', async () => {
      const { gp, emit, legacy, log } = await setup(never);
      legacy('soundOff');
      emit('soundOff');
      expect(log).toEqual(['mute']);
      emit('pause');
      legacy('pause');
      expect(log).toEqual(['mute', 'pause']);
      emit('resume');
      legacy('resume');
      // resumed, but the portal sound is still off
      expect(log).toEqual(['mute', 'pause', 'resume']);
      expect(gp.muted).toBe(true);
      emit('soundOn');
      legacy('soundOn');
      expect(log).toEqual(['mute', 'pause', 'resume', 'unmute']);
      expect(gp.muted).toBe(false);
    });

    it('pause twice (event + legacy), resume once: resumed', async () => {
      const { gp, emit, legacy, log } = await setup(never);
      emit('pause');
      legacy('pause');
      legacy('resume');
      expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
      expect(gp.muted).toBe(false);
      // a late duplicate resume changes nothing
      emit('resume');
      expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
    });

    it('a rewarded ad with duplicated pause / resume (event + legacy) settles once, no double callbacks', async () => {
      // the ad fires both the event and the legacy property for pause and resume
      const s2 = await setup(async (_k, emit) => {
        emit('pause');
        s2.legacy('pause');
        s2.legacy('resume');
        emit('resume');
        return { success: true };
      });
      await s2.gp.ready();
      expect(await s2.gp.rewarded()).toBe(true);
      expect(s2.log).toEqual(['mute', 'pause', 'unmute', 'resume']);
      expect(s2.gp.muted).toBe(false);
    });
  });

  it('without the SDK (blocked): no ads, no reward, the game plays on', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { hidden: false, addEventListener: () => {} });
    const gp = new GamePixPlatform();
    await gp.init();
    await gp.ready();
    expect(gp.available).toBe(false);
    expect(gp.locale()).toBeNull();
    expect(await gp.rewarded()).toBe(false);
    await gp.midgame('between');
    gp.gameplayStart();
    gp.happytime();
  });
});
