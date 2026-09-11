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

export function formatWeightKg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
}

export function truckStatusLabel(status: TruckStatus | string, locale?: AppLocale): string {
  const key = statusMessageKey(status);
  if (key) return translate(resolveAppLocale(locale), key);
  return status;
}
