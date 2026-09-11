import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  resolveAppLocale,
  statusMessageKey,
  translate,
} from './index.js';

describe('resolveAppLocale', () => {
  it('defaults to French', () => {
    expect(DEFAULT_LOCALE).toBe('fr');
    expect(resolveAppLocale(undefined)).toBe('fr');
    expect(resolveAppLocale('nope')).toBe('fr');
  });

  it('accepts en/fr/zh', () => {
    expect(resolveAppLocale('en')).toBe('en');
    expect(resolveAppLocale('zh')).toBe('zh');
  });
});

describe('translate', () => {
  it('returns French settings title by default locale', () => {
    expect(translate('fr', 'settings.title')).toBe('Paramètres');
  });

  it('interpolates params', () => {
    expect(
      translate('en', 'export.done', {
        count: 2,
        filename: 'a.pdf',
        statusNote: '',
      }),
    ).toBe('Exported 2 truck(s) as PDF (a.pdf).');
  });

  it('maps truck statuses', () => {
    expect(statusMessageKey('on_hold')).toBe('status.on_hold');
    expect(translate('zh', 'status.on_hold')).toBe('已暂停');
  });
});
