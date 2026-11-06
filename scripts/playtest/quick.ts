import { parseLevel } from '../../src/game/level';
import { World } from '../../src/game/world';
import { simulate, PROFILES } from '../../src/game/bot';
import { TEST } from '../../src/levels/houses/test';

const L = parseLevel(TEST, 'family', 2);
for (const prof of ['beginner', 'average', 'good'] as const) {
  let wins = 0, time = 0, spotted = 0;
  const N = 20;
  const t0 = Date.now();
  const st: Record<string, number> = {};
  for (let s = 0; s < N; s++) {
    const w = new World(L, { seed: s + 1, jitter: 1 });
    const r = simulate(w, PROFILES[prof], s + 1);
    if (r.won) { wins++; time += r.time; }
    spotted += r.spotted;
    st[r.status] = (st[r.status] ?? 0) + 1;
  }
  console.log(prof, 'win', wins / N, 'avgT', (time / Math.max(1, wins)).toFixed(1), 'spotted', (spotted / N).toFixed(2), JSON.stringify(st), (Date.now() - t0) + 'ms');
}
