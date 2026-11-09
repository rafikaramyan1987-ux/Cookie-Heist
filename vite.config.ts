import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const PLATFORMS = ['crazygames', 'gd', 'web'] as const;
type PlatformName = (typeof PLATFORMS)[number];

/**
 * Build target portal: `VITE_PLATFORM=crazygames|gd|web`, or `--mode gd` / `--mode web`; default CrazyGames.
 * The CrazyGames build goes to dist/, the others to dist-<platform>/.
 */
function platformFor(mode: string): PlatformName {
  const p = process.env.VITE_PLATFORM || (PLATFORMS.includes(mode as PlatformName) ? mode : 'crazygames');
  if (!PLATFORMS.includes(p as PlatformName)) throw new Error(`unknown VITE_PLATFORM "${p}" (crazygames | gd | web)`);
  return p as PlatformName;
}

export default defineConfig(({ mode }) => {
  const platform = platformFor(mode);
  return {
    base: './',
    plugins: [viteSingleFile()],
    define: { __PLATFORM__: JSON.stringify(platform) },
    build: {
      target: 'es2020',
      outDir: platform === 'crazygames' ? 'dist' : `dist-${platform}`,
      assetsInlineLimit: 100_000_000,
      chunkSizeWarningLimit: 4000,
    },
    server: { host: true },
  };
});
