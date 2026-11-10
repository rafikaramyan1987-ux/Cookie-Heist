import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readdirSync, readFileSync } from 'node:fs';

const PLATFORMS = ['crazygames', 'gd', 'web', 'gamepix'] as const;
type PlatformName = (typeof PLATFORMS)[number];

/** GamePix JS SDK v3 (manual lifecycle): an external script, loaded before the game bundle, in the GamePix build only */
export const GAMEPIX_SDK_URL = 'https://integration.gamepix.com/sdk/v3/gamepix.sdk.js';

/**
 * Build target portal: `VITE_PLATFORM=crazygames|gd|web|gamepix`, or `--mode gd` / `--mode web` / `--mode gamepix`;
 * default CrazyGames. The CrazyGames build goes to dist/, the others to dist-<platform>/.
 */
function platformFor(mode: string): PlatformName {
  const p = process.env.VITE_PLATFORM || (PLATFORMS.includes(mode as PlatformName) ? mode : 'crazygames');
  if (!PLATFORMS.includes(p as PlatformName)) throw new Error(`unknown VITE_PLATFORM "${p}" (crazygames | gd | web | gamepix)`);
  return p as PlatformName;
}

/** index.html of the GamePix build: `GamePixConfig` + the SDK script at the top of <head>, before the game bundle */
function gamepixSdk(): Plugin {
  return {
    name: 'gamepix-sdk',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        { tag: 'script', children: "window.GamePixConfig = { lifecycle: 'manual' };", injectTo: 'head-prepend' },
        { tag: 'script', attrs: { src: GAMEPIX_SDK_URL }, injectTo: 'head-prepend' },
      ],
    },
  };
}

/** the loading screen's tips + "Loading…" in every language, from src/locales/*.json (no hard-coded strings) */
function bootStrings(): Plugin {
  return {
    name: 'boot-strings',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => {
        const out: Record<string, { tips: string[]; loading: string }> = {};
        for (const f of readdirSync('src/locales').filter((f) => f.endsWith('.json'))) {
          const d = JSON.parse(readFileSync(`src/locales/${f}`, 'utf8')) as Record<string, string>;
          out[f.replace('.json', '')] = { tips: Object.keys(d).filter((k) => k.startsWith('loadTip_')).map((k) => d[k]), loading: d.loading };
        }
        return html.replace('__BOOT_STRINGS__', JSON.stringify(out));
      },
    },
  };
}

/** multi-file builds: preload the two Fredoka weights the HUD / tutorial use, in parallel with the scripts */
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, ctx) =>
        Object.keys(ctx.bundle ?? {})
          .filter((f) => /fredoka-latin-(600|700)-normal-.*\.woff2$/.test(f))
          .map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${f}`, crossorigin: '' }, injectTo: 'head' as const })),
    },
  };
}

export default defineConfig(({ mode }) => {
  const platform = platformFor(mode);
  // CrazyGames / web: index.html (with the loading screen) + split, lazily loaded chunks — playable fast, smallest
  // download. GameDistribution / GamePix keep their single-file upload (one index.html, everything inlined).
  const single = platform === 'gd' || platform === 'gamepix';
  return {
    base: './',
    plugins: [bootStrings(), ...(platform === 'gamepix' ? [gamepixSdk()] : []), ...(single ? [viteSingleFile()] : [preloadFonts()])],
    define: { __PLATFORM__: JSON.stringify(platform) },
    build: {
      target: 'es2020',
      outDir: platform === 'crazygames' ? 'dist' : `dist-${platform}`,
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 4000,
      modulePreload: { polyfill: false },
      rollupOptions: single
        ? undefined
        : {
            output: {
              // three.js in its own long-cached chunk, loaded in parallel with the game code
              manualChunks: (id) => (id.includes('node_modules/three/') ? 'three' : undefined),
            },
          },
    },
    server: { host: true },
  };
});
