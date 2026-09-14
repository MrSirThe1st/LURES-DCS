import {
  deletePreAlertSchema,
  pausePreAlertSchema,
  planLoadingOrderImport,
  resolveEtaReview,
  hasImplausibleEtaIssue,
  sourceEtaIso,
  resumePreAlertSchema,
  type DeletePreAlertInput,
  type PausePreAlertInput,
  type LoadingOrderLineDraft,
  type LoadingOrderPreview,
  type ResumePreAlertInput,
} from '@lures-dcs/api-contracts';
import {
  ArrivalStatus,
  FieldSource,
  PreAlertStatus,
  TruckStatus,
  UserRole,
  normalizeVehicleRegistration,
  type FieldSources,
} from '@lures-dcs/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from './database.types.js';

export type PreAlertActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

const PRE_ALERT_FIELD_KEYS = [
  'transporter_name',
  'vehicle_registration',
  'trailer_registration',
  'trailer_registration_2',
  'driver_name',
  'driver_passport_reference',
  'planned_tonnage',
  'border',
  'final_destination',
  'client_name',
] as const;

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

export async function ensureVehicle(
  client: SupabaseClient<Database>,
  registration: string | null | undefined,
): Promise<string | null> {
  const raw = registration?.trim();
  if (!raw) return null;
  const normalized = normalizeVehicleRegistration(raw);

  const { data: existing, error: lookupError } = await client
    .from('vehicles')
    .select('id')
    .ilike('registration', normalized)
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing?.[0]?.id) return existing[0].id;

  const { data: created, error: insertError } = await client
    .from('vehicles')
    .insert({ registration: normalized })
    .select('id')
    .single();
  if (insertError) {
    if (isUniqueViolation(insertError)) {
      const { data: raced, error: raceError } = await client
        .from('vehicles')
        .select('id')
        .ilike('registration', normalized)
        .limit(1);
      if (raceError) throw raceError;
      return raced?.[0]?.id ?? null;
    }
    throw insertError;
  }
  return created.id;
}

function preAlertFieldSources(): FieldSources {
  const sources: FieldSources = {};
  for (const key of PRE_ALERT_FIELD_KEYS) sources[key] = FieldSource.PreAlert;
  return sources;
}

export function mergeFieldSources(
  current: FieldSources,
  updates: FieldSources,
): FieldSources {
  return { ...current, ...updates };
}

type OpenTruck = Pick<
  Tables<'trucks'>,
  'id' | 'vehicle_registration' | 'arrival_status' | 'status' | 'pre_alert_id'
>;

async function listOpenTripsByPlate(
  client: SupabaseClient<Database>,
): Promise<Map<string, OpenTruck>> {
  const { data, error } = await client
    .from('trucks')
    .select('id, vehicle_registration, arrival_status, status, pre_alert_id')
    .in('arrival_status', ['expected', 'arrived']);
  if (error) throw error;
  const map = new Map<string, OpenTruck>();
  for (const row of data ?? []) {
    if (row.status === 'completed' || row.status === 'cancelled') continue;
    map.set(normalizeVehicleRegistration(row.vehicle_registration), row);
  }
  return map;
}

function lineToTruckInsert(
  line: LoadingOrderLineDraft,
  input: {
    preAlertId: string;
    actorId: string;
    clientName: string | null;
    loadingPoint: string | null;
    horseId: string | null;
    trailerId: string | null;
    trailer2Id: string | null;
  },
): Database['public']['Tables']['trucks']['Insert'] {
  return {
    loading_list_id: null,
    pre_alert_id: input.preAlertId,
    vehicle_registration: line.vehicle_registration.trim(),
    trailer_registration: line.trailer_registration,
    trailer_registration_2: line.trailer_registration_2,
    driver_name: line.driver_name,
    driver_passport_reference: line.driver_passport_reference,
    transporter_name: line.transporter_name,
    client_name: input.clientName,
    loading_location: input.loadingPoint,
    border: line.border,
    final_destination: line.final_destination,
    planned_tonnage: line.planned_tonnage,
    eta_to_mine: line.eta_to_mine,
    on_site: line.on_site,
    horse_vehicle_id: input.horseId,
    trailer_vehicle_id: input.trailerId,
    trailer2_vehicle_id: input.trailer2Id,
    arrival_status: ArrivalStatus.Expected,
    unplanned: false,
    status: TruckStatus.Waiting,
    field_sources: preAlertFieldSources() as Json,
    source_highlight: line.plate_highlight ?? null,
    created_by: input.actorId,
  };
}

export async function importLoadingOrder(input: {
  client: SupabaseClient<Database>;
  preview: LoadingOrderPreview;
  actor: PreAlertActor;
  originalFilename?: string | null;
  storagePath?: string | null;
}): Promise<{
  pre_alert_id: string;
  trucks_created: number;
  trucks_already_present: number;
  blocked_plates: string[];
}> {
  const { client, preview, actor } = input;
  if (preview.has_errors) {
    throw new Error('Cannot import a Loading Order while the preview has errors.');
  }

  const { data: profile, error: roleError } = await client
    .from('profiles')
    .select('role')
    .eq('id', actor.id)
    .maybeSingle();
  if (roleError) throw roleError;
  if (profile?.role !== UserRole.Management) {
    throw new Error('Only management can import a Loading Order.');
  }

  const openTrips = await listOpenTripsByPlate(client);
  const resolvedLines = preview.lines.map(resolveEtaReview);
  const { data: activeRows, error: activeError } = await client
    .from('pre_alerts')
    .select('id, client_name, loading_point, period_month, status')
    .eq('status', PreAlertStatus.Active);
  if (activeError) throw activeError;

  const plan = planLoadingOrderImport({
    header: preview.header,
    lines: resolvedLines,
    openTrips: [...openTrips.values()].map((trip) => ({
      vehicle_registration: trip.vehicle_registration,
      pre_alert_id: trip.pre_alert_id,
    })),
    activeOrders: (activeRows ?? []).map((row) => ({
      id: row.id,
      client_name: row.client_name,
      loading_point: row.loading_point,
      period_month: row.period_month,
    })),
  });

  if (plan.to_create.length === 0 && !plan.target_pre_alert_id) {
    if (plan.blocked.length > 0) {
      throw new Error(
        `Cannot import: ${plan.blocked.length} horse(s) already have an open expected or arrived trip (${plan.blocked.slice(0, 8).join(', ')}${plan.blocked.length > 8 ? '…' : ''}). Cancel or complete those trips first.`,
      );
    }
    throw new Error('No truck rows found on the Loading Order.');
  }

  let preAlertId = plan.target_pre_alert_id;
  let createdThisPreAlert = false;
  if (!preAlertId) {
    const { data: preAlert, error: createError } = await client
      .from('pre_alerts')
      .insert({
        status: PreAlertStatus.Active,
        client_name: preview.header.client_name,
        loading_point: preview.header.loading_point,
        offloading_point: preview.header.offloading_point,
        period_month: preview.header.period_month,
        allocation_mt: preview.header.allocation_mt,
        booked_mt: preview.header.booked_mt,
        balance_mt: preview.header.balance_mt,
        allocation_truck_count: preview.header.allocation_truck_count,
        booked_truck_count: preview.header.booked_truck_count,
        balance_truck_count: preview.header.balance_truck_count,
        original_filename: input.originalFilename ?? preview.source_filename,
        storage_path: input.storagePath ?? null,
        created_by: actor.id,
      })
      .select('id')
      .single();
    if (createError) throw createError;
    preAlertId = preAlert.id;
    createdThisPreAlert = true;
  } else {
    const { error: updateError } = await client
      .from('pre_alerts')
      .update({
        offloading_point: preview.header.offloading_point,
        allocation_mt: preview.header.allocation_mt,
        booked_mt: preview.header.booked_mt,
        balance_mt: preview.header.balance_mt,
        allocation_truck_count: preview.header.allocation_truck_count,
        booked_truck_count: preview.header.booked_truck_count,
        balance_truck_count: preview.header.balance_truck_count,
        original_filename: input.originalFilename ?? preview.source_filename,
        ...(input.storagePath ? { storage_path: input.storagePath } : {}),
      })
      .eq('id', preAlertId);
    if (updateError) throw updateError;
  }

  const createdTruckIds: string[] = [];
  try {
    let created = 0;
    for (const line of plan.to_create) {
      const draft = line.draft;
      const horseId = await ensureVehicle(client, draft.vehicle_registration);
      const trailerId = await ensureVehicle(client, draft.trailer_registration);
      const trailer2Id = await ensureVehicle(client, draft.trailer_registration_2);

      const { data: truck, error: truckError } = await client
        .from('trucks')
        .insert(
          lineToTruckInsert(draft, {
            preAlertId,
            actorId: actor.id,
            clientName: preview.header.client_name,
            loadingPoint: preview.header.loading_point,
            horseId,
            trailerId,
            trailer2Id,
          }),
        )
        .select('id')
        .single();
      if (truckError) {
        if (isUniqueViolation(truckError)) {
          plan.blocked.push(draft.vehicle_registration);
          continue;
        }
        throw truckError;
      }
      createdTruckIds.push(truck.id);

      const { error: lineError } = await client.from('pre_alert_lines').insert({
        pre_alert_id: preAlertId,
        truck_id: truck.id,
        sequence: draft.sequence,
        transporter_name: draft.transporter_name,
        vehicle_registration: draft.vehicle_registration,
        trailer_registration: draft.trailer_registration,
        trailer_registration_2: draft.trailer_registration_2,
        driver_name: draft.driver_name,
        driver_passport_reference: draft.driver_passport_reference,
        planned_tonnage: draft.planned_tonnage,
        border: draft.border,
        final_destination: draft.final_destination,
        eta_to_mine: draft.eta_to_mine,
        on_site: draft.on_site,
        eta_raw: draft.eta_raw,
        eta_review: draft.eta_review ?? null,
        source_highlight: draft.plate_highlight ?? null,
      });
      if (lineError) throw lineError;

      const { error: auditError } = await client.from('audit_events').insert({
        entity_type: 'truck',
        entity_id: truck.id,
        truck_id: truck.id,
        action: 'prealert_imported',
        actor_id: actor.id,
        actor_display_name: actor.display_name,
        metadata: {
          pre_alert_id: preAlertId,
          source: FieldSource.PreAlert,
          vehicle_registration: draft.vehicle_registration,
          original_filename: input.originalFilename ?? preview.source_filename,
          ...(draft.eta_review
            ? {
                eta_raw: draft.eta_raw,
                eta_to_mine: draft.eta_to_mine,
                eta_review: draft.eta_review,
              }
            : {}),
        },
      });
      if (auditError) throw auditError;

      if (draft.eta_review === 'edited' || draft.eta_review === 'cleared') {
        const { error: etaAuditError } = await client.from('audit_events').insert({
          entity_type: 'truck',
          entity_id: truck.id,
          truck_id: truck.id,
          action: 'eta_reviewed',
          field_name: 'eta_to_mine',
          previous_value: sourceEtaIso(draft),
          new_value: draft.eta_to_mine,
          actor_id: actor.id,
          actor_display_name: actor.display_name,
          metadata: {
            eta_raw: draft.eta_raw,
            eta_review: draft.eta_review,
            pre_alert_id: preAlertId,
          },
        });
        if (etaAuditError) throw etaAuditError;
      }
      created += 1;
    }

    for (const line of resolvedLines) {
      const plate = normalizeVehicleRegistration(line.draft.vehicle_registration);
      if (!plan.already_present.some((value) => normalizeVehicleRegistration(value) === plate)) {
        continue;
      }
      const existing = openTrips.get(plate);
      if (!existing) continue;
      const { error: highlightError } = await client
        .from('trucks')
        .update({ source_highlight: line.draft.plate_highlight ?? null })
        .eq('id', existing.id);
      if (highlightError) throw highlightError;
      const { error: lineUpdateError } = await client
        .from('pre_alert_lines')
        .update({
          sequence: line.draft.sequence,
          source_highlight: line.draft.plate_highlight ?? null,
        })
        .eq('truck_id', existing.id)
        .eq('pre_alert_id', preAlertId);
      if (lineUpdateError) throw lineUpdateError;
    }

    const etaReviewed = resolvedLines.filter(hasImplausibleEtaIssue);
    const { error: headerAuditError } = await client.from('audit_events').insert({
      entity_type: 'pre_alert',
      entity_id: preAlertId,
      action: 'prealert_imported',
      actor_id: actor.id,
      actor_display_name: actor.display_name,
      metadata: {
        trucks_created: created,
        trucks_already_present: plan.already_present.length,
        blocked_plates: plan.blocked,
        client_name: preview.header.client_name,
        original_filename: input.originalFilename ?? preview.source_filename,
        eta_implausible: etaReviewed.length,
        eta_kept: etaReviewed.filter((line) => line.draft.eta_review === 'kept').length,
        eta_edited: etaReviewed.filter((line) => line.draft.eta_review === 'edited').length,
        eta_cleared: etaReviewed.filter((line) => line.draft.eta_review === 'cleared').length,
      },
    });
    if (headerAuditError) throw headerAuditError;

    return {
      pre_alert_id: preAlertId,
      trucks_created: created,
      trucks_already_present: plan.already_present.length,
      blocked_plates: plan.blocked,
    };
  } catch (err) {
    if (createdTruckIds.length > 0) {
      await client.from('pre_alert_lines').delete().in('truck_id', createdTruckIds);
      await client.from('trucks').delete().in('id', createdTruckIds);
    }
    if (createdThisPreAlert) {
      await client.from('pre_alerts').delete().eq('id', preAlertId);
    }
    throw err;
  }
}

export async function listPreAlerts(
  client: SupabaseClient<Database>,
): Promise<Tables<'pre_alerts'>[]> {
  const { data, error } = await client
    .from('pre_alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function patchPreAlertDocumentHeader(
  client: SupabaseClient<Database>,
  preAlertId: string,
  header: Pick<
    Tables<'pre_alerts'>,
    | 'allocation_mt'
    | 'booked_mt'
    | 'balance_mt'
    | 'allocation_truck_count'
    | 'booked_truck_count'
    | 'balance_truck_count'
  >,
): Promise<void> {
  const { error } = await client.from('pre_alerts').update(header).eq('id', preAlertId);
  if (error) throw error;
}

export async function listPreAlertTrucks(
  client: SupabaseClient<Database>,
  preAlertId: string,
): Promise<Tables<'trucks'>[]> {
  const { data, error } = await client
    .from('trucks')
    .select('*')
    .eq('pre_alert_id', preAlertId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type LoadingOrderRow = Tables<'trucks'> & {
  sequence: number | null;
  eta_raw: string | null;
  eta_review: 'kept' | 'edited' | 'cleared' | null;
};

export async function listLoadingOrderRows(
  client: SupabaseClient<Database>,
  preAlertId: string,
): Promise<LoadingOrderRow[]> {
  const { data: lines, error: lineError } = await client
    .from('pre_alert_lines')
    .select('sequence, eta_raw, eta_review, source_highlight, truck_id')
    .eq('pre_alert_id', preAlertId)
    .order('sequence', { ascending: true });
  if (lineError) throw lineError;

  const ids = [...new Set((lines ?? []).map((line) => line.truck_id))];
  if (ids.length === 0) {
    const fallback = await listPreAlertTrucks(client, preAlertId);
    return fallback.map((truck, index) => ({
      ...truck,
      sequence: index + 1,
      eta_raw: null,
      eta_review: null,
    }));
  }

  const { data: trucks, error: truckError } = await client.from('trucks').select('*').in('id', ids);
  if (truckError) throw truckError;
  const byId = new Map((trucks ?? []).map((truck) => [truck.id, truck]));

  const rows: LoadingOrderRow[] = [];
  for (const line of lines ?? []) {
    const truck = byId.get(line.truck_id);
    if (!truck) continue;
    rows.push({
      ...truck,
      sequence: line.sequence,
      eta_raw: line.eta_raw,
      eta_review: line.eta_review ?? null,
      source_highlight: line.source_highlight ?? truck.source_highlight,
    });
  }
  return rows;
}

export async function pausePreAlert(input: {
  client: SupabaseClient<Database>;
  payload: PausePreAlertInput;
  actor: PreAlertActor;
}): Promise<void> {
  const { client, actor } = input;
  const payload = pausePreAlertSchema.parse(input.payload);
  await assertManagement(client, actor.id, 'Only management can pause a Loading Order.');

  const current = await requirePreAlert(client, payload.pre_alert_id);
  if (current.status !== PreAlertStatus.Active) {
    throw new Error('Only an active Loading Order can be paused.');
  }

  const { error } = await client
    .from('pre_alerts')
    .update({ status: PreAlertStatus.Paused })
    .eq('id', payload.pre_alert_id)
    .eq('status', PreAlertStatus.Active);
  if (error) throw error;

  const { error: auditError } = await client.from('audit_events').insert({
    entity_type: 'pre_alert',
    entity_id: payload.pre_alert_id,
    action: 'prealert_paused',
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    previous_value: PreAlertStatus.Active,
    new_value: PreAlertStatus.Paused,
  });
  if (auditError) throw auditError;
}

export async function resumePreAlert(input: {
  client: SupabaseClient<Database>;
  payload: ResumePreAlertInput;
  actor: PreAlertActor;
}): Promise<void> {
  const { client, actor } = input;
  const payload = resumePreAlertSchema.parse(input.payload);
  await assertManagement(client, actor.id, 'Only management can resume a Loading Order.');

  const current = await requirePreAlert(client, payload.pre_alert_id);
  if (current.status !== PreAlertStatus.Paused) {
    throw new Error('Only a paused Loading Order can be resumed.');
  }

  const { error } = await client
    .from('pre_alerts')
    .update({ status: PreAlertStatus.Active })
    .eq('id', payload.pre_alert_id)
    .eq('status', PreAlertStatus.Paused);
  if (error) throw error;

  const { error: auditError } = await client.from('audit_events').insert({
    entity_type: 'pre_alert',
    entity_id: payload.pre_alert_id,
    action: 'prealert_resumed',
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    previous_value: PreAlertStatus.Paused,
    new_value: PreAlertStatus.Active,
  });
  if (auditError) throw auditError;
}

export async function deletePreAlert(input: {
  client: SupabaseClient<Database>;
  payload: DeletePreAlertInput;
  actor: PreAlertActor;
}): Promise<{ trucks_removed: number }> {
  const { client, actor } = input;
  const payload = deletePreAlertSchema.parse(input.payload);
  await assertManagement(client, actor.id, 'Only management can delete a Loading Order.');

  await requirePreAlert(client, payload.pre_alert_id);

  const { data: trucks, error: truckError } = await client
    .from('trucks')
    .select('id, vehicle_registration, arrival_status, status')
    .eq('pre_alert_id', payload.pre_alert_id);
  if (truckError) throw new Error(truckError.message);

  const blocking = (trucks ?? []).filter(
    (row) =>
      row.arrival_status === ArrivalStatus.Arrived &&
      row.status !== TruckStatus.Completed &&
      row.status !== TruckStatus.Cancelled,
  );
  if (blocking.length > 0) {
    const plates = blocking.slice(0, 8).map((row) => row.vehicle_registration).join(', ');
    throw new Error(
      `Cannot delete: ${blocking.length} truck(s) have already arrived (${plates}${blocking.length > 8 ? '…' : ''}). Pause the order, or finish those trips first.`,
    );
  }

  const toRemove = (trucks ?? []).filter(
    (row) =>
      row.arrival_status === ArrivalStatus.Expected ||
      row.arrival_status === ArrivalStatus.DidNotArrive ||
      row.arrival_status === ArrivalStatus.Cancelled,
  );
  const expectedIds = toRemove
    .filter((row) => row.arrival_status === ArrivalStatus.Expected)
    .map((row) => row.id);

  // Keep trip rows so audit_events.truck_id is not rewritten (audit is immutable).
  // Cancel leftover expected trucks so they leave the yard queue and free the plate.
  if (expectedIds.length > 0) {
    const { error: cancelError } = await client
      .from('trucks')
      .update({
        arrival_status: ArrivalStatus.Cancelled,
        status: TruckStatus.Cancelled,
      })
      .in('id', expectedIds)
      .eq('arrival_status', ArrivalStatus.Expected);
    if (cancelError) throw new Error(cancelError.message);
  }

  const { error: deleteOrderError } = await client.from('pre_alerts').delete().eq('id', payload.pre_alert_id);
  if (deleteOrderError) throw new Error(deleteOrderError.message);

  const { error: auditError } = await client.from('audit_events').insert({
    entity_type: 'pre_alert',
    entity_id: payload.pre_alert_id,
    action: 'prealert_deleted',
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    metadata: {
      trucks_removed: toRemove.length,
      horses: toRemove.map((row) => row.vehicle_registration),
    },
  });
  if (auditError) throw new Error(auditError.message);

  return { trucks_removed: toRemove.length };
}

async function assertManagement(
  client: SupabaseClient<Database>,
  actorId: string,
  message: string,
): Promise<void> {
  const { data: profile, error: roleError } = await client
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .maybeSingle();
  if (roleError) throw roleError;
  if (profile?.role !== UserRole.Management) {
    throw new Error(message);
  }
}

async function requirePreAlert(
  client: SupabaseClient<Database>,
  preAlertId: string,
): Promise<Pick<Tables<'pre_alerts'>, 'id' | 'status'>> {
  const { data, error } = await client
    .from('pre_alerts')
    .select('id, status')
    .eq('id', preAlertId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Loading Order was not found.');
  return data;
}
