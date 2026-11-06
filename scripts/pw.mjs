// shared Playwright loader (uses the pre-installed browser)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require(require.resolve('playwright', { paths: ['/opt/node22/lib/node_modules', '/opt/node-tools/node_modules'] }));
}
export const { chromium } = pw;
export const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
