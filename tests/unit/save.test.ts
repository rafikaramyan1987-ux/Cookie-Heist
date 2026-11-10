import { describe, it, expect } from 'vitest';
import { defaultSave, parseSave, loadSave, saveNow, Storage } from '../../src/app/save';
import { claimDaily, dailyAvailable, ensureMissions, progressMission, claimMission, buy, SHOP, nextDaily, currentStreak, DAILY, DAILY_SKIN, nextUnlock, snackAvailable, snackIndex, today } from '../../src/app/meta';

class Mem implements Storage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('save / load', () => {
  it('round-trips through storage', () => {
    const st = new Mem();
    const s = defaultSave();
    s.coins = 321;
    s.stars['apartment-1'] = 3;
    s.skin = 'dino';
    saveNow(s, st);
    const back = loadSave(st);
    expect(back.coins).toBe(321);
    expect(back.stars['apartment-1']).toBe(3);
    expect(back.skin).toBe('dino');
  });
  it('falls back to defaults on missing or corrupted data', () => {
    expect(parseSave(null).coins).toBe(0);
    expect(parseSave('{not json').coins).toBe(0);
    expect(parseSave('{"v":99}').v).toBe(1);
  });
  it('keeps default items owned and sanitises coins', () => {
    const s = parseSave(JSON.stringify({ v: 1, coins: -5, owned: ['skin:dino'] }));
    expect(s.coins).toBe(0);
    expect(s.owned).toContain('skin:starry');
    expect(s.owned).toContain('skin:dino');
  });
});

describe('meta', () => {
  it('daily reward calendar: 7 growing days, streak, broken streak restarts at day 1', () => {
    const s = defaultSave();
    const d1 = new Date(2026, 0, 1);
    const d2 = new Date(2026, 0, 2);
    expect(claimDaily(s, d1)?.coins).toBe(50);
    expect(dailyAvailable(s, d1)).toBe(false);
    expect(claimDaily(s, d1)).toBeNull();
    // tomorrow's preview on the end screens
    expect(nextDaily(s, d1)).toMatchObject({ day: 2, coins: 75, today: false });
    expect(claimDaily(s, d2)?.coins).toBe(75);
    expect(s.daily.streak).toBe(2);
    expect(currentStreak(s, new Date(2026, 0, 3))).toBe(2);
    expect(currentStreak(s, new Date(2026, 0, 5))).toBe(0);
    expect(claimDaily(s, new Date(2026, 0, 5))?.coins).toBe(50); // streak broken
    expect(s.daily.streak).toBe(1);
  });
  it('day 7 is the Golden Moon pyjama (owned + equipped), coins once it is owned; the week repeats', () => {
    const s = defaultSave();
    const coins: number[] = [];
    for (let d = 1; d <= 6; d++) coins.push(claimDaily(s, new Date(2026, 1, d))!.coins);
    expect(coins).toEqual(DAILY.slice(0, 6));
    expect(nextDaily(s, new Date(2026, 1, 6))).toMatchObject({ day: 7, skin: DAILY_SKIN });
    const r7 = claimDaily(s, new Date(2026, 1, 7))!;
    expect(r7.skin).toBe(DAILY_SKIN);
    expect(s.owned).toContain(DAILY_SKIN);
    expect(s.skin).toBe('moon');
    expect(claimDaily(s, new Date(2026, 1, 8))).toMatchObject({ day: 1, coins: 50 });
    for (let d = 9; d <= 13; d++) claimDaily(s, new Date(2026, 1, d));
    expect(claimDaily(s, new Date(2026, 1, 14))).toMatchObject({ day: 7, coins: DAILY[6] });
  });
  it('next-unlock teaser: nights left before the next house, then the next pyjama', () => {
    const s = defaultSave();
    const done = new Set<string>();
    const isDone = (h: number, i: number) => done.has(`${h}-${i}`);
    expect(nextUnlock(s, isDone, 5, 12)).toEqual({ kind: 'house', house: 1, n: 12 });
    for (let i = 0; i < 10; i++) done.add(`0-${i}`);
    expect(nextUnlock(s, isDone, 5, 12)).toEqual({ kind: 'house', house: 1, n: 2 });
    for (let h = 0; h < 5; h++) for (let i = 0; i < 12; i++) done.add(`${h}-${i}`);
    s.coins = 100;
    expect(nextUnlock(s, isDone, 5, 12)).toEqual({ kind: 'skin', key: 'candy', n: 50 });
  });
  it('midnight snack: once a day, after the tutorial; variants rotate', () => {
    const s = defaultSave();
    const d = new Date(2026, 3, 1);
    expect(snackAvailable(s, d)).toBe(false);
    s.tutorialDone = true;
    expect(snackAvailable(s, d)).toBe(true);
    s.snack = today(d);
    expect(snackAvailable(s, d)).toBe(false);
    expect(snackAvailable(s, new Date(2026, 3, 2))).toBe(true);
    expect(new Set([1, 2, 3].map((k) => snackIndex(new Date(2026, 3, k)))).size).toBe(3);
  });
  it('old saves: players who already won a night skip the tutorial; unknown languages are dropped', () => {
    const s = parseSave(JSON.stringify({ v: 1, stars: { 'apartment-1': 2 }, lang: 'xx' }));
    expect(s.tutorialDone).toBe(true);
    expect(s.lang).toBeNull();
    expect(parseSave(JSON.stringify({ v: 1, lang: 'de' })).tutorialDone).toBe(false);
  });
  it('three daily missions with progress and rewards', () => {
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
  it('shop: buy only with enough coins', () => {
    const s = defaultSave();
    const item = SHOP.find((i) => i.id === 'skin:candy')!;
    expect(buy(s, item)).toBe(false);
    s.coins = 1000;
    expect(buy(s, item)).toBe(true);
    expect(s.skin).toBe('candy');
    expect(s.coins).toBe(1000 - item.price);
  });
});
