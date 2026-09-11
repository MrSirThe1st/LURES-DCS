import type { AppLocale } from './locale.js';
import { en, type MessageKey } from './catalogs/en.js';
import { fr } from './catalogs/fr.js';
import { zh } from './catalogs/zh.js';

const catalogs = {
  en,
  fr,
  zh,
} as const;

export type TranslateParams = Record<string, string | number>;

export function translate(
  locale: AppLocale,
  key: MessageKey,
  params?: TranslateParams,
): string {
  const catalog = catalogs[locale] ?? catalogs.fr;
  let text: string = catalog[key] ?? en[key] ?? String(key);
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function statusMessageKey(
  status: string,
): Extract<MessageKey, `status.${string}`> | null {
  switch (status) {
    case 'waiting':
      return 'status.waiting';
    case 'available':
      return 'status.available';
    case 'loading':
      return 'status.loading';
    case 'completed':
      return 'status.completed';
    case 'on_hold':
      return 'status.on_hold';
    case 'cancelled':
      return 'status.cancelled';
    default:
      return null;
  }
}
