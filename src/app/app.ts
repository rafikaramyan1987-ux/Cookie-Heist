import * as THREE from 'three';
import { createStage, Stage } from '../render/stage';
import { getLevel, levelId, HOUSE_COUNT, LEVELS_PER_HOUSE } from '../levels/index';
import { World, GameEvent } from '../game/world';
import { Bot, PROFILES } from '../game/bot';
import { GameScene, TrailId } from '../game3d/gameScene';
import { SKINS, CapId } from '../render/characters';
import { THEMES } from '../render/themes';
import { GameHud } from '../ui/gameHud';
import { buildIntro } from '../ui/intro';
import { buildTitle } from '../ui/title';
import { houseMap, shopScreen, dailyScreen, missionsScreen, settingsScreen, pauseScreen, winScreen, failScreen } from '../ui/screens';
import { titleView } from '../art/titleView';
import type { View } from '../art/view';
import { InputCtl } from './input';
import { audio } from './audio';
import { sdk } from './sdk';
import { loadSave, saveSoon, SaveData } from './save';
import { t, setLang, detectLang, getLang } from './i18n';
import { buy, levelCoins, claimDaily, dailyAvailable, ensureMissions, progressMission, claimMission } from './meta';
import type { Level } from '../game/types';

type Mode = 'title' | 'intro' | 'play' | 'paused' | 'result' | 'cinematic';

interface Run {
  h: number;
  i: number;
  level: Level;
  world: World;
  scene: GameScene;
  hud: GameHud;
  bot: Bot | null;
  acc: number;
  endT: number;
  stepT: number;
  snoreT: number;
}

const DT = 1 / 60;
const params = new URLSearchParams(location.search);

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
  overlay: HTMLElement | null = null;
  w = 1;
  h = 1;
  t = 0;
  touch = matchMedia('(pointer: coarse)').matches;
  autoplay = params.get('autoplay') as 'beginner' | 'average' | 'good' | null;
  capture = params.has('capture');
  private last = performance.now();

  async boot() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = '🍪';
    document.body.appendChild(loading);
    await sdk.init(params.has('nosdk') ? 1 : 3500);
    sdk.loadingStart();
    this.save = loadSave();
    setLang(this.save.lang ?? detectLang(sdk.locale()));
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
      if (p && this.mode === 'play') this.pause();
    };
    await document.fonts.ready;
    this.stage = createStage(this.canvas, { low: params.has('low') });
    this.input.onAnyInput = () => audio.unlock();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play' && !this.capture) this.pause();
    });
    (window as unknown as { __game: unknown }).__game = this;
    const lv = params.get('level');
    if (lv) {
      const [h, i] = lv.split('-').map(Number);
      this.openLevel(h, i);
    } else this.showTitle();
    this.resize();
    sdk.loadingStop();
    loading.style.opacity = '0';
    loading.style.pointerEvents = 'none';
    setTimeout(() => loading.remove(), 400);
    if (!this.capture) requestAnimationFrame(this.frame);
    (window as unknown as { __ready: boolean }).__ready = true;
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    document.body.classList.toggle('portrait', this.h > this.w);
    this.stage.resize(this.w, this.h);
    this.title?.resize(this.w, this.h);
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
    this.disposeRun();
    this.clearUi();
    this.mode = 'title';
    sdk.gameplayStop();
    if (!this.title) this.title = titleView();
    this.title.overlay?.forEach((o) => o.remove());
    const [h, i] = this.nextLevel();
    const unclaimed = this.save.missions.list.filter((m) => m.progress >= m.n && !m.claimed).length;
    this.titleEl = buildTitle({ coins: this.save.coins, sub: `${THEMES[getLevel(h, i).house].name[getLang()]} · ${t('night')} ${i + 1}`, dailyDot: dailyAvailable(this.save), missionsBadge: unclaimed, soundOn: this.save.sound });
    this.ui.appendChild(this.titleEl);
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
        this.openLevel(h, i);
        break;
      }
      case 'map':
        this.ui.appendChild(houseMap(this.save, (h, i) => this.openLevel(h, i), levelId, (h, i) => this.unlocked(h, i)));
        break;
      case 'shop':
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
          ),
        );
        break;
      case 'daily':
        this.ui.appendChild(
          dailyScreen(this.save, () => {
            const c = claimDaily(this.save);
            if (c) audio.play('coin');
            this.persist();
            this.refreshTitle();
            return c;
          }),
        );
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
      case 'lang-en':
      case 'lang-fr':
        this.save.lang = act === 'lang-en' ? 'en' : 'fr';
        this.applySettings();
        break;
    }
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
    const langChanged = this.save.lang && this.save.lang !== getLang();
    if (this.save.lang) setLang(this.save.lang);
    this.persist();
    if (langChanged) {
      this.ui.querySelectorAll('.settings-modal').forEach((m) => m.remove());
      if (this.mode === 'title') this.showTitle();
    } else if (this.mode === 'title') this.refreshTitle();
  }

  // ------------------------------------------------------------------ level lifecycle
  openLevel(h: number, i: number, extraToys = 0) {
    this.disposeRun();
    this.clearUi();
    const level = getLevel(h, i);
    const seed = params.has('seed') ? +params.get('seed')! : (Date.now() & 0xffff) + 1;
    const world = new World(level, { seed, jitter: this.autoplay || this.capture ? 0.6 : 0, extraToys });
    const skin = SKINS.find((s) => s.id === this.save.skin) ?? SKINS[0];
    const scene = new GameScene(level, world, { skin, cap: this.save.cap as CapId, trail: this.save.trail as TrailId });
    const theme = THEMES[level.house];
    const hud = new GameHud({
      houseName: theme.name[getLang()],
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
    });
    hud.onPause = () => this.pause();
    hud.onToy = () => {
      if (world.toys > 0) this.input.aiming = !this.input.aiming;
    };
    hud.onZoom = (on) => (scene.camera.overview = on);
    this.run = { h, i, level, world, scene, hud, bot: null, acc: 0, endT: 0, stepT: 0, snoreT: 2 };
    if (this.autoplay) this.run.bot = new Bot(world, PROFILES[this.autoplay], 7);
    this.stage.setScene(scene.scene, scene.camera.cam);
    scene.resize(this.w, this.h);
    hud.layout(this.w, this.h);
    // intro: whole-level overview + goals card
    this.mode = 'intro';
    scene.camera.overview = true;
    const intro = buildIntro({ house: theme.name[getLang()], night: i + 1, name: level.name[getLang() === 'fr' ? 1 : 0], cookies: level.need, bonus: level.bonus >= 0, par: level.par, touch: this.touch });
    intro.classList.add('live-intro');
    this.overlay = intro;
    this.ui.appendChild(intro);
    const startPlay = () => {
      if (this.mode !== 'intro') return;
      audio.unlock();
      intro.remove();
      this.overlay = null;
      this.ui.appendChild(hud.el);
      scene.camera.overview = false;
      this.mode = 'play';
      this.input.clear();
      sdk.gameplayStart();
      const tip = level.tip;
      if (tip && !params.has('notips') && (!this.save.tips.includes(tip) || this.autoplay)) {
        hud.showTip(tip);
        this.save.tips.push(tip);
        this.persist();
      }
      window.removeEventListener('keydown', keyStart);
    };
    const keyStart = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') startPlay();
    };
    intro.addEventListener('pointerdown', startPlay);
    this.canvas.addEventListener('pointerdown', startPlay, { once: true });
    window.addEventListener('keydown', keyStart);
    audio.startMusic(h);
    if ((this.autoplay || this.capture) && !params.has('introhold')) setTimeout(startPlay, this.capture ? 0 : 1200);
  }

  private disposeRun() {
    if (!this.run) return;
    this.run.hud.el.remove();
    this.run = null;
  }

  private clearUi() {
    this.ui.innerHTML = '';
    this.titleEl = null;
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
        () => {
          this.ui.querySelectorAll('.pause-modal').forEach((m) => m.remove());
          this.mode = 'play';
          sdk.gameplayStart();
        },
        () => this.openLevel(r.h, r.i),
        () => this.showTitle(),
        () => this.applySettings(),
      ),
    );
  }

  // ------------------------------------------------------------------ frame
  frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.tick(dt);
    requestAnimationFrame(this.frame);
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
    this.stage.render(this.t);
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
    if (this.mode === 'play') this.updateArrows();
    if (this.mode === 'cinematic') {
      r.endT -= dt;
      if (r.endT <= 0) this.showResult();
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
    const r = this.run!;
    const g = r.world.guards[gi];
    const v = new THREE.Vector3(g.x, 2.1, g.z).project(r.scene.camera.cam);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h };
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
        case 'cookie':
          audio.play('crunch');
          audio.play('pickup');
          r.hud.toast(e.i === r.level.bonus ? t('bonusGot') : `🍪 ${r.world.cookies.filter((c, k) => c && k !== r.level.bonus).length}/${r.level.need}`);
          break;
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
          r.hud.toast(t('needCookies'));
          break;
        case 'caught': {
          audio.play('gasp');
          audio.play('caught');
          const s = this.guardScreen(e.g);
          r.hud.shout(t('backToBedShout'), s.x, s.y);
          this.endRun(2.6);
          break;
        }
        case 'bedcheck':
          audio.play('gasp');
          r.hud.toast(t('bedCheckShout'));
          this.endRun(1.6);
          break;
        case 'win':
          audio.play('win');
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

  private showResult() {
    const r = this.run!;
    const w = r.world;
    this.mode = 'result';
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
      this.persist();
      const last = r.h === HOUSE_COUNT - 1 && r.i === LEVELS_PER_HOUSE - 1;
      this.ui.appendChild(
        winScreen(
          { stars, coins, time: w.t, par: r.level.par, newBest: newBest && !first, houseDone, last },
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
          () => this.showTitle(),
          () => this.between(() => this.openLevel(r.h, r.i)),
        ),
      );
    } else {
      this.save.fails[id] = (this.save.fails[id] ?? 0) + 1;
      progressMission(this.save, 'hide', w.stats.hides);
      progressMission(this.save, 'toys', w.stats.toysThrown);
      this.persist();
      const fails = this.save.fails[id];
      this.ui.appendChild(
        failScreen(
          { bedcheck: w.status === 'bedcheck', fails, canSkip: fails >= 3 },
          (extra) => this.between(() => this.openLevel(r.h, r.i, extra ? 1 : 0)),
          async () => {
            const ok = await sdk.rewarded();
            if (ok) {
              this.save.skipped[id] = true;
              this.persist();
              this.goNext(r.h, r.i);
            }
            return ok;
          },
          () => sdk.rewarded(),
          () => this.showTitle(),
        ),
      );
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

  /** midgame ad slot: only between levels, rate-limited by the SDK wrapper */
  private async between(next: () => void) {
    if (!this.autoplay && !this.capture) await sdk.midgame();
    next();
  }
}
