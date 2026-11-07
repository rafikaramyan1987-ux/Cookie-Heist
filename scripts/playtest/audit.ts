/**
 * Static level audit on the real guard simulation:
 * stationary adult guards, sightings of the start area in the first 3 s, and route cells that never open.
 * usage: npx tsx scripts/playtest/audit.ts [h-i]
 */
import { getLevel, LEVEL_SRC } from '../../src/levels/index';
import { closedTargets, startSightings, stationaryGuards } from '../../src/game/audit';

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
    if (probs.length) fails++;
    if (probs.length || only) console.log(`${L.id.padEnd(13)} ${probs.join('; ') || 'ok'}`);
  }
console.log(fails ? `${fails} level(s) fail the audit` : 'audit ok');
process.exit(fails ? 1 : 0);
