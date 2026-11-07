import { describe, it, expect } from "vitest";
import { World } from "../../src/game/world";
import { testLevel } from "./helpers";

const still = { mx: 0, mz: 0 };

describe("hiding", () => {
  it("a hidden kid is never seen nor caught, even when a guard walks right past", () => {
    // mum patrols the hallway back and forth, right next to the laundry basket at (3,4)
    const L = testLevel([{ k: "mum", p: "0,4 6,3", w: 0.5, speed: 1.2 }]);
    const w = new World(L, { seed: 1 });
    w.player.x = 3.5;
    w.player.z = 4.5;
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(w.player.hidden).toBe(true);
    let closest = 99;
    for (let i = 0; i < 60 * 40; i++) {
      w.step(1 / 60, still);
      const g = w.guards[0];
      closest = Math.min(
        closest,
        Math.hypot(g.x - w.player.x, g.z - w.player.z),
      );
      expect(w.player.hidden).toBe(true);
      expect(w.canSee(g, w.player).sees).toBe(false);
    }
    expect(closest).toBeLessThan(1.1); // she really did walk by
    expect(w.status).toBe("play");
    expect(w.stats.spotted).toBe(0);
  });

  it("a guard staring right at the hiding spot never spots a hidden kid", () => {
    const L = testLevel([{ k: "mum", p: "1,4", face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    w.player.x = 3.5;
    w.player.z = 4.5;
    w.player.hidden = true;
    w.player.stillT = 1;
    for (let i = 0; i < 60 * 10; i++) w.step(1 / 60, still);
    expect(w.status).toBe("play");
    expect(w.stats.spotted).toBe(0);
  });

  it('"hidden" is never set once the kid has been spotted (no hiding in plain sight)', () => {
    const L = testLevel([{ k: "mum", p: "0,4", face: 0, look: [0] }]);
    const w = new World(L, { seed: 1 });
    // in plain sight in the hallway
    w.player.x = 2.5;
    w.player.z = 4.5;
    let spotted = false;
    for (let i = 0; i < 120 && w.status === "play"; i++) {
      w.step(1 / 60, still);
      if (!spotted && w.spotted) {
        spotted = true;
        // even dropping right onto the laundry basket does not help any more
        w.player.x = 3.5;
      }
      if (spotted) expect(w.player.hidden).toBe(false);
    }
    expect(spotted).toBe(true);
    expect(w.status).toBe("caught");
  });
});
