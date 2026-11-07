/**
 * Finds good moments for the trailer in REAL bot play (same seeds as ?capture&autoplay=good&seed=N):
 * a close call (hiding while an adult walks by) and clean wins.
 */
import { getLevel } from '../../src/levels/index';
import { World } from '../../src/game/world';
import { Bot, PROFILES } from '../../src/game/bot';

const cands = [[1, 11], [1, 8], [0, 4]];
for (const [h, i] of cands) {
  for (let seed = 1; seed <= 40; seed++) {
    const L = getLevel(h, i);
    const w = new World(L, { seed, jitter: 0.6 });
    const bot = new Bot(w, PROFILES.good, 7);
    let hideAt = -1,
      closest = 9,
      closeAt = -1;
    while (w.status === 'play' && w.t < 90) {
      w.step(1 / 60, bot.update(1 / 60));
      if (w.player.hidden) {
        if (hideAt < 0) hideAt = w.t;
        for (const g of w.guards) {
          if (!g.cfg.adult || g.state === 'sleep') continue;
          const d = Math.hypot(g.x - w.player.x, g.z - w.player.z);
          if (d < closest) {
            closest = d;
            closeAt = w.t;
          }
        }
      }
    }
    if (w.status === 'won' && closest < 1.9) console.log(`close-call ${h}-${i} seed=${seed} hide=${hideAt.toFixed(1)} closest=${closest.toFixed(2)}@${closeAt.toFixed(1)} win=${w.t.toFixed(1)} spotted=${w.stats.spotted}`);
  }
}
