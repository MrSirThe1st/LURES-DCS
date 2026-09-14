import type { ReactNode } from 'react';
import type { MessageKey } from '@lures-dcs/i18n';
import { useLocale } from '../lib/locale';
import {
  IconExport,
  IconHistory,
  IconLoading,
  IconPrealerts,
  IconReports,
  IconSend,
  IconSettings,
  IconUpload,
  IconYard,
} from './icons';

export type AppPage = 'prealerts' | 'yard' | 'loading' | 'reports' | 'history' | 'settings';

type TopNavProps = {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  onUpload: () => void;
  onExport: () => void;
  onSend: () => void;
};

const NAV_ITEMS: Array<{
  id: AppPage;
  labelKey: MessageKey;
  Icon: typeof IconLoading;
}> = [
  { id: 'prealerts', labelKey: 'nav.prealerts', Icon: IconPrealerts },
  { id: 'yard', labelKey: 'nav.yard', Icon: IconYard },
  { id: 'loading', labelKey: 'nav.loading', Icon: IconLoading },
  { id: 'reports', labelKey: 'nav.reports', Icon: IconReports },
  { id: 'history', labelKey: 'nav.history', Icon: IconHistory },
  { id: 'settings', labelKey: 'nav.settings', Icon: IconSettings },
];

export function TopNav({
  activePage,
  onNavigate,
  onUpload,
  onExport,
  onSend,
}: TopNavProps) {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <nav
        className="flex h-14 items-center justify-between gap-space-md px-space-md"
        aria-label={t('nav.main')}
      >
        <div className="flex min-w-0 flex-1 items-center gap-space-xs overflow-x-auto" role="list">
          {NAV_ITEMS.map(({ id, labelKey, Icon }) => {
            const active = activePage === id;
            const label = t(labelKey);
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                onClick={() => onNavigate(id)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'inline-flex items-center gap-space-sm rounded-sm px-space-sm py-space-xs text-sm',
                  active
                    ? 'bg-background font-medium text-text-primary'
                    : 'text-text-secondary hover:bg-background hover:text-text-primary',
                ].join(' ')}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-space-xs">
          <IconActionButton label={t('nav.upload')} onClick={onUpload}>
            <IconUpload />
          </IconActionButton>
          <IconActionButton label={t('nav.export')} onClick={onExport}>
            <IconExport />
          </IconActionButton>
          <IconActionButton label={t('nav.send')} onClick={onSend}>
            <IconSend />
          </IconActionButton>
          <IconActionButton label={t('nav.settings')} onClick={() => onNavigate('settings')}>
            <IconSettings />
          </IconActionButton>
        </div>
      </nav>
    </header>
  );
}

function IconActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-secondary hover:bg-background hover:text-text-primary"
    >
      {children}
    </button>
  );
}
