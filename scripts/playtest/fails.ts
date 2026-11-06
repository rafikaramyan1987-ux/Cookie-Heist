import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
import { TEST } from '../../src/levels/houses/test';
const L = parseLevel(TEST, 'family', 2);
const prof = (process.argv[2] ?? 'good') as 'good';
for (let s = 1; s <= 20; s++) {
  const w = new World(L, { seed: s, jitter: 1 });
  const bot = new Bot(w, PROFILES[prof], s);
  const log: string[] = [];
  let n = 0;
  while (w.status === 'play' && w.t < 150) {
    const inp = bot.update(1/30); w.step(1/30, inp);
    for (const e of w.events) if (e.type !== 'noise') log.push(w.t.toFixed(1) + ':' + e.type + ('g' in e ? e.g : ''));
    if (n++ % 15 === 0) log.push(`[${w.t.toFixed(1)} p=${w.player.x.toFixed(1)},${w.player.z.toFixed(1)} ${w.player.mode}${w.player.hidden?' H':''} ${w.guards.map(g=>g.state[0]+g.x.toFixed(1)+','+g.z.toFixed(1)).join(' ')}]`);
  }
  if (w.status !== 'won') { console.log('seed', s, w.status, w.t.toFixed(1)); console.log(log.slice(-14).join('\n')); }
}
