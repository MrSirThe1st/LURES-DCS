import { z } from 'zod';

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const loadingOrderHeaderSchema = z.object({
  client_name: z.string().trim().min(1).nullable(),
  loading_point: z.string().trim().min(1).nullable(),
  offloading_point: z.string().trim().min(1).nullable(),
  period_month: z.string().trim().min(1).nullable(),
  allocation_mt: z.number().finite().nullable(),
  booked_mt: z.number().finite().nullable(),
  balance_mt: z.number().finite().nullable(),
  allocation_truck_count: z.number().int().nullable(),
  booked_truck_count: z.number().int().nullable(),
  balance_truck_count: z.number().int().nullable(),
});
export type LoadingOrderHeader = z.infer<typeof loadingOrderHeaderSchema>;

export const loadingOrderLineDraftSchema = z.object({
  sequence: z.number().int().positive().nullable(),
  transporter_name: z.string().trim().min(1).nullable(),
  vehicle_registration: z.string().trim().min(1),
  trailer_registration: z.string().trim().min(1).nullable(),
  trailer_registration_2: z.string().trim().min(1).nullable(),
  driver_name: z.string().trim().min(1).nullable(),
  driver_passport_reference: z.string().trim().min(1).nullable(),
  planned_tonnage: z.number().finite().nonnegative().nullable(),
  border: z.string().trim().min(1).nullable(),
  final_destination: z.string().trim().min(1).nullable(),
  eta_to_mine: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  on_site: z.boolean(),
  eta_raw: z.string().trim().min(1).nullable(),
  eta_review: z.enum(['kept', 'edited', 'cleared']).nullable().optional(),
  plate_highlight: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});
export type LoadingOrderLineDraft = z.infer<typeof loadingOrderLineDraftSchema>;

export const loadingOrderIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  truck_key: z.string().optional(),
  field: z.string().optional(),
  code: z.string().min(1).optional(),
});
export type LoadingOrderIssue = z.infer<typeof loadingOrderIssueSchema>;

export const loadingOrderLinePreviewSchema = z.object({
  draft: loadingOrderLineDraftSchema,
  issues: z.array(loadingOrderIssueSchema),
});
export type LoadingOrderLinePreview = z.infer<typeof loadingOrderLinePreviewSchema>;

export const loadingOrderPreviewSchema = z.object({
  header: loadingOrderHeaderSchema,
  lines: z.array(loadingOrderLinePreviewSchema),
  issues: z.array(loadingOrderIssueSchema),
  has_errors: z.boolean(),
  source_filename: z.string().nullable(),
});
export type LoadingOrderPreview = z.infer<typeof loadingOrderPreviewSchema>;

export const confirmExpectedArrivalSchema = z.object({
  truck_id: z.string().uuid(),
  trailer_registration: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  trailer_registration_2: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  driver_name: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  driver_phone: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  driver_passport_reference: z
    .string()
    .trim()
    .nullish()
    .transform((v) => emptyToNull(v ?? null)),
  transporter_name: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  client_name: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  notes: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  arrived_at: z.string().trim().min(1).nullish(),
});
export type ConfirmExpectedArrivalInput = z.infer<typeof confirmExpectedArrivalSchema>;

export const cancelExpectedTruckSchema = z.object({
  truck_id: z.string().uuid(),
  reason: z.string().trim().min(1),
});
export type CancelExpectedTruckInput = z.infer<typeof cancelExpectedTruckSchema>;

export const pausePreAlertSchema = z.object({
  pre_alert_id: z.string().uuid(),
});
export type PausePreAlertInput = z.infer<typeof pausePreAlertSchema>;
export const resumePreAlertSchema = pausePreAlertSchema;
export type ResumePreAlertInput = z.infer<typeof resumePreAlertSchema>;
export const deletePreAlertSchema = pausePreAlertSchema;
export type DeletePreAlertInput = z.infer<typeof deletePreAlertSchema>;
