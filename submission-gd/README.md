# Cookie Heist — GameDistribution submission

- **Game ID:** `6aa8020129824d9c9fc5d2cfed7b2d99`
- **Build:** `cookie-heist-gd-v1.zip` — a single `index.html` at the root of the zip (all code, art and sounds inlined),
  about 1 MB. Loads only the GameDistribution SDK (`html5.api.gamedistribution.com/main.min.js`) at runtime.
- **Orientation:** portrait and landscape (responsive), desktop and mobile.

## Name
Cookie Heist

## Description
It's the middle of the night and the cookie jar is calling. Sneak out of bed, steal the cookies and get back
under the covers before anyone notices! Tiptoe past mum's flashlight, dodge dad's big torch, don't wake Nana Rose,
keep away from Mochi the cat (she meows!) and Dusty the robot vacuum (it beeps!). Hide in laundry baskets, under
tables and behind curtains, throw squeaky toys to lure grown-ups away, switch off the lights, find keys and pillow
decoys — then sneak back into bed before the bed check.

60 hand-made nights in 5 cosy houses: a city apartment, a family house, grandma's cottage, a snowy chalet and a
grand mansion, each with a big finale. If you get caught, it's just "Back to bed!" and another try.

## Instructions
- **Touch / mouse:** drag anywhere to move. A small drag tiptoes silently; drag to the outer ring and hold to run
  (fast but noisy!). Tap the duck, then tap the floor to throw a toy. Tap the map button for an overview.
- **Keyboard:** WASD / arrow keys to move, hold Shift to run, Space to throw a toy.
- Grab the cookies, stay out of the flashlight beams (orange = "Hmm?", red = spotted) and get back to bed.
  Collect all cookies, never get spotted and beat the par time for 3 stars.

## Key features
- 60 hand-designed stealth-puzzle nights in 5 themed houses, each with a finale
- Cute, child-friendly 3D toon art; no violence — being caught means being carried back to bed
- New mechanics introduced gradually with animated tips: noise, hiding spots, distractions, light switches,
  keys and locked doors, sleeping grown-ups, a meowing cat, a beeping robot vacuum, bed checks and pillow decoys
- Free hints after 3 fails (a ghost shows a safe route), stars, coins, daily rewards and daily missions
- Shop with boosts and cosmetics (pyjamas, caps, cookie trails) tried on a rotating 3D character
- Optional rewarded ads: ×2 coins, +1 toy, skip a night after 5 fails
- English and French; progress saved in the browser
- Plays on desktop and mobile, portrait and landscape

## Tags
stealth, puzzle, casual, cute, kids, family, 3d, sneaking, cookies, night, hide and seek, mobile, html5

## Category
Puzzle (stealth)

## Age rating
Suitable for everyone (PEGI 3–7 friendly): no violence, no text chat, no external links, no logins.

## Assets in this folder
- `cookie-heist-gd-v1.zip` — the build to upload (`index.html` at the root).
- `thumbnails/thumb-512x384.jpg`, `thumb-512x512.jpg`, `thumb-200x120.jpg`, `thumb-1280x720.jpg`,
  `thumb-1280x550.jpg` — rendered from the real 3D title scene (game title and characters only).

## Ads (GameDistribution SDK)
- `window.GD_OPTIONS = { gameId, onEvent }`; the SDK script (`id="gamedistribution-jssdk"`) is loaded once while the
  game boots. `SDK_GAME_PAUSE` pauses the game and mutes all audio; `SDK_GAME_START` resumes it and restores the
  player's sound / music settings.
- Interstitials (`gdsdk.showAd()`) only after a click and never during a level: Play on the title screen (pre-roll)
  and Next / Retry / Menu on the result screens, at most one every ~2 minutes.
- Rewarded ads (`gdsdk.showAd('rewarded')`) are always optional; the reward is granted only after
  `SDK_REWARDED_WATCH_COMPLETE`. If no ad starts within 8 s (or it errors / is cancelled) the button says
  "No ad available right now, try later" for 2.5 s and can be tried again.
- If the SDK cannot load (ad blocker, offline) the game stays fully playable without ads.

Regenerate with `npm run build:gd && npm run submission:gd`.
