import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GamePixPlatform, REWARD_GRACE, type GamePixAdResult } from '../../src/app/platform/gamepix';
import { AD_TIMEOUT, MIDGAME_GAP } from '../../src/app/platform/types';

/** a GamePix SDK stand-in: `ad` decides what an ad does (it may emit the SDK's pause / resume events) */
type Emit = (name: 'pause' | 'resume' | 'soundOff' | 'soundOn') => void;
async function setup(ad: (kind: 'interstitial' | 'reward', emit: Emit) => Promise<GamePixAdResult>) {
  const handlers: Record<string, (() => void)[]> = {};
  const emit: Emit = (n) => handlers[n]?.forEach((f) => f());
  const docListeners: (() => void)[] = [];
  const doc = { hidden: false, addEventListener: (_n: string, f: () => void) => docListeners.push(f) };
  const calls: string[] = [];
  const GamePix = {
    lifecycle: {
      loading: vi.fn((p: number) => calls.push(`loading ${p}`)),
      loaded: vi.fn(async () => calls.push('loaded')),
      gameStart: vi.fn(() => calls.push('gameStart')),
    },
    events: { on: (n: string, f: () => void) => (handlers[n] ??= []).push(f) },
    ads: { interstitial: vi.fn(() => ad('interstitial', emit)), reward: vi.fn(() => ad('reward', emit)) },
    lang: () => 'fr',
    happyMoment: vi.fn((n: string) => calls.push(`happy ${n}`)),
    sadMoment: vi.fn((n: string) => calls.push(`sad ${n}`)),
  } as Record<string, unknown> & { soundOff?: () => void; soundOn?: () => void; ads: { interstitial: ReturnType<typeof vi.fn>; reward: ReturnType<typeof vi.fn> }; lifecycle: Record<string, ReturnType<typeof vi.fn>> };
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
  return { gp, GamePix, emit, log, calls, visibility };
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
    // audio stays muted until the ad has really settled (the SDK's resume comes just before the result)
    expect(log).toEqual(['mute', 'pause', 'resume', 'unmute']);
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
  describe('soundOff / soundOn', () => {
    it('soundOff mutes without pausing; soundOn restores; both idempotent', async () => {
      const { gp, emit, log } = await setup(async () => ({ success: true }));
      emit('soundOff');
      emit('soundOff');
      expect(gp.muted).toBe(true);
      expect(log).toEqual(['mute']); // no 'pause': the level keeps running
      emit('soundOn');
      emit('soundOn');
      expect(gp.muted).toBe(false);
      expect(log).toEqual(['mute', 'unmute']);
    });

    it('soundOn during a pause does not unmute until the pause ends', async () => {
      const { gp, emit, log } = await setup(async () => ({ success: true }));
      emit('pause');
      emit('soundOff');
      emit('soundOn');
      expect(gp.muted).toBe(true);
      emit('resume');
      expect(gp.muted).toBe(false);
      expect(log).toEqual(['mute', 'pause', 'unmute', 'resume']);
    });

    it('a resume while the portal sound is off keeps the game silent (pause → soundOff → resume → soundOn)', async () => {
      const { gp, emit, log } = await setup(async () => ({ success: true }));
      emit('pause');
      emit('soundOff');
      emit('resume');
      expect(gp.muted).toBe(true);
      expect(log).toEqual(['mute', 'pause', 'resume']);
      emit('soundOn');
      expect(gp.muted).toBe(false);
    });

    it('an ad over a sound-off stays silent afterwards; soundOn during the ad waits for the ad to end', async () => {
      let finish: (r: GamePixAdResult) => void = () => {};
      const { gp, emit } = await setup(
        (_k, e) =>
          new Promise<GamePixAdResult>((res) => {
            e('pause');
            finish = (r) => {
              e('resume');
              res(r);
            };
          }),
      );
      await gp.ready();
      emit('soundOff');
      const p = gp.rewarded();
      await Promise.resolve();
      expect(gp.muted).toBe(true);
      emit('soundOn'); // the player turned the portal sound back on mid-ad
      expect(gp.muted).toBe(true); // still silent: the ad is playing
      finish({ success: true });
      expect(await p).toBe(true);
      expect(gp.muted).toBe(false);
      // sound off again, then an ad: silent all along and after
      emit('soundOff');
      const q = gp.rewarded();
      await Promise.resolve();
      finish({ success: false });
      expect(await q).toBe(false);
      expect(gp.muted).toBe(true);
    });

    it('legacy hooks GamePix.soundOff() / soundOn() work the same', async () => {
      const { gp, GamePix, log } = await setup(async () => ({ success: true }));
      GamePix.soundOff!();
      expect(gp.muted).toBe(true);
      GamePix.soundOn!();
      expect(gp.muted).toBe(false);
      expect(log).toEqual(['mute', 'unmute']);
    });
  });
});
