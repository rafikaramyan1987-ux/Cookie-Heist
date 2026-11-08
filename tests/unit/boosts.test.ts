import { describe, it, expect } from 'vitest';
import { defaultSave, parseSave } from '../../src/app/save';
import { buyBoost, useBoost, BOOSTS } from '../../src/app/meta';

describe('boosts (coins have a gameplay use)', () => {
  it('cost a few coins, stack in the inventory and are consumed when used', () => {
    const s = defaultSave();
    s.coins = 100;
    expect(buyBoost(s, 'toy')).toBe(true);
    expect(s.items.toy).toBe(1);
    expect(s.coins).toBe(100 - BOOSTS.find((b) => b.id === 'toy')!.price);
    expect(useBoost(s, 'toy')).toBe(true);
    expect(useBoost(s, 'toy')).toBe(false);
    expect(s.items.toy).toBe(0);
  });

  it('cannot be bought without enough coins', () => {
    const s = defaultSave();
    s.coins = 10;
    expect(buyBoost(s, 'hint')).toBe(false);
    expect(s.coins).toBe(10);
    expect(s.items.hint).toBe(0);
  });

  it('are cheap compared with what a night pays (fair, earned by normal play)', () => {
    for (const b of BOOSTS) expect(b.price).toBeLessThanOrEqual(60);
  });

  it('old saves get an empty inventory; hinted wins are kept', () => {
    const old = parseSave(JSON.stringify({ v: 1, coins: 50 }));
    expect(old.items).toEqual({ toy: 0, peek: 0, hint: 0, pillow: 0 });
    const s = defaultSave();
    s.items.peek = 2;
    s.hinted['apartment-3'] = true;
    const back = parseSave(JSON.stringify(s));
    expect(back.items.peek).toBe(2);
    expect(back.hinted['apartment-3']).toBe(true);
  });
});
