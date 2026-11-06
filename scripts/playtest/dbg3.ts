import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
import { TEST } from '../../src/levels/houses/test';
const L = parseLevel(TEST, 'family', 2);
const w = new World(L, { seed: 1, jitter: 1 });
const b: any = new Bot(w, PROFILES.good, 1);
for (let i = 0; i < 400; i++) { const inp = b.update(1/30); w.step(1/30, inp); if (i % 20 === 0) console.log(w.t.toFixed(1), w.player.x.toFixed(2), w.player.z.toFixed(2), 'goal', JSON.stringify(b.goal()), 'plan', b.plan.slice(0,8).join(','), 'blk', b.blockedT.toFixed(1), 'mum', w.guards[0].x.toFixed(1), w.guards[0].state); }
