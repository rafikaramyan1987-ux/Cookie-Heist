import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
import { TEST } from '../../src/levels/houses/test';
const L = parseLevel(TEST, 'family', 2);
const w = new World(L, { seed: 1 });
const bot = new Bot(w, PROFILES[(process.argv[2] as 'good') ?? 'good'], 1);
console.log('start', L.start, 'bed', L.bed, 'cookies', L.cookies, 'need', L.need);
let n = 0;
while (w.status === 'play' && w.t < 60) {
  const inp = bot.update(1 / 30);
  w.step(1 / 30, inp);
  if (n++ % 30 === 0) console.log(w.t.toFixed(1), w.player.x.toFixed(2), w.player.z.toFixed(2), inp.mx.toFixed(2), inp.mz.toFixed(2), (bot as any).plan.slice(0,5).join(','), w.guards.map(g => g.state + '@' + g.x.toFixed(1) + ',' + g.z.toFixed(1)).join(' '));
}
console.log(w.status, w.t);
