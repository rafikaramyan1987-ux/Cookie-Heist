/**
 * v3 trailer moments in REAL bot play (same seeds as ?capture&autoplay=good&seed=N): a cookie grab, a snowy-chalet
 * close call, and short 3-star wins.   npx tsx scripts/submission/find-clips-v3.ts
 */
import { getLevel } from '../../src/levels/all';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';

function play(h: number, i: number, seed: number) {
  const L = getLevel(h, i);
  const w = new World(L, { seed, jitter: 0.6 });
  const bot = new Bot(w, PROFILES.good, 7);
  const cookies: number[] = [];
  let closest = 9,
    closeAt = -1;
  while (w.status === 'play' && w.t < 90) {
    w.step(1 / 60, bot.update(1 / 60));
    for (const e of w.events) if (e.type === 'cookie') cookies.push(+w.t.toFixed(2));
    for (const g of w.guards) {
      if (!g.cfg.adult || g.state === 'sleep' || g.delay > 0) continue;
      const d = Math.hypot(g.x - w.player.x, g.z - w.player.z);
      if (d < closest && w.player.hidden) {
        closest = d;
        closeAt = w.t;
      }
    }
  }
  const stars = w.status === 'won' ? [w.cookieCount === L.cookies.length, w.stats.spotted === 0, w.t <= L.par].filter(Boolean).length : 0;
  return { status: w.status, t: +w.t.toFixed(1), cookies, closest: +closest.toFixed(2), closeAt: +closeAt.toFixed(1), stars };
}
for (const [h, i] of [[3, 1], [3, 2], [3, 4], [3, 5]])
  for (let seed = 1; seed <= 12; seed++) {
    const r = play(h, i, seed);
    if (r.status === 'won' && r.closest < 1.8) console.log(`chalet ${h}-${i} seed=${seed}`, JSON.stringify(r));
  }
for (const [h, i] of [[0, 5], [0, 8], [1, 0], [1, 2], [2, 0], [3, 0]])
  for (let seed = 1; seed <= 8; seed++) {
    const r = play(h, i, seed);
    if (r.stars === 3 && r.t < 22) console.log(`3-star ${h}-${i} seed=${seed}`, JSON.stringify(r));
  }
