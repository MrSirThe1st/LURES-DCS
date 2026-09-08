import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateTruckTotalWeightKg,
  canTransitionTruckStatus,
  getManagementTruckStatusActions,
  getTruckLoadIndicator,
  requiresTruckStatusChangeReason,
  type TruckStatus,
} from '@lures-dcs/domain';
import { transitionTruckStatus } from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import { LoadProgressCell } from '../components/LoadProgressCell';
import { OverlayCloseButton } from '../components/OverlayCloseButton';
import { useAuth } from '../lib/auth';
import { formatDisplayDate, formatWeightKg, todayDateIso, truckStatusLabel } from '../lib/format';
import { useOperationalRealtime } from '../lib/realtime';
import { getSupabaseClient } from '../lib/supabase';

type TruckListItem = {
  id: string;
  vehicle_registration: string;
  trailer_registration: string | null;
  driver_name: string | null;
  transporter_name: string | null;
  status: TruckStatus;
  packing_list_number: string | null;
  bags: Array<{ id: string; net_weight_kg: number; verification_status: string }>;
};

type StatusCounts = Record<TruckStatus, number>;

const EMPTY_COUNTS: StatusCounts = {
  waiting: 0,
  available: 0,
  loading: 0,
  completed: 0,
  on_hold: 0,
  cancelled: 0,
};

const ALL_STATUSES: TruckStatus[] = [
  'waiting',
  'available',
  'loading',
  'completed',
  'on_hold',
  'cancelled',
];

type TodayOverviewScreenProps = {
  onOpenTruck: (truckId: string) => void;
};

export function TodayOverviewScreen({ onOpenTruck }: TodayOverviewScreenProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<TruckListItem[]>([]);
  const [listLabel, setListLabel] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [statusReason, setStatusReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [actionsMounted, setActionsMounted] = useState(false);
  const [actionsEntered, setActionsEntered] = useState(false);
  const [panelTrucks, setPanelTrucks] = useState<TruckListItem[]>([]);
  const [infoTruckId, setInfoTruckId] = useState<string | null>(null);
  const dateIso = todayDateIso();

  const load = useCallback(async (mode: 'initial' | 'silent' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();

    const { data: lists, error: listError } = await supabase
      .from('loading_lists')
      .select('id, packing_list_number, cargo_description, status')
      .eq('loading_date', dateIso)
      .order('created_at', { ascending: true });

    if (listError) {
      setError(listError.message);
      setTrucks([]);
      setLoading(false);
      return;
    }

    if (!lists || lists.length === 0) {
      setListLabel(null);
      setTrucks([]);
      setSelectedIds(new Set());
      setLoading(false);
      setLastSyncedAt(new Date());
      return;
    }

    const listIds = lists.map((list) => list.id);
    setListLabel(
      lists
        .map((list) => list.packing_list_number ?? list.cargo_description ?? 'Loading list')
        .join(', '),
    );

    const { data: truckData, error: truckError } = await supabase
      .from('trucks')
      .select(
        'id, vehicle_registration, trailer_registration, driver_name, transporter_name, status, packing_list_number, bags(id, net_weight_kg, verification_status)',
      )
      .in('loading_list_id', listIds)
      .order('vehicle_registration', { ascending: true });

    if (truckError) {
      setError(truckError.message);
      setTrucks([]);
      setLoading(false);
      return;
    }

    const nextTrucks = (truckData ?? []) as TruckListItem[];
    setTrucks(nextTrucks);
    setSelectedIds((prev) => {
      const valid = new Set(nextTrucks.map((t) => t.id));
      const kept = [...prev].filter((id) => valid.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
    setLastSyncedAt(new Date());
    setLoading(false);
  }, [dateIso]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refreshSilent = useCallback(() => {
    void load('silent');
  }, [load]);

  const { live } = useOperationalRealtime({
    channelName: `desktop-today-${dateIso}`,
    subscriptions: [
      { table: 'loading_lists' },
      { table: 'trucks' },
      { table: 'bags' },
    ],
    onChange: refreshSilent,
  });

  const counts = useMemo(() => {
    const next = { ...EMPTY_COUNTS };
    for (const truck of trucks) {
      next[truck.status] += 1;
    }
    return next;
  }, [trucks]);

  const selectedTrucks = useMemo(
    () => trucks.filter((truck) => selectedIds.has(truck.id)),
    [trucks, selectedIds],
  );

  const actionsOpen = selectedTrucks.length > 0;
  const overlayTrucks = actionsOpen ? selectedTrucks : panelTrucks;

  useEffect(() => {
    if (selectedTrucks.length > 0) {
      setPanelTrucks(selectedTrucks);
    }
  }, [selectedTrucks]);

  useEffect(() => {
    if (actionsOpen) {
      setActionsMounted(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setActionsEntered(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setActionsEntered(false);
    const timeout = window.setTimeout(() => {
      setActionsMounted(false);
      setPanelTrucks([]);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [actionsOpen]);

  const allSelected = trucks.length > 0 && selectedIds.size === trucks.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  /** Management actions every selected truck can take (Available / Hold / Cancel). */
  const commonTargets = useMemo(() => {
    if (overlayTrucks.length === 0) return [] as TruckStatus[];
    let targets = new Set(getManagementTruckStatusActions(overlayTrucks[0]!.status));
    for (const truck of overlayTrucks.slice(1)) {
      const allowed = new Set(getManagementTruckStatusActions(truck.status));
      targets = new Set([...targets].filter((status) => allowed.has(status)));
    }
    return ALL_STATUSES.filter((status) => targets.has(status));
  }, [overlayTrucks]);

  function dismissStatusActions() {
    if (statusBusy) return;
    setSelectedIds(new Set());
    setStatusError(null);
    setStatusNotice(null);
  }

  useEffect(() => {
    if (!actionsOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-status-actions-overlay]')) return;
      if (target.closest('[data-truck-selection]')) return;
      dismissStatusActions();
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [actionsOpen, statusBusy]);

  function toggleOne(truckId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(truckId)) next.delete(truckId);
      else next.add(truckId);
      return next;
    });
    setStatusError(null);
    setStatusNotice(null);
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      if (trucks.length > 0 && prev.size === trucks.length) return new Set();
      return new Set(trucks.map((t) => t.id));
    });
    setStatusError(null);
    setStatusNotice(null);
  }

  async function applyStatus(to: TruckStatus) {
    if (!profile || selectedTrucks.length === 0) return;
    if (requiresTruckStatusChangeReason(to) && statusReason.trim().length === 0) {
      setStatusError('A reason is required for On Hold or Cancelled.');
      return;
    }

    setStatusBusy(true);
    setStatusError(null);
    setStatusNotice(null);

    let ok = 0;
    const failures: string[] = [];

    for (const truck of selectedTrucks) {
      if (!canTransitionTruckStatus(truck.status, to)) {
        failures.push(`${truck.vehicle_registration}: cannot go to ${truckStatusLabel(to)}`);
        continue;
      }
      try {
        await transitionTruckStatus({
          client: getSupabaseClient(),
          truckId: truck.id,
          from: truck.status,
          to,
          actor: profile,
          reason: statusReason,
        });
        ok += 1;
      } catch (err) {
        failures.push(
          `${truck.vehicle_registration}: ${err instanceof Error ? err.message : 'failed'}`,
        );
      }
    }

    setStatusBusy(false);
    if (ok > 0) {
      setStatusReason('');
      setSelectedIds(new Set());
      setStatusNotice(
        `Updated ${ok} truck(s) to ${truckStatusLabel(to)}${
          failures.length > 0 ? ` · ${failures.length} skipped/failed` : ''
        }.`,
      );
      await load('silent');
    }
    if (failures.length > 0) {
      setStatusError(failures.slice(0, 4).join(' · '));
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-space-lg p-space-lg">
      <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-border pb-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="text-2xl font-semibold text-text-primary">Today’s loading</h1>
          <p className="text-base text-text-secondary">{formatDisplayDate(dateIso)}</p>
          {listLabel ? <p className="text-sm text-text-secondary">{listLabel}</p> : null}
          <p className="text-sm text-text-secondary">
            {live ? 'Live' : 'Connecting…'}
            {lastSyncedAt ? ` · updated ${lastSyncedAt.toLocaleTimeString()}` : null}
            {profile?.display_name ? ` · ${profile.display_name}` : null}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load('initial')}>
          Refresh
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-space-md md:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(EMPTY_COUNTS) as TruckStatus[]).map((status) => (
          <div key={status} className="border border-border bg-surface p-space-md">
            <p className="text-sm text-text-secondary">{truckStatusLabel(status)}</p>
            <p className="text-2xl font-semibold text-text-primary">{counts[status]}</p>
          </div>
        ))}
      </section>

      {loading ? <p className="text-base text-text-secondary">Loading trucks…</p> : null}
      {error ? <p className="text-base text-destructive">{error}</p> : null}

      {!loading && !error && trucks.length === 0 ? (
        <p className="text-base text-text-secondary">
          No trucks scheduled for today. Seed sample data with{' '}
          <code className="font-mono text-sm">pnpm seed:today</code>.
        </p>
      ) : null}

      {actionsMounted ? (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-[15] overflow-hidden">
          <section
            data-status-actions-overlay
            className={[
              'pointer-events-auto border-b border-border bg-surface/95 px-space-md py-space-md text-sm shadow-sm backdrop-blur-sm transition-transform duration-300 ease-out will-change-transform',
              actionsEntered ? 'translate-y-0' : '-translate-y-full',
            ].join(' ')}
            role="region"
            aria-label="Truck status actions"
            aria-hidden={!actionsEntered}
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-space-sm">
              <div className="flex items-start justify-between gap-space-md">
                <p className="pt-1 text-sm font-medium text-text-primary">
                  {overlayTrucks.length} truck{overlayTrucks.length === 1 ? '' : 's'} selected
                </p>
                <OverlayCloseButton
                  disabled={statusBusy}
                  onClick={dismissStatusActions}
                />
              </div>

              {commonTargets.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Selected trucks do not share a common management action. Select trucks in
                  compatible statuses (Available / Hold / Cancel).
                </p>
              ) : (
                <>
                  <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
                    Reason (required for On Hold / Cancelled)
                    <input
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      className="border border-border bg-background px-space-md py-space-sm text-base text-text-primary"
                      placeholder="e.g. Seal discrepancy — waiting for confirmation"
                    />
                  </label>
                  <div className="flex flex-wrap gap-space-sm">
                    {commonTargets.map((to) => {
                      const needsReason = requiresTruckStatusChangeReason(to);
                      const disabled =
                        statusBusy ||
                        !actionsOpen ||
                        (needsReason && statusReason.trim().length === 0);
                      return (
                        <Button
                          key={to}
                          type="button"
                          variant={to === 'cancelled' ? 'destructive' : 'secondary'}
                          disabled={disabled}
                          onClick={() => void applyStatus(to)}
                        >
                          {statusBusy ? 'Updating…' : `Set ${truckStatusLabel(to)}`}
                        </Button>
                      );
                    })}
                  </div>
                </>
              )}

              {statusNotice ? <p className="text-sm text-success">{statusNotice}</p> : null}
              {statusError ? <p className="text-sm text-destructive">{statusError}</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {trucks.length > 0 ? (
        <section
          data-truck-selection
          className="overflow-x-auto border border-border bg-surface"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-text-secondary">
              <tr>
                <th className="w-12 px-space-md py-space-sm font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all trucks"
                  />
                </th>
                <th className="px-space-md py-space-sm font-medium">Truck</th>
                <th className="px-space-md py-space-sm font-medium">Trailer</th>
                <th className="px-space-md py-space-sm font-medium">Driver</th>
                <th className="px-space-md py-space-sm font-medium">Bags</th>
                <th className="px-space-md py-space-sm font-medium">Weight</th>
                <th className="px-space-md py-space-sm font-medium">Status</th>
                <th className="px-space-md py-space-sm font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((truck) => {
                const bagCount = truck.bags?.length ?? 0;
                const total = calculateTruckTotalWeightKg(
                  (truck.bags ?? []).map((bag) => Number(bag.net_weight_kg)),
                );
                const selected = selectedIds.has(truck.id);
                const indicator = getTruckLoadIndicator(truck.status, truck.bags ?? []);
                return (
                  <tr
                    key={truck.id}
                    className={[
                      'border-b border-border last:border-b-0',
                      selected ? 'bg-background' : 'hover:bg-background',
                    ].join(' ')}
                  >
                    <td className="px-space-md py-space-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleOne(truck.id)}
                        aria-label={`Select ${truck.vehicle_registration}`}
                      />
                    </td>
                    <td className="px-space-md py-space-sm">
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-text-primary underline-offset-2 hover:underline"
                        onClick={() => onOpenTruck(truck.id)}
                      >
                        {truck.vehicle_registration}
                      </button>
                    </td>
                    <td className="px-space-md py-space-sm text-text-secondary">
                      {truck.trailer_registration ?? '—'}
                    </td>
                    <td className="px-space-md py-space-sm text-text-secondary">
                      {truck.driver_name ?? '—'}
                    </td>
                    <td className="px-space-md py-space-sm text-text-secondary">{bagCount}</td>
                    <td className="px-space-md py-space-sm text-text-secondary">
                      {formatWeightKg(total)}
                    </td>
                    <td className="px-space-md py-space-sm text-text-primary">
                      {truckStatusLabel(truck.status)}
                    </td>
                    <td className="px-space-md py-space-sm">
                      <LoadProgressCell
                        indicator={indicator}
                        infoOpen={infoTruckId === truck.id}
                        onToggleInfo={() =>
                          setInfoTruckId((current) => (current === truck.id ? null : truck.id))
                        }
                        onCloseInfo={() => setInfoTruckId(null)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}
