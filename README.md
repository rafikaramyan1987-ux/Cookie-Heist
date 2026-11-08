# Cookie Heist

A cosy 3D stealth-puzzle game for the web (portrait-first, CrazyGames-ready).
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
- EN + FR (auto-detected, switchable). All sounds synthesised (Web Audio), all models procedural.

## Controls

| | Touch | Mouse | Keyboard |
|---|---|---|---|
| Move | drag anywhere (virtual joystick) | drag | WASD / arrows (ZQSD works too) |
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
npm run build          # dist/index.html — single file, no extra requests (~1 MB)
npm run lint && npm run typecheck && npm test
npm run test:e2e       # Playwright smoke tests (desktop + 390×844 portrait)
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
- `src/app/` — app flow, input, Web Audio synth, CrazyGames SDK v3 wrapper, save, i18n, meta (shop/daily/missions)
- `src/levels/` — the 60 levels (see `docs/levels.md`)
- `scripts/playtest/` — headless playtest bot report; `scripts/submission/` — covers, trailers, zip

## CrazyGames integration

SDK v3 is loaded at runtime (with a timeout and an offline fallback): `loadingStart/Stop`, `gameplayStart/Stop`
(paused during menus, pause and ads), `happytime` on house completion, midgame ads only between levels and at most
one every ~2 minutes, optional rewarded ads (×2 coins, +1 toy, skip a night after 3 fails), SDK mute respected,
progress saved through the SDK Data Module with a localStorage fallback.

See `submission/README.md` for the store texts, tags and assets, and `CREDITS.md` for licences.
