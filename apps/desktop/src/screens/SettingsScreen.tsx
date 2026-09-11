import { Button } from '@lures-dcs/ui';
import type { AppLocale, MessageKey } from '@lures-dcs/i18n';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';

function localeLabelKey(code: AppLocale): MessageKey {
  if (code === 'fr') return 'settings.locale.fr';
  if (code === 'zh') return 'settings.locale.zh';
  return 'settings.locale.en';
}

export function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { locale, locales, t, setLocale, saving, notice } = useLocale();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-space-lg p-space-lg">
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-2xl font-semibold text-text-primary">{t('settings.title')}</h1>
        <p className="text-base text-text-secondary">{t('settings.subtitle')}</p>
      </div>

      <section className="flex max-w-md flex-col gap-space-md border border-border bg-surface p-space-md">
        <div className="flex flex-col gap-space-xs">
          <p className="text-sm text-text-secondary">{t('settings.signedInAs')}</p>
          <p className="text-base font-medium text-text-primary">
            {profile?.display_name ?? 'Management'}
          </p>
          <p className="text-sm text-text-secondary">{profile?.role ?? 'management'}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void signOut()}>
          {t('common.signOut')}
        </Button>
      </section>

      <section className="flex max-w-md flex-col gap-space-md border border-border bg-surface p-space-md">
        <div className="flex flex-col gap-space-xs">
          <h2 className="text-lg font-semibold text-text-primary">{t('settings.language')}</h2>
          <p className="text-sm text-text-secondary">{t('settings.languageHelp')}</p>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          {locales.map((code) => (
            <Button
              key={code}
              type="button"
              variant={locale === code ? 'primary' : 'secondary'}
              disabled={saving}
              onClick={() => void setLocale(code as AppLocale)}
            >
              {t(localeLabelKey(code))}
            </Button>
          ))}
        </div>
        {saving ? (
          <p className="text-sm text-text-secondary">{t('settings.savingLanguage')}</p>
        ) : null}
        {notice ? <p className="text-sm text-text-secondary">{notice}</p> : null}
      </section>
    </main>
  );
}
