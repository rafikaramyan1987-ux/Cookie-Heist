# The v3.4 nights (houses 6–8)

30 new nights after the 60 of v3.3: the **Farmhouse**, the **Beach House** and the **Royal Castle**, 10 nights each, every
one on its own floorplan (`tests/unit/levels-v34.test.ts` checks that no floorplan repeats, rotates or mirrors another
night's, old or new). They were built with the level generator (`scripts/levels/gen.ts`: a hall spine, rooms and
doors, furniture placed by room type, from the game's existing rooms and props only), kept only when they passed the
strict playtest audit (`scripts/levels/tune.ts`), and frozen as plain data (`scripts/levels/freeze.ts`).

**Rising difficulty.** Each night is a little longer and harder than the one before (checked by the tests):
- *par* (the 3rd-star time) rises by one second every night, from 76 s (the mansion finale's is 75 s) to 105 s
- the *difficulty score* (`src/game/difficulty.ts`) rises strictly: the shortest route start → required cookies (and keys)
  → bed, in cells, plus the pressure on it — awake grown-ups 8 each, sleepers 5, pets 4, a bed check 6, a locked
  door 3, a dark room 2, a motion lamp 3. The mansion finale scores 59.

**New mechanics** (all three are introduced with a first-time tip and come back in later nights and houses):
- **Light sleeper** — sleeps, then sits up on her bed and looks around for a couple of seconds, then sleeps again, on a
  fixed rhythm. Sneak past while she snores.
- **Motion-sensor lamp** — in a dark room; moving inside its dashed ring lights the room for 4 s, so grown-ups see you
  at full range there.
- **Alarm clock** — a grown-up asleep in bed gets up at a set time ("Ring ring!") and patrols for the rest of the night.

| # | Night | Name | Floor | Grown-ups / pets | Mechanics | Par | Route | Score | Avg bot win | Good bot win | Avg time | Hint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 61 | farmhouse-1 | Light Sleeper | 10×12 | dad, mum, grandma (light sleeper) | light sleeper *(tip)* | 76 s | 39 | 60 | 67% | 88% | 73 s | 100% |
| 62 | farmhouse-2 | Hay Bale Hush | 10×12 | grandma, grandma (light sleeper), cat | light sleeper | 77 s | 44 | 61 | 96% | 100% | 33 s | 100% |
| 63 | farmhouse-3 | Barn Door Creep | 10×12 | mum, grandma (light sleeper), vacuum | light sleeper | 78 s | 45 | 62 | 88% | 54% | 41 s | 100% |
| 64 | farmhouse-4 | Pantry Raid | 10×12 | mum, grandma (light sleeper), vacuum | light sleeper | 79 s | 46 | 63 | 83% | 67% | 42 s | 100% |
| 65 | farmhouse-5 | Milk and Cookies | 11×12 | grandma, grandma (light sleeper), cat | light sleeper | 80 s | 47 | 64 | 88% | 100% | 52 s | 100% |
| 66 | farmhouse-6 | Muddy Boots | 11×12 | grandma, mum (light sleeper) | light sleeper | 81 s | 52 | 65 | 83% | 83% | 57 s | 100% |
| 67 | farmhouse-7 | Harvest Moon | 11×11 | mum, dad (light sleeper), cat | light sleeper | 82 s | 49 | 66 | 75% | 92% | 72 s | 100% |
| 68 | farmhouse-8 | Henhouse Shuffle | 11×12 | mum, grandma (light sleeper), cat | light sleeper | 83 s | 50 | 67 | 50% | 13% | 46 s | 100% |
| 69 | farmhouse-9 | Lamplight Barn | 11×11 | mum, mum, grandma (light sleeper) | light sleeper | 84 s | 48 | 69 | 79% | 88% | 54 s | 100% |
| 70 | farmhouse-10 (finale) | Haystack Finale | 12×13 | mum, mum, mum (light sleeper) | light sleeper, 1 motion lamp *(tip)* | 85 s | 44 | 70 | 83% | 100% | 48 s | 100% |
| 71 | beachhouse-1 | Sandy Toes | 12×12 | mum, mum, mum (light sleeper), cat | light sleeper, 1 motion lamp | 86 s | 41 | 71 | 75% | 50% | 56 s | 67% |
| 72 | beachhouse-2 | Seashell Sneak | 12×13 | sibling, dad, dad (light sleeper), vacuum | light sleeper, 1 motion lamp | 87 s | 42 | 72 | 21% | 33% | 61 s | 100% |
| 73 | beachhouse-3 | Low Tide | 11×13 | mum, mum, mum (light sleeper), vacuum | light sleeper, 1 motion lamp | 88 s | 44 | 74 | 50% | 100% | 45 s | 100% |
| 74 | beachhouse-4 | Lighthouse Beam | 12×14 | mum, sibling, mum, dad (light sleeper) | light sleeper, 1 motion lamp | 89 s | 41 | 75 | 83% | 100% | 38 s | 100% |
| 75 | beachhouse-5 | Salty Breeze | 12×13 | mum, sibling, dad (light sleeper), cat | light sleeper, 1 motion lamp | 90 s | 46 | 76 | 92% | 100% | 44 s | 100% |
| 76 | beachhouse-6 | Boardwalk Tiptoe | 12×13 | mum, mum, dad, dad (light sleeper), vacuum | light sleeper, 1 motion lamp | 91 s | 40 | 78 | 38% | 71% | 53 s | 100% |
| 77 | beachhouse-7 | Message in a Bottle | 11×13 | mum, dad, dad (light sleeper), cat | light sleeper, 1 motion lamp | 92 s | 49 | 79 | 96% | 38% | 38 s | 100% |
| 78 | beachhouse-8 | Sandcastle Shuffle | 12×13 | mum, dad, sibling, dad (light sleeper), cat | light sleeper, 1 motion lamp | 93 s | 43 | 81 | 88% | 25% | 36 s | 100% |
| 79 | beachhouse-9 | Moonlit Waves | 12×13 | mum, dad, mum, dad (light sleeper), cat | light sleeper, 1 motion lamp | 94 s | 45 | 83 | 100% | 88% | 39 s | 100% |
| 80 | beachhouse-10 (finale) | Bonfire Finale | 13×14 | mum, dad, mum, cat, mum (alarm 31 s) | 1 motion lamp, alarm clock, bed check 88 s *(tip)* | 95 s | 40 | 84 | 58% | 13% | 73 s | 100% |
| 81 | castle-1 | Drawbridge Down | 13×14 | mum, sibling, dad, dad (light sleeper), grandma (light sleeper), vacuum | light sleeper, 2 motion lamps | 96 s | 37 | 85 | 42% | 25% | 44 s | 100% |
| 82 | castle-2 | Knight Watch | 13×14 | dad, mum, mum (light sleeper), cat, mum (alarm 25 s) | light sleeper, 2 motion lamps, alarm clock | 97 s | 46 | 86 | 71% | 100% | 63 s | 100% |
| 83 | castle-3 | Throne Room Tiptoe | 13×14 | mum, sibling, grandma, grandma (light sleeper), mum (alarm 28 s) | light sleeper, 2 motion lamps, alarm clock | 98 s | 46 | 90 | 88% | 100% | 52 s | 100% |
| 84 | castle-4 | Tower Stairs | 13×13 | mum, sibling, grandma, mum (light sleeper), cat, mum (alarm 25 s) | light sleeper, 2 motion lamps, alarm clock | 99 s | 47 | 95 | 83% | 100% | 37 s | 100% |
| 85 | castle-5 | Royal Banquet | 12×13 | dad, sibling, grandma, mum (light sleeper), grandma (light sleeper), cat | light sleeper, 2 motion lamps | 100 s | 48 | 96 | 88% | 67% | 63 s | 100% |
| 86 | castle-6 | Secret Passage | 13×14 | mum, dad, sibling, mum (light sleeper), grandma (light sleeper), vacuum | light sleeper, 2 motion lamps, locked door + key | 101 s | 46 | 97 | 25% | 88% | 89 s | 100% |
| 87 | castle-7 | Dragon's Hoard | 12×14 | grandma, dad, sibling, grandma (light sleeper), mum (light sleeper), cat | light sleeper, 2 motion lamps, bed check 95 s, locked door + key | 102 s | 43 | 100 | 63% | 92% | 68 s | 100% |
| 88 | castle-8 | Armour Echo | 13×14 | sibling, mum, grandma, grandma (light sleeper), vacuum, dad (alarm 18 s) | light sleeper, 2 motion lamps, alarm clock, bed check 90 s, locked door + key | 103 s | 44 | 101 | 63% | 92% | 60 s | 100% |
| 89 | castle-9 | Crown Jewels | 13×14 | mum, sibling, mum (light sleeper), grandma (light sleeper), cat | light sleeper, 2 motion lamps | 104 s | 63 | 103 | 63% | 75% | 88 s | 100% |
| 90 | castle-10 (finale) | Royal Finale | 12×13 | grandma, mum, sibling, grandma (light sleeper), vacuum, dad (alarm 28 s) | light sleeper, 2 motion lamps, alarm clock, locked door + key | 105 s | 54 | 105 | 75% | 21% | 63 s | 100% |

The playtest columns come from `npx tsx scripts/playtest/run.ts --house 5|6|7 --runs 24 --strict` (24 runs per profile on the real game logic); every night passes the strict audit (solvable, hint works, safe start, every patrol opens a path, readable crossings, no camping, no escape after "!", cookies visible). The solver report for all 90 levels is in `docs/solver.md`.
