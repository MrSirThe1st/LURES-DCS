import {
  BULLETIN_DATE_NUMBER_FORMAT,
  BULLETIN_HEADER_ROW_COUNT,
  BULLETIN_SHEET_NAME,
  buildBulletinSheetMatrix,
  bulletinColWidths,
  bulletinSheetMerges,
  suggestBulletinExportFilename,
  type BulletinHeader,
  type BulletinLineDraft,
} from '@lures-dcs/api-contracts';
import { fetchLoadingProgramForExport } from '@lures-dcs/data-access';
import * as XLSX from 'xlsx';
import { downloadBytes } from './download';
import { getSupabaseClient } from './supabase';

function headerFromList(
  list: Awaited<ReturnType<typeof fetchLoadingProgramForExport>>['list'],
): BulletinHeader {
  return {
    bulletin_number: list.bulletin_number,
    program_code: list.program_code,
    client_name: list.client_name,
    destination: list.destination,
    cargo_description: list.cargo_description,
    customs_agency: list.customs_agency,
    license_number: list.license_number,
    loading_point: list.loading_point,
    loading_date: list.loading_date,
    place_date_raw: null,
  };
}

function lineFromTruck(
  truck: Awaited<ReturnType<typeof fetchLoadingProgramForExport>>['trucks'][number],
): BulletinLineDraft {
  return {
    sequence: truck.program_sequence,
    packing_list_number: truck.packing_list_number,
    vehicle_registration: truck.vehicle_registration,
    trailer_registration: truck.trailer_registration,
    trailer_registration_2: truck.trailer_registration_2,
    container_number: truck.container_number,
    driver_name: truck.driver_name,
    driver_passport_reference: truck.driver_passport_reference,
    transporter_name: truck.transporter_name,
    border: truck.border,
    package_count: truck.package_count,
    gross_weight_t: truck.gross_weight_t,
    net_weight_t: truck.net_weight_t,
  };
}

export async function runBulletinExcelExport(loadingListId: string): Promise<{ filename: string }> {
  const snapshot = await fetchLoadingProgramForExport(getSupabaseClient(), loadingListId);
  const header = headerFromList(snapshot.list);
  const lines = snapshot.trucks.map(lineFromTruck);
  const matrix = buildBulletinSheetMatrix(header, lines);
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  sheet['!cols'] = bulletinColWidths();
  sheet['!merges'] = bulletinSheetMerges(lines.length);
  const dateAddr = XLSX.utils.encode_cell({
    r: BULLETIN_HEADER_ROW_COUNT + lines.length + 3,
    c: 12,
  });
  const dateCell = sheet[dateAddr] as XLSX.CellObject | undefined;
  if (dateCell && typeof dateCell.v === 'string') {
    dateCell.z = BULLETIN_DATE_NUMBER_FORMAT;
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, BULLETIN_SHEET_NAME);
  const raw = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const bytes = raw instanceof Uint8Array ? raw : Uint8Array.from(raw as ArrayLike<number>);
  const filename = suggestBulletinExportFilename(header, lines);
  downloadBytes(bytes, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return { filename };
}