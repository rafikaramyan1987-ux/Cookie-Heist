import { getLevel } from '../../src/levels/index';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
const L = getLevel(0, 2);
const w = new World(L, { seed: 1000*0 + 37*2 + 1, jitter: 1.2 });
const bot: any = new Bot(w, PROFILES.good, 1);
while (w.t < 7.6) { w.step(1/30, bot.update(1/30)); const g = w.guards[0]; if (w.t > 6.8) console.log(w.t.toFixed(2), 'g', g.x.toFixed(2), g.z.toFixed(2), g.dir.toFixed(2), g.state, g.alert.toFixed(2), g.sees, 'lookBase', g.lookBase.toFixed(2), 'p', w.player.x.toFixed(2), w.player.z.toFixed(2)); }
