/**
 * Freeze the chosen v3.4 nights into src/levels/houses/{farmhouse,beachhouse,castle}.ts.
 * Reads the JSON lines written by scripts/levels/tune.ts, picks 10 nights per house so that the difficulty score
 * rises strictly over all 30 (and above the old finale), with each house's mechanics present, and writes plain
 * level data: one floorplan per night, par 76 → 105 (one second more every night), the tip of each
 * v3.4 mechanic on the first night that uses it.
 *
 * usage: npx tsx scripts/levels/freeze.ts out1.jsonl out2.jsonl … [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Row {
  house: 'farmhouse' | 'beachhouse' | 'castle';
  tier: number;
  seed: number;
  score: number;
  route: number;
  win: Record<string, number>;
  time: number;
  hint: number;
  knobs: Record<string, unknown>;
  plan: { map: string[]; obj: string[]; doors: string; windows?: string };
  opts: { guards: Record<string, unknown>[]; par: number; toys?: number; dark?: string; bedCheck?: number; tip?: string };
}

const files = process.argv.slice(2).filter((a) => !a.startsWith('--') && a.endsWith('.jsonl'));
const dry = process.argv.includes('--dry');
const rows: Row[] = files.flatMap((f) =>
  readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Row),
);
const HOUSES = ['farmhouse', 'beachhouse', 'castle'] as const;
const hasMotion = (r: Row) => r.plan.obj.join('').includes('m');
const hasAlarm = (r: Row) => r.opts.guards.some((g) => g.wakeAt);
const hasDoze = (r: Row) => r.opts.guards.some((g) => g.doze);
/** mechanics each house must show (the house that introduces one, and one more so it is spread over the nights) */
const NEEDS: Record<(typeof HOUSES)[number], ((r: Row) => boolean)[]> = { farmhouse: [hasDoze, hasMotion], beachhouse: [hasMotion, hasAlarm], castle: [hasAlarm, hasMotion, hasDoze] };

/**
 * 10 nights per house in strictly rising difficulty score, every house above the one before it. Greedy on the
 * lowest scores (leaves the most room for the next house), then swaps to cover the mechanics each house must show.
 */
function pick(pool: Row[], above: number, needs: ((r: Row) => boolean)[]): Row[] | null {
  const sorted = pool.filter((r) => r.score > above).sort((a, b) => a.score - b.score || b.win.average - a.win.average);
  const distinct: Row[] = [];
  for (const r of sorted) if (!distinct.length || r.score > distinct[distinct.length - 1].score) distinct.push(r);
  if (distinct.length < 10) return null;
  let chosen = distinct.slice(0, 10);
  // a needed mechanic missing: swap in the lowest-scored candidate with it at its score (same score, other layout)
  for (const need of needs) {
    if (chosen.some(need)) continue;
    const alt = sorted.find((r) => need(r) && !chosen.includes(r));
    if (!alt) return null;
    const same = chosen.findIndex((c) => c.score === alt.score);
    if (same >= 0) chosen[same] = alt;
    else {
      chosen = [...chosen.slice(0, 9), alt].sort((a, b) => a.score - b.score);
      if (new Set(chosen.map((c) => c.score)).size < 10) return null;
    }
  }
  return chosen;
}
const chosen: Row[] = [];
let above = 59; // the old finale (mansion-12)
for (const h of HOUSES) {
  const got = pick(
    rows.filter((r) => r.house === h),
    above,
    NEEDS[h],
  );
  if (!got) {
    console.error(`${h}: not enough candidates above ${above}: ${rows.filter((r) => r.house === h && r.score > above).map((r) => r.score).sort((a, b) => a - b).join(' ')}`);
    process.exit(1);
  }
  chosen.push(...got);
  above = got[got.length - 1].score;
}

const LETTER = { farmhouse: 'F', beachhouse: 'S', castle: 'R' };
const TITLE = {
  farmhouse: 'House 6 — Farmhouse (v3.4): summer on the farm. Light sleepers sit up now and then; mum and dad walk the long halls.',
  beachhouse: 'House 7 — Beach House (v3.4): holidays by the sea. Motion-sensor lamps light dark rooms when you move close by.',
  castle: 'House 8 — Royal Castle (v3.4): the grand finale. Alarm clocks get grown-ups up mid-night; everything from before comes back.',
};
const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const val = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(val).join(', ')}]` : typeof v === 'string' ? q(v) : typeof v === 'object' && v ? `{ ${Object.entries(v).map(([k, x]) => `${k}: ${val(x)}`).join(', ')} }` : String(v);

let seen = { doze: false, motion: false, alarm: false };
const out: Record<string, string> = {};
for (const house of ['farmhouse', 'beachhouse', 'castle'] as const) {
  const mine = chosen.filter((r) => r.house === house);
  let src = `import { night, Plan } from '../helpers';\nimport type { LevelSrc } from '../../game/types';\n\n/**\n * ${TITLE[house]}\n * Every night has its own floorplan. Generated with scripts/levels/gen.ts and chosen by scripts/levels/tune.ts +\n * freeze.ts (each one passes the strict playtest audit); edit the data here directly from now on.\n */\n\n`;
  mine.forEach((r, k) => {
    const name = `${LETTER[house]}${k + 1}`;
    src += `const ${name}: Plan = {\n  map: [${r.plan.map.map(q).join(', ')}],\n  obj: [${r.plan.obj.map(q).join(', ')}],\n  doors: ${q(r.plan.doors)},\n  windows: ${q(r.plan.windows ?? '')},\n};\n\n`;
  });
  src += `export const ${house.toUpperCase()}: LevelSrc[] = [\n`;
  mine.forEach((r, k) => {
    const tier = r.tier;
    const o = { ...r.opts, par: 76 + chosen.indexOf(r) };
    const objs = r.plan.obj.join('');
    const tip = !seen.doze && o.guards.some((g) => g.doze) ? 'doze' : !seen.motion && objs.includes('m') ? 'motion' : !seen.alarm && o.guards.some((g) => g.wakeAt) ? 'alarm' : k === 9 ? 'finale' : undefined;
    if (tip === 'doze') seen.doze = true;
    if (tip === 'motion') seen.motion = true;
    if (tip === 'alarm') seen.alarm = true;
    const guards = o.guards.map((g) => `      ${val(g)},`).join('\n');
    const rest = Object.entries({ par: o.par, toys: o.toys, dark: o.dark, bedCheck: o.bedCheck, tip }).filter(([, v]) => v !== undefined);
    src += `  // night ${k + 1} (tier ${tier}): score ${r.score}, route ${r.route} cells; playtest avg ${Math.round(r.win.average * 100)}% / good ${Math.round(r.win.good * 100)}%, ~${Math.round(r.time)} s\n`;
    src += `  night(${LETTER[house]}${k + 1}, {\n    guards: [\n${guards}\n    ],\n${rest.map(([k2, v]) => `    ${k2}: ${val(v)},`).join('\n')}\n  }),\n`;
  });
  src += `];\n`;
  out[house] = src;
}
seen = { doze: false, motion: false, alarm: false };
for (const r of chosen) console.log(`tier ${String(r.tier).padStart(2)} ${r.house.padEnd(10)} score ${String(r.score).padStart(5)} route ${String(r.route).padStart(4)} avg ${r.win.average} good ${r.win.good} beg ${r.win.beginner} hint ${r.hint} ${JSON.stringify(r.knobs)}`);
if (!dry) for (const [h, s] of Object.entries(out)) writeFileSync(`src/levels/houses/${h}.ts`, s);
