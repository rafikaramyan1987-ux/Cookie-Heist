import { defineConfig } from 'vitest/config';
export default defineConfig({ define: { __PLATFORM__: JSON.stringify('crazygames') }, test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 120000 } });
