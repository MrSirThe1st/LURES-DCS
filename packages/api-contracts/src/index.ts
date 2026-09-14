import { z } from 'zod';
import {
  BagVerificationStatus,
  LoadingListStatus,
  TruckStatus,
  UserRole,
} from '@lures-dcs/domain';

/** Shared boundary schemas only — no DB implementation details. */

export const userRoleSchema = z.enum([
  UserRole.Management,
  UserRole.LoadingStaff,
  UserRole.YardAgent,
]);

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


export {
  exportBagSchema,
  exportTruckRecordSchema,
  exportResultSchema,
  suggestExportFilename,
  suggestBatchExportFilename,
  type ExportBag,
  type ExportTruckRecord,
  type ExportResult,
} from './export.js';

export {
  registerYardArrivalSchema,
  assignTrucksToProgramSchema,
  returnTrucksToYardSchema,
  type RegisterYardArrivalInput,
  type AssignTrucksToProgramInput,
  type ReturnTrucksToYardInput,
} from './yard.js';

export {
  loadingOrderHeaderSchema,
  loadingOrderLineDraftSchema,
  loadingOrderIssueSchema,
  loadingOrderLinePreviewSchema,
  loadingOrderPreviewSchema,
  confirmExpectedArrivalSchema,
  cancelExpectedTruckSchema,
  pausePreAlertSchema,
  resumePreAlertSchema,
  deletePreAlertSchema,
  type LoadingOrderHeader,
  type LoadingOrderLineDraft,
  type LoadingOrderIssue,
  type LoadingOrderLinePreview,
  type LoadingOrderPreview,
  type ConfirmExpectedArrivalInput,
  type CancelExpectedTruckInput,
  type PausePreAlertInput,
  type ResumePreAlertInput,
  type DeletePreAlertInput,
} from './loading-order.js';

export {
  parseLoadingOrderMatrix,
  parseEtaDate,
  excelFillToHex,
  applyPlateHighlights,
  isImplausibleEta,
  applyEtaReview,
  hasImplausibleEtaIssue,
  sourceEtaIso,
  resolveEtaReview,
  ETA_IMPLAUSIBLE_CODE,
} from './loading-order-parse.js';

export {
  planLoadingOrderImport,
  type OpenTripRef,
  type ActiveLoadingOrderRef,
  type LoadingOrderImportPlan,
} from './loading-order-import-plan.js';

export {
  bulletinHeaderSchema,
  bulletinLineDraftSchema,
  bulletinIssueSchema,
  bulletinLinePreviewSchema,
  bulletinPreviewSchema,
  importLoadingProgramSchema,
  bulletinConflictResolutionSchema,
  type BulletinHeader,
  type BulletinLineDraft,
  type BulletinIssue,
  type BulletinLinePreview,
  type BulletinPreview,
  type ImportLoadingProgramOptions,
  type BulletinConflictResolution,
} from './bulletin.js';

export {
  parseBulletinMatrix,
  parseBulletinDate,
  programCodeFromBulletin,
  preferredBulletinSheetName,
  isIgnoredBpWorkbookSheet,
  isPackingListWorkbookSheet,
  packingListSheetNames,
  bulletinSheetCellValue,
  type SpreadsheetCellLike,
} from './bulletin-parse.js';

export {
  buildBulletinSheetMatrix,
  suggestBulletinExportFilename,
  bulletinSheetMerges,
  bulletinColWidths,
  bulletinTotals,
  BULLETIN_COLUMN_HEADERS,
  BULLETIN_LETTERHEAD,
  BULLETIN_SHEET_NAME,
  BULLETIN_COL_WIDTHS,
  BULLETIN_DATE_NUMBER_FORMAT,
  BULLETIN_HEADER_ROW_COUNT,
} from './bulletin-export.js';
