# Cookie Heist

A cosy 3D stealth-puzzle game for the web (portrait-first, CrazyGames- and GameDistribution-ready).
A kid in pyjamas sneaks out of bed at night, steals cookies from the kitchen and tiptoes back to bed
without being caught by mum, dad, grandma, the big sibling, the cat or the robot vacuum.
Caught? Mum gasps *“Back to bed!”* and carries you back — child-friendly, no violence (PEGI 3–7).

- 5 houses × 12 nights = **60 hand-designed levels** (20–60 s each), each house with its own look:
  city apartment, family house, grandma's cottage, snowy chalet, grand mansion — with a finale per house.
- Mechanics introduced gradually with animated tips: flashlight vision cones (orange = “Hein ?” at the beam’s edge, in the dark or after a noise; red = “!” spotted → back to bed, no foot race),
  noise (creaky boards, squeaky toys, running), hiding spots, thrown toys as distractions, light switches,
  keys & locked doors, sleeping guards, the meowing cat, the beeping robot vacuum, bed checks & pillow decoys.
  The big sibling stops for a phone break every few seconds (small, dim beam): a readable safe moment.
- Stuck? After 3 fails in a row a free **hint** is offered: a ghost replays a safe route on the intro, then the
  dotted path and “wait here” rings with a countdown pulse **GO** when the safe window opens. After 5 fails the
  night can be skipped (rewarded ad). Hints never affect stars.
- 3 stars per night (all cookies · never spotted · under par time), coins, ×2 coins (rewarded ad), daily reward,
  3 daily missions, house map with progress.
- Shop: **boosts** for coins (extra duck, peek at the grown-ups' routes, hint, pillow decoy — small prices, never
  required) and cosmetics (6 pyjamas, 5 caps, 5 trails) with a rotating 3D Pip to try items on before buying.
- **First visit:** no menu — the loading screen, then straight into night 1 with an in-game tutorial (hand pointer:
  drag to sneak → hide in the basket → mum's flashlight sweeps right past, "Phew!" → grab the cookie → back to bed,
  ~15 s, skippable). The menu shows after night 1 and on later visits.
- **Come back tomorrow:** 7-day reward calendar (growing coins, day 7 = the Golden Moon pyjamas) with a streak, a
  "Midnight Snack" bonus night once a day, 3 daily missions with a progress bar on the menu, and on every end screen
  the next unlock (with a picture) and tomorrow's reward.
- **Juice:** "Phew!" on near misses, cookie sparkle + crunch, comic "Back to bed!" burst, star rain on 3 stars,
  instant one-tap retry.
- 10 languages (EN, FR, DE, IT, ES, PT, NL, PL, TR, RU), one JSON per language in `src/locales/` (CI checks every key);
  picked from the portal locale (CrazyGames SDK / `GamePix.lang()`) or the browser, switchable in Settings, saved.
  All sounds synthesised (Web Audio), all models procedural.

## Controls

| | Touch | Mouse | Keyboard |
|---|---|---|---|
| Move | drag anywhere (virtual joystick) | drag | WASD / arrows (physical keys: ZQSD on AZERTY) |
| Tiptoe (silent) | drag (default) | drag (default) | default |
| Run (fast, noisy) | drag to the outer ring and hold, or double-tap & hold | same | hold Shift |
| Throw a toy | tap the duck, then tap the floor | click duck, click floor | Space (throws ahead) |
| Overview map | tap (or hold) the map button | same | — |
| Peek (boost) | binoculars button | same | — |
| Pause | ⏸ button | ⏸ button | ⏸ button |

## Development

```bash
npm install
npm run dev            # http://localhost:5173  (?level=0-0 jumps to a night, ?autoplay=good lets the bot play)
npm run build          # CrazyGames build: dist/ — index.html (loading screen inline) + lazily loaded chunks
npm run build:gd       # GameDistribution build: dist-gd/index.html (no CrazyGames code)
npm run build:web      # portal-free build: dist-web/index.html
npm run build:gamepix  # GamePix build: dist-gamepix/index.html (GamePix SDK only); zip: npm run submission:gamepix
npm run lint && npm run typecheck && npm test   # (+ npm run check:locales)
npm run perf           # load time on a throttled mid-range phone (4G, 4x CPU): first frame, playable, bytes
npm run test:e2e       # Playwright smoke tests (desktop + 390×844 portrait), CrazyGames build
npm run test:e2e:gd    # Playwright smoke tests of the GD build with a mocked gdsdk
npm run test:e2e:crash # zero errors in the CrazyGames build: Chromium / WebKit / Firefox, desktop + phone (Firefox: xvfb-run on Linux); see docs/crash-investigation.md
npm run playtest       # bot plays all 60 levels (strict audit) → docs/playtest.md
npm run check:audit    # static level audit: no parked guards, safe starts, every patrol cycle opens a path
npm run check:levels   # static reachability checks
```

Art-test views are still available: `?view=title|lineup|level|hud|houses|cover`.

## Tech

Vite + TypeScript + three.js. Toon shading with a soft ramp and moonlit rim light, a cut-away “toy diorama”
house builder (half-height two-tone walls, cut caps, skirting, AO strips, moonlight shafts) driven by level data,
static meshes merged per material, one shadow-casting light, DPR capped at 2, half-res bloom.

- `src/game/` — deterministic game logic (level parser, world sim, guards, vision/LOS on the grid, noise, A*, bot)
- `src/game3d/` — 3D presentation of a running world + gameplay camera (follow + look-ahead + overview)
- `src/render/` — toon materials, procedural characters/props/textures, house builder, vision cones, effects
- `src/app/` — app flow, input, Web Audio synth, save, i18n, meta (shop/daily/missions)
- `src/app/platform/` — portal layer: one `Platform` interface, CrazyGames / GameDistribution / GamePix / plain-web implementations
- `src/levels/` — the 60 levels (see `docs/levels.md`); houses 2–5 and the midnight-snack nights are a lazy chunk
- `src/locales/` — UI strings, one JSON per language
- `scripts/playtest/` — headless playtest bot report; `scripts/submission/` — covers, trailers, zip

## Loading

`index.html` paints a plain HTML/CSS loading screen (logo, progress bar, a tip in the player's language) before any
script runs. The CrazyGames / web builds are split: the game + night 1 load first; three.js is its own chunk
(preloaded in parallel); the other houses, the 3D menu scene, the shop renderer, music + extra sounds and the other
languages stream in afterwards. GameDistribution / GamePix keep a single inlined `index.html`.
`npm run perf` measures it (see the v3 PR for the before / after numbers).

## Platforms

The portal is chosen at build time (`VITE_PLATFORM=crazygames|gd|web`, or `vite build --mode gd|web`; default
CrazyGames). `src/app/sdk.ts` picks the implementation from a compile-time constant, so each build contains only its
own SDK code: the GD build never includes or loads the CrazyGames SDK and vice versa.

## CrazyGames integration

SDK v3 is loaded at runtime (with a timeout and an offline fallback): `loadingStart/Stop`, `gameplayStart/Stop`
(paused during menus, pause and ads), `happytime` on house completion, midgame ads only between levels and at most
one every ~2 minutes, optional rewarded ads (×2 coins, +1 toy, skip a night after 3 fails), SDK mute respected,
progress saved through the SDK Data Module with a localStorage fallback (one key, `cookieheist.save.v1`). Rewarded
ads only from buttons with a TV icon + "Ad" label, paid only when the ad really completed; without an SDK no ad
buttons are shown.

## GameDistribution integration

`window.GD_OPTIONS = { gameId, onEvent }` and the GD HTML5 SDK script (`gamedistribution-jssdk`) are loaded once while
the game boots. `SDK_GAME_PAUSE` pauses the game and mutes all audio, `SDK_GAME_START` resumes it (sound / music
settings respected). Interstitials only after a click and outside gameplay: Play on the title (pre-roll) and
Next / Retry / Menu on the result screens, at most one every ~2 minutes. Rewarded ads (×2 coins, +1 toy, skip) pay
only after `SDK_REWARDED_WATCH_COMPLETE`; every ad settles once (completion, error / cancel, or not started in 8 s).
Saves use localStorage (in-memory fallback). Without the SDK the game plays on without ads.

See `submission/README.md` (CrazyGames) and `submission-gd/README.md` (GameDistribution), `submission-gamepix/README.md` (GamePix) for the store texts, tags and assets, and `CREDITS.md` for licences.
