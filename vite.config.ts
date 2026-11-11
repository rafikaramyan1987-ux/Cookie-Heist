import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readdirSync, readFileSync } from 'node:fs';

const PLATFORMS = ['crazygames', 'gd', 'web', 'gamepix', 'playgama', 'gamemonetize'] as const;
type PlatformName = (typeof PLATFORMS)[number];

/** GamePix JS SDK v3 (manual lifecycle): an external script, loaded before the game bundle, in the GamePix build only */
export const GAMEPIX_SDK_URL = 'https://integration.gamepix.com/sdk/v3/gamepix.sdk.js';

/**
 * Build target portal: `VITE_PLATFORM=crazygames|gd|web|gamepix|playgama|gamemonetize`, or `--mode gd` / `--mode web` / `--mode gamepix` /
 * `--mode playgama` / `--mode gamemonetize`;
 * default CrazyGames. The CrazyGames build goes to dist/, the others to dist-<platform>/.
 */
function platformFor(mode: string): PlatformName {
  const p = process.env.VITE_PLATFORM || (PLATFORMS.includes(mode as PlatformName) ? mode : 'crazygames');
  if (!PLATFORMS.includes(p as PlatformName)) throw new Error(`unknown VITE_PLATFORM "${p}" (crazygames | gd | web | gamepix | playgama | gamemonetize)`);
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

/**
 * Playgama build, as Playgama's docs set it up for plain JS (wiki.playgama.com/playgama/bridge-sdk/setup and
 * bridge-sdk/api "Required steps"):
 * - Bridge from Playgama's CDN, `https://bridge.playgama.com/v2/stable/playgama-bridge.js` (the recommended option: it
 *   loads the adapter of the platform the game runs on, the QA Tool's `qa_tool` one included), the first script in
 *   <head>, loaded normally (not async / defer / module);
 * - right after it, scripts/playgama/boot.js inlined: `bridge.initialize()`, and the game bundle starts only once that
 *   has settled (the module script is held as <script type="text/plain" data-playgama-game data-src=…> until then);
 * - `playgama-bridge-config.json` beside index.html (Bridge loads it from `./playgama-bridge-config.json`).
 */
export const PLAYGAMA_BRIDGE_CDN = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js';
/** scripts/playgama/boot.js without its comment lines (they name the tags it handles) */
const playgamaBoot = () => readFileSync('scripts/playgama/boot.js', 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').trim();
function playgamaBridge(): Plugin {
  return {
    name: 'playgama-bridge',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => {
        // the loading screen speaks English until Bridge gives the language (Playgama: no localStorage, the language
        // comes only from Bridge's platform.language)
        const guess = /var sv = JSON\.parse\(localStorage[^\n]*\n\s*var c = \[sv\]\.concat\(navigator\.languages \|\| \[\], navigator\.language\);/;
        if (!guess.test(html)) throw new Error('playgama-bridge: the loading screen language guess in index.html changed');
        return html.replace(guess, 'var c = [];');
      },
    },
    // the final index.html: Bridge CDN first, boot right after it, every game module script held until boot starts it
    generateBundle: { order: 'post', handler(_o, bundle) {
      this.emitFile({ type: 'asset', fileName: 'playgama-bridge-config.json', source: readFileSync('scripts/playgama/playgama-bridge-config.json') });
      const html = Object.values(bundle).find((a) => a.type === 'asset' && a.fileName.endsWith('.html'));
      if (!html || html.type !== 'asset' || typeof html.source !== 'string') return;
      let held = 0;
      let src = html.source.replace(/<script type="module"([^>]*)>/g, (_m, attrs: string) => {
        held++;
        const s = attrs.match(/\ssrc="([^"]+)"/)?.[1];
        return `<script type="text/plain" data-playgama-game${s ? ` data-src="${s}"` : ''}>`;
      });
      if (!held) throw new Error('playgama build: no game module script to hold until bridge.initialize()');
      if (!/<head>/.test(src)) throw new Error('playgama build: no <head> in index.html');
      src = src.replace('<head>', `<head>\n    <script src="${PLAYGAMA_BRIDGE_CDN}"></script>\n    <script>${playgamaBoot()}</script>`);
      html.source = src;
    } },
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
  // CrazyGames / web / Playgama / GameMonetize: index.html (with the loading screen) + split, lazily loaded chunks — playable fast, smallest
  // download. GameDistribution / GamePix keep their single-file upload (one index.html, everything inlined).
  const single = platform === 'gd' || platform === 'gamepix';
  return {
    base: './',
    plugins: [bootStrings(), ...(platform === 'gamepix' ? [gamepixSdk()] : []), ...(platform === 'playgama' ? [playgamaBridge()] : []), ...(single ? [viteSingleFile()] : [preloadFonts()])],
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
