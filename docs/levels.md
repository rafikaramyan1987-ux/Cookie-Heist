# Level format

Levels are hand-designed in `src/levels/houses/*.ts`. Each house has a few **floorplans** (`Plan`) shared by its
12 nights; each night (`night(plan, {...})`) adds cookies, items and guards. Everything is plain data, parsed by
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

Run `npm run check:levels` for static reachability checks and `npm run playtest` for the bot report.
