import { normalizeVehicleRegistration } from '@lures-dcs/domain';
import {
  loadingOrderLineDraftSchema,
  type LoadingOrderHeader,
  type LoadingOrderIssue,
  type LoadingOrderLineDraft,
  type LoadingOrderLinePreview,
  type LoadingOrderPreview,
} from './loading-order.js';

const EMPTY_MARKERS = new Set(['', 'na', 'n/a', 'n.a.', '-', '/', 'null', 'none']);

const HEADER_LABELS = {
  transporter: 'TRANSPORTER',
  truck: 'TRUCK',
  trailer1: 'TRAILER 1',
  trailer2: 'TRAILER 2',
  driver: 'DRIVER NAME',
  passport: 'PASSPORT',
  tonnage: 'TONNAGE',
  border: 'EXIT BORDER',
  destination: 'FINAL DESTINATION',
  eta: 'ETA TO MINE',
  sn: 'S/N',
} as const;

function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const rounded = new Date(Math.round(value.getTime() / 86_400_000) * 86_400_000);
    return rounded.toISOString().slice(0, 10);
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
  const normalized = text.replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  const rounded = Math.round(parsed);
  if (Math.abs(parsed - rounded) > 0.001) return rounded;
  return rounded;
}

/** Loading Order dates use DD-MM-YYYY. */
export function parseEtaDate(value: unknown): { iso: string | null; onSite: boolean; raw: string | null } {
  const raw = nullableText(value);
  if (!raw) return { iso: null, onSite: false, raw: null };
  if (raw.toLowerCase() === 'on site') return { iso: null, onSite: true, raw };

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1]?.padStart(2, '0');
    const month = dmy[2]?.padStart(2, '0');
    const year = dmy[3];
    if (day && month && year) {
      return { iso: `${year}-${month}-${day}`, onSite: false, raw };
    }
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso?.[1] && iso[2] && iso[3]) {
    return { iso: `${iso[1]}-${iso[2]}-${iso[3]}`, onSite: false, raw };
  }

  return { iso: null, onSite: false, raw };
}

function findLabelValue(rows: unknown[][], label: string): string | null {
  const needle = label.toUpperCase();
  for (const row of rows) {
    const cells = (row ?? []).map(cellText);
    const idx = cells.findIndex((cell) => cell.toUpperCase() === needle);
    if (idx < 0) continue;
    for (let i = idx + 1; i < cells.length; i += 1) {
      const value = nullableText(cells[i]);
      if (value && value.toUpperCase() !== 'MT' && value.toUpperCase() !== 'TRUCKS') {
        return value;
      }
    }
  }
  return null;
}

function headerIndex(row: unknown[], label: string): number {
  return row.findIndex((cell) => cellText(cell).toUpperCase() === label);
}

function isLoadingOrderHeaderRow(row: unknown[]): boolean {
  return headerIndex(row, HEADER_LABELS.transporter) >= 0 && headerIndex(row, HEADER_LABELS.truck) >= 0;
}

function parseMtAndTrucks(
  rows: unknown[][],
  label: string,
): { mt: number | null; trucks: number | null } {
  const needle = label.toUpperCase();
  for (const row of rows) {
    const cells = row ?? [];
    for (let i = 0; i < cells.length; i += 1) {
      if (cellText(cells[i]).toUpperCase() !== needle) continue;
      return { mt: parseNumber(cells[i + 1]), trucks: parseInteger(cells[i + 2]) };
    }
  }
  return { mt: null, trucks: null };
}

function parseHeader(rows: unknown[][]): LoadingOrderHeader {
  const allocation = parseMtAndTrucks(rows, 'ALLOCATION');
  const booked = parseMtAndTrucks(rows, 'BOOKED');
  const balance = parseMtAndTrucks(rows, 'BALANCE');

  return {
    client_name: findLabelValue(rows, 'CLIENT'),
    loading_point: findLabelValue(rows, 'LOADING POINT'),
    offloading_point: findLabelValue(rows, 'OFFLOADING POINT'),
    period_month: findLabelValue(rows, 'MONTH'),
    allocation_mt: allocation.mt,
    booked_mt: booked.mt,
    balance_mt: balance.mt,
    allocation_truck_count: allocation.trucks,
    booked_truck_count: booked.trucks,
    balance_truck_count: balance.trucks,
  };
}

function parseLine(row: unknown[], headerRow: unknown[]): LoadingOrderLineDraft | null {
  const col = (label: string) => headerIndex(headerRow, label);
  const truck = nullableText(row[col(HEADER_LABELS.truck)]);
  if (!truck) return null;

  const eta = parseEtaDate(row[col(HEADER_LABELS.eta)]);
  const sequence = parseInteger(row[col(HEADER_LABELS.sn)]);

  return {
    sequence,
    transporter_name: nullableText(row[col(HEADER_LABELS.transporter)]),
    vehicle_registration: truck,
    trailer_registration: nullableText(row[col(HEADER_LABELS.trailer1)]),
    trailer_registration_2: nullableText(row[col(HEADER_LABELS.trailer2)]),
    driver_name: nullableText(row[col(HEADER_LABELS.driver)]),
    driver_passport_reference: nullableText(row[col(HEADER_LABELS.passport)]),
    planned_tonnage: parseNumber(row[col(HEADER_LABELS.tonnage)]),
    border: nullableText(row[col(HEADER_LABELS.border)]),
    final_destination: nullableText(row[col(HEADER_LABELS.destination)]),
    eta_to_mine: eta.iso,
    on_site: eta.onSite,
    eta_raw: eta.raw,
    plate_highlight: null,
  };
}

export const ETA_IMPLAUSIBLE_CODE = 'eta_implausible';

/** Unusual calendar year on ETA TO MINE. Never auto-correct; manager reviews. */
export function isImplausibleEta(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const year = Number(iso.slice(0, 4));
  return year < 2020 || year > 2026;
}

/**
 * Parse a Loading Order sheet (CLIENT / LOADING POINT header + TRUCK column).
 * Returns null when the matrix is not this document.
 */
export function parseLoadingOrderMatrix(
  matrix: unknown[][],
  sourceFilename?: string,
): LoadingOrderPreview | null {
  const rows = matrix.filter((row) => (row ?? []).some((cell) => cellText(cell).length > 0));
  const headerRowIndex = rows.findIndex(isLoadingOrderHeaderRow);
  if (headerRowIndex < 0) return null;
  if (findLabelValue(rows.slice(0, headerRowIndex + 1), 'CLIENT') == null) return null;

  const headerRow = rows[headerRowIndex] ?? [];
  const header = parseHeader(rows.slice(0, headerRowIndex + 1));
  const issues: LoadingOrderIssue[] = [];
  const lines = [];
  const seenPlates = new Map<string, number>();

  for (const row of rows.slice(headerRowIndex + 1)) {
    const snText = cellText(row[headerIndex(headerRow, HEADER_LABELS.sn)]);
    if (snText && !/^\d+$/.test(snText)) continue;
    const draft = parseLine(row, headerRow);
    if (!draft) continue;
    if (!draft.transporter_name && !draft.driver_name) continue;

    const lineIssues: LoadingOrderIssue[] = [];
    const parsed = loadingOrderLineDraftSchema.safeParse(draft);
    if (!parsed.success) {
      lineIssues.push({
        severity: 'error',
        message: 'Row is missing a truck/horse registration.',
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

    if (draft.eta_raw && !draft.on_site && !draft.eta_to_mine) {
      lineIssues.push({
        severity: 'warning',
        message: `Could not parse ETA TO MINE “${draft.eta_raw}”.`,
        truck_key: draft.vehicle_registration,
        field: 'eta_to_mine',
      });
    }
    if (isImplausibleEta(draft.eta_to_mine)) {
      lineIssues.push({
        severity: 'warning',
        message: `ETA TO MINE ${draft.eta_to_mine} looks implausible.`,
        truck_key: draft.vehicle_registration,
        field: 'eta_to_mine',
        code: ETA_IMPLAUSIBLE_CODE,
      });
    }

    lines.push({ draft, issues: lineIssues });
  }

  if (lines.length === 0) {
    issues.push({ severity: 'error', message: 'No truck rows found on the Loading Order.' });
  }
  if (!header.client_name) {
    issues.push({ severity: 'warning', message: 'CLIENT is missing on the Loading Order header.' });
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
  };
}

const IGNORED_FILLS = new Set(['#FFFFFF', '#000000', '#002060']);

/** Excel cell fill → #RRGGBB. Ignores white/navy/theme-default so only operational highlights remain. */
export function excelFillToHex(
  fgColor: { rgb?: string; theme?: number } | undefined,
  patternType?: string,
): string | null {
  if (!patternType || patternType === 'none') return null;
  const rgb = fgColor?.rgb;
  if (!rgb) return null;
  const raw = rgb.toUpperCase();
  const body = raw.length === 8 ? raw.slice(2) : raw;
  if (!/^[0-9A-F]{6}$/.test(body)) return null;
  const hex = `#${body}`;
  if (IGNORED_FILLS.has(hex)) return null;
  return hex;
}

export function applyPlateHighlights(
  preview: LoadingOrderPreview,
  highlights: Record<string, string>,
): LoadingOrderPreview {
  if (Object.keys(highlights).length === 0) return preview;
  return {
    ...preview,
    lines: preview.lines.map((line) => {
      const hex = highlights[normalizeVehicleRegistration(line.draft.vehicle_registration)];
      if (!hex) return line;
      return { ...line, draft: { ...line.draft, plate_highlight: hex } };
    }),
  };
}

export function hasImplausibleEtaIssue(line: LoadingOrderLinePreview): boolean {
  return line.issues.some((issue) => issue.code === ETA_IMPLAUSIBLE_CODE);
}

export function sourceEtaIso(draft: LoadingOrderLineDraft): string | null {
  return parseEtaDate(draft.eta_raw).iso ?? draft.eta_to_mine;
}

export function applyEtaReview(
  line: LoadingOrderLinePreview,
  decision: 'kept' | 'cleared' | { to: string | null },
): LoadingOrderLinePreview {
  const sourceIso = sourceEtaIso(line.draft);
  if (decision === 'kept') {
    return {
      ...line,
      draft: {
        ...line.draft,
        eta_to_mine: sourceIso,
        eta_review: 'kept',
      },
    };
  }
  if (decision === 'cleared') {
    return {
      ...line,
      draft: {
        ...line.draft,
        eta_to_mine: null,
        eta_review: 'cleared',
      },
    };
  }
  const next = decision.to?.trim() || null;
  if (!next) {
    return applyEtaReview(line, 'cleared');
  }
  return {
    ...line,
    draft: {
      ...line.draft,
      eta_to_mine: next,
      eta_review: next === sourceIso ? 'kept' : 'edited',
    },
  };
}

export function resolveEtaReview(line: LoadingOrderLinePreview): LoadingOrderLinePreview {
  if (!hasImplausibleEtaIssue(line) || line.draft.eta_review) return line;
  return applyEtaReview(line, 'kept');
}
