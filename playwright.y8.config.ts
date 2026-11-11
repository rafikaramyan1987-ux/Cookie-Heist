import { defineConfig } from '@playwright/test';

/** e2e smoke test of the Y8 build (dist-y8/, `npm run build:y8`) with a stubbed Y8 SDK */
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'tests/e2e-y8',
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4177/', trace: 'off', reducedMotion: 'reduce', launchOptions: { args: GL } },
  webServer: { command: 'npx vite preview --mode y8 --host 127.0.0.1 --port 4177 --strictPort', url: 'http://127.0.0.1:4177/', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [{ name: 'y8-desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } }],
});
