import { sdk } from './sdk';
import { isLang, type Lang } from './i18n';

/**
 * Persistent progress, one JSON document under the key `cookieheist.save.v1`: stored through the CrazyGames Data
 * Module on CrazyGames (synced to the player's account), localStorage on the other platforms (same key), with an
 * in-memory fallback when storage is blocked. Saved 300 ms after every change and when the page is hidden.
 */
export interface SaveData {
  v: 1;
  coins: number;
  /** stars per level id (0..3), present = completed */
  stars: Record<string, number>;
  best: Record<string, number>;
  fails: Record<string, number>;
  skipped: Record<string, boolean>;
  owned: string[];
  skin: string;
  cap: string;
  trail: string;
  lang: Lang | null;
  sound: boolean;
  music: boolean;
  tips: string[];
  daily: { last: string; streak: number };
  missions: { day: string; list: { id: string; n: number; progress: number; reward: number; claimed: boolean }[] };
  totals: { cookies: number; wins: number };
  /** boosts bought with coins (consumed when used) */
  items: { toy: number; peek: number; hint: number; pillow: number };
  /** nights won with a hint (tracked silently; stars are not affected) */
  hinted: Record<string, boolean>;
  /** the first-visit tutorial (night 1) is done: the menu shows from now on */
  tutorialDone: boolean;
  /** day the midnight snack bonus night was last played */
  snack: string;
}

export const SAVE_KEY = 'cookieheist.save.v1';
const KEY = SAVE_KEY;

export function defaultSave(): SaveData {
  return {
    v: 1,
    coins: 0,
    stars: {},
    best: {},
    fails: {},
    skipped: {},
    owned: ['skin:starry', 'cap:classic', 'trail:none'],
    skin: 'starry',
    cap: 'classic',
    trail: 'none',
    lang: null,
    sound: true,
    music: true,
    tips: [],
    daily: { last: '', streak: 0 },
    missions: { day: '', list: [] },
    totals: { cookies: 0, wins: 0 },
    items: { toy: 0, peek: 0, hint: 0, pillow: 0 },
    hinted: {},
    tutorialDone: false,
    snack: '',
  };
}

export function parseSave(raw: string | null | undefined): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (!d || typeof d !== 'object' || d.v !== 1) return base;
    return {
      ...base,
      ...d,
      daily: { ...base.daily, ...(d.daily ?? {}) },
      missions: d.missions && Array.isArray(d.missions.list) ? d.missions : base.missions,
      totals: { ...base.totals, ...(d.totals ?? {}) },
      items: { ...base.items, ...(d.items ?? {}) },
      hinted: d.hinted && typeof d.hinted === 'object' ? d.hinted : {},
      owned: Array.isArray(d.owned) ? Array.from(new Set([...base.owned, ...d.owned])) : base.owned,
      coins: Math.max(0, Math.floor(Number(d.coins) || 0)),
      // players from before the tutorial existed have already played night 1
      tutorialDone: !!d.tutorialDone || Object.keys(d.stars ?? {}).length > 0,
      lang: isLang(d.lang) ? d.lang : null,
    };
  } catch {
    return base;
  }
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function storage(): Storage {
  const data = sdk.data();
  if (data) return data;
  // Playgama: progress goes only through Bridge Storage; without Bridge the game plays on with an in-memory save
  if (__PLATFORM__ === 'playgama') {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
  try {
    const ls = window.localStorage;
    ls.setItem('__t', '1');
    ls.removeItem('__t');
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
  }
}

export function loadSave(st: Storage = storage()): SaveData {
  try {
    return parseSave(st.getItem(KEY));
  } catch {
    return defaultSave();
  }
}

let pending: number | null = null;
export function saveNow(data: SaveData, st: Storage = storage()) {
  try {
    st.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full / blocked: keep playing */
  }
}
export function saveSoon(data: SaveData) {
  if (pending !== null) clearTimeout(pending);
  pending = window.setTimeout(() => {
    pending = null;
    saveNow(data);
  }, 300);
}
