# Cookie Heist — CrazyGames submission

## What changed in v3.2
- The title screen fits every screen: the logo never overlaps the Play / Daily reward / Midnight Snack / missions /
  Shop / Houses buttons, and every button stays fully on screen (it was overlapping at 1280x720 and 1366x768 and
  cut off on phones held sideways). Upload `cookie-heist-v3.2.zip` (unzips to `cookie-heist-v3.2/` with `index.html`
  and `assets/`, same structure as v3; `cookie-heist-v3.zip` is kept).

## What changed in v3
- New players jump straight into night 1 with a quick in-game tutorial and a close call with mum's flashlight.
- Loads much faster: a light loading screen in under a second, then only night 1 loads first.
- Come back daily: 7-day reward calendar (day 7 = Golden Moon pyjamas), streaks, a bonus "Midnight Snack" night.
- Juicier play: "Phew!" near misses, cookie sparkles, comic catches, star rain, instant retry, easier first nights.
- Now in 10 languages: English, French, German, Italian, Spanish, Portuguese, Dutch, Polish, Turkish and Russian.

## Short description
Sneak out of bed, steal the cookies, and get back under the covers before anyone notices!

## Description
It's the middle of the night and the cookie jar is calling. Tiptoe past mum's flashlight, dodge dad's big torch,
don't wake Nana Rose, keep away from Mochi the cat (she meows!) and Dusty the robot vacuum (it beeps!).
Hide in laundry baskets, under tables and behind curtains, throw squeaky toys to lure grown-ups away, switch
off the lights, find keys and pillow decoys — then sneak back into bed before the bed check.

60 hand-made nights in 5 cosy houses: a city apartment, a family house, grandma's cottage, a snowy chalet and a
grand mansion, each with a big finale. Earn stars and coins, unlock pyjamas, caps and cookie trails, claim daily
rewards and complete daily missions, and raid the Midnight Snack bonus night once a day. If you get caught, it's just
“Back to bed!” and another try. Plays in 10 languages.

## Controls
- **Touch / mouse:** drag anywhere to move — a small drag tiptoes silently, a long drag runs (noisy!).
  Tap the duck, then tap the floor to throw a toy. Hold the map button for an overview.
- **Keyboard:** WASD / arrow keys to move, hold Shift to run, Space to throw a toy.

## Tags
stealth, puzzle, casual, cute, kids, family, 3d, sneaking, cookies, night, hide and seek, mobile, portrait

## Age rating
PEGI 3–7 friendly: no violence, being caught means being carried back to bed.

## Assets in this folder
- `cookie-heist-v3.zip` — **the v3 build to upload**: unzips to `cookie-heist-v3/` with `index.html` and `assets/`
  (code split into lazily loaded chunks; relative paths only). `cookie-heist-build.zip` / `index.html` are the
  previous single-file build, kept for reference.
- **Main cover (B2):** `cover-1920x1080.png`, `cover-800x1200.png`, `cover-800x800.png` in this folder — the night
  kitchen with the kid big and clear at the front edge of the table, guilty grin to camera, a cookie held at the side,
  lit by the glowing cookie jar; mum's legs and flashlight beam and the cat around him. Same files in `covers-v3/B2/`.
- `covers-v3/A|B|C/cover-1920x1080.png`, `cover-800x1200.png`, `cover-800x800.png` — the other v3 covers rendered from the real
  3D scene, staged like posters: **A** close-up of the kid's guilty grin with a giant glowing cookie, mum's beam
  behind; **B** hiding under the kitchen table next to mum's legs and flashlight, the cookie jar glowing; **C** top-down,
  sneaking past sleeping dad with mum's beam almost touching him. The cat watches in each. Title only, top-left corner
  kept clear. Contact sheet of A, B, C and B2 at real thumbnail sizes: `docs/media/covers-v3-sheet.png`.
  (`covers/` = the v2 covers.)
- `videos/trailer-v3-1920x1080.mp4`, `videos/trailer-v3-1080x1620.mp4` (portrait 2:3, as CrazyGames requires) —
  about 18 s, no sound, real play: cover B2 as the first frame, a flashlight near miss in the first 2 s, hiding, a
  cookie grab, the Snowy Chalet, a 3-star win, cover B2 again at the end.
  (`trailer-1920x1080.mp4` / `trailer-1080x1920.mp4` = the v2 trailers.)

Regenerate: `npm run build && npm run submission`, and with `npx vite preview --host 127.0.0.1 --port 4174` running:
`npm run covers`, `npm run trailers`, `npm run media:first-minute`.
