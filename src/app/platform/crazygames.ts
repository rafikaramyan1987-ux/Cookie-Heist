/**
 * CrazyGames SDK v3 wrapper with safe fallbacks (works offline / on other hosts).
 * - gameplayStart/Stop, loadingStart/Stop, happytime. gameplayStart is never sent before loadingStop (a first-time
 *   player's night 1 starts while the loading screen is still up: it is sent right after loadingStop)
 * - midgame ads (rate-limited to one per ~2 min, only between levels), rewarded ads; every request settles once
 * - Data Module for saves (falls back to localStorage when the module is disabled / throws), mute setting, locale
 * - no SDK call ever throws into the game: the SDK forwards every uncaught error and unhandled rejection of the page
 *   to CrazyGames, where it counts as a load or gameplay crash
 */

import { AD_MAX, AD_TIMEOUT, MIDGAME_GAP, loadScript, safe, type AdSlot, type KeyValueStore, type Platform } from './types';

interface CGSdk {
  init(): Promise<void>;
  environment: 'local' | 'crazygames' | 'disabled';
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
    settings?: { muteAudio?: boolean };
    addSettingsChangeListener?(cb: (s: { muteAudio?: boolean }) => void): void;
  };
  ad: {
    requestAd(type: 'midgame' | 'rewarded', cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }): void;
  };
  data?: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
  user?: { systemInfo?: { locale?: string; countryCode?: string } };
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CGSdk };
  }
}

export class CrazyGamesPlatform implements Platform {
  readonly name = 'crazygames';
  readonly autoResume = false;
  private s: CGSdk | null = null;
  private playing = false;
  private adBusy = false;
  private lastMidgame = Date.now(); // no ad right after loading
  /** loadingStop was sent: gameplayStart may follow */
  private loaded = false;
  /** the Data Module, wrapped so it never throws (null: disabled / unusable, saves use localStorage) */
  private store: KeyValueStore | null = null;
  muted = false;
  onMute: (m: boolean) => void = () => {};
  onAdPause: (paused: boolean) => void = () => {};

  async init(timeoutMs = 3500) {
    try {
      if (!window.CrazyGames) await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js', timeoutMs);
      const s = window.CrazyGames?.SDK;
      if (!s) return;
      let to: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([s.init(), new Promise((_, rej) => (to = setTimeout(() => rej(new Error('sdk timeout')), timeoutMs)))]).finally(() => clearTimeout(to));
      if (s.environment === 'disabled') return;
      this.s = s;
      this.muted = !!safe(() => s.game.settings?.muteAudio);
      safe(() =>
        s.game.addSettingsChangeListener?.((st) => {
          if (st && st.muteAudio !== undefined) {
            this.muted = !!st.muteAudio;
            this.onMute(this.muted);
          }
        }),
      );
      this.store = wrapData(s);
    } catch {
      this.s = null;
    }
  }

  get available() {
    return !!this.s;
  }
  locale(): string | null {
    return safe(() => this.s?.user?.systemInfo?.locale) ?? null;
  }
  data() {
    return this.store;
  }
  loadingStart() {
    safe(() => this.s?.game.loadingStart());
  }
  loadingStop() {
    if (this.loaded) return;
    this.loaded = true;
    safe(() => this.s?.game.loadingStop());
    // a night that started while the loading screen was up: its gameplayStart goes out now
    if (this.playing) safe(() => this.s?.game.gameplayStart());
  }
  gameplayStart() {
    if (this.playing) return;
    this.playing = true;
    if (this.loaded) safe(() => this.s?.game.gameplayStart());
  }
  gameplayStop() {
    if (!this.playing) return;
    this.playing = false;
    if (this.loaded) safe(() => this.s?.game.gameplayStop());
  }
  happytime() {
    safe(() => this.s?.game.happytime());
  }

  /**
   * Request an ad and settle exactly once: on adFinished / adError, when requestAd throws, when the ad has not
   * started within AD_TIMEOUT (no fill, blocked, SDK stuck), or AD_MAX after it started without an end — so the
   * game never hangs waiting for an ad.
   */
  private requestAd(type: 'midgame' | 'rewarded'): Promise<boolean> {
    const s = this.s;
    if (!s || this.adBusy) return Promise.resolve(false);
    this.adBusy = true;
    return new Promise((res) => {
      let done = false;
      let started = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        clearTimeout(cap);
        this.adBusy = false;
        safe(() => this.onAdPause(false));
        res(ok);
      };
      const timer = setTimeout(() => finish(false), AD_TIMEOUT);
      const cap = setTimeout(() => finish(false), AD_MAX);
      try {
        s.ad.requestAd(type, {
          adStarted: () => {
            if (done || started) return;
            started = true;
            clearTimeout(timer); // the ad is playing: wait for it to finish (at most AD_MAX)
            safe(() => this.onAdPause(true));
          },
          adFinished: () => finish(true),
          adError: () => finish(false),
        });
      } catch {
        finish(false);
      }
    });
  }

  /** CrazyGames: midgame ads only in the between-levels slot (Next / Retry / skip) */
  adSlot(slot: AdSlot) {
    return slot === 'between';
  }

  /** Midgame ad between levels, at most once per ~2 minutes. Resolves when done, skipped, failed or timed out. */
  async midgame(slot: AdSlot = 'between'): Promise<void> {
    if (!this.adSlot(slot) || !this.s || Date.now() - this.lastMidgame < MIDGAME_GAP) return;
    this.lastMidgame = Date.now();
    await this.requestAd('midgame');
  }

  /** Rewarded ad; resolves true only if the ad completed (false on error / timeout). Always optional for the player. */
  async rewarded(): Promise<boolean> {
    // no SDK (blocked, offline, not on CrazyGames): no ad, so no reward. The game only offers rewarded buttons when
    // the SDK is there (or with ?fakeads in dev / tests, see app.ts)
    if (!this.s) return import.meta.env.DEV || new URLSearchParams(location.search).has('fakeads');
    const ok = await this.requestAd('rewarded');
    // a finished rewarded ad also counts as the midgame break
    if (ok) this.lastMidgame = Date.now();
    return ok;
  }
}

/**
 * The Data Module as a store that never throws. It throws `dataModuleDisabled` when Progress Save is off for the
 * game, and `dataLimitExcedeed` above 1 MB; a disabled module (probed with one read) means localStorage is used, so
 * a returning player still finds their progress.
 */
function wrapData(s: CGSdk): KeyValueStore | null {
  const d = s.data;
  if (!d) return null;
  try {
    d.getItem('cookieheist.save.v1');
  } catch {
    return null;
  }
  return {
    getItem: (k) => {
      try {
        return d.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        d.setItem(k, v);
      } catch {
        /* too large / unavailable: keep playing, the in-memory save stays */
      }
    },
  };
}
