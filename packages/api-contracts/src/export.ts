import { z } from 'zod';
import { BagVerificationStatus, TruckStatus } from '@lures-dcs/domain';

const truckStatusSchema = z.enum([
  TruckStatus.Waiting,
  TruckStatus.Available,
  TruckStatus.Loading,
  TruckStatus.Completed,
  TruckStatus.OnHold,
  TruckStatus.Cancelled,
]);

const bagVerificationStatusSchema = z.enum([
  BagVerificationStatus.Pending,
  BagVerificationStatus.Verified,
  BagVerificationStatus.Modified,
]);

/** Bag row included in a packing-list PDF export. */
export const exportBagSchema = z.object({
  id: z.string().uuid(),
  bag_number: z.string(),
  net_weight_kg: z.number(),
  seal_number: z.string().nullable(),
  sort_order: z.number().int(),
  verification_status: bagVerificationStatusSchema,
});

export type ExportBag = z.infer<typeof exportBagSchema>;

/** Truck + bags + loading date assembled for PDF export. */
export const exportTruckRecordSchema = z.object({
  id: z.string().uuid(),
  status: truckStatusSchema,
  vehicle_registration: z.string(),
  trailer_registration: z.string().nullable(),
  trailer_registration_2: z.string().nullable(),
  driver_name: z.string().nullable(),
  driver_passport_reference: z.string().nullable(),
  transporter_name: z.string().nullable(),
  loading_location: z.string().nullable(),
  transit_info: z.string().nullable(),
  border: z.string().nullable(),
  agent: z.string().nullable(),
  packing_list_number: z.string().nullable(),
  cargo_description: z.string().nullable(),
  loading_date: z.string().nullable(),
  total_net_weight_kg: z.number(),
  bags: z.array(exportBagSchema),
});

export type ExportTruckRecord = z.infer<typeof exportTruckRecordSchema>;

export const exportResultSchema = z.object({
  truck_count: z.number().int().nonnegative(),
  format: z.literal('pdf'),
});

export type ExportResult = z.infer<typeof exportResultSchema>;

/** Safe download stem for a single truck packing-list PDF. */
export function suggestExportFilename(record: ExportTruckRecord): string {
  const plate = sanitizeFilenamePart(record.vehicle_registration) || 'truck';
  const list =
    sanitizeFilenamePart(record.packing_list_number ?? '') ||
    sanitizeFilenamePart(record.loading_date ?? '') ||
    'packing-list';
  return `liste-de-colisage-${list}-${plate}.pdf`;
}

export function suggestBatchExportFilename(records: readonly ExportTruckRecord[]): string {
  if (records.length === 1) return suggestExportFilename(records[0]!);
  const date =
    sanitizeFilenamePart(records.find((r) => r.loading_date)?.loading_date ?? '') || 'export';
  return `liste-de-colisage-${date}-${records.length}-trucks.pdf`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
