import { describe, expect, it } from 'vitest';
import type { LoadingOrderHeader, LoadingOrderLinePreview } from './loading-order.js';
import { planLoadingOrderImport } from './loading-order-import-plan.js';

const header: LoadingOrderHeader = {
  client_name: 'Glencore',
  loading_point: 'Luilu',
  offloading_point: 'Access Durban',
  period_month: 'September',
  allocation_mt: 1600,
  booked_mt: 1713,
  balance_mt: null,
  allocation_truck_count: 53,
  booked_truck_count: 51,
  balance_truck_count: 2,
};

function line(plate: string): LoadingOrderLinePreview {
  return {
    draft: {
      sequence: 1,
      transporter_name: 'FORSH',
      vehicle_registration: plate,
      trailer_registration: null,
      trailer_registration_2: null,
      driver_name: 'Driver',
      driver_passport_reference: null,
      planned_tonnage: 34,
      border: 'Kasumbalesa',
      final_destination: 'Access Durban',
      eta_to_mine: '2026-09-03',
      on_site: false,
      eta_raw: '03-09-2026',
    },
    issues: [],
  };
}

const order = {
  id: 'order-1',
  client_name: 'Glencore',
  loading_point: 'Luilu',
  period_month: 'September',
};

describe('planLoadingOrderImport', () => {
  it('creates every horse when none are open', () => {
    const plan = planLoadingOrderImport({
      header,
      lines: [line('AJE6257ZM'), line('AGZ5278')],
      openTrips: [],
      activeOrders: [],
    });
    expect(plan.target_pre_alert_id).toBeNull();
    expect(plan.to_create).toHaveLength(2);
    expect(plan.already_present).toEqual([]);
    expect(plan.blocked).toEqual([]);
  });

  it('adds missing horses onto the partial Loading Order instead of blocking the file', () => {
    const plates = Array.from({ length: 4 }, (_, i) => line(`H${i + 1}`));
    const plan = planLoadingOrderImport({
      header,
      lines: plates,
      openTrips: [
        { vehicle_registration: 'H1', pre_alert_id: 'order-1' },
        { vehicle_registration: 'H2', pre_alert_id: 'order-1' },
      ],
      activeOrders: [order],
    });
    expect(plan.target_pre_alert_id).toBe('order-1');
    expect(plan.already_present).toEqual(['H1', 'H2']);
    expect(plan.to_create.map((row) => row.draft.vehicle_registration)).toEqual(['H3', 'H4']);
    expect(plan.blocked).toEqual([]);
  });

  it('skips a horse that already has an open trip on another order', () => {
    const plan = planLoadingOrderImport({
      header,
      lines: [line('H1'), line('H2'), line('H3')],
      openTrips: [
        { vehicle_registration: 'H1', pre_alert_id: 'order-1' },
        { vehicle_registration: 'H2', pre_alert_id: 'other-order' },
      ],
      activeOrders: [order],
    });
    expect(plan.target_pre_alert_id).toBe('order-1');
    expect(plan.already_present).toEqual(['H1']);
    expect(plan.to_create.map((row) => row.draft.vehicle_registration)).toEqual(['H3']);
    expect(plan.blocked).toEqual(['H2']);
  });
});
