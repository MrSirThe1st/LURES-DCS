import { z } from 'zod';

/** Append new trucks to the day's list, or replace existing trucks on that list. */
export const importModeSchema = z.enum(['append', 'replace']);
export type ImportMode = z.infer<typeof importModeSchema>;

export const importBagRowSchema = z.object({
  bag_number: z.string().trim().min(1),
  net_weight_kg: z.number().finite().nonnegative(),
  seal_number: z.string().trim().min(1).nullable().optional(),
  sort_order: z.number().int().positive().optional(),
});
export type ImportBagRow = z.infer<typeof importBagRowSchema>;

export const importTruckDraftSchema = z.object({
  source_file: z.string().optional(),
  packing_list_number: z.string().trim().min(1).nullable().optional(),
  loading_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  cargo_description: z.string().trim().min(1).nullable().optional(),
  vehicle_registration: z.string().trim().min(1),
  trailer_registration: z.string().trim().min(1).nullable().optional(),
  trailer_registration_2: z.string().trim().min(1).nullable().optional(),
  container_number: z.string().trim().min(1).nullable().optional(),
  driver_name: z.string().trim().min(1).nullable().optional(),
  driver_passport_reference: z.string().trim().min(1).nullable().optional(),
  transporter_name: z.string().trim().min(1).nullable().optional(),
  loading_location: z.string().trim().min(1).nullable().optional(),
  transit_info: z.string().trim().min(1).nullable().optional(),
  border: z.string().trim().min(1).nullable().optional(),
  agent: z.string().trim().min(1).nullable().optional(),
  bags: z.array(importBagRowSchema).min(1),
});
export type ImportTruckDraft = z.infer<typeof importTruckDraftSchema>;

export const importIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  source_file: z.string().optional(),
  truck_key: z.string().optional(),
});
export type ImportIssue = z.infer<typeof importIssueSchema>;

export const importTruckPreviewSchema = z.object({
  source_file: z.string().optional(),
  vehicle_registration: z.string(),
  packing_list_number: z.string().nullable(),
  trailer_registration: z.string().nullable(),
  driver_name: z.string().nullable(),
  transporter_name: z.string().nullable(),
  bag_count: z.number().int().nonnegative(),
  total_net_weight_kg: z.number(),
  draft: importTruckDraftSchema,
  issues: z.array(importIssueSchema),
});
export type ImportTruckPreview = z.infer<typeof importTruckPreviewSchema>;

export const importPreviewSchema = z.object({
  loading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trucks: z.array(importTruckPreviewSchema),
  issues: z.array(importIssueSchema),
  has_errors: z.boolean(),
});
export type ImportPreview = z.infer<typeof importPreviewSchema>;

export const importResultSchema = z.object({
  loading_list_id: z.string().uuid(),
  mode: importModeSchema,
  trucks_created: z.number().int().nonnegative(),
  bags_created: z.number().int().nonnegative(),
  trucks_removed: z.number().int().nonnegative().optional(),
});
export type ImportResult = z.infer<typeof importResultSchema>;
