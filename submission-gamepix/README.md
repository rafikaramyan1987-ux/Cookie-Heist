# Cookie Heist — GamePix submission

- **Build:** `cookie-heist-gamepix-v1.zip` — a single `index.html` at the root of the zip (all code, art and sounds
  inlined, relative paths only). The only external script is the GamePix SDK
  (`integration.gamepix.com/sdk/v3/gamepix.sdk.js`, manual lifecycle), loaded before the game bundle.
- **Icon / cover:** `icon-512x512.png`, `cover-1280x720.png` — scaled from the store covers rendered from the real 3D
  title scene (title "Cookie Heist" and characters only, no URLs).
- **Screen capture:** `cookie-heist-gamepix-capture.mp4` (58 s, 960x540) — the GamePix build in the local SDK
  simulator: title, night 1 played by the demo bot (sped up 3x), Next night with the simulator's fake interstitial
  (shown because 2 minutes have passed since loading; the idle wait on the result screen is cut; ad sped up 2x),
  a short bit of night 2 ending in a scripted "Caught!" (to keep the clip short), then the "+1 toy" rewarded ad
  (`?gpx_reward=success`, the simulator grants it instantly).
- **Orientation:** portrait and landscape (responsive), desktop and mobile.

## Name
Cookie Heist

## Short description
Sneak out of bed, steal the cookies and get back under the covers before anyone notices! Tiptoe past flashlights,
hide in laundry baskets, throw squeaky toys to lure grown-ups away and dodge the cat and the robot vacuum. 60 cosy
stealth-puzzle nights in 5 houses.

## Long description
It's the middle of the night and the cookie jar is calling. Sneak out of bed, steal the cookies and get back under
the covers before anyone notices! Tiptoe past mum's flashlight, dodge dad's big torch, don't wake Nana Rose, keep away
from Mochi the cat (she meows!) and Dusty the robot vacuum (it beeps!). Hide in laundry baskets, under tables and
behind curtains, throw squeaky toys to lure grown-ups away, switch off the lights, find keys and pillow decoys, then
sneak back into bed before the bed check.

60 hand-made nights in 5 cosy houses: a city apartment, a family house, grandma's cottage, a snowy chalet and a grand
mansion, each with a big finale. New ideas arrive one at a time with short animated tips, and if you get caught it's
just "Back to bed!" and another try. Stuck? After a few tries a free hint shows a safe route. Earn stars and coins,
claim daily rewards, finish daily missions and spend your coins in the shop on boosts, pyjamas, caps and cookie
trails. Plays in English and French on desktop and mobile, in portrait and landscape.

## Controls
- **Touch / mouse:** drag anywhere to move. A small drag tiptoes silently; drag to the outer ring and hold to run
  (fast but noisy!). Tap the duck, then tap the floor to throw a toy. Tap the map button for an overview.
- **Keyboard:** WASD / arrow keys to move, hold Shift to run, Space to throw a toy.
- Grab the cookies, stay out of the flashlight beams (orange = "Hmm?", red = spotted) and get back to bed. Collect
  all cookies, never get spotted and beat the par time for 3 stars.

## Tags
stealth, puzzle, casual, cute, kids, family, 3d, sneaking, cookies, hide and seek, mobile, html5

## Category
Puzzle

## GamePix integration
- `window.GamePixConfig = { lifecycle: 'manual' }`, then the SDK script, in `<head>` before the game bundle.
- `lifecycle.loading(10 → 30 → 100)` while the game boots behind its loading screen, `await lifecycle.loaded()`
  before the menu shows, `lifecycle.gameStart()` once, when the first night starts.
- `events.on('pause' | 'resume')` and `visibilitychange` (hidden / visible): pause the night (pause menu, timers,
  physics and input stop) and mute all audio; resume restores the player's own sound / music settings. Both are
  idempotent. A window blur (click outside the iframe) does not pause.
- Interstitials (`ads.interstitial()`) only after a click at natural breaks: Next / Retry / Menu on the result
  screens, at most one every ~2 minutes (none in the first ~2 minutes after loading; a completed rewarded ad also
  counts as the break); never during a night, never two at once, no pre-roll.
- Rewarded ads (`ads.reward()`) only from buttons that say the reward (×2 coins, +1 toy, skip a night after 5
  fails), always optional and never limited by the 2-minute gap; the reward is granted only when `success === true`. Otherwise (no fill, cancel, error,
  or no ad within 8 s) the button says "No ad available right now, try later" for 2.5 s and can be tried again.
- `happyMoment('level_complete')` on every night won, `sadMoment('game_over')` when caught,
  `sadMoment('level_failed')` on a missed bed check. Language from `GamePix.lang()` (English / French, else
  English). Progress in plain `localStorage` (one known key).
- No external links, no other SDK, no analytics, no quit button, no rotate prompt.

Regenerate with `npm run build:gamepix && npm run submission:gamepix`.
