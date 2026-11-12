// GameDistribution submission v3: zip with index.html at the root (single file). Run `npm run build:gd` first.
// `--thumbs` also re-renders the thumbnails (starts its own `vite preview --mode gd` on port 4175).
import { execFileSync, spawn } from 'node:child_process';
import { statSync, mkdirSync, rmSync } from 'node:fs';

mkdirSync('submission-gd', { recursive: true });
if (process.argv.includes('--thumbs')) {
  const base = 'http://127.0.0.1:4175/';
  const server = spawn('npx', ['vite', 'preview', '--mode', 'gd', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'ignore', detached: true });
  try {
    for (let i = 0; ; i++) {
      try {
        if ((await fetch(base)).ok) break;
      } catch {
        /* not up yet */
      }
      if (i > 120) throw new Error('vite preview did not start');
      await new Promise((r) => setTimeout(r, 500));
    }
    execFileSync('node', ['scripts/submission/thumbs-gd.mjs', base], { stdio: 'inherit' });
  } finally {
    process.kill(-server.pid);
  }
}
const zip = 'submission-gd/cookie-heist-gd-v3.zip';
rmSync(zip, { force: true });
// -j: index.html sits at the root of the zip (GD requirement)
execFileSync('zip', ['-j', '-9', '-X', '-q', zip, 'dist-gd/index.html'], { stdio: 'inherit' });
const size = statSync(zip).size;
if (size >= 50 * 1024 * 1024) throw new Error(`zip too big: ${size} bytes`);
console.log(`GD submission ready: ${zip} (${(size / 1024 / 1024).toFixed(2)} MB)`);
