# Crash investigation: the load / gameplay crash spike on CrazyGames (v3 → v3.2), fixed in v3.3

**Portal data (CrazyGames Performance tab, live build `cookie-heist-v3.2.zip`):** load crash rate ~0 % on 8–9 Nov,
~1 % on 10 Nov, ~10–12 % on 11 Nov (average 3.2 % mobile / desktop); gameplay crash rate 0 % → ~2 % → ~6–9 %;
average loading time 1.3 s → 1.8 s. Same on mobile and desktop.

**Result in one paragraph.** The CrazyGames build crashed (in the SDK's sense) whenever any of its lazily loaded files
failed to download, and in four other non-happy paths. All of them were reproduced on the exact v3.2 zip and are
fixed in v3.3. The v3.2-only code change (the title layout fix) does not throw in any scenario. The paths that do
throw arrived with **v3**: v3 split the game into 26 lazily loaded files, where the v2 build of 8–9 Nov was a
single `index.html`. A failed file download now cost every player a crash, and a returning player's loading screen
never finished. Players with a v3 save first appeared on 11 Nov. On that path the loading screen also waits for the houses 2–5
file, so for them a failed download means a load that never ends. That fits the jump from 10 to 11 Nov; this
part is an inference, see [What explains the timeline](#what-explains-the-timeline). The loading-time rise is
**not** explained by the code: v3, v3.2 and v3.3 load equally fast in our measurement (section 5). The zero-errors suite (`tests/e2e-crash`) fails on v3.2
and passes on v3.3 in Chromium, WebKit and Firefox, desktop and phone.

## 1. How CrazyGames counts crashes (and which signals we can trigger)

From the official docs (docs.crazygames.com, read 12 Nov 2026) and the official SDK itself
(`https://sdk.crazygames.com/crazygames-sdk-v3.js`, version 3.6.0):

- **What is reported.** In the `crazygames` environment, `SDK.init()` calls `propagateErrors()`, which adds two
  listeners and posts every hit to the CrazyGames page:
  ```js
  window.addEventListener("error", e => this.postMessage({ type: "error", data: { name, message, filename, lineno, colno, stack, url } }))
  window.addEventListener("unhandledrejection", e => this.postMessage({ type: "error", data: { name: "UnhandledRejection", message, stack, url } }))
  ```
  So **every uncaught exception and every unhandled promise rejection** after `init()` reaches CrazyGames.
  `console.error` is not reported. A failed `<script>` / `<img>` download is not reported either: resource
  errors don't bubble to `window`, and the listener is not in the capture phase.
- **Load vs gameplay.** The docs: *"Load start/stop events: allow us to measure and report on in-game loading times
  and fail rates"* (requirements/technical), *"The loading stop function has to be called when the loading is
  complete and eventually the gameplay starts"* (sdk/game). The SDK sends `sdkGameLoadingStart` /
  `sdkGameLoadingStop`, and on the first `gameplayStart()` the page's resource timings (`sdkGameLoadStats`). The docs
  do not spell out the formula. What we know: an error before `loadingStop` falls in the loading window, and a
  load that starts and never reaches `loadingStop` is a failed load. Errors after `gameplayStart` are in gameplay.
- **Loading time** is measured between `loadingStart()` and `loadingStop()`; the game calls `loadingStart()` right
  after `SDK.init()`.
- **Local test mode.** On `localhost` / `127.0.0.1` (or with `?useLocalSdk=true`) the SDK runs in the `local`
  environment: ads show an overlay text, SDK logging is on, the data module uses localStorage. `propagateErrors()`
  runs only in the `crazygames` environment, so the zero-errors suite uses a stand-in SDK in the `crazygames`
  environment that forwards `error` / `unhandledrejection` exactly the same way (`window.__cgReported`). It also
  runs one scenario with the official SDK in local mode.
- **Data module.** It throws `{ code: 'dataModuleDisabled' }` from every method when Progress Save is not enabled for
  the game (class `Ae` in the SDK), and `dataLimitExcedeed` above 1 MB.

**Signals we can trigger** (all are checked by the zero-errors suite): uncaught errors, unhandled rejections, loading
that never reaches `loadingStop`, `gameplayStart` before `loadingStop`, a WebGL context loss nobody asked for, console
errors, failed requests nobody injected, and the game's own last-resort record (`window.__errors`, `src/app/guard.ts`).

## 2. What ships to players: `cookie-heist-v3.zip` → `cookie-heist-v3.2.zip`

Unzipped and compared file by file (minified identifiers and chunk hashes normalised); the zips were built from
`135f751` (v3) and `a75fffb` (v3.2).

| File | Change |
| --- | --- |
| `index.html` | the `fredoka-latin-700` font preload moved one line (no behaviour change) |
| `assets/index-*.js` (main chunk) | **`fitTitle()`** (src/ui/title.ts): the title logo / button layout. Runs when the menu opens, again when `document.fonts.ready` resolves, and on every resize |
| 7 other chunks (`rest`, `titleView`, `houses`, `levelView`, `lineup`, `pipPreview`, cover views) | renamed only (their import of `index-<hash>.js` changed); content identical |
| 18 chunks (three.js, languages, fonts, art) | identical |

The other commits of 10–11 Nov (`save.ts` in-memory fallback, `sdk.ts` / `types.ts` / GamePix / Playgama platform
code) are compiled out of the CrazyGames build (`__PLATFORM__` is a build-time constant): `grep -ci playgama` and
`grep -ci gamepix` on the v3.2 main chunk give 0. `fitTitle()` only reads layout and sets styles. It never threw in
any run below (all engines, every viewport, zero-size and rotated). **v3.2 adds no new crash path; the crash
paths below are in v3 and v3.2 alike.**

## 3. Method

- The **exact v3.2 zip**, unzipped and served from `127.0.0.1`, driven by Playwright in **Chromium, WebKit and
  Firefox** (Firefox headed under Xvfb: headless Firefox has no WebGL in this container). Desktop 1280×720 and phone
  emulation (iPhone 13 / Pixel 7 / 390×844 touch).
- SDK: the stand-in SDK in the `crazygames` environment (Data Module, ads with every outcome, error forwarding), and
  the official SDK v3 in local mode.
- Scenarios: first load, title, several nights (bot), midgame + rewarded ads (success / error / blocked = `requestAd`
  throws / no fill = never answers / started but never finished), pause / resume, tab hide / show,
  resize / rotate, WebGL context loss and restore, many nights in a row (GPU memory), slow network, failed downloads
  of each file, private mode (localStorage / sessionStorage throw), Data Module disabled, returning players with real
  saves made by playing the v3 and v3.2 builds plus a v2-shaped save, opened 1 and 8 days later in English,
  French and Russian, full quality and `?low`, and no WebGL.
- Measurements: every `pageerror`, `error` / `unhandledrejection` event, console error, failed request,
  `webglcontextlost`; the SDK call sequence; `renderer.info.memory` after each night; `loadingStart → loadingStop`
  on a throttled phone profile.

## 4. Errors found, root causes, fixes

"How often" is the reproduction rate in our runs. The real-world rate depends on how often a download fails,
WebGL is missing, etc., which only the CrazyGames error log can show (see the end).

| # | What the player / SDK sees | How often (our runs) | Root cause | Fix (v3.3) |
| --- | --- | --- | --- | --- |
| 1 | **Unhandled rejection** `TypeError: Failed to fetch dynamically imported module …/rest-*.js` (and `titleView`, a language, `pipPreview`, `audioExtra`); for a **returning player the loading screen never finishes** (`loadingStart` without `loadingStop`) | 100 % of runs with one failed download of the file (all engines). Returning + `rest` fails: never loads (90 s+). `titleView` fails: loading ends on a black screen with no menu | v3 split the build into lazily loaded chunks. `boot()` awaits `loadHouses()` for returning players, `void new App().boot()` has no `catch`, and `void loadHouses()` / `void import('../art/titleView')` have no rejection handler. `loadHouses()` keeps the rejected promise (`??=`), so it never tries again. **Chromium caches a failed dynamic `import()` for the whole page**: we measured that a retry of the same URL never refetches, while WebKit / Firefox do | `src/app/lazy.ts` `importRetry()`: 3 retries with back-off. The first retry uses the same URL (WebKit / Firefox), later ones a `?retry=n` URL taken from the error message (Chromium); measured to work in all three. Used for houses, title scene, languages, shop renderer, extra sounds. `loadHouses()` forgets a failed attempt. The menu shows without houses 2–5 (house 1 plays; opening another house tries again and says "Couldn't load…" if it can't). Without the title scene, a plain backdrop. Every background load has a handler |
| 2 | Loading screen **forever**, no error at all | 100 % when `three-*.js` or `index-*.js` fails to download | A failed module-graph download fires `error` only on the `<script>` element: nothing runs, nothing reaches `loadingStop` | `index.html`: a capture-phase listener before the game script fetches the game's script files again with `cache: 'reload'` and reloads the page once (measured: **WebKit keeps the failed script in its memory cache across a plain reload** and never asks for it again; the fresh fetch replaces it), guarded by `sessionStorage`; a second failure shows "Couldn't load the game. Check your connection." with **Try again** |
| 3 | **Unhandled rejection** `Error creating WebGL context` from `boot()`, loading screen forever | 100 % without WebGL (blocked, no GPU, too many contexts) | `createStage()` throws inside `boot()`, and nothing catches it | `boot()` never throws: the loading screen says "This browser can't show the 3D game. Turn on hardware acceleration or try another browser." with **Try again** (10 languages) |
| 4 | GPU memory grows every night until the browser loses the WebGL context / kills the tab (phones) | every night: +~100 geometries and +~10 shader programs, never freed (269 → 1,345 geometries, heap 57 → 181 MB after 12 nights) | `disposeRun()` removed the HUD but never freed the night's geometries, materials, textures or the 2048² shadow map. Every retry builds a new scene (v3's instant retry makes that frequent) | `src/render/dispose.ts`: a finished night's scene is disposed (shared cached geometry / textures / materials are kept). Measured: 269 → 327 geometries after 12 nights, heap ~105 MB |
| 5 | Game **stays paused and muted**, Next does nothing | 100 % when the SDK calls `adStarted` and never `adFinished` / `adError` | After `adStarted` the 8 s timeout was cleared, with no upper bound | `AD_MAX` (120 s) after start, shared by every platform (CrazyGames, GD, GamePix, Playgama added; GameMonetize / Y8 had it). One ad at a time. Every request settles exactly once |
| 6 | **Unhandled rejection** `InvalidStateError` from `AudioContext.resume()` / `suspend()` | 100 % on a closed AudioContext (all engines, measured); `new AudioContext()` can also throw | `void ctx.resume()` / `void ctx.suspend()` with no handler, called from ad callbacks and taps; a throw in `unlock()` runs inside an input handler | Every `resume()` / `suspend()` has a handler and is skipped on a closed context; `new AudioContext()` is guarded (the game plays on silently) |
| 7 | Returning player **loses progress** (treated as a first visit) | 100 % when the Data Module throws (`dataModuleDisabled`) | `loadSave()` caught the throw and returned a fresh save | The Data Module is probed once at init. If it throws, saves use localStorage (same key, same format); otherwise every get / set is wrapped so it never throws |
| 8 | `gameplayStart` before `loadingStop` | every first visit (night 1 starts under the loading screen) | The tutorial night calls `gameplayStart()` during `boot()`, before `loadingStop()` | The CrazyGames wrapper holds `gameplayStart` until `loadingStop` and sends it right after |
| 9 | `WebGL: INVALID_OPERATION: delete: object does not belong to this context` (console, WebKit), hundreds of lines | measured on the v3.3 candidate before this fix (WebKit, every restore followed by a resize or a disposed night); v3.2 takes the same path on any resize after a restore | three.js rebuilds its state on restore, but the `dispose` listeners its old state put on every geometry, material, texture and render target stay; disposing or resizing them deletes lost-context objects in the new context | `forgetLostContext()` (src/render/dispose.ts) drops those stale listeners on restore (the new state adds its own on the next draw; the lost context already freed the memory); the night pauses while the context is lost |
| 10 | (hardening) a save with a wrong-typed field would throw later in game code | not seen in real saves | `parseSave()` trusted field types | Every field is coerced to its type; unknown fields kept; format unchanged (v3 / v3.2 saves load byte-for-byte equal, unit test) |
| 11 | (hardening) an exception in one frame stopped the frame loop for good | not seen | `requestAnimationFrame` was scheduled after `tick()` | The next frame is scheduled first; a failing frame is logged and recorded (`src/app/guard.ts`), the game keeps running |

Not errors (checked, clean on v3.2 already): WebGL context loss and restore on the menu and during a night (three.js
recovers; v3.3 also pauses the night while the screen is black); tab hide / show; resize / rotate; private mode;
old saves from v2 / v3 / v3.2 on a later day (daily calendar, missions, snack night), in English / French /
Russian; all ad outcomes except #5; the official SDK in local mode.

**Shared code:** fixes 1, 3, 4, 6, 9, 10 and 11 are in shared code (`app.ts`, `levels/index.ts`, `i18n.ts`, `audio.ts`,
`previewHandle.ts`, `save.ts`, `render/`, `index.html`), so every build gets them. Fix 2 is in every multi-file
build (CrazyGames, web, Playgama, GameMonetize, Y8); GD / GamePix are single files with nothing to download. Fix 5
covers every ad platform, and fixes 7 and 8 are CrazyGames-specific.

## What explains the timeline

What we measured: v3.2 adds no crash path to v3 (section 2). Every crash path in v3.2 is in v3, and none is in
the v2 single-file build except #3, #4 and #6, which v2 also had. The portal's own numbers (`~0 %` on v2) show they
were rare there.

What we infer (it needs the CrazyGames error log to confirm):
- **8–9 Nov (v2, one file): ~0 %.** No lazily loaded files, so nothing could fail to download.
- **10 Nov (v3 from ~13:30 UTC, v3.2 from ~23:30): ~1 %.** Part of the day on the split build. Almost nobody had a
  v3 save yet, so nearly everyone took the first-visit path: night 1 loads with the main files, and houses 2–5 load
  in the background. A failed download there is an unhandled rejection *after* loading (gameplay crash), not a
  stuck load.
- **11 Nov (v3.2 all day): load 10–12 %, gameplay 6–9 %.** The first full day on the split build, and the first
  day with returning v3 players. A returning player's boot waits for houses 2–5 *inside* the loading window, so a
  failed download leaves the loading screen up forever. First-time players still crash after loading when a
  background download fails.
- **Loading time 1.3 → 1.8 s: not explained by the code.** Measured on a throttled phone, v3 and v3.2 are equal
  (section 5), and a returning player loads *faster* than a first-time player (~0.5 s vs ~2.5 s
  `loadingStart → loadingStop`: the first visit builds night 1 inside the loading window, the menu does not). If the
  portal's average counts only loads that finished, it moves with the mix of first-time and returning players and
  with retried loads, which the code cannot show. v3.3 does not change load time. Every lazily loaded file also
  changed its name in v3.2, so a session that started on v3 and fetched a file after the v3.2 upload asked for a
  name that no longer existed (if CrazyGames removes the old files).

**To confirm on the portal:** the error messages in the CrazyGames error log for 11 Nov should be dominated by
`Failed to fetch dynamically imported module` / `Importing a module script failed` / `error loading dynamically
imported module` (#1), then `Error creating WebGL context` (#3) and `InvalidStateError` (#6). After v3.3 they
should be gone.

## 5. Proof

### Zero-errors suite (`tests/e2e-crash`, `playwright.crash.config.ts`, CI job `crash`)

15 scenarios × 6 projects (Chromium / WebKit / Firefox × desktop / phone). Each fails on any of the signals in
section 1. The CI job also checks that the committed `submission/cookie-heist-v3.3.zip` is byte-identical to the
fresh build.

Before / after (the same suite, pointed at the unzipped `cookie-heist-v3.2.zip` with `CRASH_DIR`, desktop):

| Scenario | v3.2 Chromium | v3.2 WebKit | v3.2 Firefox | v3.3 (all 6 projects) |
| --- | --- | --- | --- | --- |
| first visit, 4 nights, midgame ads | ✘ `gameplayStart` before `loadingStop` (#8) | ✘ same | ✘ same | ✓ |
| returning player, v2 save, +1 day | ✓ | ✓ | ✓ | ✓ |
| returning player, v3 save, +1 day | ✓ | ✓ | ✓ | ✓ |
| returning player, v3.2 save, +8 days | ✘ (test bug since fixed: the bot was caught and the test looked for Next) | ✓ | ✓ | ✓ |
| ads: success / error / blocked / no fill | ✓ | ✓ | ✓ | ✓ |
| pause, tab hide / show, resize / rotate | ✓ | ✓ | ✓ | ✓ |
| WebGL context lost + restored | ✘ the night keeps running on a black screen (v3.3 pauses it) | ✘ same | ✘ same | ✓ |
| low memory: 10 nights / retries | ✘ +803 geometries never freed (#4) | ✘ | ✘ | ✓ |
| slow network + each lazy file failing once | ✘ unhandled rejections, loading never ends (#1, #2) | ✘ | ✘ | ✓ |
| offline after loading (houses 2–5 never arrive) | ✘ loading never ends (#1) | ✘ | ✘ | ✓ |
| private mode + Data Module disabled | ✘ `gameplayStart` before `loadingStop` (#8) | ✘ | ✘ | ✓ |
| Data Module holds the save, localStorage blocked | ✓ | ✓ | ✓ | ✓ |
| game script fails to download once | ✘ loading never ends (#2) | ✘ | ✘ | ✓ |
| no WebGL | ✘ unhandled rejection, loading never ends (#3) | ✘ | ✘ | ✓ |
| official SDK, local mode | ✓ | ✓ | ✓ | ✓ |
| **total** | **9 failed / 6 passed** | **8 / 7** | **8 / 7** | **15 / 15 in each of the 6 projects** (local runs and CI job `crash`) |

### Loading time (`loadingStart → loadingStop`, throttled phone: 150 ms RTT, 1.6 MB/s, 4× CPU, median of 5)

| Build | First visit (night 1) | Returning player (menu) |
| --- | --- | --- |
| v3 | 2,773 ms | 502 ms |
| v3.2 | 2,472 ms | 486 ms |
| v3.3 | 2,777 ms | 475 ms |

The run-to-run spread is about ±600 ms on the first visit, so the three builds are equal; v3.3 adds no loading cost
(the retries only run when a download fails).

### Unit tests

`tests/unit/crash.test.ts`: retries (same URL, then cache-busted), chunk URL from each engine's error message, v2 /
v3 / v3.2 saves, damaged saves, the CrazyGames wrapper (Data Module disabled / full, throwing SDK, `gameplayStart`
held until `loadingStop`, `AD_MAX`, one ad at a time).

## Builds (v3.3)

| Portal | Zip |
| --- | --- |
| CrazyGames | `submission/cookie-heist-v3.3.zip` (unzips to `cookie-heist-v3.3/`) |
| GameDistribution | `submission-gd/cookie-heist-gd-v3.zip` |
| GamePix | `submission-gamepix/cookie-heist-gamepix-v4.zip` |
| Playgama | `submission-playgama/cookie-heist-playgama-v3.zip` |
| GameMonetize | `submission-gamemonetize/cookie-heist-gamemonetize-v2.zip` |
| Y8 | `submission-y8/cookie-heist-y8-v2.zip` |
| Open web (itch.io, Newgrounds…) | `submission-web/cookie-heist-web-v2.zip` |

Save format, save key (`cookieheist.save.v1`), game IDs and the B2 covers are unchanged; older zips are kept.
