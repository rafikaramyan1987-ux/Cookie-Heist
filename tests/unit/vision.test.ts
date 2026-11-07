import { describe, it, expect } from "vitest";
import { World } from "../../src/game/world";
import { los, rayDist } from "../../src/game/grid";
import { testLevel } from "./helpers";

describe("vision cone", () => {
  const L = testLevel([{ k: "mum", p: "3,4", face: 0 }]);
  const make = () => new World(L, { seed: 1 });

  it("sees the kid in front, inside range", () => {
    const w = make();
    const g = w.guards[0];
    expect(w.canSee(g, { x: g.x + 2, z: g.z }).sees).toBe(true);
  });
  it("does not see behind or outside the cone angle", () => {
    const w = make();
    const g = w.guards[0];
    expect(w.canSee(g, { x: g.x - 2, z: g.z }).sees).toBe(false);
    expect(w.canSee(g, { x: g.x + 0.6, z: g.z + 2.5 }).sees).toBe(false);
  });
  it("does not see beyond its range", () => {
    const w = make();
    const g = w.guards[0];
    expect(w.canSee(g, { x: g.x + g.cfg.range + 1, z: g.z }).sees).toBe(false);
  });
  it("walls block line of sight, open doors do not", () => {
    const w = make();
    // hallway (3,4) to kitchen (3,1): wall between rows 2 and 3 at x=3
    expect(los(L, w.E, { x: 3.5, z: 4.5 }, { x: 3.5, z: 1.5 })).toBe(false);
    // through the door at x=1
    expect(los(L, w.E, { x: 1.5, z: 4.5 }, { x: 1.5, z: 1.5 })).toBe(true);
    expect(rayDist(L, w.E, 3.5, 4.5, 0, -1, 10)).toBeCloseTo(1.5, 5);
  });
  it("dark rooms shrink the effective range", () => {
    const w = make();
    const g = w.guards[0];
    const p = { x: g.x + 3.2, z: g.z };
    expect(w.canSee(g, p).sees).toBe(true);
    w.roomDark[L.room[Math.floor(p.z) * L.w + Math.floor(p.x)]] = true;
    expect(w.canSee(g, p).sees).toBe(false);
  });
  it("a hidden kid is invisible", () => {
    const w = make();
    const g = w.guards[0];
    w.player.x = g.x + 1.5;
    w.player.z = g.z;
    expect(w.canSee(g, w.player).sees).toBe(true);
    w.player.hidden = true;
    expect(w.canSee(g, w.player).sees).toBe(false);
  });
});
