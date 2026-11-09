// GamePix submission: zip (index.html at the zip root) + icon / cover from the existing store covers.
// Run `npm run build:gamepix` first. The screen capture is recorded separately (see submission-gamepix/README.md).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';

const out = 'submission-gamepix';
mkdirSync(out, { recursive: true });
const zip = `${out}/cookie-heist-gamepix-v1.zip`;
rmSync(zip, { force: true });
// -j: index.html sits at the root of the zip; -9: smallest; -X: no extra file attributes
execFileSync('zip', ['-j', '-9', '-X', '-q', zip, 'dist-gamepix/index.html'], { stdio: 'inherit' });
execFileSync('node', ['scripts/submission/check-gamepix.mjs', zip], { stdio: 'inherit' });
// icon / cover: scaled from the 3D title covers (the "COOKIE HEIST" logo is part of the art)
const ff = (src, w, h, dst) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', `scale=${w}:${h}:flags=lanczos`, dst], { stdio: 'inherit' });
ff('submission/covers/cover-800x800.png', 512, 512, `${out}/icon-512x512.png`);
ff('submission/covers/cover-1920x1080.png', 1280, 720, `${out}/cover-1280x720.png`);
console.log(`GamePix submission ready: ${zip} (${(statSync(zip).size / 1024 / 1024).toFixed(2)} MB)`);
