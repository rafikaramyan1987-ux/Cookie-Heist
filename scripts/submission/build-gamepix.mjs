// GamePix submission v3: zip (index.html at the zip root) + icon 256×256 and cover 1360×850 (JPG) from cover B2.
// Run `npm run build:gamepix` and scripts/submission/covers-v3.mjs first.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';

const out = 'submission-gamepix';
mkdirSync(out, { recursive: true });
// bump the version for every new submission; older zips stay as they are
const zip = `${out}/cookie-heist-gamepix-v3.zip`;
rmSync(zip, { force: true });
// -j: index.html sits at the root of the zip; -9: smallest; -X: no extra file attributes
execFileSync('zip', ['-j', '-9', '-X', '-q', zip, 'dist-gamepix/index.html'], { stdio: 'inherit' });
execFileSync('node', ['scripts/submission/check-gamepix.mjs', zip], { stdio: 'inherit' });
// icon: the square cover B2, scaled; cover: the wide cover B2, cropped to 1360×850 (16:10) from the right, so the title stays whole
const ff = (src, vf, dst) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', vf, '-q:v', '2', dst], { stdio: 'inherit' });
ff('submission/covers-v3/B2/cover-800x800.png', 'scale=256:256:flags=lanczos', `${out}/icon-256x256.jpg`);
ff('submission/covers-v3/B2/cover-1920x1080.png', 'scale=1511:850:flags=lanczos,crop=1360:850:in_w-1360:0', `${out}/cover-1360x850.jpg`);
console.log(`GamePix submission ready: ${zip} (${(statSync(zip).size / 1024 / 1024).toFixed(2)} MB)`);
