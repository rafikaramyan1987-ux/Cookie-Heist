/**
 * Strings: one JSON file per language in src/locales/ (English is the reference and the fallback; every file has
 * every English key, see tests/unit/locales.test.ts). English is bundled; the other languages are separate chunks
 * loaded on demand. Language: the save, else the portal locale (CrazyGames SDK / GamePix.lang()), else the browser.
 */
import EN from '../locales/en.json';
import { importRetry } from './lazy';

export type Key = keyof typeof EN;
export const LANGS = ['en', 'fr', 'de', 'it', 'es', 'pt', 'nl', 'pl', 'tr', 'ru'] as const;
export type Lang = (typeof LANGS)[number];

const loaders = import.meta.glob<{ default: Record<string, string> }>(['../locales/*.json', '!../locales/en.json']);
const dicts: Partial<Record<Lang, Record<string, string>>> = { en: EN };

let lang: Lang = 'en';
let plural = new Intl.PluralRules('en');
let cats: string[] = ['one', 'other'];
const ORDER = ['zero', 'one', 'two', 'few', 'many', 'other'];

export const isLang = (l: unknown): l is Lang => typeof l === 'string' && (LANGS as readonly string[]).includes(l);

/** load a language's strings (no-op if loaded); falls back to English if the file cannot be loaded */
export async function loadLang(l: Lang): Promise<void> {
  if (dicts[l]) return;
  const ld = loaders[`../locales/${l}.json`];
  if (!ld) return;
  try {
    dicts[l] = (await importRetry(ld)).default;
  } catch {
    /* offline: English */
  }
}

export function setLang(l: Lang) {
  lang = dicts[l] ? l : 'en';
  plural = new Intl.PluralRules(lang);
  cats = ORDER.filter((c) => (plural.resolvedOptions().pluralCategories as string[]).includes(c));
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

/** load + switch */
export async function useLang(l: Lang) {
  await loadLang(l);
  setLang(l);
}

export function getLang(): Lang {
  return lang;
}

export function detectLang(locale?: string | null): Lang {
  const cands = [locale, ...(typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : [])];
  for (const c of cands) {
    const l = (c || '').toLowerCase().split(/[-_]/)[0];
    if (isLang(l)) return l;
  }
  return 'en';
}

/** pick a plural form: "a|b" (one|other) or "a|b|c|d" (the language's CLDR categories in order) */
function pickPlural(s: string, n: number) {
  const forms = s.split('|');
  const i = cats.indexOf(plural.select(n));
  return forms[Math.min(i < 0 ? forms.length - 1 : i, forms.length - 1)];
}

/** Translate; `{n}` style params; "singular|plural" picks by n. Missing keys fall back to English. */
export function t(key: Key | string, params: Record<string, string | number> = {}): string {
  let s: string = dicts[lang]?.[key] ?? (EN as Record<string, string>)[key] ?? key;
  if (s.includes('|')) s = pickPlural(s, Number(params.n ?? 0));
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}

/** has this key a string (in English) */
export const hasKey = (k: string) => k in EN;

/** the tip card (title, text) of a level tip */
export const tip = (id: string): [string, string] | null => (hasKey(`tip_${id}_t`) ? [t(`tip_${id}_t`), t(`tip_${id}_d`)] : null);
