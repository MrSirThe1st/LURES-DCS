import type { BulletinHeader, BulletinLineDraft } from './bulletin.js';

/**
 * Letterhead from the company BP049 workbook (sheet BP).
 * Includes the Chinese company name so WPS/Excel exports stay recognizable.
 */
export const BULLETIN_LETTERHEAD = {
  company: 'LUILU RESSOURCES SAS                       鲁依鲁资源简易股份有限公司',
  address1: '167 AV.BUKAMA Q.MUTOSHI',
  address2: 'C/MANIKA, KOLWEZI',
  address3: 'Province du Lualaba, Democratic Republic of Congo',
  tel: 'Tel:+243 843613879',
  email: 'E-mail:xieboyang@hkexcellen.com',
} as const;

export const BULLETIN_SHEET_NAME = 'BP';

/** Column character widths from BP049 sheet BP (A–M). */
export const BULLETIN_COL_WIDTHS = [
  5.5, 20.17, 13.17, 14.33, 11.33, 25.83, 42.33, 17.67, 63.5, 15.67, 11.33, 20.83, 20.83,
] as const;

export const BULLETIN_DATE_NUMBER_FORMAT = 'd-mmm-yy';

export const BULLETIN_COLUMN_HEADERS = [
  'NO.',
  'LOT NO.',
  'HORSE NO.',
  'TRAILER 1',
  'TRAILER 2',
  'CONTAINER NO',
  'DRIVER NAME',
  'PASSPORT',
  'TRANSPORTER',
  'BORDER',
  'PKGS',
  'G.W(T)',
  'N.W(T)',
] as const;

export type BulletinSheetMerge = {
  s: { c: number; r: number };
  e: { c: number; r: number };
};

/** Header block occupies Excel rows 1–11 (0-based 0–10); trucks start at index 11. */
export const BULLETIN_HEADER_ROW_COUNT = 11;

function blank(value: string | number | null | undefined): string | number {
  if (value == null || value === '') return '';
  return value;
}

function na(value: string | null | undefined): string {
  return value?.trim() ? value : 'NA';
}

function formatPlaceDate(iso: string | null, raw: string | null): string {
  if (raw && !/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  if (!iso) return raw ?? '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = months[Number(month) - 1] ?? month;
  return `${Number(day)}-${label}-${year.slice(2)}`;
}

export function bulletinTotals(lines: readonly BulletinLineDraft[]): {
  pkgs: number;
  gw: number;
  nw: number;
} {
  let pkgs = 0;
  let gw = 0;
  let nw = 0;
  for (const line of lines) {
    if (line.package_count != null) pkgs += line.package_count;
    if (line.gross_weight_t != null) gw += line.gross_weight_t;
    if (line.net_weight_t != null) nw += line.net_weight_t;
  }
  return { pkgs, gw: Number(gw.toFixed(3)), nw: Number(nw.toFixed(3)) };
}

/**
 * Merged ranges from the BP049 workbook, with the KOLWEZI merge shifted to the
 * signature row after `truckCount` data rows.
 */
export function bulletinSheetMerges(truckCount: number): BulletinSheetMerge[] {
  const signatureRow = BULLETIN_HEADER_ROW_COUNT + truckCount + 3;
  return [
    { s: { c: 0, r: 0 }, e: { c: 12, r: 1 } },
    { s: { c: 0, r: 2 }, e: { c: 1, r: 2 } },
    { s: { c: 10, r: 2 }, e: { c: 12, r: 2 } },
    { s: { c: 0, r: 3 }, e: { c: 1, r: 3 } },
    { s: { c: 10, r: 3 }, e: { c: 12, r: 3 } },
    { s: { c: 0, r: 4 }, e: { c: 1, r: 4 } },
    { s: { c: 2, r: 4 }, e: { c: 7, r: 5 } },
    { s: { c: 10, r: 8 }, e: { c: 12, r: 8 } },
    { s: { c: 8, r: signatureRow }, e: { c: 10, r: signatureRow } },
  ];
}

export function bulletinColWidths(): Array<{ wch: number }> {
  return BULLETIN_COL_WIDTHS.map((wch) => ({ wch }));
}

/**
 * Company BP sheet layout cloned from BP049 (letterhead, header block, trucks, TOTAL, signature).
 * Values are written as supplied — no transporter/client rewriting.
 */
export function buildBulletinSheetMatrix(
  header: BulletinHeader,
  lines: readonly BulletinLineDraft[],
): unknown[][] {
  const rows: unknown[][] = [
    [BULLETIN_LETTERHEAD.company, '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    [BULLETIN_LETTERHEAD.address1, '', '', '', '', '', '', '', '', '', BULLETIN_LETTERHEAD.tel, '', ''],
    [BULLETIN_LETTERHEAD.address2, '', '', '', '', '', '', '', '', '', BULLETIN_LETTERHEAD.email, '', ''],
    [
      BULLETIN_LETTERHEAD.address3,
      '',
      header.bulletin_number
        ? `BULLETIN DE PESAGE/WEIGHTING SHEET:${header.bulletin_number}`
        : 'BULLETIN DE PESAGE/WEIGHTING SHEET:',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    [
      header.client_name ? `Client:        ${header.client_name}` : 'Client:',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'AGENCE EN DOUANE:',
      '',
      header.customs_agency ?? '',
      '',
      '',
    ],
    [
      header.destination ? `Destination：${header.destination}` : 'Destination：',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'License NO.：',
      '',
      header.license_number ?? '',
      '',
      '',
    ],
    [
      header.cargo_description ? `Product:     ${header.cargo_description}` : 'Product:',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Loading Point: ',
      '',
      header.loading_point ?? '',
      '',
      '',
    ],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    [...BULLETIN_COLUMN_HEADERS],
  ];

  const totals = bulletinTotals(lines);
  for (const line of lines) {
    rows.push([
      blank(line.sequence),
      blank(line.packing_list_number),
      line.vehicle_registration,
      na(line.trailer_registration),
      na(line.trailer_registration_2),
      na(line.container_number),
      blank(line.driver_name),
      blank(line.driver_passport_reference),
      blank(line.transporter_name),
      blank(line.border),
      blank(line.package_count),
      blank(line.gross_weight_t),
      blank(line.net_weight_t),
    ]);
  }

  rows.push(['', '', '', '', '', '', '', '', 'TOTAL', '', totals.pkgs || '', totals.gw, totals.nw]);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push([
    '',
    'SIGNATURE:',
    '',
    '',
    '',
    '',
    '',
    '',
    'KOLWEZI,',
    '',
    '',
    '',
    formatPlaceDate(header.loading_date, header.place_date_raw),
  ]);

  return rows;
}

function compactBulletinStamp(header: BulletinHeader): string | null {
  if (!header.loading_date || !header.bulletin_number) return null;
  const tail = header.bulletin_number.match(/(\d{2,4})\s*$/);
  if (!tail?.[1]) return null;
  const compactDate = header.loading_date.replace(/-/g, '');
  return `${compactDate}${tail[1].padStart(3, '0')}`;
}

export function suggestBulletinExportFilename(
  header: BulletinHeader,
  lines: readonly BulletinLineDraft[] = [],
): string {
  const code = header.program_code ?? 'BP';
  const stamp = compactBulletinStamp(header);
  const product =
    header.bulletin_number
      ?.replace(/-\d{4}-\d{1,2}-\d{1,2}-\d+\s*$/, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim() ?? 'bulletin';
  const nw = lines.length > 0 ? bulletinTotals(lines).nw : null;
  const nwPart = nw != null ? `-${nw}吨` : '';
  if (stamp) return `${code}-${product}-${stamp}${nwPart}.xlsx`;
  const bulletin = (header.bulletin_number ?? 'bulletin').replace(/[\\/:*?"<>|]/g, '_');
  return `${code}-${bulletin}${nwPart}.xlsx`;
}