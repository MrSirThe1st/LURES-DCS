import type { TruckStatus } from '@lures-dcs/domain';

export function todayDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatWeightKg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
}

/** Numeric weight for packing-list table cells (no unit suffix). */
export function formatWeightFigure(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

/** Paper-style date like 4-Sep-26. */
export function formatPackingListDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const yy = String(year).slice(-2);
  return `${day}-${months[month - 1]}-${yy}`;
}

/** Empty optional fields on the paper form use NA or /. */
export function formBlank(value: string | null | undefined, empty: 'NA' | '/' = 'NA'): string {
  const text = value?.trim();
  return text ? text : empty;
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
