import { parseLoadingOrderMatrix } from '@lures-dcs/api-contracts';
import {
  patchPreAlertDocumentHeader,
  type AppSupabaseClient,
  type Tables,
} from '@lures-dcs/data-access';
import { readLoadingOrderSpreadsheet } from './spreadsheet';

function missingHeaderTruckCounts(order: Tables<'pre_alerts'>): boolean {
  return order.allocation_truck_count == null || order.balance_truck_count == null;
}

/**
 * Orders imported before allocation/balance truck-count columns existed still have
 * MT values but show "—" for truck counts. Re-read the stored source workbook
 * header and persist those counts. Do not invent numbers if the file is unavailable.
 */
export async function hydratePreAlertHeaderFromStorage(
  client: AppSupabaseClient,
  order: Tables<'pre_alerts'>,
): Promise<Tables<'pre_alerts'>> {
  if (!missingHeaderTruckCounts(order) || !order.storage_path) return order;

  const { data, error } = await client.storage.from('operational-documents').download(order.storage_path);
  if (error || !data) return order;

  const file = new File([data], order.original_filename ?? 'loading-order.xlsx');
  const { matrix } = await readLoadingOrderSpreadsheet(file);
  const parsed = parseLoadingOrderMatrix(matrix, order.original_filename ?? undefined);
  if (!parsed) return order;
  if (parsed.header.allocation_truck_count == null && parsed.header.balance_truck_count == null) {
    return order;
  }

  const header = {
    allocation_mt: parsed.header.allocation_mt,
    booked_mt: parsed.header.booked_mt,
    balance_mt: parsed.header.balance_mt,
    allocation_truck_count: parsed.header.allocation_truck_count,
    booked_truck_count: parsed.header.booked_truck_count,
    balance_truck_count: parsed.header.balance_truck_count,
  };

  await patchPreAlertDocumentHeader(client, order.id, header);
  return { ...order, ...header };
}
