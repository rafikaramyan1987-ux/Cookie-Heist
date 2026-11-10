import type { SaveData } from './save';
import type { Key } from './i18n';

/** Economy, shop catalogue, daily rewards and missions. */

export interface ShopItem {
  id: string; // "skin:candy"
  kind: 'skin' | 'cap' | 'trail';
  key: string;
  price: number;
}

export const SHOP: ShopItem[] = [
  { id: 'skin:starry', kind: 'skin', key: 'starry', price: 0 },
  { id: 'skin:candy', kind: 'skin', key: 'candy', price: 150 },
  { id: 'skin:mint', kind: 'skin', key: 'mint', price: 250 },
  { id: 'skin:dino', kind: 'skin', key: 'dino', price: 350 },
  { id: 'skin:sunny', kind: 'skin', key: 'sunny', price: 400 },
  { id: 'skin:astro', kind: 'skin', key: 'astro', price: 500 },
  { id: 'cap:classic', kind: 'cap', key: 'classic', price: 0 },
  { id: 'cap:bunny', kind: 'cap', key: 'bunny', price: 200 },
  { id: 'cap:propeller', kind: 'cap', key: 'propeller', price: 300 },
  { id: 'cap:crown', kind: 'cap', key: 'crown', price: 400 },
  { id: 'cap:chef', kind: 'cap', key: 'chef', price: 500 },
  { id: 'trail:none', kind: 'trail', key: 'none', price: 0 },
  { id: 'trail:crumbs', kind: 'trail', key: 'crumbs', price: 120 },
  { id: 'trail:stars', kind: 'trail', key: 'stars', price: 250 },
  { id: 'trail:hearts', kind: 'trail', key: 'hearts', price: 300 },
  { id: 'trail:bubbles', kind: 'trail', key: 'bubbles', price: 350 },
];

export function buy(save: SaveData, item: ShopItem): boolean {
  if (save.owned.includes(item.id) || save.coins < item.price) return false;
  save.coins -= item.price;
  save.owned.push(item.id);
  equip(save, item);
  return true;
}

export function equip(save: SaveData, item: ShopItem) {
  if (!save.owned.includes(item.id)) return;
  if (item.kind === 'skin') save.skin = item.key;
  else if (item.kind === 'cap') save.cap = item.key;
  else save.trail = item.key;
}

// ------------------------------------------------------------------ boosts (fair: they help, never required)
export type BoostId = 'toy' | 'peek' | 'hint' | 'pillow';
export const BOOSTS: { id: BoostId; price: number }[] = [
  { id: 'toy', price: 30 },
  { id: 'peek', price: 40 },
  { id: 'hint', price: 60 },
  { id: 'pillow', price: 50 },
];

export function buyBoost(save: SaveData, id: BoostId): boolean {
  const b = BOOSTS.find((x) => x.id === id);
  if (!b || save.coins < b.price) return false;
  save.coins -= b.price;
  save.items[id]++;
  return true;
}

/** use one boost from the inventory */
export function useBoost(save: SaveData, id: BoostId): boolean {
  if (save.items[id] <= 0) return false;
  save.items[id]--;
  return true;
}

export function levelCoins(stars: number, firstTime: boolean, cookies: number): number {
  const base = 20 + stars * 10 + cookies * 5;
  return firstTime ? base : Math.round(base / 2);
}

// ------------------------------------------------------------------ daily reward calendar (7 days, growing)
/** coins for days 1–7; day 7 is the Golden Moon pyjama (coins instead once it is owned) */
export const DAILY = [50, 75, 100, 125, 150, 200, 300];
export const DAILY_SKIN = 'skin:moon';

export interface DailyReward {
  day: number; // 1..7
  coins: number;
  skin?: string;
}

export const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const yesterday = (now: Date) => {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return today(y);
};

export function dailyAvailable(save: SaveData, now = new Date()) {
  return save.daily.last !== today(now);
}

/** the streak as it stands now: claimed today or yesterday keeps it, otherwise it is broken (0) */
export function currentStreak(save: SaveData, now = new Date()) {
  return save.daily.last === today(now) || save.daily.last === yesterday(now) ? save.daily.streak : 0;
}

/** what day `n` (1..7) of the calendar gives */
export function rewardFor(save: SaveData, day: number): DailyReward {
  if (day === 7 && !save.owned.includes(DAILY_SKIN)) return { day, coins: 0, skin: DAILY_SKIN };
  return { day, coins: DAILY[day - 1] };
}

/** the calendar day the next claim lands on (1..7) */
export function nextDailyDay(save: SaveData, now = new Date()) {
  // claimed today: tomorrow's day; not yet: today's (the streak continues from yesterday, or restarts at day 1)
  return (currentStreak(save, now) % 7) + 1;
}

/** reward of the next claim: today's if still unclaimed, else tomorrow's */
export function nextDaily(save: SaveData, now = new Date()): DailyReward & { today: boolean } {
  return { ...rewardFor(save, nextDailyDay(save, now)), today: dailyAvailable(save, now) };
}

/** claim today's reward (null if already claimed today); a pyjama is owned and equipped */
export function claimDaily(save: SaveData, now = new Date()): DailyReward | null {
  if (!dailyAvailable(save, now)) return null;
  const streak = save.daily.last === yesterday(now) ? save.daily.streak + 1 : 1;
  const r = rewardFor(save, ((streak - 1) % 7) + 1);
  save.daily = { last: today(now), streak };
  save.coins += r.coins;
  if (r.skin && !save.owned.includes(r.skin)) {
    save.owned.push(r.skin);
    save.skin = r.skin.split(':')[1];
  }
  return r;
}

// ------------------------------------------------------------------ midnight snack (bonus night, once a day)
export const SNACK_VARIANTS = 3;
export const SNACK_COINS = 15;
export function snackAvailable(save: SaveData, now = new Date()) {
  return save.tutorialDone && save.snack !== today(now);
}
/** today's snack variant (0..2), rotating daily */
export function snackIndex(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000) % SNACK_VARIANTS;
}

// ------------------------------------------------------------------ next-unlock teaser
export type Teaser = { kind: 'house'; house: number; n: number } | { kind: 'skin'; key: string; n: number };

/**
 * What the player unlocks next: the next locked house (nights left to finish before it opens), else the cheapest
 * pyjama not yet owned and not yet affordable (coins left). null when nothing is left to unlock.
 */
export function nextUnlock(save: SaveData, isDone: (h: number, i: number) => boolean, houses: number, perHouse: number): Teaser | null {
  let left = 0;
  for (let h = 0; h < houses; h++) {
    if (h > 0 && !isDone(h - 1, perHouse - 1)) return { kind: 'house', house: h, n: left };
    for (let i = 0; i < perHouse; i++) if (!isDone(h, i)) left++;
  }
  const skin = SHOP.filter((it) => it.kind === 'skin' && !save.owned.includes(it.id) && it.price > save.coins).sort((a, b) => a.price - b.price)[0];
  return skin ? { kind: 'skin', key: skin.key, n: skin.price - save.coins } : null;
}

// ------------------------------------------------------------------ missions
export type MissionId = 'cookies' | 'stars' | 'nights' | 'ghost' | 'toys' | 'hide';
const POOL: { id: MissionId; n: [number, number]; reward: number }[] = [
  { id: 'cookies', n: [5, 9], reward: 60 },
  { id: 'stars', n: [4, 7], reward: 70 },
  { id: 'nights', n: [3, 5], reward: 60 },
  { id: 'ghost', n: [2, 3], reward: 80 },
  { id: 'toys', n: [3, 5], reward: 50 },
  { id: 'hide', n: [4, 6], reward: 50 },
];
export const MISSION_KEY: Record<MissionId, Key> = { cookies: 'm_cookies', stars: 'm_stars', nights: 'm_nights', ghost: 'm_ghost', toys: 'm_toys', hide: 'm_hide' };

export function ensureMissions(save: SaveData, now = new Date()) {
  const d = today(now);
  if (save.missions.day === d && save.missions.list.length === 3) return;
  let seed = 0;
  for (const ch of d) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const pool = POOL.slice();
  const list = [];
  for (let i = 0; i < 3; i++) {
    const m = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const n = m.n[0] + Math.floor(rnd() * (m.n[1] - m.n[0] + 1));
    list.push({ id: m.id, n, progress: 0, reward: m.reward, claimed: false });
  }
  save.missions = { day: d, list };
}

export function progressMission(save: SaveData, id: MissionId, amount: number) {
  for (const m of save.missions.list) if (m.id === id && !m.claimed) m.progress = Math.min(m.n, m.progress + amount);
}

/** missions summary for the menu: claimed-or-done count and overall progress 0..1 */
export function missionsProgress(save: SaveData) {
  const l = save.missions.list;
  const done = l.filter((m) => m.progress >= m.n).length;
  const frac = l.length ? l.reduce((a, m) => a + Math.min(1, m.progress / m.n), 0) / l.length : 0;
  return { done, total: l.length, frac, claimable: l.filter((m) => m.progress >= m.n && !m.claimed).length };
}

export function claimMission(save: SaveData, i: number): number {
  const m = save.missions.list[i];
  if (!m || m.claimed || m.progress < m.n) return 0;
  m.claimed = true;
  save.coins += m.reward;
  return m.reward;
}
