import type { ReactNode } from 'react';
import {
  IconExport,
  IconHistory,
  IconLoading,
  IconReports,
  IconSend,
  IconSettings,
  IconUpload,
} from './icons';

export type AppPage = 'loading' | 'reports' | 'history' | 'settings';

type TopNavProps = {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  onUpload: () => void;
  onExport: () => void;
  onSend: () => void;
};

const NAV_ITEMS: Array<{
  id: AppPage;
  label: string;
  Icon: typeof IconLoading;
}> = [
  { id: 'loading', label: 'Loading', Icon: IconLoading },
  { id: 'reports', label: 'Reports', Icon: IconReports },
  { id: 'history', label: 'History', Icon: IconHistory },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
];

export function TopNav({
  activePage,
  onNavigate,
  onUpload,
  onExport,
  onSend,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <nav
        className="flex h-14 items-center justify-between gap-space-md px-space-md"
        aria-label="Main"
      >
        <div className="flex min-w-0 items-center gap-space-xs" role="list">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activePage === id;
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
          <IconActionButton label="Upload" onClick={onUpload}>
            <IconUpload />
          </IconActionButton>
          <IconActionButton label="Export" onClick={onExport}>
            <IconExport />
          </IconActionButton>
          <IconActionButton label="Send" onClick={onSend}>
            <IconSend />
          </IconActionButton>
          <IconActionButton label="Settings" onClick={() => onNavigate('settings')}>
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
