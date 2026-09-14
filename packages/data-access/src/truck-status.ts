import {
  TruckStatus,
  assertTruckStatusTransition,
  requiresTruckStatusChangeReason,
  type TruckStatus as TruckStatusType,
} from '@lures-dcs/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from './database.types.js';

export type TruckStatusActor = Pick<Tables<'profiles'>, 'id' | 'display_name'>;

export type TransitionTruckStatusInput = {
  client: SupabaseClient<Database>;
  truckId: string;
  from: TruckStatusType;
  to: TruckStatusType;
  actor: TruckStatusActor;
  reason?: string | null;
};

/**
 * Apply a controlled truck status transition and write an audit event.
 * Domain rules live in `@lures-dcs/domain`; this is the shared persistence path.
 */
export async function transitionTruckStatus(input: TransitionTruckStatusInput): Promise<void> {
  const { client, truckId, from, to, actor } = input;
  const reason = input.reason?.trim() || null;

  assertTruckStatusTransition(from, to);

  if (requiresTruckStatusChangeReason(to) && !reason) {
    throw new Error(`A reason is required when setting status to ${to}.`);
  }

  if (to === TruckStatus.Available) {
    const { count, error: bagCountError } = await client
      .from('bags')
      .select('id', { count: 'exact', head: true })
      .eq('truck_id', truckId);
    if (bagCountError) throw bagCountError;
    if (!count) {
      throw new Error('Upload the packing list before marking this truck Available.');
    }
  }

  const patch: Database['public']['Tables']['trucks']['Update'] = {
    status: to,
    completed_at: to === TruckStatus.Completed ? new Date().toISOString() : null,
  };

  if (to === TruckStatus.Loading) {
    const { data: current, error: currentError } = await client
      .from('trucks')
      .select('loading_started_at')
      .eq('id', truckId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current?.loading_started_at) {
      patch.loading_started_at = new Date().toISOString();
    }
  }

  const { data: updated, error: updateError } = await client
    .from('trucks')
    .update(patch)
    .eq('id', truckId)
    .eq('status', from)
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;
  if (!updated) {
    throw new Error(
      `Truck status could not be updated from ${from}. It may have already changed.`,
    );
  }

  const { error: auditError } = await client.from('audit_events').insert({
    entity_type: 'truck',
    entity_id: truckId,
    truck_id: truckId,
    action: 'status_changed',
    field_name: 'status',
    previous_value: from,
    new_value: to,
    reason,
    actor_id: actor.id,
    actor_display_name: actor.display_name,
  });
  if (auditError) throw auditError;
}
