import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  packingListSheetNames,
  bulletinSheetCellValue,
} from './bulletin-parse.js';
import {
  buildImportPreview,
  parseListeDeColisageMatrix,
  parseLoadingDate,
} from './liste-de-colisage-parse.js';

const keyValueSheet = [
  ['lot_number', 'EX202609-0399'],
  ['loading_date', '2026-09-04'],
  ['cargo_description', 'CONCENTRÉ DE CUIVRE'],
  ['vehicle_registration', 'T582DTQ'],
  ['trailer_registration', 'T820DTQ'],
  ['trailer_registration_2', 'NA'],
  ['driver_name', 'KIMWELI MUSSA'],
  ['passport', 'TAE671764'],
  ['loading_location', "L'USINE DE LUILU"],
  ['transporter', 'GALCO TANZANIA LIMITED'],
  ['border', 'Dar es Salaam'],
  ['agent', 'CONNEX'],
  [],
  ['bag_no', 'net_weight_kg', 'seal_no'],
  ['LU-CC260722109', '1426', '114709'],
  ['LU-CC260722110', '1385', '114699'],
];

const denormalizedSheet = [
  [
    'lot_number',
    'loading_date',
    'vehicle_registration',
    'trailer_registration',
    'driver_name',
    'bag_no',
    'net_weight_kg',
    'seal_no',
  ],
  ['EX202609-0400', '2026-09-04', 'T583DTQ', 'T821DTQ', 'JEAN', 'LU-1', '1500', '100001'],
  ['EX202609-0400', '2026-09-04', 'T583DTQ', 'T821DTQ', 'JEAN', 'LU-2', '1510', '100002'],
];

/** Minimal CSV split that respects double-quoted fields. */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      rows.push([]);
      continue;
    }
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current);
    rows.push(cells);
  }
  return rows;
}

describe('parseLoadingDate', () => {
  it('parses company date like 3-Sep-26', () => {
    expect(parseLoadingDate('3-Sep-26')).toBe('2026-09-03');
  });

  it('recovers 11-Sep-26 from a timezone-shifted Excel Date', () => {
    expect(parseLoadingDate(new Date('2026-09-10T21:59:42.000Z'))).toBe('2026-09-11');
  });
});

describe('parseListeDeColisageMatrix', () => {
  it('parses key/value + bag table format', () => {
    const draft = parseListeDeColisageMatrix(keyValueSheet, 'truck-a.csv');
    expect(draft).not.toBeNull();
    expect(draft?.vehicle_registration).toBe('T582DTQ');
    expect(draft?.packing_list_number).toBe('EX202609-0399');
    expect(draft?.trailer_registration_2).toBeNull();
    expect(draft?.bags).toHaveLength(2);
    expect(draft?.bags[0]?.bag_number).toBe('LU-CC260722109');
  });

  it('parses denormalized bag rows', () => {
    const draft = parseListeDeColisageMatrix(denormalizedSheet, 'truck-b.csv');
    expect(draft?.vehicle_registration).toBe('T583DTQ');
    expect(draft?.bags).toHaveLength(2);
    expect(draft?.bags[1]?.net_weight_kg).toBe(1510);
  });

  it('parses the exact Luilu company liste de colisage CSV', () => {
    const fixturePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../fixtures/import/luilu-liste-de-colisage-EX202609-0376.csv',
    );
    const matrix = parseCsvText(readFileSync(fixturePath, 'utf8'));
    const draft = parseListeDeColisageMatrix(matrix, 'luilu-EX202609-0376.csv');

    expect(draft).not.toBeNull();
    expect(draft?.packing_list_number).toBe('EX202609-0376');
    expect(draft?.cargo_description).toBe('CONCENTRÉ DE CUIVRE');
    expect(draft?.loading_date).toBe('2026-09-03');
    expect(draft?.vehicle_registration).toBe('T681ERQ');
    expect(draft?.trailer_registration).toBe('T766ERT');
    expect(draft?.trailer_registration_2).toBeNull();
    expect(draft?.driver_name).toBe('AMIMU MDAILE');
    expect(draft?.driver_passport_reference).toBe('TAE793110');
    expect(draft?.loading_location).toMatch(/USINE DE LUILU/i);
    expect(draft?.transporter_name).toBe('VAN MO COMPANY LIMITED');
    expect(draft?.transit_info).toBeNull();
    expect(draft?.border).toBe('Dar es Salaam');
    expect(draft?.agent).toBe('CONNEX');
    expect(draft?.bags).toHaveLength(20);
    expect(draft?.bags[0]).toMatchObject({
      bag_number: 'LU-CC26082392',
      net_weight_kg: 1551,
      seal_number: '116094',
    });
    expect(draft?.bags[19]).toMatchObject({
      bag_number: 'LU-CC26072354',
      net_weight_kg: 1258,
      seal_number: '114854',
    });
    const total = draft!.bags.reduce((sum, bag) => sum + bag.net_weight_kg, 0);
    expect(total).toBe(30590);
  });

  it('reads LIEU DE CHARGEMENT when label and value share one cell', () => {
    const draft = parseListeDeColisageMatrix(
      [
        ['DESCRIPTION:', 'CONCENTRÉ DE CUIVRE', 'N° DE LISTE DE COLISAGE :', 'EX202609-0506'],
        ['DATE:', '11-Sep-26'],
        ['CHEVAL:', 'T641EKD'],
        ['CHARIOT-REMORQUE 1 :', 'T560EKD', 'CHARIOT-REMORQUE 2:', 'NA'],
        ['LIEU DE CHARGEMENT : L’ USINE DE LUILU'],
        ['NO.', 'BAG NO.', 'NET WEIGHT(KG)', 'SEAL NO.'],
        ['1', 'LU-CC26090500301', 1333, 'DC15001'],
      ],
      'inline-lieu.xlsx',
    );
    expect(draft?.loading_location).toMatch(/USINE DE LUILU/i);
    expect(draft?.vehicle_registration).toBe('T641EKD');
    expect(draft?.loading_date).toBe('2026-09-11');
  });

  it('parses the original BP049 colisage xlsx 装 sheets', () => {
    const fixturePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../fixtures/import/bp049-lu-ex-colisage.xlsx',
    );
    const workbook = XLSX.read(readFileSync(fixturePath), { type: 'buffer', cellDates: true });
    expect(workbook.SheetNames[0]).toBe('BP');
    const names = packingListSheetNames(workbook.SheetNames);
    expect(names).toHaveLength(26);
    expect(names[0]).toBe('1装');
    expect(names.some((name) => name.includes('发') || name.includes('放') || name === 'BP')).toBe(
      false,
    );

    const drafts = names.map((name) => {
      const sheet = workbook.Sheets[name]!;
      const ref = sheet['!ref'];
      if (!ref) return null;
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
      return parseListeDeColisageMatrix(matrix, `bp049.xlsx (${name})`);
    });

    expect(drafts.every(Boolean)).toBe(true);
    expect(drafts).toHaveLength(26);

    const first = drafts[0]!;
    expect(first.packing_list_number).toBe('EX202609-0506');
    expect(first.vehicle_registration).toBe('T641EKD');
    expect(first.trailer_registration).toBe('T560EKD');
    expect(first.trailer_registration_2).toBeNull();
    expect(first.driver_name).toBe('OMARY HAMISI');
    expect(first.loading_date).toBe('2026-09-11');
    expect(first.loading_location).toMatch(/USINE DE LUILU/i);
    expect(first.transporter_name).toBe('VAN MO COMPANY LIMITED');
    expect(first.bags).toHaveLength(22);
    expect(first.bags[0]).toMatchObject({
      bag_number: 'LU-CC26090500301',
      net_weight_kg: 1333,
      seal_number: 'DC15001',
    });
    expect(first.bags.reduce((sum, bag) => sum + bag.net_weight_kg, 0)).toBe(30653);

    const dual = drafts.find((draft) => draft?.vehicle_registration === 'FWH557L');
    expect(dual?.trailer_registration_2).toBe('FPC421L');
    expect(dual?.packing_list_number).toBe('EX202609-0512');

    const preview = buildImportPreview({
      drafts: drafts.filter((draft): draft is NonNullable<typeof draft> => Boolean(draft)),
      loadingDate: '2026-09-11',
    });
    expect(preview.has_errors).toBe(false);
    expect(preview.trucks).toHaveLength(26);
  });
});

describe('buildImportPreview', () => {
  it('flags duplicate vehicles in a batch', () => {
    const a = parseListeDeColisageMatrix(keyValueSheet, 'a.csv')!;
    const b = parseListeDeColisageMatrix(keyValueSheet, 'b.csv')!;
    const preview = buildImportPreview({
      drafts: [a, b],
      loadingDate: '2026-09-04',
    });
    expect(preview.has_errors).toBe(true);
    expect(preview.issues.some((i) => i.message.includes('Duplicate vehicle'))).toBe(true);
  });

  it('accepts a valid multi-truck batch', () => {
    const a = parseListeDeColisageMatrix(keyValueSheet, 'a.csv')!;
    const b = parseListeDeColisageMatrix(denormalizedSheet, 'b.csv')!;
    const preview = buildImportPreview({
      drafts: [a, b],
      loadingDate: '2026-09-04',
    });
    expect(preview.has_errors).toBe(false);
    expect(preview.trucks).toHaveLength(2);
    expect(preview.trucks[0]?.bag_count).toBe(2);
  });
});
