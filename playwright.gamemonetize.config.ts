import { defineConfig } from '@playwright/test';

/** e2e smoke test of the GameMonetize build (dist-gamemonetize/, `npm run build:gamemonetize`) with a stubbed GameMonetize SDK */
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'tests/e2e-gamemonetize',
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4176/', trace: 'off', reducedMotion: 'reduce', launchOptions: { args: GL } },
  webServer: { command: 'npx vite preview --mode gamemonetize --host 127.0.0.1 --port 4176 --strictPort', url: 'http://127.0.0.1:4176/', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [{ name: 'gamemonetize-desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } }],
});
