import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildBulletinSheetMatrix,
  bulletinSheetMerges,
  suggestBulletinExportFilename,
} from './bulletin-export.js';
import {
  bulletinSheetCellValue,
  isIgnoredBpWorkbookSheet,
  packingListSheetNames,
  parseBulletinDate,
  parseBulletinMatrix,
  preferredBulletinSheetName,
  programCodeFromBulletin,
} from './bulletin-parse.js';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../fixtures/import');
const jsonFixturePath = path.join(fixturesDir, 'bp049-lu-ex-conc.json');
const xlsxFixturePath = path.join(fixturesDir, 'bp049-lu-ex-conc.xlsx');

function matrixFromBulletinSheet(sheet: XLSX.WorkSheet): unknown[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const matrix: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: unknown[] = [];
    let seen = false;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      const value = bulletinSheetCellValue(cell);
      row.push(value);
      if (value !== '' && value != null) seen = true;
    }
    if (seen) matrix.push(row);
  }
  return matrix;
}

describe('parseBulletinDate', () => {
  it('parses 11-Sep-26', () => {
    expect(parseBulletinDate('11-Sep-26')).toBe('2026-09-11');
  });

  it('keeps the local calendar day from Date cells', () => {
    expect(parseBulletinDate(new Date(2026, 8, 11))).toBe('2026-09-11');
  });

  it('recovers 11-Sep-26 from a timezone-shifted Excel Date', () => {
    expect(parseBulletinDate(new Date('2026-09-10T21:59:42.000Z'))).toBe('2026-09-11');
  });
});

describe('bulletinSheetCellValue', () => {
  it('prefers the displayed date from an Excel serial cell', () => {
    expect(
      bulletinSheetCellValue({ t: 'n', v: 46276, z: 'd-mmm-yy', w: '11-Sep-26' }),
    ).toBe('11-Sep-26');
  });
});

describe('programCodeFromBulletin', () => {
  it('reads BP049 from the filename', () => {
    expect(programCodeFromBulletin('LU-EX Conc.-2026-9-11-049', 'BP049-LU-EX Conc.-20260911049-850.csv')).toBe(
      'BP049',
    );
  });
});

describe('workbook sheet selection', () => {
  it('prefers BP and ignores 装/发/放 sheets', () => {
    expect(preferredBulletinSheetName(['1装', 'BP', '1发', '1放'])).toBe('BP');
    expect(isIgnoredBpWorkbookSheet('1装')).toBe(true);
    expect(isIgnoredBpWorkbookSheet('26发')).toBe(true);
    expect(isIgnoredBpWorkbookSheet('1放')).toBe(true);
    expect(isIgnoredBpWorkbookSheet('BP')).toBe(false);
  });

  it('selects 装 sheets for packing-list import', () => {
    expect(packingListSheetNames(['BP', '1装', '2装', '1发', '1放'])).toEqual(['1装', '2装']);
    expect(packingListSheetNames(['Sheet1'])).toEqual(['Sheet1']);
    expect(packingListSheetNames(['BP'])).toEqual([]);
  });
});

describe('parseBulletinMatrix', () => {
  const matrix = JSON.parse(readFileSync(jsonFixturePath, 'utf8')) as unknown[][];

  it('returns null for a Loading Order sheet', () => {
    expect(
      parseBulletinMatrix([
        ['CLIENT', 'Glencore'],
        ['S/N', 'TRANSPORTER', 'TRUCK'],
        [1, 'FORSH', 'AJE6257ZM'],
      ]),
    ).toBeNull();
  });

  it('parses BP049 CSV/JSON fixture', () => {
    const preview = parseBulletinMatrix(matrix, 'BP049-LU-EX Conc.-20260911049-850.595吨.xlsx', 'BP');
    expect(preview).not.toBeNull();
    expect(preview?.header.bulletin_number).toBe('LU-EX Conc.-2026-9-11-049');
    expect(preview?.header.program_code).toBe('BP049');
    expect(preview?.header.client_name).toBe('SINGAPORE EXCELLEN PTE.LTD/SINGAPORE');
    expect(preview?.header.destination).toBe('Singapore');
    expect(preview?.header.cargo_description).toBe('COPPER CONCENTRATE');
    expect(preview?.header.customs_agency).toBe('CONNEX');
    expect(preview?.header.license_number).toBe('DEC1798930-4F06-EB');
    expect(preview?.header.loading_point).toBe('LUILU PLANT');
    expect(preview?.header.loading_date).toBe('2026-09-11');
    expect(preview?.lines).toHaveLength(26);
    expect(preview?.has_errors).toBe(false);

    const first = preview?.lines[0]?.draft;
    expect(first?.sequence).toBe(1);
    expect(first?.packing_list_number).toBe('EX202609-0506');
    expect(first?.vehicle_registration).toBe('T641EKD');
    expect(first?.trailer_registration).toBe('T560EKD');
    expect(first?.trailer_registration_2).toBeNull();
    expect(first?.container_number).toBeNull();
    expect(first?.driver_name).toBe('OMARY HAMISI');
    expect(first?.transporter_name).toBe('VAN MO COMPANY LIMITED');
    expect(first?.border).toBe('Dar es Salaam');
    expect(first?.package_count).toBe(22);
    expect(first?.gross_weight_t).toBe(30.719);
    expect(first?.net_weight_t).toBe(30.653);

    const dualTrailer = preview?.lines.find((line) => line.draft.sequence === 7)?.draft;
    expect(dualTrailer?.trailer_registration_2).toBe('FPC421L');
    expect(dualTrailer?.border).toBe('DURBAN');
  });

  it('parses the original BP049 xlsx BP sheet the same as the CSV fixture', () => {
    const workbook = XLSX.read(readFileSync(xlsxFixturePath), { type: 'buffer', cellDates: true });
    expect(workbook.SheetNames[0]).toBe('BP');
    expect(workbook.SheetNames.some((name) => name.includes('装'))).toBe(true);
    const sheetName = preferredBulletinSheetName(workbook.SheetNames);
    expect(sheetName).toBe('BP');
    const preview = parseBulletinMatrix(
      matrixFromBulletinSheet(workbook.Sheets['BP']!),
      'BP049-LU-EX Conc.-20260911049-850.595吨.xlsx',
      sheetName ?? 'BP',
    );
    const csv = parseBulletinMatrix(matrix, 'BP049-LU-EX Conc.-20260911049-850.595吨.xlsx', 'BP');
    expect(preview).not.toBeNull();
    expect(preview?.header.bulletin_number).toBe(csv?.header.bulletin_number);
    expect(preview?.header.client_name).toBe(csv?.header.client_name);
    expect(preview?.header.destination).toBe('Singapore');
    expect(preview?.header.loading_date).toBe('2026-09-11');
    expect(preview?.lines).toHaveLength(26);
    expect(preview?.has_errors).toBe(false);
    expect(preview?.lines.map((line) => line.draft.vehicle_registration)).toEqual(
      csv?.lines.map((line) => line.draft.vehicle_registration),
    );
    expect(preview?.lines[0]?.draft.net_weight_t).toBeCloseTo(csv?.lines[0]?.draft.net_weight_t ?? 0, 3);
    expect(preview?.header.program_code).toBe('BP049');
  });

  it('round-trips through the company layout matrix', () => {
    const preview = parseBulletinMatrix(matrix, 'BP049-LU-EX Conc.xlsx');
    expect(preview).not.toBeNull();
    const exported = buildBulletinSheetMatrix(
      preview!.header,
      preview!.lines.map((line) => line.draft),
    );
    const again = parseBulletinMatrix(exported, 'BP049-export.xlsx');
    expect(again?.header.bulletin_number).toBe(preview?.header.bulletin_number);
    expect(again?.header.client_name).toBe(preview?.header.client_name);
    expect(again?.header.destination).toBe(preview?.header.destination);
    expect(again?.header.loading_date).toBe(preview?.header.loading_date);
    expect(again?.lines).toHaveLength(26);
    expect(again?.lines[0]?.draft.vehicle_registration).toBe('T641EKD');
    expect(again?.lines[0]?.draft.transporter_name).toBe('VAN MO COMPANY LIMITED');
    expect(bulletinSheetMerges(26).at(-1)).toEqual({ s: { c: 8, r: 40 }, e: { c: 10, r: 40 } });
    expect(
      suggestBulletinExportFilename(
        preview!.header,
        preview!.lines.map((line) => line.draft),
      ),
    ).toBe('BP049-LU-EX Conc.-20260911049-850.595吨.xlsx');
  });
});
