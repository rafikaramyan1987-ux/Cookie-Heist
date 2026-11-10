# Load performance: v2 → v3 (CrazyGames build)

Measured with `scripts/perf/measure.mjs` (`npm run perf`): the build is served gzip-compressed, loaded in headless
Chromium at 390×844 (touch), with a **4× CPU slowdown** and **SwiftShader software WebGL** (pessimistic: a real phone
GPU compiles shaders much faster), portal SDKs blocked. Medians of 5–7 runs.

- **First frame**: first paint of anything (`first-contentful-paint`).
- **Playable**: the game takes input. v2: the menu (players still had to tap Play and then the intro card);
  v2 `?level=0-0`: the same build sent straight to night 1's intro card (still one tap to start); v3: night 1 is
  running with the tutorial.
- **Bytes**: compressed bytes transferred until playable / in total (lazy chunks included, 15 s after load).

| | 4G (9 Mbps, 170 ms RTT) | Slow 4G (1.6 Mbps, 150 ms RTT) |
|---|---|---|
| v2 first frame | 732 ms | 2044 ms |
| **v3 first frame** (HTML loading screen) | **548 ms** (−25 %) | **956 ms** (−53 %) |
| v2 menu interactive | 3045 ms | 4302 ms |
| v2 night 1 intro card (`?level=0-0`) | 2871 ms | 4117 ms |
| **v3 night 1 playable** | **2832 ms** | **3988 ms** |
| v2 bytes | 387 KB (one 990 KB file) | 387 KB |
| **v3 bytes to playable / total** | **304 KB / 312 KB** (−21 %) | 304 KB / 312 KB |

v3 boot timeline on 4G (performance marks `ch:*`): scripts ready ~0.65 s → SDK + language ~0.05 s → stage ~0.1 s →
night 1 built ~1.3 s → first frame (shader compile) ~0.85 s → playable.

What changed: an inline HTML/CSS loading screen (logo, progress bar, a tip in the player's language) painted before
any script; three.js in its own preloaded chunk; houses 2–5, the snack nights, the 3D menu scene, the shop / thumbnail
renderer, music + extra sounds and the 9 non-English languages are lazy chunks loaded after night 1 is up; fonts are
files (preloaded) instead of base64; the `.woff` fallbacks are left out of the upload zip. Models and textures were
already procedural (generated in code, no image / model files to compress).
