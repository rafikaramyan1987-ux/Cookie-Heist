// Locale check (CI): every src/locales/<lang>.json has exactly the English keys, the same {placeholders},
// a valid number of plural forms ("a|b", or 4 forms one|few|many|other for Polish / Russian), and no empty value.
// Also: every literal t('key') in src/ exists in en.json.  usage: node scripts/check-locales.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'src/locales';
const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'));
const LANGS = ['en', 'fr', 'de', 'it', 'es', 'pt', 'nl', 'pl', 'tr', 'ru'];
const FORMS = { pl: [2, 4], ru: [2, 4] };
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const errors = [];
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
for (const l of LANGS) if (!files.includes(`${l}.json`)) errors.push(`missing ${l}.json`);
for (const f of files) {
  const l = f.replace('.json', '');
  let d;
  try {
    d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  } catch (e) {
    errors.push(`${f}: invalid JSON (${e.message})`);
    continue;
  }
  for (const k of Object.keys(en)) {
    if (!(k in d)) {
      errors.push(`${f}: missing key "${k}"`);
      continue;
    }
    const v = d[k];
    if (typeof v !== 'string' || !v.trim()) errors.push(`${f}: "${k}" is empty`);
    else {
      if (ph(v.split('|')[0]) !== ph(en[k].split('|')[0]) && !en[k].includes('|')) errors.push(`${f}: "${k}" placeholders {${ph(v)}} ≠ English {${ph(en[k])}}`);
      if (en[k].includes('|')) {
        const n = v.split('|').length;
        const ok = FORMS[l] ?? [2];
        if (!ok.includes(n)) errors.push(`${f}: "${k}" has ${n} plural forms (expected ${ok.join(' or ')})`);
        for (const form of v.split('|')) if (ph(form) !== ph(en[k].split('|')[1])) errors.push(`${f}: "${k}" plural form "${form}" placeholders differ`);
      }
    }
  }
  for (const k of Object.keys(d)) if (!(k in en)) errors.push(`${f}: extra key "${k}" (not in en.json)`);
}
// literal t('key') calls in the source must exist
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => walk(join(p, f))) : p.endsWith('.ts') ? [p] : []);
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)) if (!(m[1] in en)) errors.push(`${file}: t('${m[1]}') is not in en.json`);
}
if (errors.length) {
  console.error(`locale check FAILED:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`locales OK: ${files.length} languages × ${Object.keys(en).length} keys`);
