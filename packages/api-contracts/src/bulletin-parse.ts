import { normalizeVehicleRegistration } from '@lures-dcs/domain';
import {
  bulletinLineDraftSchema,
  type BulletinHeader,
  type BulletinIssue,
  type BulletinLineDraft,
  type BulletinPreview,
} from './bulletin.js';

const EMPTY_MARKERS = new Set(['', 'na', 'n/a', 'n.a.', '-', '/', 'null', 'none']);

const COLUMN_LABELS = {
  no: 'NO.',
  lot: 'LOT NO.',
  horse: 'HORSE NO.',
  trailer1: 'TRAILER 1',
  trailer2: 'TRAILER 2',
  container: 'CONTAINER NO',
  driver: 'DRIVER NAME',
  passport: 'PASSPORT',
  transporter: 'TRANSPORTER',
  border: 'BORDER',
  pkgs: 'PKGS',
  gw: 'G.W(T)',
  nw: 'N.W(T)',
} as const;

const MONTHS: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

function excelDateToIso(value: Date): string {
  const rounded = new Date(Math.round(value.getTime() / 86_400_000) * 86_400_000);
  return rounded.toISOString().slice(0, 10);
}

export type SpreadsheetCellLike = {
  t?: string;
  v?: unknown;
  w?: string;
  z?: string | number;
};

function isExcelDateNumberFormat(format: string | number | undefined): boolean {
  if (format == null || format === '') return false;
  const text = String(format);
  return /d-mmm|mmm-yy|yyyy|yy/i.test(text) && /d/i.test(text);
}

/**
 * Normalize a SheetJS cell for BP parsing. Prefer the workbook's displayed date
 * (`w`, e.g. 11-Sep-26) over a timezone-shifted Date/serial.
 */
export function bulletinSheetCellValue(cell: SpreadsheetCellLike | null | undefined): unknown {
  if (!cell || cell.v == null || cell.v === '') return '';
  const formatted = typeof cell.w === 'string' ? cell.w.trim() : '';
  const looksLikeDate =
    cell.t === 'd' || cell.v instanceof Date || isExcelDateNumberFormat(cell.z);
  if (looksLikeDate) {
    if (formatted && parseBulletinDate(formatted)) return formatted;
    if (cell.v instanceof Date) return cell.v;
  }
  return cell.v;
}

function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return excelDateToIso(value);
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function isEmptyMarker(value: string): boolean {
  return EMPTY_MARKERS.has(value.toLowerCase());
}

function nullableText(value: unknown): string | null {
  const text = cellText(value);
  if (!text || isEmptyMarker(text)) return null;
  return text;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = nullableText(value);
  if (!text) return null;
  const parsed = Number(text.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  return Math.round(parsed);
}

export function parseBulletinDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return excelDateToIso(value);
  }
  const raw = nullableText(value);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso?.[1] && iso[2] && iso[3]) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy?.[1] && dmy[2] && dmy[3]) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  const named = raw.match(/^(\d{1,2})[- ]([A-Za-z]+)[- ](\d{2,4})$/);
  if (named?.[1] && named[2] && named[3]) {
    const month = MONTHS[named[2].toLowerCase()];
    if (!month) return null;
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${year}-${month}-${named[1].padStart(2, '0')}`;
  }

  return null;
}

export function programCodeFromBulletin(
  bulletinNumber: string | null,
  filename: string | null,
): string | null {
  const fromFile = filename?.match(/\bBP\s*0*(\d{1,4})\b/i);
  if (fromFile?.[1]) return `BP${fromFile[1].padStart(3, '0')}`;
  const tail = bulletinNumber?.match(/(\d{2,4})\s*$/);
  if (tail?.[1]) return `BP${tail[1].padStart(3, '0')}`;
  return null;
}

function headerIndex(row: unknown[], label: string): number {
  const needle = label.toUpperCase().replace(/\s+/g, ' ');
  return row.findIndex((cell) => cellText(cell).toUpperCase().replace(/\s+/g, ' ') === needle);
}

function isBulletinHeaderRow(row: unknown[]): boolean {
  return headerIndex(row, COLUMN_LABELS.horse) >= 0 && headerIndex(row, COLUMN_LABELS.lot) >= 0;
}

function findPrefixedValue(rows: unknown[][], prefixes: readonly string[]): string | null {
  for (const row of rows) {
    const cells = (row ?? []).map(cellText);
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i] ?? '';
      const upper = cell.toUpperCase();
      for (const prefix of prefixes) {
        if (!upper.startsWith(prefix.toUpperCase())) continue;
        const rest = cell.slice(prefix.length).replace(/^[\s:：?？]+/, '').trim();
        if (rest && !isEmptyMarker(rest)) return rest;
        for (let j = i + 1; j < cells.length; j += 1) {
          const next = nullableText(cells[j]);
          if (next) return next;
        }
      }
    }
  }
  return null;
}

function findKolweziDate(rows: unknown[][]): { iso: string | null; raw: string | null } {
  for (const row of rows) {
    const cells = (row ?? []).map(cellText);
    const idx = cells.findIndex((cell) => cell.toUpperCase().replace(/,$/, '') === 'KOLWEZI');
    if (idx < 0) continue;
    for (let i = idx + 1; i < cells.length; i += 1) {
      const iso = parseBulletinDate(cells[i]);
      if (iso) return { iso, raw: nullableText(cells[i]) };
    }
  }
  return { iso: null, raw: null };
}

function parseHeader(rows: unknown[][], filename: string | null): BulletinHeader {
  const bulletin_number = findPrefixedValue(rows, ['BULLETIN DE PESAGE/WEIGHTING SHEET', 'BULLETIN DE PESAGE']);
  const place = findKolweziDate(rows);
  return {
    bulletin_number,
    program_code: programCodeFromBulletin(bulletin_number, filename),
    client_name: findPrefixedValue(rows, ['CLIENT']),
    destination: findPrefixedValue(rows, ['DESTINATION']),
    cargo_description: findPrefixedValue(rows, ['PRODUCT']),
    customs_agency: findPrefixedValue(rows, ['AGENCE EN DOUANE']),
    license_number: findPrefixedValue(rows, ['LICENSE NO.', 'LICENSE NO', 'LICENCE NO.', 'LICENCE NO']),
    loading_point: findPrefixedValue(rows, ['LOADING POINT']),
    loading_date: place.iso,
    place_date_raw: place.raw,
  };
}

function parseLine(row: unknown[], headerRow: unknown[]): BulletinLineDraft | null {
  const col = (label: string) => headerIndex(headerRow, label);
  const horse = nullableText(row[col(COLUMN_LABELS.horse)]);
  if (!horse) return null;
  const first = cellText(row[col(COLUMN_LABELS.no)]).toUpperCase();
  if (first === 'TOTAL' || first === 'SIGNATURE' || first.startsWith('SIGNATURE')) return null;

  return {
    sequence: parseInteger(row[col(COLUMN_LABELS.no)]),
    packing_list_number: nullableText(row[col(COLUMN_LABELS.lot)]),
    vehicle_registration: horse,
    trailer_registration: nullableText(row[col(COLUMN_LABELS.trailer1)]),
    trailer_registration_2: nullableText(row[col(COLUMN_LABELS.trailer2)]),
    container_number: nullableText(row[col(COLUMN_LABELS.container)]),
    driver_name: nullableText(row[col(COLUMN_LABELS.driver)]),
    driver_passport_reference: nullableText(row[col(COLUMN_LABELS.passport)]),
    transporter_name: nullableText(row[col(COLUMN_LABELS.transporter)]),
    border: nullableText(row[col(COLUMN_LABELS.border)]),
    package_count: parseInteger(row[col(COLUMN_LABELS.pkgs)]),
    gross_weight_t: parseNumber(row[col(COLUMN_LABELS.gw)]),
    net_weight_t: parseNumber(row[col(COLUMN_LABELS.nw)]),
  };
}

/**
 * Parse a company Bulletin de pesage / Loading Program sheet.
 * Returns null when the matrix is not this document (Loading Order, liste de colisage, etc.).
 */
export function parseBulletinMatrix(
  matrix: unknown[][],
  sourceFilename?: string,
  sourceSheet?: string,
): BulletinPreview | null {
  const rows = matrix.filter((row) => (row ?? []).some((cell) => cellText(cell).length > 0));
  const headerRowIndex = rows.findIndex(isBulletinHeaderRow);
  if (headerRowIndex < 0) return null;

  const allText = rows
    .flat()
    .map(cellText)
    .join(' ')
    .toUpperCase();
  if (!allText.includes('BULLETIN DE PESAGE')) return null;

  const headerRow = rows[headerRowIndex] ?? [];
  const header = parseHeader(rows, sourceFilename ?? null);
  const issues: BulletinIssue[] = [];
  const lines: BulletinPreview['lines'] = [];
  const seenPlates = new Map<string, number>();
  const seenLots = new Map<string, string>();

  for (const row of rows.slice(headerRowIndex + 1)) {
    const noText = cellText(row[headerIndex(headerRow, COLUMN_LABELS.no)]).toUpperCase();
    if (noText === 'TOTAL' || noText.startsWith('SIGNATURE')) continue;
    const transporterCell = cellText(row[headerIndex(headerRow, COLUMN_LABELS.transporter)]).toUpperCase();
    if (transporterCell === 'TOTAL') continue;

    const draft = parseLine(row, headerRow);
    if (!draft) continue;

    const lineIssues: BulletinIssue[] = [];
    const parsed = bulletinLineDraftSchema.safeParse(draft);
    if (!parsed.success) {
      lineIssues.push({
        severity: 'error',
        message: 'Row is missing a horse registration.',
        truck_key: draft.vehicle_registration,
      });
    }

    const plate = normalizeVehicleRegistration(draft.vehicle_registration);
    const prior = seenPlates.get(plate);
    if (prior != null) {
      lineIssues.push({
        severity: 'error',
        message: `Duplicate horse ${draft.vehicle_registration} (also row ${prior}).`,
        truck_key: draft.vehicle_registration,
        field: 'vehicle_registration',
      });
    } else {
      seenPlates.set(plate, draft.sequence ?? seenPlates.size + 1);
    }

    const lot = draft.packing_list_number?.trim().toUpperCase();
    if (lot) {
      const priorLot = seenLots.get(lot);
      if (priorLot) {
        lineIssues.push({
          severity: 'error',
          message: `Duplicate LOT ${draft.packing_list_number} (also ${priorLot}).`,
          truck_key: draft.vehicle_registration,
          field: 'packing_list_number',
        });
      } else {
        seenLots.set(lot, draft.vehicle_registration);
      }
    }

    lines.push({ draft, issues: lineIssues });
  }

  if (lines.length === 0) {
    issues.push({ severity: 'error', message: 'No truck rows found on the Loading Program / BP.' });
  }
  if (!header.bulletin_number) {
    issues.push({ severity: 'warning', message: 'BULLETIN DE PESAGE number is missing.' });
  }
  if (!header.loading_date) {
    issues.push({ severity: 'warning', message: 'Loading date (KOLWEZI) could not be parsed.' });
  }

  const has_errors =
    issues.some((issue) => issue.severity === 'error') ||
    lines.some((line) => line.issues.some((issue) => issue.severity === 'error'));

  return {
    header,
    lines,
    issues,
    has_errors,
    source_filename: sourceFilename ?? null,
    source_sheet: sourceSheet ?? null,
  };
}

/** True when a workbook sheet name is a packing list / invoice / exit pass, not the BP. */
export function isIgnoredBpWorkbookSheet(name: string): boolean {
  const trimmed = name.trim();
  if (/发|放|装/.test(trimmed)) return true;
  const upper = trimmed.toUpperCase();
  return upper.includes('FACTURE') || upper.includes('BON DE SORTIE');
}

/** Company packing lists live on 装 sheets (1装, 2装, …). */
export function isPackingListWorkbookSheet(name: string): boolean {
  return /装/.test(name.trim());
}

/**
 * Sheets to read for packing-list import: every 装 sheet when present.
 * Otherwise the first non-BP / non-发 / non-放 sheet (CSV or a single-truck workbook).
 */
export function packingListSheetNames(sheetNames: readonly string[]): string[] {
  const packing = sheetNames.filter(isPackingListWorkbookSheet);
  if (packing.length > 0) return packing;
  return sheetNames.filter((name) => {
    const trimmed = name.trim();
    if (trimmed.toUpperCase() === 'BP') return false;
    return !isIgnoredBpWorkbookSheet(trimmed);
  });
}

export function preferredBulletinSheetName(sheetNames: readonly string[]): string | null {
  const named = sheetNames.find((name) => name.trim().toUpperCase() === 'BP');
  if (named) return named;
  const first = sheetNames.find((name) => !isIgnoredBpWorkbookSheet(name));
  return first ?? null;
}
