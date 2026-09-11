export const AppLocale = {
  English: 'en',
  French: 'fr',
  Mandarin: 'zh',
} as const;

export type AppLocale = (typeof AppLocale)[keyof typeof AppLocale];

/** ADR-002 default UI language. */
export const DEFAULT_LOCALE: AppLocale = AppLocale.French;

export const APP_LOCALES: readonly AppLocale[] = [
  AppLocale.French,
  AppLocale.English,
  AppLocale.Mandarin,
];

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'fr' || value === 'zh';
}

export function resolveAppLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}
