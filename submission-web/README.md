# Cookie Heist

**Tagline:** Sneak out of bed, steal the cookies and get back under the covers unseen!

## Description

It's the middle of the night and the cookie jar is calling. Tiptoe past mum's flashlight, dodge dad's torch, keep away from Mochi the cat and Dusty the robot vacuum. Hide in laundry baskets and behind curtains, throw squeaky toys to lure grown-ups away, then sneak back into bed before the bed check. 60 hand-made nights in 5 cosy houses, stars, coins, pyjamas to unlock and daily rewards. Plays in 10 languages.

## Controls

- **Keyboard:** WASD / arrow keys to move, hold Shift to run (noisy!), Space to throw a toy, hold the map button for an overview.
- **Mouse / touch:** drag anywhere to move (a small drag tiptoes, a long drag runs); tap the toy, then tap the floor to throw it.

## Genre

Stealth puzzle (casual, 3D)

## Tags

stealth, puzzle, casual, cute, family, 3d, sneaking, cookies, hide-and-seek, mobile

## Ad-free build

This web build contains **no ads and no portal SDK**: no interstitials, no rewarded-ad buttons (the game is fully
playable without them), no analytics, no external requests (fonts and all assets are in the zip), no external links.

## Files

| File | What |
|---|---|
| `cookie-heist-web-v1.zip` | the game: `index.html` at the zip root + `assets/`, relative paths only (upload as an HTML5 game, "played in the browser") |
| `cover-630x500.png` | itch.io cover, from the main cover art |
| `icon-512x512.png` | icon |
| `screenshot-1.png` … `screenshot-4.png` | 1280x720 gameplay: night 1 start (tutorial), mid-level (Family House night 3), hiding in a laundry basket, win screen |
| `checks/iframe-<w>x<h>.png` | the zip in an iframe at 640x480, 960x600, 1280x720 and 390x844 after night 1 was played (scripts/web/check.mjs) |

- **Embed size:** any; the game fills its frame (landscape and portrait). Suggested itch.io viewport 960x600,
  "mobile friendly" on, no fullscreen button needed (the game has none of its own; itch.io's works).
- **Saves:** localStorage, key `cookieheist.save.v1` only (a JSON document; settings, progress, coins).

## Rebuild

```sh
npm ci
npm run submission:web     # web build (vite --mode web) → submission-web/cookie-heist-web-v1.zip
npm run check:web -- submission-web/cookie-heist-web-v1.zip --shots submission-web/checks
npm run store:web          # cover, icon and the four screenshots
```
