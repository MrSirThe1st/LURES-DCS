import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAuditHistory,
  fetchHistoryDay,
  listHistoryLoadingDates,
  KNOWN_AUDIT_ACTIONS,
  type AuditHistoryRow,
  type HistoryDaySnapshot,
} from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import {
  formatDisplayDate,
  formatWeightKg,
  todayDateIso,
  truckStatusLabel,
} from '../lib/format';
import { getSupabaseClient } from '../lib/supabase';

type HistoryScreenProps = {
  onOpenTruck: (truckId: string) => void;
};

type HistoryTab = 'day' | 'audit';

export function HistoryScreen({ onOpenTruck }: HistoryScreenProps) {
  const [tab, setTab] = useState<HistoryTab>('day');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayDateIso());
  const [daySnapshot, setDaySnapshot] = useState<HistoryDaySnapshot | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState<string | null>(null);

  const [auditFrom, setAuditFrom] = useState(todayDateIso());
  const [auditTo, setAuditTo] = useState(todayDateIso());
  const [auditAction, setAuditAction] = useState('');
  const [auditActor, setAuditActor] = useState('');
  const [auditTruckId, setAuditTruckId] = useState('');
  const [auditRows, setAuditRows] = useState<AuditHistoryRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoadedOnce, setAuditLoadedOnce] = useState(false);

  const loadDates = useCallback(async () => {
    const supabase = getSupabaseClient();
    const dates = await listHistoryLoadingDates(supabase, { limit: 90 });
    setAvailableDates(dates);
    setSelectedDate((current) => {
      if (dates.length > 0 && !dates.includes(current)) return dates[0]!;
      return current;
    });
  }, []);

  const loadDay = useCallback(async () => {
    setDayLoading(true);
    setDayError(null);
    try {
      const supabase = getSupabaseClient();
      const snapshot = await fetchHistoryDay(supabase, selectedDate);
      setDaySnapshot(snapshot);
    } catch (err) {
      setDaySnapshot(null);
      setDayError(err instanceof Error ? err.message : 'Failed to load history day');
    } finally {
      setDayLoading(false);
    }
  }, [selectedDate]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const supabase = getSupabaseClient();
      const rows = await fetchAuditHistory(supabase, {
        from: auditFrom || null,
        to: auditTo || null,
        action: auditAction || null,
        actorQuery: auditActor || null,
        truckId: auditTruckId || null,
        limit: 250,
      });
      setAuditRows(rows);
      setAuditLoadedOnce(true);
    } catch (err) {
      setAuditRows([]);
      setAuditError(err instanceof Error ? err.message : 'Failed to load audit history');
    } finally {
      setAuditLoading(false);
    }
  }, [auditAction, auditActor, auditFrom, auditTo, auditTruckId]);

  useEffect(() => {
    void loadDates().catch((err) => {
      setDayError(err instanceof Error ? err.message : 'Failed to load available dates');
    });
  }, [loadDates]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    if (tab === 'audit' && !auditLoadedOnce) {
      void loadAudit();
    }
  }, [tab, auditLoadedOnce, loadAudit]);

  const listLabel = useMemo(() => {
    if (!daySnapshot || daySnapshot.lists.length === 0) return null;
    return daySnapshot.lists
      .map((list) => list.packing_list_number ?? list.cargo_description ?? 'Loading list')
      .join(', ');
  }, [daySnapshot]);

  const truckOptions = useMemo(() => {
    const fromDay = (daySnapshot?.trucks ?? []).map((truck) => ({
      id: truck.id,
      label: truck.vehicle_registration,
    }));
    const fromAudit = auditRows
      .filter((row) => row.truck_id && row.vehicle_registration)
      .map((row) => ({ id: row.truck_id!, label: row.vehicle_registration! }));
    const map = new Map<string, string>();
    for (const option of [...fromDay, ...fromAudit]) {
      map.set(option.id, option.label);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [auditRows, daySnapshot]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-space-md p-space-lg">
      <header className="flex flex-col gap-space-sm">
        <h1 className="text-2xl font-semibold text-text-primary">History</h1>
        <p className="text-base text-text-secondary">
          Past loading days and filterable audit events. Today’s live work stays on Loading.
        </p>
      </header>

      <div className="flex flex-wrap gap-space-sm">
        <Button
          type="button"
          variant={tab === 'day' ? 'primary' : 'secondary'}
          onClick={() => setTab('day')}
        >
          Day trucks
        </Button>
        <Button
          type="button"
          variant={tab === 'audit' ? 'primary' : 'secondary'}
          onClick={() => setTab('audit')}
        >
          Audit log
        </Button>
      </div>

      {tab === 'day' ? (
        <section className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-end gap-space-md">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Loading date
              <input
                type="date"
                className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
            {availableDates.length > 0 ? (
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                Known days
                <select
                  className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                  value={availableDates.includes(selectedDate) ? selectedDate : ''}
                  onChange={(event) => {
                    if (event.target.value) setSelectedDate(event.target.value);
                  }}
                >
                  <option value="" disabled>
                    Select a day with data
                  </option>
                  {availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDisplayDate(date)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => void loadDay()}>
              Refresh
            </Button>
          </div>

          <p className="text-sm text-text-secondary">
            {formatDisplayDate(selectedDate)}
            {listLabel ? ` · ${listLabel}` : null}
          </p>

          {dayLoading ? <p className="text-base text-text-secondary">Loading day…</p> : null}
          {dayError ? <p className="text-base text-destructive">{dayError}</p> : null}

          {!dayLoading && !dayError && (daySnapshot?.trucks.length ?? 0) === 0 ? (
            <p className="text-base text-text-secondary">No trucks for this loading date.</p>
          ) : null}

          {(daySnapshot?.trucks.length ?? 0) > 0 ? (
            <div className="overflow-x-auto border border-border bg-surface">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-background text-left text-text-secondary">
                    <th className="px-space-sm py-space-sm font-semibold">Vehicle</th>
                    <th className="px-space-sm py-space-sm font-semibold">Trailer</th>
                    <th className="px-space-sm py-space-sm font-semibold">Driver</th>
                    <th className="px-space-sm py-space-sm font-semibold">Status</th>
                    <th className="px-space-sm py-space-sm font-semibold">Packing list</th>
                    <th className="px-space-sm py-space-sm font-semibold">Bags</th>
                    <th className="px-space-sm py-space-sm font-semibold">Total</th>
                    <th className="px-space-sm py-space-sm font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {daySnapshot!.trucks.map((truck) => (
                    <tr key={truck.id} className="border-t border-border">
                      <td className="px-space-sm py-space-sm font-medium text-text-primary">
                        {truck.vehicle_registration}
                      </td>
                      <td className="px-space-sm py-space-sm text-text-secondary">
                        {truck.trailer_registration ?? '—'}
                      </td>
                      <td className="px-space-sm py-space-sm text-text-secondary">
                        {truck.driver_name ?? '—'}
                      </td>
                      <td className="px-space-sm py-space-sm text-text-secondary">
                        {truckStatusLabel(truck.status)}
                      </td>
                      <td className="px-space-sm py-space-sm text-text-secondary">
                        {truck.packing_list_number ?? '—'}
                      </td>
                      <td className="px-space-sm py-space-sm tabular-nums text-text-secondary">
                        {truck.bag_count}
                      </td>
                      <td className="px-space-sm py-space-sm tabular-nums text-text-secondary">
                        {formatWeightKg(truck.total_net_weight_kg)}
                      </td>
                      <td className="px-space-sm py-space-sm text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onOpenTruck(truck.id)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'audit' ? (
        <section className="flex flex-col gap-space-md">
          <div className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              From
              <input
                type="date"
                className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                value={auditFrom}
                onChange={(event) => setAuditFrom(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              To
              <input
                type="date"
                className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                value={auditTo}
                onChange={(event) => setAuditTo(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Action
              <select
                className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                value={auditAction}
                onChange={(event) => setAuditAction(event.target.value)}
              >
                <option value="">All actions</option>
                {KNOWN_AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Actor contains
              <input
                type="text"
                className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                value={auditActor}
                placeholder="Display name"
                onChange={(event) => setAuditActor(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Truck
              <select
                className="rounded-md border border-border bg-surface px-space-sm py-space-xs text-base text-text-primary"
                value={auditTruckId}
                onChange={(event) => setAuditTruckId(event.target.value)}
              >
                <option value="">All trucks</option>
                {truckOptions.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" onClick={() => void loadAudit()} disabled={auditLoading}>
                {auditLoading ? 'Loading…' : 'Apply filters'}
              </Button>
            </div>
          </div>

          {auditError ? <p className="text-base text-destructive">{auditError}</p> : null}
          {!auditLoading && auditLoadedOnce && auditRows.length === 0 ? (
            <p className="text-base text-text-secondary">No audit events match these filters.</p>
          ) : null}

          {auditRows.length > 0 ? (
            <ul className="flex flex-col gap-space-sm border border-border bg-surface p-space-md">
              {auditRows.map((event) => (
                <li key={event.id} className="border-b border-border pb-space-sm last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-space-sm gap-y-1 text-sm">
                    <span className="font-medium text-text-primary">
                      {new Date(event.occurred_at).toLocaleString()}
                    </span>
                    <span className="text-text-secondary">{event.action}</span>
                    {event.vehicle_registration ? (
                      <button
                        type="button"
                        className="text-text-primary underline-offset-2 hover:underline"
                        onClick={() => event.truck_id && onOpenTruck(event.truck_id)}
                      >
                        {event.vehicle_registration}
                      </button>
                    ) : null}
                    {event.actor_display_name ? (
                      <span className="text-text-secondary">· {event.actor_display_name}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {event.field_name ? `${event.field_name}: ` : ''}
                    {event.previous_value || event.new_value
                      ? `${event.previous_value ?? '—'} → ${event.new_value ?? '—'}`
                      : event.entity_type}
                    {event.reason ? ` · ${event.reason}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
