import { normalizeVehicleRegistration } from '@lures-dcs/domain';
import type { LoadingOrderHeader, LoadingOrderLinePreview } from './loading-order.js';

export type OpenTripRef = {
  vehicle_registration: string;
  pre_alert_id: string | null;
};

export type ActiveLoadingOrderRef = {
  id: string;
  client_name: string | null;
  loading_point: string | null;
  period_month: string | null;
};

export type LoadingOrderImportPlan = {
  target_pre_alert_id: string | null;
  to_create: LoadingOrderLinePreview[];
  already_present: string[];
  blocked: string[];
};

function labelKey(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function sameHeader(order: ActiveLoadingOrderRef, header: LoadingOrderHeader): boolean {
  return (
    labelKey(order.client_name) !== '' &&
    labelKey(order.client_name) === labelKey(header.client_name) &&
    labelKey(order.loading_point) === labelKey(header.loading_point) &&
    labelKey(order.period_month) === labelKey(header.period_month)
  );
}

/**
 * Decide which Loading Order horses to insert on re-upload.
 * Horses already expected/arrived on the same order are kept.
 * Horses with an open trip on a different order are skipped, not fatal.
 */
export function planLoadingOrderImport(input: {
  header: LoadingOrderHeader;
  lines: LoadingOrderLinePreview[];
  openTrips: OpenTripRef[];
  activeOrders: ActiveLoadingOrderRef[];
}): LoadingOrderImportPlan {
  const openByPlate = new Map<string, OpenTripRef>();
  for (const trip of input.openTrips) {
    openByPlate.set(normalizeVehicleRegistration(trip.vehicle_registration), trip);
  }

  const collisionAlertIds = new Set<string>();
  for (const line of input.lines) {
    const trip = openByPlate.get(normalizeVehicleRegistration(line.draft.vehicle_registration));
    if (trip?.pre_alert_id) collisionAlertIds.add(trip.pre_alert_id);
  }

  const headerMatches = input.activeOrders.filter((order) => sameHeader(order, input.header));
  let target: string | null = null;
  if (collisionAlertIds.size === 1) {
    target = [...collisionAlertIds][0] ?? null;
  } else if (headerMatches.length === 1) {
    target = headerMatches[0]?.id ?? null;
  } else if (headerMatches.length > 1) {
    const overlap = headerMatches.find((order) => collisionAlertIds.has(order.id));
    target = overlap?.id ?? headerMatches[0]?.id ?? null;
  }

  const already_present: string[] = [];
  const blocked: string[] = [];
  const to_create: LoadingOrderLinePreview[] = [];

  for (const line of input.lines) {
    const plate = line.draft.vehicle_registration;
    const trip = openByPlate.get(normalizeVehicleRegistration(plate));
    if (!trip) {
      to_create.push(line);
      continue;
    }
    if (target && trip.pre_alert_id === target) {
      already_present.push(plate);
      continue;
    }
    blocked.push(plate);
  }

  return { target_pre_alert_id: target, to_create, already_present, blocked };
}
