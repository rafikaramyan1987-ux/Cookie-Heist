/**
 * CrazyGames SDK v3 wrapper with safe fallbacks (works offline / on other hosts).
 * - gameplayStart/Stop, loadingStart/Stop, happytime
 * - midgame ads (rate-limited to one per ~2 min, only between levels), rewarded ads
 * - Data Module for saves, mute setting, locale
 */

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

const MIDGAME_GAP = 120_000;

class SdkWrapper {
  private s: CGSdk | null = null;
  private playing = false;
  private lastMidgame = Date.now(); // no ad right after loading
  muted = false;
  onMute: (m: boolean) => void = () => {};
  onAdPause: (paused: boolean) => void = () => {};

  async init(timeoutMs = 3500) {
    try {
      if (!window.CrazyGames) await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js', timeoutMs);
      const s = window.CrazyGames?.SDK;
      if (!s) return;
      await Promise.race([s.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('sdk timeout')), timeoutMs))]);
      if (s.environment === 'disabled') return;
      this.s = s;
      this.muted = !!s.game.settings?.muteAudio;
      s.game.addSettingsChangeListener?.((st) => {
        if (st.muteAudio !== undefined) {
          this.muted = st.muteAudio;
          this.onMute(this.muted);
        }
      });
    } catch {
      this.s = null;
    }
  }

  get available() {
    return !!this.s;
  }
  locale(): string | null {
    return this.s?.user?.systemInfo?.locale ?? null;
  }
  data() {
    return this.s?.data ?? null;
  }
  loadingStart() {
    this.s?.game.loadingStart();
  }
  loadingStop() {
    this.s?.game.loadingStop();
  }
  gameplayStart() {
    if (this.playing) return;
    this.playing = true;
    this.s?.game.gameplayStart();
  }
  gameplayStop() {
    if (!this.playing) return;
    this.playing = false;
    this.s?.game.gameplayStop();
  }
  happytime() {
    this.s?.game.happytime();
  }

  /** Midgame ad between levels, at most once per ~2 minutes. Resolves when done (or skipped). */
  midgame(): Promise<void> {
    if (!this.s || Date.now() - this.lastMidgame < MIDGAME_GAP) return Promise.resolve();
    this.lastMidgame = Date.now();
    return new Promise((res) => {
      this.s!.ad.requestAd('midgame', {
        adStarted: () => this.onAdPause(true),
        adFinished: () => {
          this.onAdPause(false);
          res();
        },
        adError: () => {
          this.onAdPause(false);
          res();
        },
      });
    });
  }

  /** Rewarded ad; resolves true only if the ad completed. Always optional for the player. */
  rewarded(): Promise<boolean> {
    if (!this.s) {
      // no SDK (local dev / tests): grant the reward so the flow can be tested
      return Promise.resolve(true);
    }
    return new Promise((res) => {
      this.s!.ad.requestAd('rewarded', {
        adStarted: () => this.onAdPause(true),
        adFinished: () => {
          this.onAdPause(false);
          this.lastMidgame = Date.now();
          res(true);
        },
        adError: () => {
          this.onAdPause(false);
          res(false);
        },
      });
    });
  }
}

function loadScript(src: string, timeoutMs: number) {
  return new Promise<void>((res, rej) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    const to = setTimeout(() => rej(new Error('timeout')), timeoutMs);
    el.onload = () => {
      clearTimeout(to);
      res();
    };
    el.onerror = () => {
      clearTimeout(to);
      rej(new Error('load failed'));
    };
    document.head.appendChild(el);
  });
}

export const sdk = new SdkWrapper();
