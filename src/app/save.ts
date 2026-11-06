import { sdk } from './sdk';

/** Persistent progress. Stored through the CrazyGames Data Module (localStorage fallback). */
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
  lang: 'en' | 'fr' | null;
  sound: boolean;
  music: boolean;
  tips: string[];
  daily: { last: string; streak: number };
  missions: { day: string; list: { id: string; n: number; progress: number; reward: number; claimed: boolean }[] };
  totals: { cookies: number; wins: number };
}

const KEY = 'cookieheist.save.v1';

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
      owned: Array.isArray(d.owned) ? Array.from(new Set([...base.owned, ...d.owned])) : base.owned,
      coins: Math.max(0, Math.floor(Number(d.coins) || 0)),
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
