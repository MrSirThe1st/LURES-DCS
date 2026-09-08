import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

type RealtimeTable = 'trucks' | 'bags' | 'audit_events' | 'loading_lists';

export type RealtimeSubscription = {
  table: RealtimeTable;
  /** Optional PostgREST-style filter, e.g. `truck_id=eq.<uuid>` */
  filter?: string;
};

type UseOperationalRealtimeOptions = {
  channelName: string;
  subscriptions: RealtimeSubscription[];
  enabled?: boolean;
  onChange: () => void;
  /** Debounce rapid bursts of row changes. */
  debounceMs?: number;
};

/**
 * Subscribe to operational table changes and invoke onChange (debounced).
 * Tables must already be in the supabase_realtime publication.
 */
export function useOperationalRealtime({
  channelName,
  subscriptions,
  enabled = true,
  onChange,
  debounceMs = 250,
}: UseOperationalRealtimeOptions): { live: boolean } {
  const [live, setLive] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const subscriptionsKey = JSON.stringify(subscriptions);

  useEffect(() => {
    const parsed = JSON.parse(subscriptionsKey) as RealtimeSubscription[];
    if (!enabled || parsed.length === 0) {
      setLive(false);
      return;
    }

    const supabase = getSupabaseClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onChangeRef.current();
      }, debounceMs);
    };

    channel = supabase.channel(channelName);
    for (const sub of parsed) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        () => schedule(),
      );
    }

    channel.subscribe((status) => {
      setLive(status === 'SUBSCRIBED');
    });

    return () => {
      if (timer) clearTimeout(timer);
      setLive(false);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [channelName, subscriptionsKey, enabled, debounceMs]);

  return { live };
}
