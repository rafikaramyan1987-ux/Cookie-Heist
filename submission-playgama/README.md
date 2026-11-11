# Cookie Heist — Playgama

## Description

It's the middle of the night and the cookie jar is calling. Tiptoe past mum's flashlight, dodge dad's torch, keep away from Mochi the cat and Dusty the robot vacuum. Hide in laundry baskets and behind curtains, throw squeaky toys to lure grown-ups away, then sneak back into bed before the bed check. 60 hand-made nights in 5 cosy houses, stars, coins, pyjamas to unlock and daily rewards. Plays in 10 languages.

## Controls

- **Desktop:** WASD / arrow keys to move, hold Shift to run (noisy!), Space to throw a toy; mouse: drag anywhere to move, click the toy then the floor to throw. No Esc key is used.
- **Touch:** drag anywhere to move (a small drag tiptoes, a long drag runs); tap the toy, then tap the floor to throw it.

## Tags

stealth, puzzle, casual, cute, family, 3d, sneaking, cookies, hide-and-seek, mobile

## Files

| File | What |
|---|---|
| `cookie-heist-playgama-v2.zip` | **upload this one.** The Playgama build: `index.html` at the zip root, `playgama-bridge-config.json` beside it, `assets/`; Playgama Bridge from Playgama's CDN, initialized before the game bundle runs; otherwise relative paths only |
| `cookie-heist-playgama-v1.zip` | the previous build, kept for reference: **do not upload**. Its vendored single-platform Bridge build had no `qa_tool` adapter, so Playgama's archive check reported "Playgama Bridge never initialized in this archive" (see below) |
| `cover-800x800.png`, `cover-1080x1920.png`, `cover-1920x1080.png` | the three covers Playgama's form takes (square, portrait, landscape), made with Playgama's own covers script from 1920x1080 / 1080x1920 screenshots of real play and the game's title font |
| `icon-512x512.png` | icon (same as submission-web/) |

## Playgama Bridge

- **Include:** `<script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>`, the first script
  in `<head>`, loaded normally: the CDN option Playgama's setup page recommends (wiki.playgama.com/playgama/bridge-sdk/setup;
  `v2/stable` served Bridge 2.4.1 when v2 was built). It loads the adapter of the platform the game runs on, including
  the QA Tool's `qa_tool` adapter that Playgama's archive check uses. Requirement 1.2.5 allows the Bridge, and only it,
  from Playgama's CDN.
- **Why v1 failed the archive check:** v1 shipped a custom single-platform build (`build-dist.ts --type=standalone
  --platform=playgama`), which bundles only the `playgama`, `standalone` and `playgama_sandbox` adapters. Playgama's
  archive check and QA Tool run the game with `?platform_id=qa_tool`; that build has no `qa_tool` adapter, so Bridge fell
  back to its generic base platform (`platform.id` "mock") and never sent the QA Tool its `initialize` handshake. The
  game's own 10 s `Promise.race` and silent catch hid this.
- **Initialization:** index.html's inline boot (scripts/playgama/boot.js) calls `bridge.initialize()` right after the
  Bridge script; the game's module script is held (`<script type="text/plain" data-playgama-game data-src=…>`) and
  starts only once initialize() has settled, so nothing of the game runs or loads before it (Playgama's required step
  2). There is no timeout of the game's own (a console.warn after 15 s if it is still pending). If initialize() fails,
  or the Bridge script does not load, `console.error("[Playgama Bridge] bridge.initialize() failed; the game runs
  WITHOUT Playgama Bridge …")` and the game plays on with no ads and no Bridge storage.
- **Config:** `playgama-bridge-config.json` beside `index.html` (Bridge loads `./playgama-bridge-config.json`).
- **Events:** `game_ready` once the loading screen is gone, and always first: a `level_started` / `level_completed`
  before it (night 1 starts behind the loading screen) is held and sent right after it.
- **Ads:** interstitials at every break between nights (the result screen's Next / Menu), so never during a night and
  never before the first night has ended, with no counter or timer of the game's own: how often one shows is Bridge's
  call, `minimumDelayBetweenInterstitial` in playgama-bridge-config.json (Playgama's interstitial docs).
- Language from `platform.language`
  (English fallback); progress through Bridge Storage only (key `cookieheist.save.v1`, its default storage type); rewarded ads only from the labelled "×2 coins / skip / extra toy" ad buttons, with
  the reward only after Bridge's `rewarded` state; audio muted and the night paused during ads, on Bridge's pause and
  audio events and when the page is hidden.

## Rebuild

```sh
npm ci
npm run submission:playgama   # vite --mode playgama → submission-playgama/cookie-heist-playgama-v2.zip
npm run check:playgama        # zip checks + Playgama's precheck (no FAIL, no WARN)
npm run qa:playgama           # Playgama QA Tool harness: ?platform_id=qa_tool, Bridge's initialize handshake, game_ready
npm run test:playgama         # Bridge mock + stubbed Playgama SDK test (Playwright)
```
