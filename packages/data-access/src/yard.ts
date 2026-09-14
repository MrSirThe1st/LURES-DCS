import {
  assignTrucksToProgramSchema,
  cancelExpectedTruckSchema,
  confirmExpectedArrivalSchema,
  registerYardArrivalSchema,
  returnTrucksToYardSchema,
  type AssignTrucksToProgramInput,
  type CancelExpectedTruckInput,
  type ConfirmExpectedArrivalInput,
  type RegisterYardArrivalInput,
  type ReturnTrucksToYardInput,
} from '@lures-dcs/api-contracts';
import {
  ArrivalStatus,
  FieldSource,
  TruckStatus,
  UserRole,
  isPreAlertYardMutable,
  normalizeVehicleRegistration,
  type FieldSources,
} from '@lures-dcs/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from './database.types.js';
import { ensureVehicle, mergeFieldSources } from './pre-alerts.js';

export type YardActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

export type YardQueueTruck = Pick<
  Tables<'trucks'>,
  | 'id'
  | 'vehicle_registration'
  | 'trailer_registration'
  | 'trailer_registration_2'
  | 'driver_name'
  | 'driver_phone'
  | 'driver_passport_reference'
  | 'transporter_name'
  | 'client_name'
  | 'status'
  | 'arrival_status'
  | 'unplanned'
  | 'on_site'
  | 'eta_to_mine'
  | 'arrived_at'
  | 'created_at'
  | 'updated_at'
  | 'notes'
  | 'pre_alert_id'
  | 'final_destination'
  | 'field_sources'
> & {
  pre_alert_status: Tables<'pre_alerts'>['status'] | null;
};

const YARD_TRUCK_COLUMNS =
  'id, vehicle_registration, trailer_registration, trailer_registration_2, driver_name, driver_phone, driver_passport_reference, transporter_name, client_name, status, arrival_status, unplanned, on_site, eta_to_mine, arrived_at, created_at, updated_at, notes, pre_alert_id, final_destination, field_sources';

async function withPreAlertStatus(
  client: SupabaseClient<Database>,
  trucks: Array<Omit<YardQueueTruck, 'pre_alert_status'>>,
): Promise<YardQueueTruck[]> {
  const ids = [...new Set(trucks.map((row) => row.pre_alert_id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) {
    return trucks.map((row) => ({ ...row, pre_alert_status: null }));
  }
  const { data, error } = await client.from('pre_alerts').select('id, status').in('id', ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((row) => [row.id, row.status]));
  return trucks.map((row) => ({
    ...row,
    pre_alert_status: row.pre_alert_id ? (byId.get(row.pre_alert_id) ?? null) : null,
  }));
}

async function assertPreAlertYardMutable(
  client: SupabaseClient<Database>,
  preAlertId: string | null,
): Promise<void> {
  if (!preAlertId) return;
  const { data, error } = await client.from('pre_alerts').select('status').eq('id', preAlertId).maybeSingle();
  if (error) throw error;
  if (!isPreAlertYardMutable(data?.status)) {
    throw new Error('This Loading Order is paused. Yard confirm and cancel are disabled.');
  }
}

async function assertActorRole(
  client: SupabaseClient<Database>,
  actorId: string,
  allowed: ReadonlyArray<(typeof UserRole)[keyof typeof UserRole]>,
): Promise<void> {
  const { data, error } = await client.from('profiles').select('role').eq('id', actorId).maybeSingle();
  if (error) throw error;
  if (!data || !allowed.includes(data.role)) {
    throw new Error('Not authorized for this yard action.');
  }
}

async function ensureActiveLoadingList(
  client: SupabaseClient<Database>,
  loadingDate: string,
  actorId: string,
): Promise<string> {
  const { data: existingLists, error: listLookupError } = await client
    .from('loading_lists')
    .select('id')
    .eq('loading_date', loadingDate)
    .eq('status', 'active')
    .is('bulletin_number', null)
    .order('created_at', { ascending: true })
    .limit(1);
  if (listLookupError) throw listLookupError;
  const existingId = existingLists?.[0]?.id;
  if (existingId) return existingId;

  const { data: created, error: createError } = await client
    .from('loading_lists')
    .insert({
      loading_date: loadingDate,
      status: 'active',
      created_by: actorId,
    })
    .select('id')
    .single();
  if (createError) throw createError;
  return created.id;
}

/** Arrived trucks not yet on a Loading Program / BP, oldest arrival first. */
export async function listYardQueue(
  client: SupabaseClient<Database>,
): Promise<YardQueueTruck[]> {
  const { data, error } = await client
    .from('trucks')
    .select(YARD_TRUCK_COLUMNS)
    .is('loading_list_id', null)
    .eq('arrival_status', ArrivalStatus.Arrived)
    .in('status', ['waiting', 'available', 'loading', 'on_hold'])
    .order('arrived_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return withPreAlertStatus(client, (data ?? []) as Array<Omit<YardQueueTruck, 'pre_alert_status'>>);
}

export async function listExpectedTrucks(
  client: SupabaseClient<Database>,
  query?: string,
): Promise<YardQueueTruck[]> {
  let request = client
    .from('trucks')
    .select(YARD_TRUCK_COLUMNS)
    .eq('arrival_status', ArrivalStatus.Expected)
    .eq('status', TruckStatus.Waiting)
    .order('created_at', { ascending: true });

  const needle = query?.trim();
  if (needle) {
    request = request.ilike('vehicle_registration', `%${needle}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return withPreAlertStatus(client, (data ?? []) as Array<Omit<YardQueueTruck, 'pre_alert_status'>>);
}

export async function listDidNotArriveTrucks(
  client: SupabaseClient<Database>,
): Promise<YardQueueTruck[]> {
  const { data, error } = await client
    .from('trucks')
    .select(YARD_TRUCK_COLUMNS)
    .eq('arrival_status', ArrivalStatus.DidNotArrive)
    .not('pre_alert_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return withPreAlertStatus(client, (data ?? []) as Array<Omit<YardQueueTruck, 'pre_alert_status'>>);
}

export async function getYardTruck(
  client: SupabaseClient<Database>,
  truckId: string,
): Promise<YardQueueTruck | null> {
  const { data, error } = await client
    .from('trucks')
    .select(YARD_TRUCK_COLUMNS)
    .eq('id', truckId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [row] = await withPreAlertStatus(client, [data as Omit<YardQueueTruck, 'pre_alert_status'>]);
  return row ?? null;
}

/** Register a truck when it parks outside — phone yard agent only; no packing list required. */
export async function registerYardArrival(input: {
  client: SupabaseClient<Database>;
  payload: RegisterYardArrivalInput;
  actor: YardActor;
}): Promise<{ truck_id: string }> {
  const { client, actor } = input;
  await assertActorRole(client, actor.id, [UserRole.YardAgent, UserRole.Management]);
  const payload = registerYardArrivalSchema.parse(input.payload);
  const plate = normalizeVehicleRegistration(payload.vehicle_registration);

  let arrivedAt = new Date().toISOString();
  if (payload.arrived_at) {
    const parsed = new Date(payload.arrived_at);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Arrival time is not a valid date.');
    }
    arrivedAt = parsed.toISOString();
  }

  const horseId = await ensureVehicle(client, plate);
  const trailerId = await ensureVehicle(client, payload.trailer_registration);

  const fieldSources: FieldSources = {
    vehicle_registration: FieldSource.Yard,
    trailer_registration: FieldSource.Yard,
    driver_name: FieldSource.Yard,
    driver_phone: FieldSource.Yard,
    driver_passport_reference: FieldSource.Yard,
    transporter_name: FieldSource.Yard,
    client_name: FieldSource.Yard,
  };

  const { data: truck, error } = await client
    .from('trucks')
    .insert({
      loading_list_id: null,
      vehicle_registration: payload.vehicle_registration.trim(),
      trailer_registration: payload.trailer_registration,
      driver_name: payload.driver_name,
      driver_phone: payload.driver_phone,
      driver_passport_reference: payload.driver_passport_reference,
      transporter_name: payload.transporter_name,
      client_name: payload.client_name,
      notes: payload.notes,
      arrived_at: arrivedAt,
      arrived_by: actor.id,
      arrival_status: ArrivalStatus.Arrived,
      unplanned: true,
      status: TruckStatus.Waiting,
      horse_vehicle_id: horseId,
      trailer_vehicle_id: trailerId,
      field_sources: fieldSources as Json,
      created_by: actor.id,
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error(
        `Vehicle ${plate} is already in the yard or on a loading program. Complete or cancel that trip first.`,
      );
    }
    throw error;
  }

  const { error: auditError } = await client.from('audit_events').insert({
    entity_type: 'truck',
    entity_id: truck.id,
    truck_id: truck.id,
    action: 'unplanned_registered',
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    metadata: {
      vehicle_registration: plate,
      arrived_at: arrivedAt,
      client_name: payload.client_name,
      transporter_name: payload.transporter_name,
    },
  });
  if (auditError) throw auditError;

  return { truck_id: truck.id };
}

/** Put waiting yard trucks onto a loading date (creates the day’s list if needed). */
export async function assignTrucksToLoadingDate(input: {
  client: SupabaseClient<Database>;
  payload: AssignTrucksToProgramInput;
  actor: YardActor;
}): Promise<{ assigned: number; loading_list_id: string }> {
  const { client, actor } = input;
  await assertActorRole(client, actor.id, [UserRole.Management]);
  const payload = assignTrucksToProgramSchema.parse(input.payload);
  const loadingListId = await ensureActiveLoadingList(client, payload.loading_date, actor.id);

  const { data: trucks, error: fetchError } = await client
    .from('trucks')
    .select('id, vehicle_registration, loading_list_id, status')
    .in('id', payload.truck_ids);
  if (fetchError) throw fetchError;

  const found = new Set((trucks ?? []).map((row) => row.id));
  for (const id of payload.truck_ids) {
    if (!found.has(id)) throw new Error('One or more trucks were not found.');
  }

  for (const truck of trucks ?? []) {
    if (truck.status === TruckStatus.Cancelled || truck.status === TruckStatus.Completed) {
      throw new Error(`${truck.vehicle_registration} is ${truck.status} and cannot be programmed.`);
    }
    if (truck.loading_list_id && truck.loading_list_id !== loadingListId) {
      throw new Error(
        `${truck.vehicle_registration} is already on another loading day. Return it to the yard first.`,
      );
    }
  }

  const toAssign = (trucks ?? []).filter((row) => row.loading_list_id == null).map((row) => row.id);
  if (toAssign.length === 0) {
    return { assigned: 0, loading_list_id: loadingListId };
  }

  const { error: updateError } = await client
    .from('trucks')
    .update({ loading_list_id: loadingListId })
    .in('id', toAssign)
    .is('loading_list_id', null);
  if (updateError) throw updateError;

  const { error: auditError } = await client.from('audit_events').insert(
    toAssign.map((truckId) => ({
      entity_type: 'truck',
      entity_id: truckId,
      truck_id: truckId,
      action: 'programmed',
      actor_id: actor.id,
      actor_display_name: actor.display_name,
      new_value: payload.loading_date,
      metadata: { loading_list_id: loadingListId, loading_date: payload.loading_date },
    })),
  );
  if (auditError) throw auditError;

  return { assigned: toAssign.length, loading_list_id: loadingListId };
}

/** Take waiting trucks off a program day and return them to the yard queue. */
export async function returnTrucksToYard(input: {
  client: SupabaseClient<Database>;
  payload: ReturnTrucksToYardInput;
  actor: YardActor;
}): Promise<{ returned: number }> {
  const { client, actor } = input;
  await assertActorRole(client, actor.id, [UserRole.Management]);
  const payload = returnTrucksToYardSchema.parse(input.payload);

  const { data: trucks, error: fetchError } = await client
    .from('trucks')
    .select('id, vehicle_registration, status, loading_list_id')
    .in('id', payload.truck_ids);
  if (fetchError) throw fetchError;

  const eligible = (trucks ?? []).filter(
    (row) => row.status === TruckStatus.Waiting && row.loading_list_id != null,
  );
  for (const truck of trucks ?? []) {
    if (truck.status !== TruckStatus.Waiting) {
      throw new Error(
        `${truck.vehicle_registration} is ${truck.status} and cannot return to the yard.`,
      );
    }
  }

  if (eligible.length === 0) return { returned: 0 };

  const ids = eligible.map((row) => row.id);
  const { error: updateError } = await client
    .from('trucks')
    .update({ loading_list_id: null })
    .in('id', ids)
    .eq('status', TruckStatus.Waiting);
  if (updateError) throw updateError;

  const { error: auditError } = await client.from('audit_events').insert(
    eligible.map((truck) => ({
      entity_type: 'truck',
      entity_id: truck.id,
      truck_id: truck.id,
      action: 'returned_to_yard',
      actor_id: actor.id,
      actor_display_name: actor.display_name,
      previous_value: truck.loading_list_id,
    })),
  );
  if (auditError) throw auditError;

  return { returned: ids.length };
}

const CONFIRM_FIELDS = [
  'trailer_registration',
  'trailer_registration_2',
  'driver_name',
  'driver_phone',
  'driver_passport_reference',
  'transporter_name',
  'client_name',
  'notes',
] as const;

export async function confirmExpectedArrival(input: {
  client: SupabaseClient<Database>;
  payload: ConfirmExpectedArrivalInput;
  actor: YardActor;
}): Promise<{ truck_id: string }> {
  const { client, actor } = input;
  await assertActorRole(client, actor.id, [UserRole.YardAgent, UserRole.Management]);
  const payload = confirmExpectedArrivalSchema.parse(input.payload);

  const { data: truck, error: fetchError } = await client
    .from('trucks')
    .select('*')
    .eq('id', payload.truck_id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!truck) throw new Error('Expected truck was not found.');
  await assertPreAlertYardMutable(client, truck.pre_alert_id);
  if (truck.arrival_status !== ArrivalStatus.Expected) {
    throw new Error(`${truck.vehicle_registration} is not in expected status.`);
  }
  if (truck.status !== TruckStatus.Waiting) {
    throw new Error(`${truck.vehicle_registration} cannot be confirmed in status ${truck.status}.`);
  }

  let arrivedAt = new Date().toISOString();
  if (payload.arrived_at) {
    const parsed = new Date(payload.arrived_at);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Arrival time is not a valid date.');
    }
    arrivedAt = parsed.toISOString();
  }

  const currentSources = (truck.field_sources ?? {}) as FieldSources;
  const nextSources: FieldSources = { ...currentSources };
  const patch: Database['public']['Tables']['trucks']['Update'] = {
    arrival_status: ArrivalStatus.Arrived,
    arrived_at: arrivedAt,
    arrived_by: actor.id,
    trailer_vehicle_id: await ensureVehicle(
      client,
      payload.trailer_registration ?? truck.trailer_registration,
    ),
    trailer2_vehicle_id: await ensureVehicle(
      client,
      payload.trailer_registration_2 ?? truck.trailer_registration_2,
    ),
  };

  const audits: Database['public']['Tables']['audit_events']['Insert'][] = [
    {
      entity_type: 'truck',
      entity_id: truck.id,
      truck_id: truck.id,
      action: 'arrival_confirmed',
      actor_id: actor.id,
      actor_display_name: actor.display_name,
      new_value: arrivedAt,
      metadata: {
        source: FieldSource.Yard,
        on_site_from_prealert: truck.on_site,
        unplanned: false,
      },
    },
  ];

  for (const field of CONFIRM_FIELDS) {
    const nextValue = payload[field] ?? null;
    const previous = (truck[field] as string | null) ?? null;
    if ((nextValue ?? null) === (previous ?? null)) continue;
    (patch as Record<string, string | null>)[field] = nextValue;
    nextSources[field] = FieldSource.Yard;
    audits.push({
      entity_type: 'truck',
      entity_id: truck.id,
      truck_id: truck.id,
      action: 'yard_correction',
      field_name: field,
      previous_value: previous,
      new_value: nextValue,
      actor_id: actor.id,
      actor_display_name: actor.display_name,
      metadata: { source: FieldSource.Yard, previous_source: currentSources[field] ?? null },
    });
  }

  patch.field_sources = mergeFieldSources(currentSources, nextSources) as Json;

  const { error: updateError } = await client
    .from('trucks')
    .update(patch)
    .eq('id', truck.id)
    .eq('arrival_status', ArrivalStatus.Expected);
  if (updateError) throw updateError;

  const { error: auditError } = await client.from('audit_events').insert(audits);
  if (auditError) throw auditError;

  return { truck_id: truck.id };
}

export async function cancelExpectedTruck(input: {
  client: SupabaseClient<Database>;
  payload: CancelExpectedTruckInput;
  actor: YardActor;
}): Promise<void> {
  const { client, actor } = input;
  await assertActorRole(client, actor.id, [UserRole.Management]);
  const payload = cancelExpectedTruckSchema.parse(input.payload);

  const { data: truck, error: fetchError } = await client
    .from('trucks')
    .select('id, vehicle_registration, arrival_status, status, pre_alert_id')
    .eq('id', payload.truck_id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!truck) throw new Error('Truck was not found.');
  await assertPreAlertYardMutable(client, truck.pre_alert_id);
  if (truck.arrival_status !== ArrivalStatus.Expected) {
    throw new Error(`${truck.vehicle_registration} is not expected and cannot be cancelled this way.`);
  }

  const { error: updateError } = await client
    .from('trucks')
    .update({
      arrival_status: ArrivalStatus.Cancelled,
      status: TruckStatus.Cancelled,
    })
    .eq('id', truck.id)
    .eq('arrival_status', ArrivalStatus.Expected);
  if (updateError) throw updateError;

  const { error: auditError } = await client.from('audit_events').insert({
    entity_type: 'truck',
    entity_id: truck.id,
    truck_id: truck.id,
    action: 'expected_cancelled',
    reason: payload.reason,
    actor_id: actor.id,
    actor_display_name: actor.display_name,
    previous_value: ArrivalStatus.Expected,
    new_value: ArrivalStatus.Cancelled,
    metadata: { vehicle_registration: truck.vehicle_registration },
  });
  if (auditError) throw auditError;
}
