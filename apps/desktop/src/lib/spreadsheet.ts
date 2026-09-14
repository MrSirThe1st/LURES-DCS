import * as XLSX from 'xlsx';
import {
  bulletinSheetCellValue,
  excelFillToHex,
  isIgnoredBpWorkbookSheet,
  packingListSheetNames,
  preferredBulletinSheetName,
} from '@lures-dcs/api-contracts';
import { normalizeVehicleRegistration } from '@lures-dcs/domain';

export async function readWorkbook(file: File, options?: { cellStyles?: boolean }): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true, cellStyles: options?.cellStyles ?? false });
}

/**
 * Read the first sheet of a CSV/XLSX file as a matrix of cell values.
 */
export async function readSpreadsheetMatrix(file: File): Promise<unknown[][]> {
  const workbook = await readWorkbook(file);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return sheetToMatrix(sheet);
}

export async function readLoadingOrderSpreadsheet(
  file: File,
): Promise<{ matrix: unknown[][]; plateHighlights: Record<string, string> }> {
  const workbook = await readWorkbook(file, { cellStyles: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { matrix: [], plateHighlights: {} };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { matrix: [], plateHighlights: {} };
  return { matrix: sheetToMatrix(sheet), plateHighlights: plateHighlightsFromSheet(sheet) };
}

function plateHighlightsFromSheet(sheet: XLSX.WorkSheet): Record<string, string> {
  const ref = sheet['!ref'];
  if (!ref) return {};
  const range = XLSX.utils.decode_range(ref);
  let truckCol = -1;
  let headerRow = -1;
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (String(cell?.v ?? '').replace(/\s+/g, ' ').trim().toUpperCase() === 'TRUCK') {
        truckCol = c;
        headerRow = r;
      }
    }
  }
  if (truckCol < 0 || headerRow < 0) return {};

  const highlights: Record<string, string> = {};
  for (let r = headerRow + 1; r <= range.e.r; r += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: truckCol })] as XLSX.CellObject | undefined;
    const plate = String(cell?.v ?? '').replace(/\s+/g, ' ').trim();
    if (!plate) continue;
    const style = cell?.s as { patternType?: string; fgColor?: { rgb?: string; theme?: number } } | undefined;
    const hex = excelFillToHex(style?.fgColor, style?.patternType);
    if (!hex) continue;
    highlights[normalizeVehicleRegistration(plate)] = hex;
  }
  return highlights;
}

export async function readBulletinSheet(
  file: File,
): Promise<{ name: string; matrix: unknown[][] } | null> {
  const workbook = await readWorkbook(file);
  const preferred = preferredBulletinSheetName(workbook.SheetNames);
  const sheetName =
    preferred && !isIgnoredBpWorkbookSheet(preferred) ? preferred : workbook.SheetNames[0];
  if (!sheetName || isIgnoredBpWorkbookSheet(sheetName)) return null;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;
  return { name: sheetName, matrix: sheetToDisplayedMatrix(sheet) };
}

export async function readPackingListSheets(
  file: File,
): Promise<Array<{ name: string; matrix: unknown[][] }>> {
  const workbook = await readWorkbook(file);
  const names = packingListSheetNames(workbook.SheetNames);
  const sheets: Array<{ name: string; matrix: unknown[][] }> = [];
  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    sheets.push({ name, matrix: sheetToDisplayedMatrix(sheet) });
  }
  return sheets;
}

function sheetToDisplayedMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const matrix: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: unknown[] = [];
    let seen = false;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      const value = bulletinSheetCellValue(cell);
      row.push(value);
      if (value !== '' && value != null) seen = true;
    }
    if (seen) matrix.push(row);
  }
  return matrix;
}

function sheetToMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  }) as unknown[][];
}

