/**
 * Lazy audio chunk (loaded after the first tap): the music-box lullaby per house and the extra "juice" sounds
 * (cookie sparkle, near-miss whoosh + "phew", star rain, comic boing). Everything is synthesised (Web Audio).
 */
import type { AudioCore, ExtraSound } from './audio';

const SONGS = [
  { root: 60, bpm: 84, scale: [0, 2, 4, 7, 9], prog: [0, 9, 5, 7] }, // apartment
  { root: 62, bpm: 76, scale: [0, 2, 4, 7, 9], prog: [0, 5, 9, 7] }, // family
  { root: 57, bpm: 70, scale: [0, 2, 3, 7, 8], prog: [0, 5, 3, 7] }, // cottage (minor-ish)
  { root: 64, bpm: 72, scale: [0, 2, 4, 7, 11], prog: [0, 4, 9, 5] }, // chalet
  { root: 55, bpm: 66, scale: [0, 2, 4, 5, 7, 9], prog: [0, 9, 2, 7] }, // mansion
];

export function scheduleMusic(a: AudioCore, c: AudioContext, bus: AudioNode) {
  const song = SONGS[a.musicHouse % SONGS.length];
  const beat = 60 / (song.bpm * (1 + a.tension * 0.35));
  while (a.nextNote < c.currentTime + 0.5) {
    const t = a.nextNote;
    const bar = Math.floor(a.step / 8) % song.prog.length;
    const chordRoot = song.root + song.prog[bar];
    const inBar = a.step % 8;
    // bass on beats 0 and 4
    if (inBar === 0 || inBar === 4) musicNote(c, bus, chordRoot - 12, t, beat * 3.5, 0.18, 'sine');
    // melody: gentle pseudo-random walk over the pentatonic scale
    const r = Math.sin(a.step * 12.9898 + a.musicHouse * 7.1) * 43758.5453;
    const pick = Math.floor((r - Math.floor(r)) * song.scale.length);
    if (inBar % 2 === 0 || r - Math.floor(r) > 0.6) musicNote(c, bus, song.root + 12 + song.scale[pick], t, beat * 1.6, 0.11, 'triangle');
    a.nextNote += beat / 2;
    a.step++;
  }
}

function musicNote(c: AudioContext, bus: AudioNode, midi: number, t: number, dur: number, peak: number, type: OscillatorType) {
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
  g.connect(bus);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

export function extraSound(a: AudioCore, name: ExtraSound, t: number, out: AudioNode, vol: number) {
  switch (name) {
    case 'sparkle':
      // bright rising glints
      [1568, 2093, 2637, 3136].forEach((f, i) => a.osc('triangle', f, t + i * 0.045, 0.16, 0.07 * vol, out));
      break;
    case 'whoosh':
      a.noise(t, 0.45, 0.12 * vol, 'bandpass', 500, 1.4, undefined, 2600);
      break;
    case 'phew':
      // a relieved sigh: falling breathy tone
      a.noise(t, 0.5, 0.09 * vol, 'bandpass', 1400, 2, undefined, 500);
      a.osc('sine', 620, t, 0.42, 0.08 * vol, out, [[300, 0.42]]);
      break;
    case 'stars':
      for (let i = 0; i < 8; i++) a.osc('triangle', 1046 * Math.pow(2, [0, 4, 7, 12, 16, 19, 24, 28][i] / 12), t + i * 0.07, 0.25, 0.06 * vol, out);
      break;
    case 'boing':
      a.osc('square', 180, t, 0.35, 0.06 * vol, out, [[520, 0.12], [140, 0.35]]);
      break;
  }
}
