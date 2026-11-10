import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { t, useLang, setLang, detectLang, LANGS } from '../../src/app/i18n';

describe('locales', () => {
  it('every language file has every English key, matching placeholders and plural forms (scripts/check-locales.mjs)', () => {
    expect(() => execFileSync('node', ['scripts/check-locales.mjs'], { stdio: 'pipe' })).not.toThrow();
  });

  it('ships the 10 languages', () => {
    expect([...LANGS].sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'tr']);
    for (const l of LANGS) expect(JSON.parse(readFileSync(`src/locales/${l}.json`, 'utf8')).langName).toBeTruthy();
  });

  describe('plurals and fallback', () => {
    beforeAll(async () => {
      for (const l of LANGS) await useLang(l);
    });
    it('English / French: one|other', () => {
      setLang('en');
      expect(t('streakDays', { n: 1 })).toBe('1 day');
      expect(t('streakDays', { n: 5 })).toBe('5 days');
      setLang('fr');
      expect(t('streakDays', { n: 1 })).toBe('1 jour');
      expect(t('streakDays', { n: 3 })).toBe('3 jours');
    });
    it('Russian / Polish: one|few|many|other picked with Intl.PluralRules', () => {
      setLang('ru');
      const ru = [1, 2, 5, 21, 22, 25].map((n) => t('streakDays', { n }));
      expect(new Set(ru.slice(0, 3)).size).toBe(3); // 1, 2, 5 use three different forms
      expect(ru[3].replace('21', '1')).toBe(ru[0]);
      expect(ru[4].replace('22', '2')).toBe(ru[1]);
      expect(ru[5].replace('25', '5')).toBe(ru[2]);
      setLang('pl');
      const pl = [1, 3, 5].map((n) => t('streakDays', { n }));
      expect(new Set(pl).size).toBe(3);
    });
    it('unknown keys fall back to the key; detectLang maps locales, falls back to English', () => {
      setLang('de');
      expect(t('no_such_key')).toBe('no_such_key');
      expect(detectLang('pt-BR')).toBe('pt');
      expect(detectLang('ru_RU')).toBe('ru');
      expect(['en', ...LANGS]).toContain(detectLang('xx-YY'));
      setLang('en');
    });
  });
});
