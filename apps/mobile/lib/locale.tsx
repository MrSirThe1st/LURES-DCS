import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  resolveAppLocale,
  translate,
  type AppLocale,
  type MessageKey,
  type TranslateParams,
} from '@lures-dcs/i18n';
import { useAuth } from './auth';
import { getSupabaseClient } from './supabase';

type LocaleState = {
  locale: AppLocale;
  locales: readonly AppLocale[];
  t: (key: MessageKey, params?: TranslateParams) => string;
  setLocale: (locale: AppLocale) => Promise<void>;
  saving: boolean;
  notice: string | null;
};

const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocaleState(resolveAppLocale(profile?.preferred_locale));
  }, [profile?.preferred_locale]);

  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) => translate(locale, key, params),
    [locale],
  );

  const setLocale = useCallback(
    async (next: AppLocale) => {
      setNotice(null);
      setLocaleState(next);
      if (!profile) return;

      setSaving(true);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_locale: next })
          .eq('id', profile.id);
        if (error) throw error;
        await refreshProfile();
        setNotice(translate(next, 'settings.languageSaved'));
      } catch {
        setLocaleState(resolveAppLocale(profile.preferred_locale));
        setNotice(translate(locale, 'settings.languageFailed'));
      } finally {
        setSaving(false);
      }
    },
    [locale, profile, refreshProfile],
  );

  const value = useMemo(
    () => ({
      locale,
      locales: APP_LOCALES,
      t,
      setLocale,
      saving,
      notice,
    }),
    [locale, t, setLocale, saving, notice],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
