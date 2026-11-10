// Load-time measurement: node scripts/perf/measure.mjs <dir> [runs] [--profile 4g|slow4g] [--query k=v] [--json out.json]
// Serves <dir> gzip-compressed (as portals / CDNs do) and loads it in Chromium with mid-range-phone throttling
// (--profile 4g: 9 Mbps / 170 ms RTT, default; --profile slow4g: 1.6 Mbps / 150 ms; both with a 4x CPU slowdown),
// 390x844 touch viewport, SwiftShader (software) WebGL. External requests (portal SDKs) are blocked so only the game's own bytes are measured.
// Reports (median over runs):
// - first frame: first paint of anything (performance 'first-contentful-paint')
// - interactive: the game is playable (window.__ready, the first level / menu is on screen and takes input)
// - bytes to interactive: compressed bytes transferred until interactive; total: after 15 s (lazy chunks included)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, extname } from 'node:path';
import { chromium, GL_ARGS } from '../pw.mjs';

const args = process.argv.slice(2);
const dir = args[0] ?? 'dist';
const runs = +(args[1] ?? 3);
const PROFILES = {
  // mid-range phone on 4G: 9 Mbps down, 1.5 Mbps up, 170 ms RTT, 4x CPU slowdown
  '4g': { latency: 170, down: 9 * 1024 * 1024, up: 1.5 * 1024 * 1024, cpu: 4 },
  // stress case: Lighthouse 'Slow 4G' (1.6 Mbps, 150 ms), 4x CPU
  'slow4g': { latency: 150, down: 1.6 * 1024 * 1024, up: 750 * 1024, cpu: 4 },
};
const query = args.includes('--query') ? args[args.indexOf('--query') + 1] : '';
const prof = PROFILES[args.includes('--profile') ? args[args.indexOf('--profile') + 1] : '4g'];
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const cache = new Map();
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(dir, p);
  if (!existsSync(f) || !statSync(f).isFile()) return res.writeHead(404).end();
  let body = cache.get(f);
  if (!body) cache.set(f, (body = gzipSync(readFileSync(f), { level: 9 })));
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream', 'content-encoding': 'gzip', 'cache-control': 'no-store' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: GL_ARGS });
const results = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: prof.latency, downloadThroughput: prof.down / 8, uploadThroughput: prof.up / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  let bytes = 0;
  const files = new Set();
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  cdp.on('Network.responseReceived', (e) => e.response.url.startsWith('http') && files.add(new URL(e.response.url).pathname));
  if (args.includes('--cpuprofile') && i === 0) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    await cdp.send('Profiler.start');
  }
  const t0 = Date.now();
  await page.goto(`${base}?low${query ? '&' + query : ''}`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 300000, polling: 50 });
  const tti = Date.now() - t0;
  if (args.includes('--cpuprofile') && i === 0) {
    const { profile } = await cdp.send('Profiler.stop');
    writeFileSync(args[args.indexOf('--cpuprofile') + 1], JSON.stringify(profile));
  }
  const bytesTti = bytes;
  const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null);
  const marks = await page.evaluate(() => performance.getEntriesByType('mark').filter((m) => m.name.startsWith('ch:')).map((m) => `${m.name.slice(3)} ${Math.round(m.startTime)}`).join(', '));
  if (marks) console.log(`  boot marks (ms since navigation): ${marks}`);
  await page.waitForTimeout(15000);
  results.push({ fcp: Math.round(fcp), tti, bytesTti, bytesTotal: bytes, files: [...files].sort() });
  console.log(`run ${i + 1}: first frame ${Math.round(fcp)} ms, interactive ${tti} ms, ${(bytesTti / 1024).toFixed(0)} KB to interactive, ${(bytes / 1024).toFixed(0)} KB total, ${files.size} files`);
  await ctx.close();
}
await browser.close();
server.close();
const med = (k) => results.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(results.length / 2)];
const diskBytes = (d) => readdirSync(d).reduce((s, f) => {
  const p = join(d, f);
  return s + (statSync(p).isDirectory() ? diskBytes(p) : statSync(p).size);
}, 0);
const raw = diskBytes(dir);
const summary = { dir, runs, query, profile: prof, firstFrameMs: med('fcp'), interactiveMs: med('tti'), kbToInteractive: Math.round(med('bytesTti') / 1024), kbTotalTransferred: Math.round(med('bytesTotal') / 1024), kbOnDisk: Math.round(raw / 1024), files: results[0].files };
console.log(JSON.stringify(summary, null, 2));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(summary, null, 2) + '\n');
