# Cookie Heist (working title)

A cosy 3D stealth-puzzle web game: a kid in pyjamas sneaks out of bed at night, steals cookies
from the kitchen and tiptoes back to bed without being caught by mum, dad, grandma, the teen
sibling, the cat or the robot vacuum. Built with Vite + TypeScript + three.js, single-file build.

## Status: Step 1 — art test

The current build is the **art approval test** (no gameplay yet):

| URL | Shows |
| --- | --- |
| `?view=title` | Title screen (3D scene + menu) |
| `?view=lineup` | Character line-up (3 pyjama skins, mum, dad, grandma, teen, cat, robot vacuum) |
| `?view=level` | One full level (bedroom + hallway + kitchen + parents' room) with intro card |
| `?view=hud` | Same level, gameplay camera + in-game HUD |
| `?view=houses` | Corner previews of the 5 houses |

Add `&t=6` to freeze time (used for screenshots).

```bash
npm install
npm run dev          # http://localhost:5173/?view=level
npm run build        # dist/index.html (single file)
npm run shots        # renders docs/screenshots/* (needs the dev server running)
```
