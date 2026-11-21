# Level format

Levels live in `src/levels/houses/*.ts`: houses 1–5 have 12 nights each, houses 6–8 (v3.4: Farmhouse, Beach House,
Royal Castle) 10 nights each (`NIGHTS` in `src/levels/index.ts`; the last night of a house is its finale). In
houses 1–5 each house has a few **floorplans** (`Plan`) shared by its 12 nights; every v3.4 night has its own
floorplan; each night (`night(plan, {...})`) adds cookies, items and guards. Everything is plain data, parsed by
`src/game/level.ts` into the runtime `Level` used by the game, the renderer, the playtest bot and the tests.

## Floorplan

```ts
const A1: Plan = {
  map: ['KKKLLLL', ...],   // one letter per cell = room ('.' = outside)
  obj: ['CNO  VP', ...],   // furniture per cell (same size)
  doors: '3,1w 4,4n',      // edges between rooms: "x,z" + side n/s/e/w (suffix L = locked)
  windows: '4,0n 0,1w',
};
```

Walls are generated automatically between different rooms. Room letters pick the floor/wallpaper style per
house (K kitchen, H hall, B kid's bedroom, P parents, L living, A bath, T teen, G grandma, D dining, O study,
C laundry, E entrance, M ballroom, Y library).

## Objects

| Char | Meaning | | Char | Meaning |
|---|---|---|---|---|
| `c` | cookie (floor) | | `j` | cookie jar on a counter (pick up from next to it) |
| `b` | kid's bed (2 cells) | | `@` | start cell (default: next to the bed) |
| `~` | creaky board | | `t` | squeaky toy on the floor |
| `k` | key (opens a locked door) | | `s` | light switch (turns the room's lights off) |
| `p` | pillow decoy (cancels the bed check) | | `x` | extra toy to throw |
| `T` | table — hide under | | `W` | wardrobe — hide inside |
| `Q` | laundry basket — hide inside | | `U` | curtain — hide behind |
| `C N O F` | counter, sink, stove, fridge | | `R d n l` | bookshelf, dresser, nightstand, side table (lamps) |
| `S A V E` | sofa, armchair, TV, fireplace | | `Z h P r` | double bed, chair, plant, rug |
| `K I J M` | clock, pillar, piano, armour | | `X Y G q e i o` | toy box, bathtub, rocking chair, candelabra, bench, skis, boots |
| `g` | golden bonus cookie (optional) | | `m` | motion-sensor lamp (v3.4; its room must be dark) |

Tall furniture (fridge, wardrobe, bookshelf, clock, pillar, armour) blocks line of sight.

## Night options

```ts
night(A1, {
  name: ['Pacing Mum', 'Maman fait les cent pas'],
  put: 'j 0,0; c 1,2; ~ 4,3',         // object overrides on top of the plan
  doors: '1,4n 4,1wL',                 // extra / locked doors
  guards: [{ k: 'mum', p: '6,1 6,2', w: 2.5, speed: 0.5, look: [0] }],
  par: 22, toys: 1, tip: 'cookies', dark: 'H', bedCheck: 40, boost: 1.3,
});
```

Guards: `k` kind (mum, dad, grandma, teen, cat, vacuum), `p` patrol points (ping-pong; first = last makes a loop),
`w` wait at each point, `look` angles while waiting (deg, 0 = east, 90 = south), `sleep`, `speed`, `delay`.

### v3.4 mechanics

- **Light sleeper** — `{ k: 'grandma', p: '9,6', sleep: true, doze: [asleep, awake, firstWake] }`: sleeps (no beam),
  then sits up on her bed and looks around for `awake` seconds (beam on), then sleeps again, on a fixed rhythm. Noise
  still wakes her as any sleeper. She never "camps" next to a hidden kid.
- **Alarm clock** — `{ k: 'mum', p: 'bed x,z  a,b  c,d', sleep: true, wakeAt: 30 }`: asleep on the first point until
  `wakeAt` seconds into the night, then gets up ("Ring ring!") and patrols the other points for the rest of the
  night. Woken early by a noise, she checks it and goes back to bed until the alarm.
- **Motion-sensor lamp** — object `m` in a dark room (`dark: 'L'`): moving within 1.6 cells of it (same room) lights
  the room for 4 s after the last movement (no 60 % "dark" vision bonus, no "edge only" sightings); a dashed ring on
  the floor shows its reach.

Each mechanic has a first-time tip (`doze`, `alarm`, `motion`). The v3.4 nights were generated with
`scripts/levels/gen.ts`, tuned with `scripts/levels/tune.ts` (only candidates that pass the strict playtest audit) and
frozen with `scripts/levels/freeze.ts`; see `docs/levels-v34.md`.

Run `npm run check:levels` for static reachability checks, `npm run playtest` for the bot report and
`npx tsx scripts/playtest/solve.ts --md docs/solver.md` for the solver report (a recorded winning run per level).
