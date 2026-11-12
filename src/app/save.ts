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

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
/** a { key: value } map keeping only values that pass `ok` */
function map<T>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> {
  const out: Record<string, T> = {};
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (ok(x)) out[k] = x;
  return out;
}
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Read a save of any earlier version (v1 format since the first release, fields added over time): unknown or
 * missing fields get their defaults and every field gets its expected type, so a damaged or hand-edited save can
 * never break the game. The format itself is unchanged (same key, same JSON).
 */
export function parseSave(raw: string | null | undefined): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as unknown;
    if (!isObj(d) || d.v !== 1) return base;
    const daily = isObj(d.daily) ? d.daily : {};
    const missions = isObj(d.missions) ? d.missions : {};
    const items = isObj(d.items) ? d.items : {};
    const totals = isObj(d.totals) ? d.totals : {};
    const list = Array.isArray(missions.list)
      ? missions.list
          .filter(isObj)
          .filter((m) => typeof m.id === 'string' && isNum(m.n) && m.n > 0)
          .map((m) => ({ id: m.id as string, n: m.n as number, progress: num(m.progress), reward: num(m.reward), claimed: !!m.claimed }))
      : [];
    const stars = map(d.stars, isNum);
    return {
      // keep fields this version does not know (a newer save opened by an older build keeps them)
      ...(d as Partial<SaveData>),
      v: 1,
      coins: Math.max(0, Math.floor(num(d.coins))),
      stars,
      best: map(d.best, isNum),
      fails: map(d.fails, isNum),
      skipped: map(d.skipped, isBool),
      owned: Array.from(new Set([...base.owned, ...strings(d.owned)])),
      skin: str(d.skin, base.skin),
      cap: str(d.cap, base.cap),
      trail: str(d.trail, base.trail),
      lang: isLang(d.lang) ? d.lang : null,
      sound: bool(d.sound, base.sound),
      music: bool(d.music, base.music),
      tips: strings(d.tips),
      daily: { last: str(daily.last, ''), streak: Math.max(0, Math.floor(num(daily.streak))) },
      missions: { day: list.length === 3 ? str(missions.day, '') : '', list: list.length === 3 ? list : [] },
      totals: { cookies: num(totals.cookies), wins: num(totals.wins) },
      items: { toy: Math.max(0, num(items.toy)), peek: Math.max(0, num(items.peek)), hint: Math.max(0, num(items.hint)), pillow: Math.max(0, num(items.pillow)) },
      hinted: map(d.hinted, isBool),
      // players from before the tutorial existed have already played night 1
      tutorialDone: !!d.tutorialDone || Object.keys(stars).length > 0,
      snack: str(d.snack, ''),
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
