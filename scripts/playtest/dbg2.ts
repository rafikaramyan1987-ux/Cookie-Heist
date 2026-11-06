import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';
import { TEST } from '../../src/levels/houses/test';
const L = parseLevel(TEST, 'family', 2);
const w = new World(L, { seed: 1, jitter: 1 });
const b: any = new Bot(w, PROFILES.good, 1);
while (w.t < 70) { w.step(1/30, b.update(1/30)); }
console.log('goal', b.goal(), 'player', w.player.x, w.player.z, w.guards[0]);
for (let t = 0; t < 8; t++) {
  for (let i = 0; i < 30; i++) w.step(1/30, {mx:0,mz:0});
  const r = b.makePlan();
  const D = b.dangerMaps(3);
  console.log('t', w.t.toFixed(1), 'mum', w.guards[0].x.toFixed(1), w.guards[0].dir.toFixed(2), w.guards[0].state, 'plan', r.plan.join(','), r.blocked);
  for (let z = 3; z < 9; z++) { let row = ''; for (let x = 0; x < L.w; x++) { const i = z*L.w+x; row += L.room[i] < 0 ? ' ' : L.solid[i] ? '#' : D[1][i] ? 'X' : '.'; } console.log('  '+row); }
}
