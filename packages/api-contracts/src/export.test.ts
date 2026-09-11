import { describe, expect, it } from 'vitest';
import {
  exportTruckRecordSchema,
  suggestBatchExportFilename,
  suggestExportFilename,
  type ExportTruckRecord,
} from './export.js';

function sampleRecord(overrides: Partial<ExportTruckRecord> = {}): ExportTruckRecord {
  return exportTruckRecordSchema.parse({
    id: '11111111-1111-4111-8111-111111111111',
    status: 'completed',
    vehicle_registration: 'T681ERQ',
    trailer_registration: 'T766ERT',
    trailer_registration_2: null,
    driver_name: 'AMIMU MDAILE',
    driver_passport_reference: null,
    transporter_name: 'VAN MO COMPANY LIMITED',
    loading_location: "L'USINE DE LUILU",
    transit_info: null,
    border: 'Dar es Salaam',
    agent: 'CONNEX',
    packing_list_number: 'EX202609-0376',
    cargo_description: 'CONCENTRE DE CUIVRE',
    loading_date: '2026-09-03',
    total_net_weight_kg: 30590,
    bags: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        bag_number: '1',
        net_weight_kg: 1529.5,
        seal_number: 'S-1',
        sort_order: 0,
        verification_status: 'verified',
      },
    ],
    ...overrides,
  });
}

describe('export filename helpers', () => {
  it('builds a single-truck liste de colisage filename', () => {
    expect(suggestExportFilename(sampleRecord())).toBe(
      'liste-de-colisage-EX202609-0376-T681ERQ.pdf',
    );
  });

  it('builds a batch filename for multiple trucks', () => {
    const records = [
      sampleRecord(),
      sampleRecord({
        id: '33333333-3333-4333-8333-333333333333',
        vehicle_registration: 'T999ZZZ',
      }),
    ];
    expect(suggestBatchExportFilename(records)).toBe(
      'liste-de-colisage-2026-09-03-2-trucks.pdf',
    );
  });

  it('falls back when packing list number is missing', () => {
    expect(
      suggestExportFilename(
        sampleRecord({ packing_list_number: null, vehicle_registration: 'ABC 123' }),
      ),
    ).toBe('liste-de-colisage-2026-09-03-ABC-123.pdf');
  });
});

describe('exportTruckRecordSchema', () => {
  it('accepts a completed truck export record', () => {
    const parsed = exportTruckRecordSchema.parse(sampleRecord());
    expect(parsed.total_net_weight_kg).toBe(30590);
    expect(parsed.bags).toHaveLength(1);
  });
});
