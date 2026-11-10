/**
 * Static level audit on the real guard simulation:
 * stationary adult guards, sightings of the start area in the first 3 s, route cells that never open, and
 * corridors every route must take that do not open a crossing window at least every 10 s.
 * usage: npx tsx scripts/playtest/audit.ts [h-i]
 */
import { getLevel, LEVEL_SRC } from '../../src/levels/all';
import { closedTargets, startSightings, stationaryGuards, crossingWaits, MAX_CROSS_WAIT } from '../../src/game/audit';

const only = process.argv[2];
let fails = 0;
for (let h = 0; h < LEVEL_SRC.length; h++)
  for (let i = 0; i < LEVEL_SRC[h].length; i++) {
    if (only && only !== `${h}-${i}`) continue;
    const L = getLevel(h, i);
    const probs: string[] = [];
    const st = stationaryGuards(L);
    if (st.length) probs.push(`stationary guard ${st.map((g) => L.guards[g].kind).join(', ')}`);
    const ss = startSightings(L);
    if (ss.length) probs.push(`start seen (phase ${ss[0][0]}, ${ss[0][1]} s)`);
    const ct = closedTargets(L);
    if (ct.length) probs.push(`never opens: ${ct.join(', ')}`);
    const cw = crossingWaits(L).filter((s) => s.maxWait > MAX_CROSS_WAIT);
    if (cw.length) probs.push(`only route not readable: ${cw.map((s) => `${s.cells.length}-cell corridor waits ${s.maxWait.toFixed(1)} s`).join(', ')}`);
    if (probs.length) fails++;
    if (probs.length || only) console.log(`${L.id.padEnd(13)} ${probs.join('; ') || 'ok'}`);
  }
console.log(fails ? `${fails} level(s) fail the audit` : 'audit ok');
process.exit(fails ? 1 : 0);
