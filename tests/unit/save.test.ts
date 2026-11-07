import { describe, it, expect } from "vitest";
import {
  defaultSave,
  parseSave,
  loadSave,
  saveNow,
  Storage,
} from "../../src/app/save";
import {
  claimDaily,
  dailyAvailable,
  ensureMissions,
  progressMission,
  claimMission,
  buy,
  SHOP,
} from "../../src/app/meta";

class Mem implements Storage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe("save / load", () => {
  it("round-trips through storage", () => {
    const st = new Mem();
    const s = defaultSave();
    s.coins = 321;
    s.stars["apartment-1"] = 3;
    s.skin = "dino";
    saveNow(s, st);
    const back = loadSave(st);
    expect(back.coins).toBe(321);
    expect(back.stars["apartment-1"]).toBe(3);
    expect(back.skin).toBe("dino");
  });
  it("falls back to defaults on missing or corrupted data", () => {
    expect(parseSave(null).coins).toBe(0);
    expect(parseSave("{not json").coins).toBe(0);
    expect(parseSave('{"v":99}').v).toBe(1);
  });
  it("keeps default items owned and sanitises coins", () => {
    const s = parseSave(
      JSON.stringify({ v: 1, coins: -5, owned: ["skin:dino"] }),
    );
    expect(s.coins).toBe(0);
    expect(s.owned).toContain("skin:starry");
    expect(s.owned).toContain("skin:dino");
  });
});

describe("meta", () => {
  it("daily reward streak", () => {
    const s = defaultSave();
    const d1 = new Date(2026, 0, 1);
    const d2 = new Date(2026, 0, 2);
    expect(claimDaily(s, d1)).toBe(50);
    expect(dailyAvailable(s, d1)).toBe(false);
    expect(claimDaily(s, d1)).toBe(0);
    expect(claimDaily(s, d2)).toBe(75);
    expect(s.daily.streak).toBe(2);
    expect(claimDaily(s, new Date(2026, 0, 5))).toBe(50); // streak broken
  });
  it("three daily missions with progress and rewards", () => {
    const s = defaultSave();
    ensureMissions(s, new Date(2026, 2, 3));
    expect(s.missions.list).toHaveLength(3);
    const m = s.missions.list[0];
    progressMission(s, m.id as never, 999);
    expect(m.progress).toBe(m.n);
    const before = s.coins;
    expect(claimMission(s, 0)).toBe(m.reward);
    expect(s.coins).toBe(before + m.reward);
    expect(claimMission(s, 0)).toBe(0);
  });
  it("shop: buy only with enough coins", () => {
    const s = defaultSave();
    const item = SHOP.find((i) => i.id === "skin:candy")!;
    expect(buy(s, item)).toBe(false);
    s.coins = 1000;
    expect(buy(s, item)).toBe(true);
    expect(s.skin).toBe("candy");
    expect(s.coins).toBe(1000 - item.price);
  });
});
