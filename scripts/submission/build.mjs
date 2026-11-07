// Covers + trailers + zip. Expects `npx vite preview --host 127.0.0.1 --port 4174` running on the built dist.
import { execFileSync } from 'node:child_process';
const base = 'http://127.0.0.1:4174/';
const run = (...a) => execFileSync('node', a, { stdio: 'inherit' });
run('scripts/submission/covers.mjs', base);
run('scripts/submission/record.mjs', base, '1920', '1080', 'submission/videos/trailer-1920x1080.mp4');
run('scripts/submission/record.mjs', base, '1080', '1920', 'submission/videos/trailer-1080x1920.mp4');
execFileSync('rm', ['-f', 'submission/cookie-heist-build.zip']);
execFileSync('zip', ['-j', '-q', 'submission/cookie-heist-build.zip', 'dist/index.html'], { stdio: 'inherit' });
console.log('submission ready');
