import { z } from 'zod';
import {
  BagVerificationStatus,
  LoadingListStatus,
  TruckStatus,
  UserRole,
} from '@lures-dcs/domain';

/** Shared boundary schemas only — no DB implementation details. */

export const userRoleSchema = z.enum([UserRole.Management, UserRole.LoadingStaff]);

export const truckStatusSchema = z.enum([
  TruckStatus.Waiting,
  TruckStatus.Available,
  TruckStatus.Loading,
  TruckStatus.Completed,
  TruckStatus.OnHold,
  TruckStatus.Cancelled,
]);

export const bagVerificationStatusSchema = z.enum([
  BagVerificationStatus.Pending,
  BagVerificationStatus.Verified,
  BagVerificationStatus.Modified,
]);

export const loadingListStatusSchema = z.enum([
  LoadingListStatus.Draft,
  LoadingListStatus.Active,
  LoadingListStatus.Closed,
]);

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export {
  importModeSchema,
  importBagRowSchema,
  importTruckDraftSchema,
  importIssueSchema,
  importTruckPreviewSchema,
  importPreviewSchema,
  importResultSchema,
  type ImportMode,
  type ImportBagRow,
  type ImportTruckDraft,
  type ImportIssue,
  type ImportTruckPreview,
  type ImportPreview,
  type ImportResult,
} from './import.js';

export {
  parseListeDeColisageMatrix,
  buildImportPreview,
  parseLoadingDate,
  type BuildImportPreviewInput,
} from './liste-de-colisage-parse.js';
