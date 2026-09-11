import { useLocale } from '../lib/locale';

export function ReportsScreen() {
  const { t } = useLocale();
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-space-md p-space-lg">
      <h1 className="text-2xl font-semibold text-text-primary">{t('reports.title')}</h1>
      <p className="text-base text-text-secondary">{t('reports.placeholder')}</p>
    </main>
  );
}
