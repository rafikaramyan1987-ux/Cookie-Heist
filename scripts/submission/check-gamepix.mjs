// Checks the GamePix zip: node scripts/submission/check-gamepix.mjs [zip]
// - index.html at the zip root, nothing else outside the build
// - the GamePix SDK is referenced as an external script (not inlined), before the game bundle
// - no CrazyGames / GameDistribution strings in the bundle
// - no http(s) URL other than the GamePix SDK (XML namespace identifiers such as http://www.w3.org/1999/xhtml,
//   used by three.js for document.createElementNS, are not links and are allowed)
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const SDK = 'https://integration.gamepix.com/sdk/v3/gamepix.sdk.js';
const NAMESPACES = new Set(['http://www.w3.org/1999/xhtml', 'http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink']);
const zip = process.argv[2] ?? 'submission-gamepix/cookie-heist-gamepix-v1.zip';
const errors = [];
const files = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
if (!files.includes('index.html')) errors.push('index.html is not at the zip root');
const extra = files.filter((f) => f !== 'index.html');
if (extra.length) errors.push(`unexpected files in the zip: ${extra.join(', ')}`);
const html = execFileSync('unzip', ['-p', zip, 'index.html'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sdkTag = html.indexOf(`<script src="${SDK}"></script>`);
if (sdkTag < 0) errors.push('gamepix.sdk.js is not referenced as an external <script src>');
if (!/window\.GamePixConfig\s*=\s*\{\s*lifecycle:\s*'manual'\s*\}/.test(html)) errors.push("GamePixConfig { lifecycle: 'manual' } missing");
const bundle = html.indexOf('<script type="module"');
if (bundle < 0 || sdkTag > bundle) errors.push('the SDK script must come before the game bundle');
for (const bad of ['crazygames', 'gamedistribution']) if (html.toLowerCase().includes(bad)) errors.push(`"${bad}" found in the bundle`);
const urls = [...new Set(html.match(/https?:\/\/[^\s"'`<>)\\]+/gi) ?? [])];
const links = urls.filter((u) => u !== SDK && !NAMESPACES.has(u));
if (links.length) errors.push(`external URLs in the bundle: ${links.join(', ')}`);
const size = statSync(zip).size;
if (errors.length) {
  console.error(`GamePix zip check FAILED (${zip}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`GamePix zip OK: ${zip} (${(size / 1024).toFixed(0)} KB), files: ${files.join(', ')}; URLs: ${urls.join(', ')}`);
