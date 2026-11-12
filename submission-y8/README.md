# Cookie Heist — Y8 submission

- **App ID:** `6af4a2c63c0f1c5e7ad8dc57` · **Game ID:** `292539` (already in the build)
- **Hosting:** direct upload. It is a single-player game, so per docs.y8.com/studio/iframe-game-hosting it must be
  uploaded to Y8 and not iframe-hosted.

## Files to upload

| Portal tab → slot | File (in this folder) | Spec checked |
|---|---|---|
| **Builds** → upload build | `cookie-heist-y8-v2.zip` (Crash fixes (v3.3 of the game): lazy downloads retried, nothing uncaught when a download, WebGL or storage fails, GPU memory freed between nights (docs/crash-investigation.md); v1 = previous build) | `index.html` + `assets/` at the zip root, relative paths only, about 430 KB |
| **Media** → Standard Screenshot (4:3) | `media/screenshot-760x570-1.jpg` … `-4.jpg` | 760x570 JPG, < 2 MB |
| **Media** → Widescreen Screenshot (16:9) | `media/screenshot-1280x720-1.jpg` … `-4.jpg` | 1280x720 JPG, < 5 MB |
| **Media** → Landscape Promo | `media/promo-landscape-1920x1080.jpg` | 1920x1080 JPG, < 5 MB |
| **Media** → Portrait Promo | `media/promo-portrait-1080x1920.jpg` | 1080x1920 JPG, < 5 MB |
| **Media** → Game Card Promo | `media/promo-card-760x570.jpg` | 760x570 JPG, < 2 MB |
| **Media** → Gameplay video (16:9) | `media/gameplay-1280x720.mp4` | H.264 MP4 1280x720, 28 s, < 50 MB |
| **Media** → own 4:3 clip (optional) | `media/gameplay-960x720.mp4` | H.264 MP4 960x720, the same take, < 50 MB |

Screenshots (the same four moments at both sizes, all real gameplay with no menus or title screens):
1. Family House, night 3: sneaking past a grown-up with a flashlight
2. City Apartment, night 4: hiding in a laundry basket while a grown-up walks past
3. Snowy Chalet, night 5: a close call with the flashlight
4. Grand Mansion, night 2: the cookie run

Promos: the main B2 cover art (`submission/covers-v3/B2`) with the game logo. The landscape promo is that cover
as it is; the portrait and card promos are the same B2 scene and logo rendered at 1080x1920 and 760x570.

Video: one continuous, unedited 28 s recording of real play (Snowy Chalet, night 5, played by the game's bot) with
no intro, menus or sound. It shows sneaking past the robot vacuum from the first second, a bonus-cookie grab around
8 s and hiding while Dad walks past with his flashlight around 16 s (all inside Y8's 20 s preview), then the sneak
back to bed. The 960x720 clip is the same seeded take rendered at 4:3, so the action stays in frame.

## Basic Info (ready to paste)

**Game name**
```
Cookie Heist
```

**Short description / tagline**
```
Sneak out of bed, steal the cookies and get back under the covers unseen!
```

**Description** (987 characters)
```
It's the middle of the night and the cookie jar is calling! Sneak out of bed, grab the cookies and get back under the covers before anyone notices.

Tiptoe past Mum's flashlight, dodge Dad's big torch, don't wake Nana Rose, and keep away from Mochi the cat (she meows!) and Dusty the robot vacuum (it beeps!). Hide in laundry baskets, under tables and behind curtains, throw squeaky toys to lure grown-ups away, switch off the lights, find keys and leave pillow decoys - then sneak back into bed before the bed check.

60 hand-made nights in 5 cosy houses: City Apartment, Family House, Grandma's Cottage, Snowy Chalet and Grand Mansion, each with a big finale. Collect every cookie, stay unseen and beat the par time for 3 stars. Getting caught just means "Back to bed!" and another try - free hints show a safe route after 3 fails.

Earn coins for pyjamas, caps and cookie trails, claim daily rewards and complete daily missions. Progress is saved automatically. Plays in 10 languages.
```

**Instructions / Controls**
```
Desktop: WASD or arrow keys to move, hold Shift to run (fast but noisy!), Space to throw a toy, hold the map button for an overview.
Mobile / touch: drag anywhere to move - a small drag tiptoes silently, drag further to run. Tap the toy, then tap the floor to throw it.
Goal: grab the cookies, stay out of the flashlight beams (orange = "Hmm?", red = spotted) and get back to bed. All cookies + never spotted + beat the par time = 3 stars.
```

**Category:** Puzzle (alternatives: Adventure, Stealth if offered)

**Tags**
```
stealth, puzzle, 3d, casual, cute, kids, family, sneaking, cookies, hide and seek, night, html5, mobile
```

**Platforms / devices:** Desktop and mobile (keyboard, mouse and touch). **Orientation:** landscape and portrait (the
game fills any frame). **Suggested size:** 1280x720 (16:9; any size works).

**Languages:** English (default), French, German, Spanish, Italian, Portuguese, Dutch, Polish, Russian, Turkish.

**Multiplayer:** No (single player). **Login:** not required, guests play everything. **In-app purchases:** none.

**AI Declaration:** this one is your call; I can't fill it in from the repository. For reference, `CREDITS.md`
says all art, sound and levels are original and generated in code (procedural 3D, synthesised audio, hand-designed
levels, no third-party or AI image or audio assets). If the code was written with an AI coding assistant, declare that
as the form asks.

## Ads in this build (Y8 SDK)

- The SDK loads only from Y8's CDN (`<script src="https://cdn.y8.com/minimal-sdk/2-0/y8.min.js" async>` in
  `<head>`) and is never bundled. It is initialized exactly as the portal snippet does it: a `y8sdk.ready` listener
  (once) calls `y8.sdk()`, then `init({ appId, autoLogin: true }, { gameId, preloadAdBreaks: 'on', sound: 'on',
  onReady })`, then `onAuth`, and `window.y8.emitReadyEvent()` covers an SDK that loaded first. Guests always play.
- Interstitials: `showAd({ type: 'start' })` on the first Play click, and `showAd({ type: 'next' })` on
  Next / Retry / Menu of a result screen. They never fire automatically or during a level, and the game adds no cap
  of its own (the SDK paces them). A break that shows no ad continues at once.
- The game pauses and mutes in `beforeAd`, and resumes and restores the player's audio settings in `afterAd`.
  `adBreakDone` settles each request; `.catch()` and a timeout also settle it, exactly once, so the game never
  gets stuck.
- Rewarded (`type: 'reward'`): only from the optional, labelled buttons (TV icon + "Ad" + the reward: ×2 coins,
  +1 toy, skip a night after 5 fails). `beforeReward` calls `showAdFn()`, and the reward is granted only in
  `adViewed`. `adDismissed` or no ad means no reward, and the button says "No ad available right now, try later".
- The game also pauses and mutes when the tab is hidden (`visibilitychange`) or the window loses focus (`blur`),
  and resumes when the player comes back.
- No other ad networks, external links or "more games". Saves stay in localStorage (`cookieheist.save.v1`). With
  an ad blocker the game is fully playable and the rewarded buttons are hidden.

## Rebuild

```sh
npm ci
npm run submission:y8        # vite --mode y8 → dist-y8/ → cookie-heist-y8-v2.zip + checks (zip and media)
npm run test:e2e:y8          # Playwright smoke test of dist-y8 with a stubbed Y8 SDK
# media: npx vite --host 127.0.0.1 --port 4174 &  node scripts/y8/media.mjs http://127.0.0.1:4174/
```
