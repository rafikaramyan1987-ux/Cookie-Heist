import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
import { distanceField, walkable } from '../../src/game/grid';
import { TEST } from '../../src/levels/houses/test';
const L = parseLevel(TEST, 'family', 2);
const w = new World(L, { seed: 1 });
const bot: any = new Bot(w, PROFILES.good, 1);
console.log('goal', bot.goal());
const D = bot.dangerMaps(3);
for (let z = 0; z < L.d; z++) { let row = ''; for (let x = 0; x < L.w; x++) { const i = z*L.w+x; row += L.room[i] < 0 ? ' ' : L.solid[i] ? '#' : D[1][i] ? 'X' : '.'; } console.log(row); }
const f = distanceField(L, w.E, walkable(L,false), {x:0.5,z:11.5});
for (let z = 0; z < L.d; z++) { let row=''; for (let x=0;x<L.w;x++){ const v=f[z*L.w+x]; row += v===Infinity?'∞':String(v%10);} console.log(row); }
console.log(bot.makePlan());
// step a few seconds with the bot, print plan each replan
const w2 = new World(L, { seed: 1 });
const b2: any = new Bot(w2, PROFILES.good, 1);
for (let i = 0; i < 90; i++) { const inp = b2.update(1/30); w2.step(1/30, inp); if (i % 6 === 0) console.log(w2.t.toFixed(2), w2.player.x.toFixed(2), w2.player.z.toFixed(2), 'plan', b2.plan.join(','), 'start', b2.planStart.toFixed(2), 'in', inp.mx.toFixed(2), inp.mz.toFixed(2)); }
