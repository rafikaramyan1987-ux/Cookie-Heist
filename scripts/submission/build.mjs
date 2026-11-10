// CrazyGames submission: the multi-file build in a zip that unzips to <name>/ (index.html + assets/), default
// cookie-heist-v3 (`node scripts/submission/build.mjs cookie-heist-v3.2` for the v3.2 update).
// Run `npm run build` first. Covers: scripts/submission/covers-v3.mjs; trailers: scripts/submission/trailer-v3.mjs
// (both need `npx vite preview --host 127.0.0.1 --port 4174` on the built dist).
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, statSync, readdirSync } from 'node:fs';

const name = process.argv[2] ?? 'cookie-heist-v3';
const tmp = '/tmp/claude-0/submission-cg';
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
cpSync('dist', `${tmp}/${name}`, { recursive: true });
// .woff (non-woff2) fallbacks are never fetched by browsers that run WebGL 2-era games: leave them out
for (const f of readdirSync(`${tmp}/${name}/assets`)) if (f.endsWith('.woff')) rmSync(`${tmp}/${name}/assets/${f}`);
const zip = `${process.cwd()}/submission/${name}.zip`;
rmSync(zip, { force: true });
execFileSync('zip', ['-r', '-9', '-X', '-q', zip, name], { cwd: tmp, stdio: 'inherit' });
console.log(`CrazyGames submission ready: submission/${name}.zip (${(statSync(zip).size / 1024).toFixed(0)} KB)`);
execFileSync('unzip', ['-l', zip], { stdio: 'inherit' });
