/**
 * All sounds are synthesised with the Web Audio API (no audio files):
 * footsteps, creaks, squeaks, "Hmm?", gasps, meows, beeps, crunches, jingles,
 * and a soft music-box lullaby per house.
 */

type Ctx = AudioContext;

class Audio {
  private ctx: Ctx | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  soundOn = true;
  musicOn = true;
  sdkMuted = false;
  private musicTimer: number | null = null;
  private musicHouse = -1;
  private nextNote = 0;
  private step = 0;
  tension = 0;

  /** must be called from a user gesture */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.apply();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  apply() {
    if (!this.ctx) return;
    const on = !this.sdkMuted;
    this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
    this.sfx.gain.setTargetAtTime(this.soundOn ? 0.9 : 0, this.ctx.currentTime, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.22 : 0, this.ctx.currentTime, 0.2);
  }

  suspend(paused: boolean) {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ------------------------------------------------------------------ primitives
  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  private osc(type: OscillatorType, f: number, t: number, dur: number, peak: number, out: AudioNode, bend?: [number, number][]) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    for (const [ft, tt] of bend ?? []) o.frequency.exponentialRampToValueAtTime(ft, t + tt);
    const g = c.createGain();
    this.env(g, t, Math.min(0.02, dur * 0.2), peak, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }
  private noise(t: number, dur: number, peak: number, filter: BiquadFilterType, freq: number, q = 1, out?: AudioNode, sweep?: number) {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, 0.005, peak, dur);
    s.connect(f).connect(g).connect(out ?? this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  /** vowel-ish voice: two saws through formant filters */
  private voice(t: number, dur: number, f0: number, f1: number, formants: [number, number], peak = 0.25) {
    const c = this.ctx!;
    const mix = c.createGain();
    mix.gain.value = 1;
    for (const [i, ff] of formants.entries()) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff;
      bp.Q.value = 6;
      const g = c.createGain();
      g.gain.value = i === 0 ? 1 : 0.6;
      bp.connect(g).connect(mix);
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      o.connect(bp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    const out = c.createGain();
    this.env(out, t, 0.04, peak, dur);
    mix.connect(out).connect(this.sfx);
  }

  play(name: SoundName, vol = 1) {
    if (!this.ctx || !this.soundOn || this.sdkMuted) return;
    const t = this.ctx.currentTime + 0.01;
    const s = this.sfx;
    switch (name) {
      case 'tiptoe':
        this.noise(t, 0.05, 0.05 * vol, 'bandpass', 2400 + Math.random() * 600, 3);
        break;
      case 'step':
        this.noise(t, 0.08, 0.22 * vol, 'lowpass', 500, 1);
        this.osc('sine', 110, t, 0.08, 0.15 * vol, s, [[60, 0.08]]);
        break;
      case 'creak': {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(95, t);
        o.frequency.linearRampToValueAtTime(150, t + 0.25);
        o.frequency.linearRampToValueAtTime(110, t + 0.5);
        const lfo = c.createOscillator();
        lfo.frequency.value = 28;
        const lg = c.createGain();
        lg.gain.value = 18;
        lfo.connect(lg).connect(o.frequency);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 700;
        bp.Q.value = 4;
        const g = c.createGain();
        this.env(g, t, 0.04, 0.28 * vol, 0.5);
        o.connect(bp).connect(g).connect(s);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.6);
        lfo.stop(t + 0.6);
        break;
      }
      case 'squeak':
        this.osc('sine', 900, t, 0.22, 0.25 * vol, s, [
          [1600, 0.08],
          [1100, 0.2],
        ]);
        this.osc('triangle', 1800, t, 0.18, 0.06 * vol, s, [[2600, 0.08]]);
        break;
      case 'throw':
        this.noise(t, 0.25, 0.08, 'bandpass', 600, 2, undefined, 2400);
        break;
      case 'hmm':
        this.voice(t, 0.5, 170, 250, [500, 1300], 0.3 * vol);
        break;
      case 'gasp':
        this.noise(t, 0.35, 0.3, 'bandpass', 900, 2, undefined, 2200);
        this.voice(t + 0.25, 0.22, 320, 280, [800, 1200], 0.3);
        this.voice(t + 0.5, 0.22, 330, 300, [700, 1100], 0.3);
        this.voice(t + 0.75, 0.4, 340, 220, [750, 1150], 0.3);
        break;
      case 'meow':
        this.voice(t, 0.55, 520, 640, [900, 2200], 0.22 * vol);
        this.voice(t + 0.22, 0.35, 700, 480, [700, 1800], 0.18 * vol);
        break;
      case 'beep':
        this.osc('square', 1250, t, 0.1, 0.12 * vol, s);
        this.osc('square', 1250, t + 0.16, 0.1, 0.12 * vol, s);
        this.osc('square', 1650, t + 0.32, 0.14, 0.12 * vol, s);
        break;
      case 'crunch':
        for (let i = 0; i < 4; i++) this.noise(t + i * 0.07, 0.06, 0.25, 'highpass', 1800 + i * 400, 1);
        this.osc('triangle', 660, t + 0.05, 0.25, 0.12, s);
        this.osc('triangle', 990, t + 0.14, 0.3, 0.12, s);
        break;
      case 'pickup':
        [784, 988, 1175, 1568].forEach((f, i) => this.osc('triangle', f, t + i * 0.06, 0.3, 0.12, s));
        break;
      case 'unlock':
        this.noise(t, 0.08, 0.3, 'bandpass', 1500, 4);
        this.osc('square', 300, t + 0.08, 0.12, 0.1, s, [[180, 0.1]]);
        [1046, 1318].forEach((f, i) => this.osc('triangle', f, t + 0.2 + i * 0.08, 0.3, 0.1, s));
        break;
      case 'click':
        this.noise(t, 0.03, 0.3, 'highpass', 3000, 1);
        break;
      case 'spotted':
        this.osc('square', 520, t, 0.1, 0.12, s);
        this.osc('square', 780, t + 0.1, 0.22, 0.12, s);
        break;
      case 'hide':
        this.noise(t, 0.2, 0.12, 'lowpass', 900, 1);
        this.osc('sine', 600, t, 0.15, 0.08, s, [[300, 0.15]]);
        break;
      case 'win':
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => {
          this.osc('triangle', f, t + i * 0.11, 0.4, 0.14, s);
          this.osc('sine', f * 2, t + i * 0.11, 0.3, 0.04, s);
        });
        break;
      case 'caught':
        [392, 330, 262, 196].forEach((f, i) => this.osc('triangle', f, t + 0.6 + i * 0.16, 0.35, 0.14, s));
        break;
      case 'ui':
        this.osc('sine', 660, t, 0.08, 0.12, s, [[990, 0.06]]);
        break;
      case 'coin':
        this.osc('square', 988, t, 0.08, 0.07, s);
        this.osc('square', 1318, t + 0.08, 0.25, 0.07, s);
        break;
      case 'snore':
        this.noise(t, 0.9, 0.06, 'lowpass', 300, 2, undefined, 600);
        break;
    }
  }

  // ------------------------------------------------------------------ lullaby
  startMusic(house: number) {
    if (!this.ctx) return;
    if (this.musicHouse === house && this.musicTimer !== null) return;
    this.stopMusic();
    this.musicHouse = house;
    this.nextNote = this.ctx.currentTime + 0.2;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 100);
  }
  stopMusic() {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicHouse = -1;
  }
  private schedule() {
    const c = this.ctx;
    if (!c || this.musicHouse < 0) return;
    const SONGS = [
      { root: 60, bpm: 84, scale: [0, 2, 4, 7, 9], prog: [0, 9, 5, 7] }, // apartment
      { root: 62, bpm: 76, scale: [0, 2, 4, 7, 9], prog: [0, 5, 9, 7] }, // family
      { root: 57, bpm: 70, scale: [0, 2, 3, 7, 8], prog: [0, 5, 3, 7] }, // cottage (minor-ish)
      { root: 64, bpm: 72, scale: [0, 2, 4, 7, 11], prog: [0, 4, 9, 5] }, // chalet
      { root: 55, bpm: 66, scale: [0, 2, 4, 5, 7, 9], prog: [0, 9, 2, 7] }, // mansion
    ];
    const song = SONGS[this.musicHouse % SONGS.length];
    const beat = 60 / (song.bpm * (1 + this.tension * 0.35));
    while (this.nextNote < c.currentTime + 0.5) {
      const t = this.nextNote;
      const bar = Math.floor(this.step / 8) % song.prog.length;
      const chordRoot = song.root + song.prog[bar];
      const inBar = this.step % 8;
      // bass on beats 0 and 4
      if (inBar === 0 || inBar === 4) this.musicNote(chordRoot - 12, t, beat * 3.5, 0.18, 'sine');
      // melody: gentle pseudo-random walk over the pentatonic scale
      const r = Math.sin(this.step * 12.9898 + this.musicHouse * 7.1) * 43758.5453;
      const pick = Math.floor((r - Math.floor(r)) * song.scale.length);
      if (inBar % 2 === 0 || (r - Math.floor(r)) > 0.6) {
        const note = song.root + 12 + song.scale[pick] + (inBar === 0 ? 0 : 0);
        this.musicNote(note, t, beat * 1.6, 0.11, 'triangle');
      }
      this.nextNote += beat / 2;
      this.step++;
    }
  }
  private musicNote(midi: number, t: number, dur: number, peak: number, type: OscillatorType) {
    const c = this.ctx!;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.01;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = c.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }
}

export type SoundName =
  | 'tiptoe'
  | 'step'
  | 'creak'
  | 'squeak'
  | 'throw'
  | 'hmm'
  | 'gasp'
  | 'meow'
  | 'beep'
  | 'crunch'
  | 'pickup'
  | 'unlock'
  | 'click'
  | 'spotted'
  | 'hide'
  | 'win'
  | 'caught'
  | 'ui'
  | 'coin'
  | 'snore';

export const audio = new Audio();
