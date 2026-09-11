export {
  AppLocale,
  APP_LOCALES,
  DEFAULT_LOCALE,
  isAppLocale,
  resolveAppLocale,
} from './locale.js';
export type { AppLocale as AppLocaleType } from './locale.js';

export { en, type MessageKey, type MessageCatalog } from './catalogs/en.js';
export { fr } from './catalogs/fr.js';
export { zh } from './catalogs/zh.js';

export { translate, statusMessageKey, type TranslateParams } from './translate.js';
