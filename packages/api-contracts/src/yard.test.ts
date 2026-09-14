import { describe, expect, it } from 'vitest';
import {
  assignTrucksToProgramSchema,
  registerYardArrivalSchema,
  returnTrucksToYardSchema,
} from './yard.js';

describe('registerYardArrivalSchema', () => {
  it('requires a plate and trims optional blanks to null', () => {
    const parsed = registerYardArrivalSchema.parse({
      vehicle_registration: '  t681erq ',
      trailer_registration: '  ',
      driver_phone: ' 0812345678 ',
    });
    expect(parsed.vehicle_registration).toBe('t681erq');
    expect(parsed.trailer_registration).toBeNull();
    expect(parsed.driver_phone).toBe('0812345678');
  });

  it('rejects an empty plate', () => {
    const result = registerYardArrivalSchema.safeParse({ vehicle_registration: '   ' });
    expect(result.success).toBe(false);
  });
});

describe('assignTrucksToProgramSchema', () => {
  it('requires at least one truck and an ISO date', () => {
    expect(() =>
      assignTrucksToProgramSchema.parse({
        truck_ids: [],
        loading_date: '2026-09-12',
      }),
    ).toThrow();
    expect(
      assignTrucksToProgramSchema.parse({
        truck_ids: ['11111111-1111-4111-8111-111111111111'],
        loading_date: '2026-09-12',
      }).loading_date,
    ).toBe('2026-09-12');
  });
});

describe('returnTrucksToYardSchema', () => {
  it('requires truck ids', () => {
    expect(returnTrucksToYardSchema.safeParse({ truck_ids: [] }).success).toBe(false);
  });
});
