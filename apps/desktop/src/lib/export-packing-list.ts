import { suggestBatchExportFilename } from '@lures-dcs/api-contracts';
import {
  fetchTrucksForExport,
  recordTruckExportAudit,
  type ExportActor,
} from '@lures-dcs/data-access';
import { buildPackingListPdf } from './packing-list-pdf';
import { downloadPdf, openPdfForPrint } from './save-pdf';
import { getSupabaseClient } from './supabase';

export type RunPackingListExportInput = {
  truckIds: readonly string[];
  actor: ExportActor;
  /** When true, also open the system print dialog after download. */
  print?: boolean;
};

export type RunPackingListExportResult = {
  truckCount: number;
  filename: string;
  nonCompletedCount: number;
};

/**
 * Fetch trucks, generate PDF, download (and optionally print), then audit.
 */
export async function runPackingListExport(
  input: RunPackingListExportInput,
): Promise<RunPackingListExportResult> {
  const truckIds = [...new Set(input.truckIds.filter(Boolean))];
  if (truckIds.length === 0) {
    throw new Error('Select one or more trucks, or open a truck detail, before exporting.');
  }

  const client = getSupabaseClient();
  const records = await fetchTrucksForExport({ client, truckIds });
  if (records.length === 0) {
    throw new Error('No truck records found for export.');
  }

  const bytes = await buildPackingListPdf(records);
  const filename = suggestBatchExportFilename(records);
  downloadPdf(bytes, filename);
  if (input.print) {
    openPdfForPrint(bytes);
  }

  await recordTruckExportAudit({
    client,
    records,
    actor: input.actor,
  });

  return {
    truckCount: records.length,
    filename,
    nonCompletedCount: records.filter((record) => record.status !== 'completed').length,
  };
}
