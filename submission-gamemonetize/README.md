# Cookie Heist — GameMonetize submission

- **Game ID:** `p4y3j0gzsj1efndrh21up9ji7ykxjyo8`
- **Upload:** `cookie-heist-gamemonetize-v2.zip` (Crash fixes (v3.3 of the game): lazy downloads retried, nothing uncaught when a download, WebGL or storage fails, GPU memory freed between nights (docs/crash-investigation.md); `cookie-heist-gamemonetize-v1.zip` = previous build): `index.html` and `assets/` at the zip root, relative paths only
  (Game Management > My games > select the game > drop the file; then "Verify Game" and "REQUEST ACTIVATION").
- **Images:** `cookie-heist-512x384.jpg`, `cookie-heist-512x512.jpg`, `cookie-heist-512x340.jpg` — the B2 cover
  scene (submission/covers-v3/B2) re-rendered without the title logo: no text, no logo, each under 300 KB.

## Form fields (ready to paste)

**Name**

```
Cookie Heist
```

**Category** (pick 2–3): Puzzles, 3D, Adventure

**Tags**

```
stealth, puzzle, 3d, casual, cute, kids, family, sneaking, cookies, hide and seek, night, mobile, html5
```

**Width / Height:** `1280` x `720` (landscape 16:9; the game fills any frame size, landscape or portrait)

**Optimized for Mobile Devices:** Yes (touch controls; landscape and portrait)

**Description** (880 characters)

```
Sneak out of bed, steal the cookies and get back under the covers before anyone notices! Cookie Heist is a cosy 3D stealth puzzle game. Tiptoe past Mum's flashlight, dodge Dad's torch, don't wake Nana Rose, and keep away from Mochi the cat and Dusty the robot vacuum. Hide in laundry baskets and behind curtains, throw squeaky toys to lure grown-ups away, flip light switches, find keys and use pillow decoys.

Modes: Story with 60 hand-made nights in 5 houses (City Apartment, Family House, Grandma's Cottage, Snowy Chalet, Grand Mansion), each with a finale; replay any night for 3 stars; daily rewards and missions. Shop with pyjamas and boosts. 10 languages.

Desktop controls: WASD / arrow keys to move, hold Shift to run (noisy!), Space to throw a toy.
Mobile controls: drag anywhere to move (small drag tiptoes, long drag runs), tap the toy, then tap the floor to throw it.
```

## Ads in this build (GameMonetize SDK)

- `window.SDK_OPTIONS = { gameId, onEvent }` is set, then `https://api.gamemonetize.com/sdk.js` is inserted once
  while the game boots (`<script id="gamemonetize-sdk">` before the first script, as the SDK README's loader does),
  never from a click. If it fails to load, the game plays on without ads.
- `SDK_GAME_PAUSE`: the game pauses and all audio is muted. `SDK_GAME_START`: the game resumes and audio comes back
  through the player's own sound / music settings. `SDK_READY`: interstitials can be shown.
- Interstitials (`sdk.showBanner()`) only after a click and never during a level: Play on the title screen and
  Next / Retry / Menu on the result screens, at most one every ~2 minutes, never on a timer. Every request settles
  once (`SDK_GAME_START`, an error, or not started within 8 s), so the game cannot get stuck.
- **No rewarded ads:** the GameMonetize SDK documents no rewarded API or completion event, so this build has no
  "watch an ad" buttons (×2 coins, +1 toy and skip-night are hidden).
- No "More games" buttons, no external links, no iframes. Saves stay in localStorage (`cookieheist.save.v1`).

## Rebuild

```sh
npm ci
npm run submission:gamemonetize      # build (vite --mode gamemonetize → dist-gamemonetize/) + zip + checks
npm run test:e2e:gamemonetize        # Playwright smoke test of dist-gamemonetize with a stubbed SDK
# images (B2 cover scene without the logo): npx vite --port 4174 & node scripts/gamemonetize/images.mjs http://127.0.0.1:4174/
```
