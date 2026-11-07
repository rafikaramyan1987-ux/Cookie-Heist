import { getLevel } from '../../src/levels/index';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
const [h, i, prof, only] = process.argv.slice(2);
const L = getLevel(+h, +i);
for (let s = 1; s <= 12; s++) {
  if (only && +only !== s) continue;
  const w = new World(L, { seed: 1000 * +h + 37 * +i + s + 1, jitter: 1.2 });
  const bot: any = new Bot(w, PROFILES[prof as 'good'], s);
  const log: string[] = [];
  let n = 0;
  while (w.status === 'play' && w.t < 150) {
    const inp = bot.update(1/30); w.step(1/30, inp);
    for (const e of w.events) if (e.type !== 'noise') log.push(w.t.toFixed(1) + ':' + e.type + ('g' in e ? e.g : ''));
    if (n++ % 15 === 0) log.push(`[${w.t.toFixed(1)} p=${w.player.x.toFixed(1)},${w.player.z.toFixed(1)} ${w.player.mode}${w.player.hidden?' H':''} ck${w.cookieCount} goal=${JSON.stringify(bot.goal())} plan=${bot.plan.slice(0,4).join(',')} ${w.guards.map((g: any)=>g.state[0]+g.x.toFixed(1)+','+g.z.toFixed(1)).join(' ')}]`);
  }
  if (w.status !== 'won') { console.log('seed', s, w.status, w.t.toFixed(1)); console.log(log.slice(-12).join('\n')); }
}
