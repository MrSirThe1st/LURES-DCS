import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseLoadingOrderMatrix, parseEtaDate, excelFillToHex, applyEtaReview, sourceEtaIso } from './loading-order-parse.js';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/import/loading-order-glencore-luilu.json',
);

describe('parseEtaDate', () => {
  it('parses DD-MM-YYYY', () => {
    expect(parseEtaDate('03-09-2026')).toEqual({
      iso: '2026-09-03',
      onSite: false,
      raw: '03-09-2026',
    });
  });

  it('treats On Site as a flag, not an arrival', () => {
    expect(parseEtaDate('On Site')).toEqual({ iso: null, onSite: true, raw: 'On Site' });
  });
});

describe('excelFillToHex', () => {
  it('keeps 6-digit yellow and red fills', () => {
    expect(excelFillToHex({ rgb: 'FFFF00' }, 'solid')).toBe('#FFFF00');
    expect(excelFillToHex({ rgb: 'FF0000' }, 'solid')).toBe('#FF0000');
  });

  it('strips only an 8-character alpha prefix', () => {
    expect(excelFillToHex({ rgb: 'FFFF0000' }, 'solid')).toBe('#FF0000');
  });

  it('ignores navy, white, and empty pattern', () => {
    expect(excelFillToHex({ rgb: '002060' }, 'solid')).toBeNull();
    expect(excelFillToHex({ rgb: 'FFFFFF' }, 'solid')).toBeNull();
    expect(excelFillToHex({ rgb: 'FFFF00' }, 'none')).toBeNull();
    expect(excelFillToHex({ theme: 0 }, 'solid')).toBeNull();
  });
});

describe('parseLoadingOrderMatrix', () => {
  const matrix = JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown[][];

  it('parses the Glencore xlsx to 51 truck rows', () => {
    const workbook = XLSX.readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../fixtures/import/loading-order-glencore-luilu.xlsx'),
      { cellDates: true, raw: true },
    );
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
    const xlsxMatrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
      blankrows: false,
    }) as unknown[][];
    const preview = parseLoadingOrderMatrix(xlsxMatrix);
    expect(preview?.header.booked_truck_count).toBe(51);
    expect(preview?.header.allocation_truck_count).toBe(53);
    expect(preview?.header.balance_truck_count).toBe(2);
    expect(preview?.lines).toHaveLength(51);
  });

  it('preserves yellow and red TRUCK fills from the source workbook', () => {
    const workbook = XLSX.readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../fixtures/import/loading-order-glencore-luilu.xlsx'),
      { cellDates: true, raw: true, cellStyles: true },
    );
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
    const highlights: Record<string, string> = {};
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
    let truckCol = -1;
    let headerRow = -1;
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
        if (String(cell?.v ?? '').trim().toUpperCase() === 'TRUCK') {
          truckCol = c;
          headerRow = r;
        }
      }
    }
    expect(truckCol).toBeGreaterThanOrEqual(0);
    for (let r = headerRow + 1; r <= range.e.r; r += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: truckCol })] as XLSX.CellObject | undefined;
      const plate = String(cell?.v ?? '').trim();
      if (!plate) continue;
      const style = cell?.s as { patternType?: string; fgColor?: { rgb?: string; theme?: number } } | undefined;
      const hex = excelFillToHex(style?.fgColor, style?.patternType);
      if (hex) highlights[plate.replace(/\s+/g, ' ')] = hex;
    }
    const yellow = Object.values(highlights).filter((hex) => hex === '#FFFF00').length;
    const red = Object.values(highlights).filter((hex) => hex === '#FF0000').length;
    expect(yellow).toBe(36);
    expect(red).toBe(5);
    expect(highlights['AJF7869ZM']).toBe('#FF0000');
    expect(highlights['AJE6257ZM']).toBe('#FFFF00');
  });

  it('returns null for a liste de colisage sheet', () => {
    expect(
      parseLoadingOrderMatrix([
        ['LISTE DE COLISAGE'],
        ['CHEVAL:', 'T681ERQ'],
      ]),
    ).toBeNull();
  });

  it('parses the Glencore Luilu Loading Order', () => {
    const preview = parseLoadingOrderMatrix(matrix, 'Loading Order - Glencore - 1600 2.xlsx');
    expect(preview).not.toBeNull();
    expect(preview?.header.client_name).toBe('Glencore');
    expect(preview?.header.loading_point).toBe('Luilu');
    expect(preview?.header.offloading_point).toBe('Access Durban');
    expect(preview?.header.period_month).toBe('September');
    expect(preview?.header.allocation_mt).toBe(1600);
    expect(preview?.header.allocation_truck_count).toBe(53);
    expect(preview?.header.booked_mt).toBe(1713);
    expect(preview?.header.booked_truck_count).toBe(51);
    expect(preview?.header.balance_mt).toBe(-113);
    expect(preview?.header.balance_truck_count).toBe(2);
    expect(preview?.lines).toHaveLength(51);
    expect(preview?.has_errors).toBe(false);

    const first = preview?.lines[0]?.draft;
    expect(first?.vehicle_registration).toBe('AJE6257ZM');
    expect(first?.transporter_name).toBe('FORSH');
    expect(first?.trailer_registration_2).toBe('AJE6463ZM');
    expect(first?.eta_to_mine).toBe('2026-09-03');
    expect(first?.on_site).toBe(false);

    const onSite = preview?.lines.find((line) => line.draft.on_site);
    expect(onSite?.draft.vehicle_registration).toBe('AJF1094ZM');
    expect(onSite?.draft.eta_to_mine).toBeNull();

    const singleTrailer = preview?.lines.find((line) => line.draft.vehicle_registration === 'ADS6345');
    expect(singleTrailer?.draft.trailer_registration_2).toBeNull();

    const implausible = preview?.lines.filter((line) =>
      line.issues.some((issue) => issue.code === 'eta_implausible'),
    );
    expect(implausible?.length).toBeGreaterThan(0);
    expect(implausible?.every((line) => line.draft.eta_to_mine != null)).toBe(true);
    expect(implausible?.[0]?.issues.some((issue) => issue.message.includes('stored as written'))).toBe(
      false,
    );
  });

  it('errors on duplicate horses', () => {
    const preview = parseLoadingOrderMatrix([
      ['', '', 'CLIENT', 'Glencore'],
      [
        '',
        'S/N',
        'TRANSPORTER',
        'TRUCK',
        'TRAILER 1',
        'TRAILER 2',
        'DRIVER NAME',
        'PASSPORT',
        'TONNAGE',
        'EXIT BORDER',
        'FINAL DESTINATION',
        'ETA TO MINE',
      ],
      ['', 1, 'FORSH', 'AJE6257ZM', 'A1', 'N/A', 'Driver A', 'P1', 35, 'Kasumbalesa', 'Access Durban', 'On Site'],
      ['', 2, 'FORSH', 'aje6257zm', 'A2', 'N/A', 'Driver B', 'P2', 35, 'Kasumbalesa', 'Access Durban', 'On Site'],
    ]);
    expect(preview?.has_errors).toBe(true);
    expect(preview?.lines[1]?.issues[0]?.message).toMatch(/Duplicate horse/i);
  });
});

describe('applyEtaReview', () => {
  const line = {
    draft: {
      sequence: 8,
      transporter_name: 'BRO',
      vehicle_registration: 'JK52PYGP',
      trailer_registration: 'HL08BSGP',
      trailer_registration_2: null,
      driver_name: 'COLLEN CHIKARA',
      driver_passport_reference: 'AE228919',
      planned_tonnage: 31,
      border: 'SAKANIA',
      final_destination: 'Access Durban',
      eta_to_mine: '2027-09-01',
      on_site: false,
      eta_raw: '01-09-2027',
    },
    issues: [
      {
        severity: 'warning' as const,
        message: 'ETA TO MINE 2027-09-01 looks implausible.',
        truck_key: 'JK52PYGP',
        field: 'eta_to_mine',
        code: 'eta_implausible',
      },
    ],
  };

  it('keeps the parsed source date and never invents a substitute', () => {
    const next = applyEtaReview(line, 'kept');
    expect(next.draft.eta_to_mine).toBe('2027-09-01');
    expect(next.draft.eta_raw).toBe('01-09-2027');
    expect(next.draft.eta_review).toBe('kept');
    expect(sourceEtaIso(next.draft)).toBe('2027-09-01');
  });

  it('clears the operational ETA while preserving the source value', () => {
    const next = applyEtaReview(line, 'cleared');
    expect(next.draft.eta_to_mine).toBeNull();
    expect(next.draft.eta_raw).toBe('01-09-2027');
    expect(next.draft.eta_review).toBe('cleared');
  });

  it('records an explicit edit without changing eta_raw', () => {
    const next = applyEtaReview(line, { to: '2026-09-01' });
    expect(next.draft.eta_to_mine).toBe('2026-09-01');
    expect(next.draft.eta_raw).toBe('01-09-2027');
    expect(next.draft.eta_review).toBe('edited');
  });
});
