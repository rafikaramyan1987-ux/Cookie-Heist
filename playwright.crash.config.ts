import { defineConfig, devices } from '@playwright/test';

// Zero-errors tests of the CrazyGames build (tests/e2e-crash, docs/crash-investigation.md) on all three engines,
// desktop and phone. Build first (`npm run build`); `CRASH_DIR=<dir>` tests another build folder (e.g. an unzipped
// submission). Firefox runs headed (software WebGL needs a display: `xvfb-run` on Linux CI).
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const dir = process.env.CRASH_DIR || 'dist';
const port = Number(process.env.CRASH_PORT || 4176);
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true };

export default defineConfig({
  testDir: 'tests/e2e-crash',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}/`, trace: 'off' },
  webServer: { command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort --outDir ${dir}`, url: `http://127.0.0.1:${port}/`, reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, launchOptions: { args: GL } } },
    { name: 'chromium-phone', use: { ...devices['Pixel 7'], launchOptions: { args: GL } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1280, height: 720 } } },
    { name: 'webkit-phone', use: { ...devices['iPhone 13'] } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: { width: 1280, height: 720 }, headless: false } },
    { name: 'firefox-phone', use: { browserName: 'firefox', ...phone, headless: false } },
  ],
});
