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
| `cookie-heist-playgama-v1.zip` | the Playgama build: `index.html` at the zip root, `playgama-bridge.js` (Bridge 2.4.1) + `playgama-bridge-config.json` beside it, `assets/`; relative paths only |
| `cover-800x800.png`, `cover-1080x1920.png`, `cover-1920x1080.png` | the three covers Playgama's form takes (square, portrait, landscape), made with Playgama's own covers script from 1920x1080 / 1080x1920 screenshots of real play and the game's title font |
| `icon-512x512.png` | icon (same as submission-web/) |

## Playgama Bridge

- **Version: 2.4.1** (pinned): the official standalone `playgama` build from github.com/Playgama/bridge tag `v2.4.1`,
  vendored in `vendor/playgama-bridge/` (sha256 `b016a8d6…adc25`, checked in CI, reproducible with
  `bash scripts/playgama/build-bridge.sh`). Shipped inside the zip, so the game loads nothing from outside.
- Init before the game shows anything; `game_ready` once the loading screen is gone; language from `platform.language`
  (English fallback); progress through Bridge Storage only (key `cookieheist.save.v1`, its default storage type);
  interstitials only between nights; rewarded ads only from the labelled "×2 coins / skip / extra toy" ad buttons, with
  the reward only after Bridge's `rewarded` state; audio muted and the night paused during ads, on Bridge's pause and
  audio events and when the page is hidden.

## Rebuild

```sh
npm ci
npm run submission:playgama   # vite --mode playgama → submission-playgama/cookie-heist-playgama-v1.zip
npm run check:playgama        # zip checks + Playgama's precheck
npm run test:playgama         # Bridge mock + stubbed Playgama SDK test (Playwright)
```
