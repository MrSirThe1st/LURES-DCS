import { z } from 'zod';

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const bulletinHeaderSchema = z.object({
  bulletin_number: z.string().trim().min(1).nullable(),
  program_code: z.string().trim().min(1).nullable(),
  client_name: z.string().trim().min(1).nullable(),
  destination: z.string().trim().min(1).nullable(),
  cargo_description: z.string().trim().min(1).nullable(),
  customs_agency: z.string().trim().min(1).nullable(),
  license_number: z.string().trim().min(1).nullable(),
  loading_point: z.string().trim().min(1).nullable(),
  loading_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  place_date_raw: z.string().trim().min(1).nullable(),
});
export type BulletinHeader = z.infer<typeof bulletinHeaderSchema>;

export const bulletinLineDraftSchema = z.object({
  sequence: z.number().int().positive().nullable(),
  packing_list_number: z.string().trim().min(1).nullable(),
  vehicle_registration: z.string().trim().min(1),
  trailer_registration: z.string().trim().min(1).nullable(),
  trailer_registration_2: z.string().trim().min(1).nullable(),
  container_number: z.string().trim().min(1).nullable(),
  driver_name: z.string().trim().min(1).nullable(),
  driver_passport_reference: z.string().trim().min(1).nullable(),
  transporter_name: z.string().trim().min(1).nullable(),
  border: z.string().trim().min(1).nullable(),
  package_count: z.number().int().nonnegative().nullable(),
  gross_weight_t: z.number().finite().nonnegative().nullable(),
  net_weight_t: z.number().finite().nonnegative().nullable(),
});
export type BulletinLineDraft = z.infer<typeof bulletinLineDraftSchema>;

export const bulletinIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  truck_key: z.string().optional(),
  field: z.string().optional(),
});
export type BulletinIssue = z.infer<typeof bulletinIssueSchema>;

export const bulletinLinePreviewSchema = z.object({
  draft: bulletinLineDraftSchema,
  issues: z.array(bulletinIssueSchema),
});
export type BulletinLinePreview = z.infer<typeof bulletinLinePreviewSchema>;

export const bulletinPreviewSchema = z.object({
  header: bulletinHeaderSchema,
  lines: z.array(bulletinLinePreviewSchema),
  issues: z.array(bulletinIssueSchema),
  has_errors: z.boolean(),
  source_filename: z.string().nullable(),
  source_sheet: z.string().nullable(),
});
export type BulletinPreview = z.infer<typeof bulletinPreviewSchema>;

export const bpFieldResolutionSchema = z.enum(['keep_current', 'apply_incoming']);
export type BpFieldResolutionInput = z.infer<typeof bpFieldResolutionSchema>;

export const bulletinConflictResolutionSchema = z.object({
  vehicle_registration: z.string().trim().min(1),
  field: z.string().trim().min(1),
  resolution: bpFieldResolutionSchema,
});
export type BulletinConflictResolution = z.infer<typeof bulletinConflictResolutionSchema>;

export const importLoadingProgramSchema = z.object({
  create_unplanned: z.array(z.string().trim().min(1)).default([]),
  resolutions: z.array(bulletinConflictResolutionSchema).default([]),
});
export type ImportLoadingProgramOptions = z.infer<typeof importLoadingProgramSchema>;

export const emptyToNullText = emptyToNull;
