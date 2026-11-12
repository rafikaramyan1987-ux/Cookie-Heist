import * as THREE from 'three';
import { createStage, Stage } from '../render/stage';
import { getLevel, levelId, HOUSE_COUNT, LEVELS_PER_HOUSE, loadHouses, housesLoaded, getSnackLevel } from '../levels/index';
import { World, GameEvent, Input } from '../game/world';
import { Bot, PROFILES } from '../game/bot';
import { GameScene, TrailId } from '../game3d/gameScene';
import { SKINS, CapId } from '../render/characters';
import { HOUSES, HIDE } from '../game/level';
import { GameHud } from '../ui/gameHud';
import { buildIntro } from '../ui/intro';
import { buildTitle, fitTitle } from '../ui/title';
import { houseMap, shopScreen, dailyScreen, missionsScreen, settingsScreen, pauseScreen, winScreen, failScreen, retentionStrip } from '../ui/screens';
import { Tutorial } from '../ui/tutorial';
import { sparkle, phew, catchBurst, starRain } from '../ui/juice';
import type { View } from '../art/view';
import { InputCtl } from './input';
import { audio } from './audio';
import { sdk, type AdSlot } from './sdk';
import { loadSave, saveSoon, saveNow, SaveData } from './save';
import { t, useLang, detectLang, getLang } from './i18n';
import { loader } from './loader';
import { importRetry } from './lazy';
import { report } from './guard';
import { disposeScene, forgetLostContext } from '../render/dispose';
import {
  buy,
  levelCoins,
  claimDaily,
  dailyAvailable,
  ensureMissions,
  progressMission,
  claimMission,
  useBoost,
  buyBoost,
  BoostId,
  currentStreak,
  nextDaily,
  nextUnlock,
  missionsProgress,
  snackAvailable,
  snackIndex,
  today,
  SNACK_COINS,
} from './meta';
import { findHint, HintFollower } from '../game/hint';
import { ICONS } from '../ui/icons';
import { preview, loadPreview } from '../ui/previewHandle';
import type { IntroBoost } from '../ui/intro';
import type { Level } from '../game/types';

type Mode = 'title' | 'intro-wait' | 'intro' | 'play' | 'paused' | 'result' | 'cinematic';
type RunKind = 'normal' | 'tutorial' | 'snack';

interface Run {
  h: number;
  i: number;
  kind: RunKind;
  level: Level;
  world: World;
  scene: GameScene;
  hud: GameHud;
  bot: { update(dt: number): Input } | null;
  acc: number;
  endT: number;
  stepT: number;
  snoreT: number;
  /** this attempt is played with a hint */
  hinted: boolean;
  /** first-visit tutorial overlay (night 1) */
  tut: Tutorial | null;
  /** near-miss tracking: a grown-up came close (s since), cooldown before the next "Phew!" */
  near: number;
  phewCd: number;
}

export interface OpenOpts {
  extraToys?: number;
  hint?: boolean;
  /** start playing at once (retry, tutorial): no intro card */
  quick?: boolean;
  tutorial?: boolean;
  /** the midnight-snack bonus night (variant) */
  snack?: number;
}

const DT = 1 / 60;
const params = new URLSearchParams(location.search);
/** rewarded-ad buttons are offered only where real ads exist (dev / tests: `?fakeads`) */
const FAKE_ADS = import.meta.env.DEV || params.has('fakeads');

export class App {
  stage!: Stage;
  save: SaveData = loadSave();
  ui = document.getElementById('ui')!;
  canvas = document.getElementById('game') as HTMLCanvasElement;
  input = new InputCtl(this.canvas);
  mode: Mode = 'title';
  run: Run | null = null;
  title: View | null = null;
  titleEl: HTMLElement | null = null;
  /** houses 2–5 could not be loaded for the menu (offline): it shows without them; opening one tries again */
  private housesFailed = false;
  /** the WebGL renderer could not be created (boot() says so on the loading screen) */
  private noWebgl = false;
  overlay: HTMLElement | null = null;
  w = 1;
  h = 1;
  t = 0;
  touch = matchMedia('(pointer: coarse)').matches;
  autoplay = params.get('autoplay') as 'beginner' | 'average' | 'good' | 'hint' | null;
  capture = params.has('capture');
  private last = performance.now();
  private adPausedPlay = false;
  private adBusy = false;

  /** rewarded ads available on this platform */
  get adsOn() {
    return sdk.available || FAKE_ADS;
  }

  /**
   * Boot, never throwing: an error here used to be an unhandled rejection with the loading screen up forever (a
   * CrazyGames load crash). Now the loading screen says what failed, with a retry button (index.html).
   */
  async boot() {
    try {
      await this.start();
    } catch (e) {
      report('boot', e);
      const w = window as unknown as { __bootFail?: (kind: string) => void };
      w.__bootFail?.(this.noWebgl ? 'webgl' : 'load');
    }
  }

  private async start() {
    performance.mark('ch:boot');
    loader.progress(0.3);
    await sdk.init(params.has('nosdk') ? 1 : 3500);
    sdk.loadingStart();
    performance.mark('ch:sdk');
    loader.progress(0.5);
    this.save = loadSave();
    await useLang(this.save.lang ?? detectLang(sdk.locale()));
    loader.progress(0.6);
    ensureMissions(this.save);
    audio.soundOn = this.save.sound;
    audio.musicOn = this.save.music;
    audio.sdkMuted = sdk.muted;
    sdk.onMute = (m) => {
      audio.sdkMuted = m;
      audio.apply();
    };
    sdk.onAdPause = (p) => {
      audio.suspend(p);
      if (p && this.mode === 'play') {
        this.pause();
        this.adPausedPlay = true;
      } else if (!p && this.adPausedPlay) {
        this.adPausedPlay = false;
        // portals that hand control back with an event (GD's SDK_GAME_START) resume the level by themselves
        if (sdk.autoResume && this.mode === 'paused') this.resume();
      }
    };
    // the UI font: wait a moment for it, never long (the loader is already on screen; text swaps in when it lands)
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 250))]);
    performance.mark('ch:fonts');
    // no WebGL (blocked, no GPU, too many contexts): boot() shows the "no 3D" card instead of a stuck loader
    try {
      this.stage = createStage(this.canvas, { low: params.has('low') });
    } catch (e) {
      this.noWebgl = true;
      throw e;
    }
    this.watchContext();
    performance.mark('ch:stage');
    loader.progress(0.8);
    this.input.onAnyInput = () => audio.unlock();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        saveNow(this.save);
        if (this.mode === 'play' && !this.capture) this.pause();
      }
    });
    (window as unknown as { __game: unknown }).__game = this;
    // GamePix: loading 100 %, then `await lifecycle.loaded()` before the menu shows (the loading screen stays up)
    if (__PLATFORM__ === 'gamepix') await sdk.ready?.();
    const lv = params.get('level');
    // first visit: no menu, straight into night 1 with the in-game tutorial
    const first = !this.save.tutorialDone && !params.has('menu');
    if (lv) {
      const [h, i] = lv.split('-').map(Number);
      if (h > 0) await loadHouses();
      this.openLevel(h, i, { hint: params.has('hint'), tutorial: h === 0 && i === 0 && first && !this.autoplay && !this.capture });
    } else if (first) this.openLevel(0, 0, { tutorial: true, quick: true });
    else {
      // houses 2–5 for the menu (map, next night); if they cannot be loaded the menu still shows (showTitle)
      await loadHouses().catch(() => (this.housesFailed = true));
      this.showTitle();
    }
    performance.mark('ch:level');
    this.resize();
    // render the first frame before the loader fades
    this.tick(0);
    performance.mark('ch:frame');
    sdk.loadingStop();
    loader.done();
    // Playgama: Bridge's game_ready once the loading screen has faded out (loader.ts) and the player can play
    if (__PLATFORM__ === 'playgama') setTimeout(() => sdk.gameReady?.(), 500);
    // ?capture / ?manual: frames are driven from outside (tick), for recordings; ?manual keeps the normal player flow
    if (!this.capture && !params.has('manual')) requestAnimationFrame(this.frame);
    (window as unknown as { __ready: boolean }).__ready = true;
    try {
      sessionStorage.removeItem('ch-reload'); // index.html's one automatic reload is available again
    } catch {
      /* no sessionStorage */
    }
    // everything else streams in the background once night 1 / the menu is up (failures: tried again when needed)
    setTimeout(() => {
      loadHouses().catch(() => {});
      void loadPreview();
    }, 600);
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    document.body.classList.toggle('portrait', this.h > this.w);
    this.stage.resize(this.w, this.h);
    this.title?.resize(this.w, this.h);
    if (this.titleEl) fitTitle(this.titleEl, this.w, this.h);
    if (this.run) {
      this.run.scene.resize(this.w, this.h);
      this.run.hud.layout(this.w, this.h);
    }
    this.input.radius = Math.min(90, Math.max(60, Math.min(this.w, this.h) * 0.17));
  }

  persist() {
    saveSoon(this.save);
  }

  // ------------------------------------------------------------------ progress helpers
  isDone(h: number, i: number) {
    const id = levelId(h, i);
    return this.save.stars[id] !== undefined || !!this.save.skipped[id];
  }
  unlocked(h: number, i: number): boolean {
    if (h === 0 && i === 0) return true;
    if (i === 0) return this.isDone(h - 1, LEVELS_PER_HOUSE - 1);
    return this.isDone(h, i - 1);
  }
  nextLevel(): [number, number] {
    for (let h = 0; h < HOUSE_COUNT; h++) for (let i = 0; i < LEVELS_PER_HOUSE; i++) if (!this.isDone(h, i) && this.unlocked(h, i)) return [h, i];
    return [HOUSE_COUNT - 1, LEVELS_PER_HOUSE - 1];
  }

  // ------------------------------------------------------------------ title
  showTitle() {
    if (!housesLoaded() && !this.housesFailed) {
      // houses 2–5 are a lazy chunk (normally long loaded by now); offline: the menu shows anyway (house 1 plays,
      // the others are tried again when opened)
      loadHouses().then(
        () => this.showTitle(),
        () => {
          this.housesFailed = true;
          this.showTitle();
        },
      );
      return;
    }
    if (!this.title) {
      // the 3D title scene is a lazy chunk (first-time players go straight into night 1); offline: a plain backdrop
      importRetry(() => import('../art/titleView')).then(
        (m) => {
          this.title ??= m.titleView();
          this.showTitle();
        },
        () => {
          this.title ??= plainView();
          this.showTitle();
        },
      );
      return;
    }
    this.disposeRun();
    this.clearUi();
    this.mode = 'title';
    sdk.gameplayStop();
    this.title.overlay?.forEach((o) => o.remove());
    const [h, i] = this.nextLevel();
    this.titleEl = buildTitle({
      coins: this.save.coins,
      sub: `${t(`house_${HOUSES[h]}`)} · ${t('night')} ${i + 1}`,
      dailyReady: dailyAvailable(this.save),
      streak: currentStreak(this.save),
      missions: missionsProgress(this.save),
      soundOn: this.save.sound,
      snack: this.save.tutorialDone && housesLoaded() ? snackAvailable(this.save) : undefined,
    });
    this.ui.appendChild(this.titleEl);
    // logo and buttons never overlap: fit now, and again once the title font has loaded (it changes the sizes)
    const fit = () => this.titleEl && fitTitle(this.titleEl, this.w, this.h);
    fit();
    void document.fonts?.ready.then(fit);
    this.stage.setScene(this.title.scene, this.title.camera);
    this.title.resize(this.w, this.h);
    this.titleEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.titleEl.querySelectorAll<HTMLElement>('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        audio.unlock();
        audio.play('ui');
        this.titleAction(b.dataset.act!);
      }),
    );
    audio.startMusic(1);
  }

  private titleAction(act: string) {
    switch (act) {
      case 'play': {
        const [h, i] = this.nextLevel();
        this.between(() => this.openLevel(h, i), 'preroll');
        break;
      }
      case 'snack':
        if (snackAvailable(this.save)) this.openLevel(0, 0, { snack: snackIndex() });
        break;
      case 'map':
        this.ui.appendChild(houseMap(this.save, (h, i) => this.openLevel(h, i), levelId, (h, i) => this.unlocked(h, i)));
        break;
      case 'shop':
        void loadPreview().then(() => {
          if (this.mode !== 'title') return;
          this.ui.appendChild(
            shopScreen(
              this.save,
              () => {
                this.persist();
                this.refreshTitle();
              },
              (item) => {
                const ok = buy(this.save, item);
                if (ok) audio.play('coin');
                return ok;
              },
              (id) => {
                const ok = buyBoost(this.save, id);
                if (ok) audio.play('coin');
                return ok;
              },
            ),
          );
        });
        break;
      case 'daily':
        this.openDaily();
        break;
      case 'missions':
        this.ui.appendChild(
          missionsScreen(this.save, (i) => {
            const c = claimMission(this.save, i);
            if (c) audio.play('coin');
            this.persist();
            this.refreshTitle();
            return c;
          }),
        );
        break;
      case 'settings':
        this.ui.appendChild(settingsScreen(this.save, () => this.applySettings()));
        break;
      case 'sound':
        this.save.sound = !this.save.sound;
        this.save.music = this.save.sound;
        this.applySettings();
        break;
    }
  }

  /** the 7-day calendar (title, or from the end screens) */
  private openDaily() {
    void loadPreview().then(() =>
      this.ui.appendChild(
        dailyScreen(this.save, () => {
          const r = claimDaily(this.save);
          if (r) audio.play('coin');
          this.persist();
          this.refreshTitle();
          return r;
        }),
      ),
    );
  }

  private refreshTitle() {
    if (this.mode !== 'title') return;
    const modals = [...this.ui.querySelectorAll('.modal-wrap')];
    this.titleEl?.remove();
    this.showTitle();
    modals.forEach((m) => this.ui.appendChild(m));
  }

  applySettings() {
    audio.soundOn = this.save.sound;
    audio.musicOn = this.save.music;
    audio.apply();
    this.persist();
    const lang = this.save.lang;
    if (lang && lang !== getLang()) {
      void useLang(lang).then(() => {
        this.ui.querySelectorAll('.settings-modal:not(.pause-modal)').forEach((m) => m.remove());
        if (this.mode === 'title') this.showTitle();
        else if (this.mode === 'paused') {
          // rebuild the pause menu in the new language
          this.ui.querySelectorAll('.pause-modal').forEach((m) => m.remove());
          this.mode = 'play';
          this.pause();
        }
      });
    } else if (this.mode === 'title') this.refreshTitle();
  }

  // ------------------------------------------------------------------ level lifecycle
  openLevel(h: number, i: number, opts: OpenOpts = {}) {
    if ((opts.snack !== undefined || h > 0) && !housesLoaded()) {
      loadHouses().then(
        () => this.openLevel(h, i, opts),
        () => this.loadFailed(),
      );
      return;
    }
    if (opts.hint && this.mode !== 'intro-wait') {
      // finding a hint takes a moment: show a card first, then compute
      this.disposeRun();
      this.clearUi();
      this.mode = 'intro-wait';
      const card = document.createElement('div');
      card.className = 'finding-hint';
      card.innerHTML = `${ICONS.bulb}<span>${t('findingHint')}</span>`;
      this.ui.appendChild(card);
      setTimeout(() => this.openLevel(h, i, opts), 40);
      return;
    }
    this.disposeRun();
    this.clearUi();
    const kind: RunKind = opts.snack !== undefined ? 'snack' : opts.tutorial ? 'tutorial' : 'normal';
    const level = opts.snack !== undefined ? getSnackLevel(opts.snack) : getLevel(h, i);
    let seed = params.has('seed') ? +params.get('seed')! : (Date.now() & 0xffff) + 1;
    // hint: a safe route for this exact attempt (the attempt is played on the hint's seed)
    const hint = opts.hint ? findHint(level, seed, 6, 3) : null;
    if (hint) seed = hint.seed;
    const world = new World(level, { seed, jitter: this.autoplay || this.capture ? 0.6 : 0, extraToys: opts.extraToys ?? 0 });
    const skin = SKINS.find((s) => s.id === this.save.skin) ?? SKINS[0];
    const scene = new GameScene(level, world, { skin, cap: this.save.cap as CapId, trail: this.save.trail as TrailId });
    if (hint) scene.setHint(hint, { wait: t('hintWait'), go: t('hintGoLabel') });
    const houseName = kind === 'snack' ? t('snackTitle') : t(`house_${level.house}`);
    const hud = new GameHud({
      houseName,
      night: i + 1,
      total: level.cookies.length,
      need: level.need,
      par: level.par,
      toys: world.toys,
      bedCheck: level.bedCheck,
      hasKeys: level.keys.length > 0,
      hasPillow: level.pillows.length > 0,
      toyPickups: level.toyPickups.length,
      bonus: level.bonus,
      touch: this.touch,
      peeks: this.autoplay || this.capture ? 0 : this.save.items.peek,
    });
    hud.onPause = () => this.pause();
    hud.onToy = () => {
      if (world.toys > 0) this.input.aiming = !this.input.aiming;
    };
    hud.onZoom = (on) => (scene.camera.overview = on);
    hud.onPeek = () => {
      // peek boost: 2 s map view with the grown-ups' routes
      if (this.mode !== 'play' || !useBoost(this.save, 'peek')) return;
      this.persist();
      hud.setPeeks(this.save.items.peek);
      scene.camera.overview = true;
      scene.setRoutes(true);
      setTimeout(() => {
        scene.setRoutes(false);
        if (!hud.zoomOn) scene.camera.overview = false;
      }, 2000);
    };
    const tut = kind === 'tutorial' ? new Tutorial(this.touch) : null;
    this.run = { h, i, kind, level, world, scene, hud, bot: null, acc: 0, endT: 0, stepT: 0, snoreT: 2, hinted: !!hint, tut, near: 0, phewCd: 0 };
    if (tut) {
      hud.el.appendChild(tut.el);
      tut.onSkip = () => audio.play('ui');
    }
    // ?autoplay=hint: Pip follows the hint like a person would (demo / capture)
    if (this.autoplay === 'hint') this.run.bot = hint ? new HintFollower(world, hint, 1) : new Bot(world, PROFILES.good, 7);
    else if (this.autoplay) this.run.bot = new Bot(world, PROFILES[this.autoplay], 7);
    if (hint && scene.hint)
      scene.hint.onGo = (_k, x, z) => {
        // the safe window opens: pulse; a "Go!" for the marker the kid is waiting at
        const p = world.player;
        hud.goPulse();
        if (Math.hypot(p.x - x, p.z - z) < 1.6) {
          hud.toast(t('hintGo'));
          audio.play('ui');
          try {
            navigator.vibrate?.(35);
          } catch {
            /* no vibration */
          }
        }
      };
    this.stage.setScene(scene.scene, scene.camera.cam);
    scene.resize(this.w, this.h);
    hud.layout(this.w, this.h);
    audio.startMusic(kind === 'snack' ? 0 : h);
    const chosen = new Set<string>();
    let intro: HTMLElement | null = null;
    const startPlay = () => {
      if (this.mode !== 'intro' || this.run?.world !== world) return;
      audio.unlock();
      intro?.remove();
      this.overlay = null;
      // boosts picked on the intro card are used now
      if (chosen.has('toy') && useBoost(this.save, 'toy')) world.toys++;
      if (chosen.has('pillow') && useBoost(this.save, 'pillow')) {
        world.decoy = true;
        hud.toast(t('pillowOn'));
      }
      if (chosen.size) this.persist();
      this.ui.appendChild(hud.el);
      scene.camera.overview = false;
      scene.hintReplay = false;
      this.mode = 'play';
      this.input.clear();
      sdk.gameplayStart();
      const tip = level.tip;
      if (kind === 'tutorial') {
        if (tip && !this.save.tips.includes(tip)) this.save.tips.push(tip);
      } else if (kind === 'snack') hud.toast(t('snackIntro'), ICONS.moon);
      else if (tip && !params.has('notips') && !hint && (!this.save.tips.includes(tip) || this.autoplay)) {
        hud.showTip(tip);
        this.save.tips.push(tip);
        this.persist();
      }
      window.removeEventListener('keydown', keyStart);
    };
    const keyStart = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') startPlay();
    };
    this.mode = 'intro';
    // quick start (retry, tutorial): straight into play, the camera already on the kid
    if (opts.quick && !hint) {
      scene.camera.overview = false;
      this.overlay = null;
      startPlay();
      return;
    }
    // intro: whole-level overview + goals card (+ the hint replay and boosts)
    scene.camera.overview = true;
    scene.hintReplay = !!hint;
    const boosts: IntroBoost[] = [];
    const prev = preview();
    if (!this.autoplay && !this.capture && kind === 'normal') {
      const img = (id: BoostId) => prev?.boostThumb(id, 96) ?? '';
      if (this.save.items.toy > 0) boosts.push({ id: 'toy', name: t('b_toy'), count: this.save.items.toy, img: img('toy'), on: false });
      if (this.save.items.pillow > 0 && level.bedCheck > 0) boosts.push({ id: 'pillow', name: t('b_pillow'), count: this.save.items.pillow, img: img('pillow'), on: false });
      if (this.save.items.hint > 0 && !hint) boosts.push({ id: 'hint', name: t('b_hint'), count: this.save.items.hint, img: img('hint'), on: false });
    }
    intro = buildIntro({
      house: houseName,
      night: i + 1,
      name: t(level.nameKey),
      cookies: level.need,
      bonus: level.bonus >= 0,
      par: level.par,
      touch: this.touch,
      hint: !!hint,
      boosts,
      onBoost: (id, chip) => {
        if (id === 'hint') {
          // a bought hint: replay this night with a safe route
          if (useBoost(this.save, 'hint')) {
            this.persist();
            this.openLevel(h, i, { hint: true });
          }
          return;
        }
        if (chosen.has(id)) chosen.delete(id);
        else chosen.add(id);
        chip.classList.toggle('on', chosen.has(id));
      },
    });
    if (opts.hint && !hint) hud.toast(t('noHint'));
    intro.classList.add('live-intro');
    this.overlay = intro;
    this.ui.appendChild(intro);
    intro.addEventListener('pointerdown', startPlay);
    this.canvas.addEventListener('pointerdown', startPlay, { once: true });
    window.addEventListener('keydown', keyStart);
    if ((this.autoplay || this.capture) && !params.has('introhold')) setTimeout(startPlay, this.capture ? 0 : 1200);
  }

  private disposeRun() {
    if (!this.run) return;
    this.run.hud.el.remove();
    // free the night's GPU memory (it used to pile up night after night: WebGL context loss / tab killed on phones)
    try {
      disposeScene(this.run.scene.scene);
    } catch (e) {
      report('dispose', e);
    }
    this.run = null;
  }

  /** a chunk the player asked for (another house, the snack night) could not be loaded: say so, stay in the menu */
  private loadFailed() {
    if (this.mode !== 'title') this.showTitle();
    const n = document.createElement('div');
    n.className = 'toast show load-failed';
    n.textContent = t('loadFailed');
    this.ui.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  /**
   * WebGL context loss (the GPU was reset, or a phone reclaimed its memory): three.js stops drawing and rebuilds
   * everything on restore. The level pauses while the screen is black; nothing else is needed.
   */
  private contextLost = false;
  private watchContext() {
    this.canvas.addEventListener('webglcontextlost', () => {
      this.contextLost = true;
      if (this.mode === 'play') this.pause();
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      try {
        forgetLostContext([this.stage.composer, ...(this.title ? [this.title.scene] : []), ...(this.run ? [this.run.scene.scene] : [])]);
      } catch (e) {
        report('context', e);
      }
    });
  }

  private clearUi() {
    this.ui.innerHTML = '';
    this.titleEl = null;
  }

  /** capture / test tool: the playtest bot takes over the current night */
  autopilot(profile: 'beginner' | 'average' | 'good' = 'good') {
    if (this.run) this.run.bot = new Bot(this.run.world, PROFILES[profile], 7);
  }

  /** replay the current night at once: one tap, no intro card, no ad */
  retry(extraToy = false, hint = false) {
    const r = this.run;
    if (!r) return;
    if (r.kind === 'snack') return this.showTitle();
    this.openLevel(r.h, r.i, { extraToys: extraToy ? 1 : 0, hint, quick: true, tutorial: r.kind === 'tutorial' });
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.ui.querySelectorAll('.pause-modal').forEach((m) => m.remove());
    this.mode = 'play';
    sdk.gameplayStart();
  }

  pause() {
    if (this.mode !== 'play' || !this.run) return;
    this.mode = 'paused';
    sdk.gameplayStop();
    this.input.clear();
    const r = this.run;
    this.ui.appendChild(
      pauseScreen(
        this.save,
        () => this.resume(),
        () => this.retry(false, r.hinted),
        () => this.showTitle(),
        () => this.applySettings(),
      ),
    );
  }

  // ------------------------------------------------------------------ frame
  frame = (now: number) => {
    // next frame first: one failing frame never freezes the game (logged + recorded by report())
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    try {
      this.tick(dt);
    } catch (e) {
      report('frame', e);
    }
  };

  /** advance without rendering (capture tool: skip to a moment quickly) */
  simOnly(dt: number) {
    this.t += dt;
    if (this.mode === 'title' && this.title) this.title.update(dt, this.t, this.w, this.h);
    else if (this.run) this.updateRun(dt);
  }

  /** advance and render one frame (also used by the capture tool) */
  tick(dt: number) {
    this.t += dt;
    if (this.mode === 'title' && this.title) {
      this.title.update(dt, this.t, this.w, this.h);
    } else if (this.run) this.updateRun(dt);
    if (!this.contextLost) this.stage.render(this.t);
  }

  private updateRun(dt: number) {
    const r = this.run!;
    const { world, scene, hud } = r;
    const events: GameEvent[] = [];
    if (this.mode === 'play') {
      this.input.poll();
      let input = { mx: 0, mz: 0, run: this.input.run, throwAt: null as { x: number; z: number } | null };
      if (r.bot) {
        r.acc += dt;
        while (r.acc >= DT && world.status === 'play') {
          r.acc -= DT;
          world.step(DT, r.bot.update(DT));
          events.push(...world.events);
        }
      } else {
        const mv = scene.screenToWorldMove(this.input.vx, this.input.vy);
        input = { mx: mv.mx, mz: mv.mz, run: this.input.run, throwAt: null };
        if (this.input.tapThrow) {
          const p = scene.camera.screenToGround((this.input.tapThrow.x / this.w) * 2 - 1, -(this.input.tapThrow.y / this.h) * 2 + 1);
          if (p) input.throwAt = { x: p.x, z: p.z };
          this.input.tapThrow = null;
          this.input.aiming = false;
        }
        if (this.input.spaceThrow) {
          this.input.spaceThrow = false;
          const pl = world.player;
          input.throwAt = { x: pl.x + Math.cos(pl.dir) * 4, z: pl.z + Math.sin(pl.dir) * 4 };
        }
        r.acc += dt;
        let first = true;
        while (r.acc >= DT && world.status === 'play') {
          r.acc -= DT;
          world.step(DT, first ? input : { ...input, throwAt: null });
          first = false;
          events.push(...world.events);
        }
      }
      this.handleEvents(events);
      this.footsteps(dt);
      this.nearMiss(dt);
    }
    scene.update(dt, this.t, events);
    const alert = world.guards.some((g) => g.state === 'spot') ? 'chase' : world.guards.some((g) => g.state === 'suspicious' || g.state === 'look') ? 'sus' : 'calm';
    audio.tension += ((alert === 'chase' ? 1 : alert === 'sus' ? 0.5 : 0) - audio.tension) * Math.min(1, dt * 2);
    if (this.mode === 'play' || this.mode === 'cinematic')
      hud.update(
        {
          time: world.t,
          cookies: world.cookies,
          alert,
          hidden: world.player.hidden,
          toys: world.toys,
          keys: world.keys,
          decoy: world.decoy,
          joy: this.input.joy,
          joyRadius: this.input.radius,
          aiming: this.input.aiming,
          running: world.player.mode === 'run',
          moving: world.player.mode !== 'idle',
        },
        dt,
      );
    if (this.mode === 'play') {
      this.updateArrows();
      this.updateTutorial(dt);
    }
    if (this.mode === 'cinematic') {
      r.endT -= dt;
      if (r.endT <= 0) this.showResult();
    }
  }

  /** world point → screen px */
  private screen(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(this.run!.scene.camera.cam);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h };
  }

  /** tutorial: move the hand pointer and advance the steps */
  private updateTutorial(dt: number) {
    const r = this.run!;
    const tut = r.tut;
    if (!tut || tut.step === 'done') return;
    const { world, level } = r;
    const p = world.player;
    const kid = this.screen(p.x, 0.6, p.z);
    let target: { x: number; z: number } | null = null;
    if (tut.step === 'drag' || tut.step === 'hide' || tut.step === 'stay') {
      // the nearest basket
      let best = Infinity;
      for (let k = 0; k < level.hide.length; k++)
        if (level.hide[k] === HIDE.basket) {
          const x = (k % level.w) + 0.5,
            z = Math.floor(k / level.w) + 0.5;
          const d = Math.hypot(x - p.x, z - p.z);
          if (d < best) {
            best = d;
            target = { x, z };
          }
        }
      if (tut.step === 'drag' && (Math.hypot(p.x - level.start.x, p.z - level.start.z) > 1 || tut.stepT > 4)) tut.set('hide');
      // never hid: carry on to the cookie after a while (mum simply does not come)
      if (tut.step === 'hide' && tut.stepT > 9) tut.set('cookie');
    } else if (tut.step === 'cookie') {
      const k = level.cookies.findIndex((_, j) => !world.cookies[j] && j !== level.bonus);
      if (k >= 0) target = level.cookies[k];
      else tut.set('bed');
    }
    if (tut.step === 'bed') target = { x: (level.bed.x0 + level.bed.x1) / 2, z: (level.bed.z0 + level.bed.z1) / 2 };
    tut.update(dt, kid, target ? this.screen(target.x, 0.5, target.z) : null);
  }

  /** a grown-up came really close and the kid got away: "Phew!" (all nights; the tutorial has its scripted one) */
  private nearMiss(dt: number) {
    const r = this.run!;
    if (r.kind === 'tutorial' || this.capture) return;
    const w = r.world;
    const p = w.player;
    r.phewCd -= dt;
    const danger = w.guards.some((g) => g.cfg.adult && g.delay <= 0 && g.state !== 'sleep' && g.coneOn && Math.hypot(g.x - p.x, g.z - p.z) < (p.hidden ? 1.7 : 1.4));
    const wondering = w.guards.some((g) => g.state === 'suspicious' || g.state === 'look');
    if (danger || wondering) r.near = Math.max(r.near, danger ? 2 : 1);
    else if (r.near > 0 && w.status === 'play' && !w.spotted) {
      const calm = w.guards.every((g) => !g.cfg.adult || g.state === 'sleep' || Math.hypot(g.x - p.x, g.z - p.z) > 2.6);
      if (calm) {
        if (r.phewCd <= 0) {
          phew(r.hud.el, r.near >= 2 ? t('phew') : t('closeCall'));
          audio.play('whoosh');
          audio.play('phew');
          r.phewCd = 7;
        }
        r.near = 0;
      }
    }
  }

  /** off-screen pointers: remaining required cookies, the bonus, or the bed once ready */
  private updateArrows() {
    const r = this.run!;
    const { world, level, scene } = r;
    const cam = scene.camera.cam;
    const list: { x: number; y: number; kind: 'cookie' | 'bonus' | 'bed'; behind: boolean }[] = [];
    const push = (x: number, z: number, kind: 'cookie' | 'bonus' | 'bed') => {
      const v = new THREE.Vector3(x, 0.5, z).project(cam);
      list.push({ x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h, kind, behind: v.z > 1 });
    };
    if (!scene.camera.overview) {
      level.cookies.forEach((c, i) => {
        if (!world.cookies[i]) push(c.x, c.z, i === level.bonus ? 'bonus' : 'cookie');
      });
      if (world.requiredDone) push((level.bed.x0 + level.bed.x1) / 2, (level.bed.z0 + level.bed.z1) / 2, 'bed');
    }
    r.hud.setTargets(list, this.w, this.h);
  }

  private footsteps(dt: number) {
    const r = this.run!;
    const p = r.world.player;
    if (p.mode === 'tiptoe') {
      r.stepT -= dt;
      if (r.stepT <= 0) {
        r.stepT = 0.36;
        audio.play('tiptoe');
      }
    }
    if (r.world.guards.some((g) => g.state === 'sleep')) {
      r.snoreT -= dt;
      if (r.snoreT <= 0) {
        r.snoreT = 2.6;
        audio.play('snore');
      }
    }
  }

  private guardScreen(gi: number) {
    const g = this.run!.world.guards[gi];
    return this.screen(g.x, 2.1, g.z);
  }

  private handleEvents(events: GameEvent[]) {
    const r = this.run!;
    for (const e of events) {
      switch (e.type) {
        case 'noise':
          if (e.kind === 'creak') audio.play('creak');
          else if (e.kind === 'squeak' || e.kind === 'toy') audio.play('squeak');
          else if (e.kind === 'step') audio.play('step');
          else if (e.kind === 'click') audio.play('click');
          break;
        case 'cookie': {
          audio.play('crunch');
          audio.play('pickup');
          audio.play('sparkle');
          const s = this.screen(e.x, 0.7, e.z);
          sparkle(r.hud.el, s.x, s.y);
          try {
            navigator.vibrate?.(20);
          } catch {
            /* no vibration */
          }
          if (e.i === r.level.bonus) r.hud.toast(t('bonusGot'));
          else if (r.kind === 'snack') r.hud.toast(` ${r.world.cookieCount}`, ICONS.cookie(true));
          else r.hud.toast(` ${r.world.cookies.filter((c, k) => c && k !== r.level.bonus).length}/${r.level.need}`, ICONS.cookie(true));
          break;
        }
        case 'key':
        case 'toyPickup':
          audio.play('pickup');
          break;
        case 'pillow':
          audio.play('pickup');
          r.hud.toast(t('decoy'));
          break;
        case 'unlock':
          audio.play('unlock');
          break;
        case 'suspicious':
        case 'wake':
          if (r.world.guards[e.g].cfg.adult) audio.play('hmm');
          break;
        case 'spotted':
          audio.play('spotted');
          break;
        case 'meow':
          audio.play('meow');
          break;
        case 'beep':
          audio.play('beep');
          break;
        case 'hide':
          audio.play('hide');
          break;
        case 'throw':
          audio.play('throw');
          break;
        case 'needCookies':
          // not while the kid is still standing by the bed at the start
          if (Math.hypot(r.world.player.x - r.level.start.x, r.world.player.z - r.level.start.z) > 0.8) r.hud.toast(t('needCookies'));
          break;
        case 'cue':
          // tutorial: mum comes by the basket
          r.hud.toast(t('momComing'));
          audio.play('hmm');
          r.tut?.set('stay');
          break;
        case 'cueClear':
          phew(r.hud.el, t('phew'));
          audio.play('whoosh');
          audio.play('phew');
          if (r.tut && r.tut.step !== 'done') r.tut.set('cookie');
          break;
        case 'caught': {
          audio.play('gasp');
          audio.play('caught');
          audio.play('boing');
          const s = this.guardScreen(e.g);
          catchBurst(r.hud.el, t('backToBedShout'), s.x, s.y);
          this.endRun(2.6);
          break;
        }
        case 'bedcheck':
          audio.play('gasp');
          audio.play('boing');
          catchBurst(r.hud.el, t('bedCheckShout'), this.w / 2, this.h * 0.4);
          this.endRun(1.6);
          break;
        case 'win':
          audio.play('win');
          r.tut?.set('done');
          this.endRun(2.4);
          break;
      }
    }
  }

  private endRun(delay: number) {
    const r = this.run!;
    this.mode = 'cinematic';
    r.endT = delay;
    sdk.gameplayStop();
    this.input.clear();
  }

  /** next-unlock teaser + tomorrow's daily reward, for the end screens */
  private strip() {
    const tz = nextUnlock(this.save, (h, i) => this.isDone(h, i), HOUSE_COUNT, LEVELS_PER_HOUSE);
    const prev = preview();
    let teaser: Parameters<typeof retentionStrip>[0]['teaser'] = null;
    if (tz?.kind === 'house') teaser = { img: prev?.houseThumb(HOUSES[tz.house], 192, 120) ?? '', name: t(`house_${HOUSES[tz.house]}`), line: t('nightsToUnlock', { n: tz.n }) };
    else if (tz?.kind === 'skin') teaser = { img: prev?.thumb({ skin: tz.key, cap: this.save.cap, trail: 'none' }, 120) ?? '', name: t(`skin_${tz.key}`), line: t('coinsToUnlock', { n: tz.n }) };
    return retentionStrip({ teaser, daily: nextDaily(this.save), streak: currentStreak(this.save) });
  }

  private wireStrip(el: HTMLElement) {
    el.querySelector('.daily-peek')?.addEventListener('click', () => {
      audio.play('ui');
      this.openDaily();
    });
  }

  private showResult() {
    const r = this.run!;
    const w = r.world;
    this.mode = 'result';
    // Playgama: Bridge's level_completed / level_failed
    if (__PLATFORM__ === 'playgama') sdk.levelEnd?.(w.status === 'won');
    if (r.kind === 'snack') return this.snackResult();
    const id = levelId(r.h, r.i);
    if (w.status === 'won') {
      const stars: [boolean, boolean, boolean] = [w.cookieCount === r.level.cookies.length, w.stats.spotted === 0, w.t <= r.level.par];
      const n = stars.filter(Boolean).length;
      const first = this.save.stars[id] === undefined;
      const prevBest = this.save.best[id];
      const newBest = prevBest === undefined || w.t < prevBest;
      this.save.stars[id] = Math.max(n, this.save.stars[id] ?? 0);
      this.save.best[id] = Math.min(w.t, prevBest ?? Infinity);
      this.save.fails[id] = 0;
      if (r.kind === 'tutorial') this.save.tutorialDone = true;
      // wins with a hint are tracked silently (stars are not affected)
      if (r.hinted) this.save.hinted[id] = true;
      const coins = levelCoins(n, first, w.cookieCount);
      this.save.coins += coins;
      this.save.totals.cookies += w.cookieCount;
      this.save.totals.wins++;
      progressMission(this.save, 'cookies', w.cookieCount);
      progressMission(this.save, 'stars', n);
      progressMission(this.save, 'nights', 1);
      if (w.stats.spotted === 0) progressMission(this.save, 'ghost', 1);
      progressMission(this.save, 'toys', w.stats.toysThrown);
      progressMission(this.save, 'hide', w.stats.hides);
      const houseDone = r.i === LEVELS_PER_HOUSE - 1;
      if (houseDone) sdk.happytime();
      else if (__PLATFORM__ === 'gamepix') sdk.happytime(); // GamePix: a happy moment for every level complete
      this.persist();
      const last = r.h === HOUSE_COUNT - 1 && r.i === LEVELS_PER_HOUSE - 1;
      const el = winScreen(
        { stars, coins, time: w.t, par: r.level.par, newBest: newBest && !first, houseDone, last, strip: this.strip(), ads: this.adsOn },
        async () => {
          const ok = await sdk.rewarded();
          if (ok) {
            this.save.coins += coins;
            audio.play('coin');
            this.persist();
          }
          return ok;
        },
        () => this.goNext(r.h, r.i),
        () => this.between(() => this.showTitle(), 'menu'),
        () => this.retry(),
      );
      this.wireStrip(el);
      this.ui.appendChild(el);
      if (n === 3) {
        starRain(el);
        setTimeout(() => audio.play('stars'), 700);
      }
    } else {
      this.save.fails[id] = (this.save.fails[id] ?? 0) + 1;
      if (__PLATFORM__ === 'gamepix') sdk.sadMoment?.(w.status === 'bedcheck' ? 'level_failed' : 'game_over');
      progressMission(this.save, 'hide', w.stats.hides);
      progressMission(this.save, 'toys', w.stats.toysThrown);
      this.persist();
      const fails = this.save.fails[id];
      const el = failScreen(
        { bedcheck: w.status === 'bedcheck', fails, canSkip: fails >= 5, freeHint: fails >= 3, strip: this.strip(), ads: this.adsOn },
        (extra, hintOn) => this.retry(extra, hintOn),
        async () => {
          const ok = await sdk.rewarded();
          if (ok) {
            this.save.skipped[id] = true;
            if (r.kind === 'tutorial') this.save.tutorialDone = true;
            this.persist();
            this.goNext(r.h, r.i);
          }
          return ok;
        },
        () => sdk.rewarded(),
        () => {
          if (r.kind === 'tutorial') this.save.tutorialDone = true;
          this.between(() => this.showTitle(), 'menu');
        },
      );
      this.wireStrip(el);
      this.ui.appendChild(el);
    }
  }

  /** midnight snack: coins per cookie, once a day; never touches stars or progress */
  private snackResult() {
    const r = this.run!;
    const w = r.world;
    const won = w.status === 'won';
    this.save.snack = today();
    const coins = won ? w.cookieCount * SNACK_COINS : 0;
    this.save.coins += coins;
    if (won) {
      this.save.totals.cookies += w.cookieCount;
      progressMission(this.save, 'cookies', w.cookieCount);
    }
    this.persist();
    if (won) {
      const el = winScreen(
        { stars: [true, true, true], coins, time: w.t, par: r.level.par, newBest: false, houseDone: false, last: false, snack: { cookies: w.cookieCount }, strip: this.strip(), ads: this.adsOn },
        async () => {
          const ok = await sdk.rewarded();
          if (ok) {
            this.save.coins += coins;
            audio.play('coin');
            this.persist();
          }
          return ok;
        },
        () => this.between(() => this.showTitle()),
        () => this.between(() => this.showTitle(), 'menu'),
        () => this.showTitle(),
      );
      this.wireStrip(el);
      this.ui.appendChild(el);
      if (w.cookieCount >= 5) starRain(el);
    } else {
      const el = failScreen(
        { bedcheck: w.status === 'bedcheck', fails: 0, canSkip: false, strip: this.strip(), ads: false },
        () => this.showTitle(),
        async () => false,
        async () => false,
        () => this.showTitle(),
      );
      // the bonus night is once a day: "Try again" goes back to the menu
      this.wireStrip(el);
      this.ui.appendChild(el);
    }
  }

  private goNext(h: number, i: number) {
    let nh = h,
      ni = i + 1;
    if (ni >= LEVELS_PER_HOUSE) {
      nh++;
      ni = 0;
    }
    if (nh >= HOUSE_COUNT) return this.showTitle();
    this.between(() => this.openLevel(nh, ni));
  }

  /**
   * Interstitial slot (always after a click, never during a level), rate-limited by the platform. Slots the
   * platform does not use continue synchronously.
   */
  private async between(next: () => void, slot: AdSlot = 'between') {
    if (slot === 'between') {
      if (!this.autoplay && !this.capture) await sdk.midgame(slot);
      return next();
    }
    if (!sdk.adSlot(slot)) return next();
    // the title stays clickable behind the ad: one Play at a time
    if (this.adBusy) return;
    this.adBusy = true;
    try {
      if (!this.autoplay && !this.capture) await sdk.midgame(slot);
    } finally {
      this.adBusy = false;
    }
    next();
  }
}

/** the menu backdrop when the 3D title scene could not be loaded: the night sky colour, no scene */
function plainView(): View {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140f33);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
  return { scene, camera, resize: (w, h) => ((camera.aspect = w / Math.max(1, h)), camera.updateProjectionMatrix()), update: () => {} };
}
