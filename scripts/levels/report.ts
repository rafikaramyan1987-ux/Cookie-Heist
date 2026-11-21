/**
 * docs/levels-v34.md: the 30 v3.4 nights with their difficulty measures and the playtest results.
 * usage: npx tsx scripts/playtest/run.ts --house 5 --json a.json … ; npx tsx scripts/levels/report.ts a.json b.json c.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ALL_LEVELS, getLevel } from '../../src/levels/all';
import { difficulty } from '../../src/game/difficulty';

interface Row {
  id: string;
  solvable: boolean;
  hint: number;
  audit: string[];
  prof: Record<string, { win: number; time: number }>;
}
const EN = JSON.parse(readFileSync('src/locales/en.json', 'utf8')) as Record<string, string>;
const runs: Row[] = process.argv.slice(2).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Row[]);
const byId = new Map(runs.map((r) => [r.id, r]));
const KIND: Record<string, string> = { mum: 'mum', dad: 'dad', grandma: 'grandma', teen: 'sibling', cat: 'cat', vacuum: 'vacuum' };

let md = `# The v3.4 nights (houses 6–8)

30 new nights after the 60 of v3.3: the **Farmhouse**, the **Beach House** and the **Royal Castle**, 10 nights each, every
one on its own floorplan (\`tests/unit/levels-v34.test.ts\` checks that no floorplan repeats, rotates or mirrors another
night's, old or new). They were built with the level generator (\`scripts/levels/gen.ts\`: a hall spine, rooms and
doors, furniture placed by room type, from the game's existing rooms and props only), kept only when they passed the
strict playtest audit (\`scripts/levels/tune.ts\`), and frozen as plain data (\`scripts/levels/freeze.ts\`).

**Rising difficulty.** Each night is a little longer and harder than the one before (checked by the tests):
- *par* (the 3rd-star time) rises by one second every night, from 76 s (the mansion finale's is 75 s) to 105 s
- the *difficulty score* (\`src/game/difficulty.ts\`) rises strictly: the shortest route start → required cookies (and keys)
  → bed, in cells, plus the pressure on it — awake grown-ups 8 each, sleepers 5, pets 4, a bed check 6, a locked
  door 3, a dark room 2, a motion lamp 3. The mansion finale scores 59.

**New mechanics** (all three are introduced with a first-time tip and come back in later nights and houses):
- **Light sleeper** — sleeps, then sits up on her bed and looks around for a couple of seconds, then sleeps again, on a
  fixed rhythm. Sneak past while she snores.
- **Motion-sensor lamp** — in a dark room; moving inside its dashed ring lights the room for 4 s, so grown-ups see you
  at full range there.
- **Alarm clock** — a grown-up asleep in bed gets up at a set time ("Ring ring!") and patrols for the rest of the night.

| # | Night | Name | Floor | Grown-ups / pets | Mechanics | Par | Route | Score | Avg bot win | Good bot win | Avg time | Hint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
`;
let n = 60;
for (const [h, i] of ALL_LEVELS.slice(60)) {
  n++;
  const L = getLevel(h, i);
  const d = difficulty(L);
  const r = byId.get(L.id);
  const who = L.guards
    .map((g) => `${KIND[g.kind]}${g.doze ? ' (light sleeper)' : g.wakeAt ? ` (alarm ${g.wakeAt} s)` : g.sleep ? ' (asleep)' : ''}`)
    .join(', ');
  const mech = [L.guards.some((g) => g.doze) && 'light sleeper', L.motion.length && `${L.motion.length} motion lamp${L.motion.length > 1 ? 's' : ''}`, L.guards.some((g) => g.wakeAt) && 'alarm clock', L.bedCheck && `bed check ${L.bedCheck} s`, (L.eh.includes(3) || L.ev.includes(3)) && 'locked door + key']
    .filter(Boolean)
    .join(', ');
  const pct = (x?: number) => (x === undefined ? '—' : `${Math.round(x * 100)}%`);
  md += `| ${n} | ${L.id}${L.finale ? ' (finale)' : ''} | ${EN[L.nameKey]} | ${L.w}×${L.d} | ${who} | ${mech}${L.tip && ['doze', 'alarm', 'motion'].includes(L.tip) ? ' *(tip)*' : ''} | ${L.par} s | ${d.route} | ${d.score} | ${pct(r?.prof.average?.win)} | ${pct(r?.prof.good?.win)} | ${r ? r.prof.average.time.toFixed(0) + ' s' : '—'} | ${r ? (r.hint < 0 ? 'none' : pct(r.hint)) : '—'} |\n`;
}
md += `\nThe playtest columns come from \`npx tsx scripts/playtest/run.ts --house 5|6|7 --runs 24 --strict\` (24 runs per profile on the real game logic); every night passes the strict audit (solvable, hint works, safe start, every patrol opens a path, readable crossings, no camping, no escape after "!", cookies visible). The solver report for all 90 levels is in \`docs/solver.md\`.\n`;
writeFileSync('docs/levels-v34.md', md);
console.log('wrote docs/levels-v34.md');
