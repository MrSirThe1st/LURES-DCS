import type { TruckStatus } from '@lures-dcs/domain';

export function todayDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeightKg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
}

const STATUS_LABELS: Record<TruckStatus, string> = {
  waiting: 'Waiting',
  available: 'Available',
  loading: 'Loading',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export function truckStatusLabel(status: TruckStatus | string): string {
  return STATUS_LABELS[status as TruckStatus] ?? status;
}
