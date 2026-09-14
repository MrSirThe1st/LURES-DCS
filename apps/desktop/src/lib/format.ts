import type { TruckStatus } from '@lures-dcs/domain';
import {
  resolveAppLocale,
  statusMessageKey,
  translate,
  type AppLocale,
} from '@lures-dcs/i18n';

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

/** Calendar date only (Loading Order ETA). Never attach a clock — ISO dates are midnight UTC. */
export function formatEtaDate(value: string | null | undefined): string {
  if (!value) return '—';
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso?.[1] || !iso[2] || !iso[3]) return String(value);
  return `${iso[3]}-${iso[2]}-${iso[1]}`;
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

export function truckStatusLabel(status: TruckStatus | string, locale?: AppLocale): string {
  const key = statusMessageKey(status);
  if (key) return translate(resolveAppLocale(locale), key);
  return status;
}
