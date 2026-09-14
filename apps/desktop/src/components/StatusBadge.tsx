import type { ReactNode } from 'react';

export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: StatusBadgeTone;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
