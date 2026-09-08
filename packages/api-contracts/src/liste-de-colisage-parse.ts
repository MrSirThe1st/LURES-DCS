import { calculateTruckTotalWeightKg } from '@lures-dcs/domain';
import {
  importBagRowSchema,
  importTruckDraftSchema,
  type ImportIssue,
  type ImportPreview,
  type ImportTruckDraft,
  type ImportTruckPreview,
} from './import.js';

const EMPTY_MARKERS = new Set(['', 'na', 'n/a', 'n.a.', '-', '/', 'null', 'none']);

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** Canonical truck/list metadata keys (not bag columns). */
const META_KEYS = new Set([
  'packing_list_number',
  'loading_date',
  'cargo_description',
  'vehicle_registration',
  'trailer_registration',
  'trailer_registration_2',
  'container_number',
  'driver_name',
  'driver_passport_reference',
  'transporter_name',
  'loading_location',
  'transit_info',
  'border',
  'agent',
]);

/** Normalize spreadsheet header labels (FR/EN paper aliases) to canonical keys. */
const HEADER_ALIASES: Record<string, string> = {
  lot_number: 'packing_list_number',
  lot_no: 'packing_list_number',
  lot: 'packing_list_number',
  packing_list_number: 'packing_list_number',
  n_de_liste_de_colisage: 'packing_list_number',
  no_de_liste_de_colisage: 'packing_list_number',
  numero_de_liste_de_colisage: 'packing_list_number',
  loading_date: 'loading_date',
  date: 'loading_date',
  cargo_description: 'cargo_description',
  cargo: 'cargo_description',
  description: 'cargo_description',
  product: 'cargo_description',
  vehicle_registration: 'vehicle_registration',
  cheval: 'vehicle_registration',
  horse: 'vehicle_registration',
  horse_no: 'vehicle_registration',
  truck: 'vehicle_registration',
  trailer_registration: 'trailer_registration',
  trailer: 'trailer_registration',
  trailer_1: 'trailer_registration',
  remorque: 'trailer_registration',
  remorque_1: 'trailer_registration',
  chariot_remorque_1: 'trailer_registration',
  trailer_registration_2: 'trailer_registration_2',
  trailer_2: 'trailer_registration_2',
  remorque_2: 'trailer_registration_2',
  chariot_remorque_2: 'trailer_registration_2',
  container_number: 'container_number',
  container: 'container_number',
  container_no: 'container_number',
  driver_name: 'driver_name',
  driver: 'driver_name',
  conducteur: 'driver_name',
  driver_passport_reference: 'driver_passport_reference',
  passport: 'driver_passport_reference',
  transporter_name: 'transporter_name',
  transporter: 'transporter_name',
  transporteur: 'transporter_name',
  loading_location: 'loading_location',
  lieu_de_chargement: 'loading_location',
  loading_point: 'loading_location',
  transit_info: 'transit_info',
  transit: 'transit_info',
  border: 'border',
  agent: 'agent',
  bag_no: 'bag_number',
  bag_number: 'bag_number',
  bag: 'bag_number',
  net_weight_kg: 'net_weight_kg',
  net_weight: 'net_weight_kg',
  net_weight_kg_kg: 'net_weight_kg',
  weight_kg: 'net_weight_kg',
  seal_no: 'seal_number',
  seal_number: 'seal_number',
  seal: 'seal_number',
  no: '_row_no',
  n: '_row_no',
};

function normalizeHeader(raw: string): string {
  const key = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/°/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return HEADER_ALIASES[key] ?? key;
}

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

function nullableText(value: unknown): string | null {
  const text = cellToString(value);
  if (EMPTY_MARKERS.has(text.toLowerCase())) return null;
  return text;
}

function parseWeightKg(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cellToString(value).replace(/\s/g, '').replace(',', '.');
  if (!text || EMPTY_MARKERS.has(text.toLowerCase())) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Parse ISO date or common spreadsheet date strings to YYYY-MM-DD. */
export function parseLoadingDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + value * 86400000;
    return toIsoDate(new Date(ms));
  }
  const text = cellToString(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return toIsoDate(new Date(Date.UTC(year, month - 1, day)));
  }
  const monName = text.match(/^(\d{1,2})[-\s]+([A-Za-zéûÉÛ]{3,})[-\s]+(\d{2,4})$/);
  if (monName) {
    const day = Number(monName[1]);
    const monthKey = monName[2]!
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .slice(0, 3);
    const month = MONTHS[monthKey] ?? MONTHS[monName[2]!.toLowerCase()];
    let year = Number(monName[3]);
    if (year < 100) year += 2000;
    if (month != null && day >= 1 && day <= 31) {
      return toIsoDate(new Date(Date.UTC(year, month, day)));
    }
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
  return null;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rowsToMatrix(rows: unknown[][]): string[][] {
  return rows.map((row) => row.map((cell) => cellToString(cell)));
}

function isBagHeaderRow(cells: string[]): boolean {
  const normalized = cells.map(normalizeHeader).filter(Boolean);
  return normalized.includes('bag_number') && normalized.includes('net_weight_kg');
}

function isFooterOrSectionRow(row: string[]): boolean {
  const joined = row.map((c) => c.trim()).filter(Boolean).join(' ').toLowerCase();
  if (!joined) return true;
  if (/^liste de colisage$/i.test(joined)) return true;
  if (/^d[ée]tails du camion$/i.test(joined)) return true;
  if (/^total\b/i.test(joined)) return true;
  if (/^beneficiary\b/i.test(joined)) return true;
  if (/^conseil\b/i.test(joined)) return true;
  if (/^(driver|supply|transport agent|security)\s*:/i.test(joined)) return true;
  return false;
}

/**
 * Extract label/value pairs from a row (supports Luilu two-column layout:
 * CHEVAL: | T681ERQ | … | CHARIOT-REMORQUE 2: | NA).
 */
function extractMetaPairs(row: string[]): Record<string, string> {
  const meta: Record<string, string> = {};
  for (let i = 0; i < row.length; i++) {
    const label = row[i] ?? '';
    if (!label.trim()) continue;
    const key = normalizeHeader(label);
    if (!META_KEYS.has(key)) continue;
    let j = i + 1;
    while (j < row.length && !(row[j] ?? '').trim()) j += 1;
    const value = row[j] ?? '';
    if (!value.trim()) continue;
    // Do not treat the next label as a value
    if (META_KEYS.has(normalizeHeader(value))) continue;
    meta[key] = value.trim();
    i = j;
  }
  return meta;
}

function parseMetaAndBagTable(matrix: string[][]): {
  meta: Record<string, string>;
  bagStart: number;
} {
  const meta: Record<string, string> = {};
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    if (isBagHeaderRow(row)) {
      return { meta, bagStart: i };
    }
    Object.assign(meta, extractMetaPairs(row));
  }
  return { meta, bagStart: -1 };
}

function draftFromMetaAndBags(
  meta: Record<string, string>,
  bags: ImportTruckDraft['bags'],
  sourceFile?: string,
): ImportTruckDraft {
  return {
    source_file: sourceFile,
    packing_list_number: nullableText(meta.packing_list_number),
    loading_date: parseLoadingDate(meta.loading_date),
    cargo_description: nullableText(meta.cargo_description),
    vehicle_registration: nullableText(meta.vehicle_registration) ?? '',
    trailer_registration: nullableText(meta.trailer_registration),
    trailer_registration_2: nullableText(meta.trailer_registration_2),
    container_number: nullableText(meta.container_number),
    driver_name: nullableText(meta.driver_name),
    driver_passport_reference: nullableText(meta.driver_passport_reference),
    transporter_name: nullableText(meta.transporter_name),
    loading_location: nullableText(meta.loading_location),
    transit_info: nullableText(meta.transit_info),
    border: nullableText(meta.border),
    agent: nullableText(meta.agent),
    bags,
  };
}

function parseDenormalized(matrix: string[][], sourceFile?: string): ImportTruckDraft | null {
  if (matrix.length < 2) return null;
  const headers = (matrix[0] ?? []).map(normalizeHeader);
  if (!headers.includes('bag_number') || !headers.includes('net_weight_kg')) {
    return null;
  }
  if (!headers.includes('vehicle_registration')) {
    return null;
  }

  const objects = matrix
    .slice(1)
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) obj[header] = row[index] ?? '';
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => v.trim() !== ''));

  if (objects.length === 0) return null;

  const first = objects[0]!;
  const bags = objects.flatMap((obj, index) => {
    const bagNumber = nullableText(obj.bag_number);
    const weight = parseWeightKg(obj.net_weight_kg);
    if (!bagNumber || weight == null) return [];
    return [
      {
        bag_number: bagNumber,
        net_weight_kg: weight,
        seal_number: nullableText(obj.seal_number),
        sort_order: index + 1,
      },
    ];
  });

  if (bags.length === 0) return null;

  return draftFromMetaAndBags(
    {
      packing_list_number: first.packing_list_number ?? '',
      loading_date: first.loading_date ?? '',
      cargo_description: first.cargo_description ?? '',
      vehicle_registration: first.vehicle_registration ?? '',
      trailer_registration: first.trailer_registration ?? '',
      trailer_registration_2: first.trailer_registration_2 ?? '',
      container_number: first.container_number ?? '',
      driver_name: first.driver_name ?? '',
      driver_passport_reference: first.driver_passport_reference ?? '',
      transporter_name: first.transporter_name ?? '',
      loading_location: first.loading_location ?? '',
      transit_info: first.transit_info ?? '',
      border: first.border ?? '',
      agent: first.agent ?? '',
    },
    bags.map((bag, index) => ({ ...bag, sort_order: index + 1 })),
    sourceFile,
  );
}

/**
 * Luilu / company liste de colisage layout (and simple key/value sheets):
 * letterhead, DESCRIPTION / DATE / CHEVAL two-column header block, then bag table,
 * then TOTAL / signature footer.
 */
function parseCompanyListeDeColisage(
  matrix: string[][],
  sourceFile?: string,
): ImportTruckDraft | null {
  const { meta, bagStart } = parseMetaAndBagTable(matrix);
  if (bagStart < 0) return null;
  if (!meta.vehicle_registration && !meta.packing_list_number) return null;

  const headerRow = matrix[bagStart] ?? [];
  const headers = headerRow.map(normalizeHeader);
  const bags: ImportTruckDraft['bags'] = [];

  for (let i = bagStart + 1; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    if (isFooterOrSectionRow(row)) break;

    const obj: Record<string, string> = {};
    headers.forEach((header, col) => {
      if (header) obj[header] = row[col] ?? '';
    });

    const bagNumber = nullableText(obj.bag_number);
    const weight = parseWeightKg(obj.net_weight_kg);
    if (!bagNumber || weight == null) continue;

    bags.push({
      bag_number: bagNumber,
      net_weight_kg: weight,
      seal_number: nullableText(obj.seal_number),
      sort_order: bags.length + 1,
    });
  }

  if (bags.length === 0) return null;

  return draftFromMetaAndBags(meta, bags, sourceFile);
}

/**
 * Parse one liste de colisage sheet as a matrix of cells.
 * Supports:
 * 1) Company Luilu layout (exact paper/CSV export)
 * 2) Denormalized header row with bag columns
 * 3) Simple key/value metadata + bag table
 */
export function parseListeDeColisageMatrix(
  rows: unknown[][],
  sourceFile?: string,
): ImportTruckDraft | null {
  const matrix = rowsToMatrix(rows).filter((row) => row.some((cell) => cell.trim() !== ''));
  if (matrix.length === 0) return null;

  const company = parseCompanyListeDeColisage(matrix, sourceFile);
  if (company) return company;

  const denormalized = parseDenormalized(matrix, sourceFile);
  if (denormalized) return denormalized;

  return null;
}

function truckIssues(draft: ImportTruckDraft): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const source_file = draft.source_file;
  const truck_key = draft.vehicle_registration || draft.packing_list_number || source_file;

  const parsed = importTruckDraftSchema.safeParse(draft);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        severity: 'error',
        message: `${issue.path.join('.') || 'truck'}: ${issue.message}`,
        source_file,
        truck_key: truck_key || undefined,
      });
    }
  }

  if (!draft.packing_list_number) {
    issues.push({
      severity: 'warning',
      message: 'Lot / liste de colisage number is missing.',
      source_file,
      truck_key: truck_key || undefined,
    });
  }

  const bagNumbers = new Set<string>();
  draft.bags.forEach((bag, index) => {
    const bagResult = importBagRowSchema.safeParse(bag);
    if (!bagResult.success) {
      issues.push({
        severity: 'error',
        message: `Bag row ${index + 1}: ${bagResult.error.issues[0]?.message ?? 'invalid'}`,
        source_file,
        truck_key: truck_key || undefined,
      });
      return;
    }
    if (bagNumbers.has(bag.bag_number)) {
      issues.push({
        severity: 'error',
        message: `Duplicate bag number ${bag.bag_number}`,
        source_file,
        truck_key: truck_key || undefined,
      });
    }
    bagNumbers.add(bag.bag_number);
  });

  return issues;
}

function toTruckPreview(draft: ImportTruckDraft): ImportTruckPreview {
  const issues = truckIssues(draft);
  const weights = draft.bags
    .map((bag) => bag.net_weight_kg)
    .filter((w) => Number.isFinite(w));

  return {
    source_file: draft.source_file,
    vehicle_registration: draft.vehicle_registration || '(missing)',
    packing_list_number: draft.packing_list_number ?? null,
    trailer_registration: draft.trailer_registration ?? null,
    driver_name: draft.driver_name ?? null,
    transporter_name: draft.transporter_name ?? null,
    bag_count: draft.bags.length,
    total_net_weight_kg: calculateTruckTotalWeightKg(weights),
    draft,
    issues,
  };
}

export type BuildImportPreviewInput = {
  /** Parsed drafts from one or more liste de colisage files. */
  drafts: ImportTruckDraft[];
  /** UI-selected loading date; used when files omit dates. */
  loadingDate: string;
};

/**
 * Validate and merge multiple liste de colisage drafts into an import preview.
 */
export function buildImportPreview(input: BuildImportPreviewInput): ImportPreview {
  const issues: ImportIssue[] = [];
  const trucks = input.drafts.map(toTruckPreview);

  if (trucks.length === 0) {
    issues.push({
      severity: 'error',
      message: 'No liste de colisage data found in the selected files.',
    });
  }

  const vehicleSeen = new Map<string, string>();
  const lotSeen = new Map<string, string>();

  for (const truck of trucks) {
    const vehicleKey = truck.vehicle_registration.trim().toUpperCase();
    if (vehicleKey && vehicleKey !== '(MISSING)') {
      const prior = vehicleSeen.get(vehicleKey);
      if (prior) {
        issues.push({
          severity: 'error',
          message: `Duplicate vehicle registration ${truck.vehicle_registration} in batch (also in ${prior}).`,
          source_file: truck.source_file,
          truck_key: truck.vehicle_registration,
        });
      } else {
        vehicleSeen.set(vehicleKey, truck.source_file ?? truck.vehicle_registration);
      }
    }

    const lot = truck.packing_list_number?.trim().toUpperCase();
    if (lot) {
      const prior = lotSeen.get(lot);
      if (prior) {
        issues.push({
          severity: 'error',
          message: `Duplicate lot / liste de colisage ${truck.packing_list_number} in batch (also in ${prior}).`,
          source_file: truck.source_file,
          truck_key: truck.vehicle_registration,
        });
      } else {
        lotSeen.set(lot, truck.source_file ?? truck.vehicle_registration);
      }
    }

    issues.push(...truck.issues);
  }

  const dates = trucks
    .map((t) => t.draft.loading_date)
    .filter((d): d is string => Boolean(d));
  const uniqueDates = [...new Set(dates)];
  if (uniqueDates.length > 1) {
    issues.push({
      severity: 'warning',
      message: `Files contain multiple loading dates (${uniqueDates.join(', ')}); using selected date ${input.loadingDate}.`,
    });
  }

  const loading_date = input.loadingDate || uniqueDates[0] || todayIso();
  const has_errors = issues.some((i) => i.severity === 'error');

  return {
    loading_date,
    trucks,
    issues,
    has_errors,
  };
}
