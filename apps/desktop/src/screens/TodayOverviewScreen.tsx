import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateTruckTotalWeightKg,
  canTransitionTruckStatus,
  getManagementTruckStatusActions,
  getTruckLoadIndicator,
  requiresTruckStatusChangeReason,
  type TruckStatus,
} from '@lures-dcs/domain';
import { transitionTruckStatus, returnTrucksToYard } from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import { BulletinImportModal } from '../components/BulletinImportModal';
import { LoadProgressCell } from '../components/LoadProgressCell';
import { OverlayCloseButton } from '../components/OverlayCloseButton';
import { useAuth } from '../lib/auth';
import { runBulletinExcelExport } from '../lib/export-bulletin';
import { formatDisplayDate, formatWeightKg, todayDateIso, truckStatusLabel } from '../lib/format';
import { useOperationalRealtime } from '../lib/realtime';
import { useLocale } from '../lib/locale';
import { getSupabaseClient } from '../lib/supabase';

type ProgramListRow = {
  id: string;
  bulletin_number: string | null;
  program_code: string | null;
  cargo_description: string | null;
  status: string;
};

type TruckListItem = {
  id: string;
  vehicle_registration: string;
  trailer_registration: string | null;
  driver_name: string | null;
  transporter_name: string | null;
  status: TruckStatus;
  packing_list_number: string | null;
  program_sequence: number | null;
  unplanned: boolean;
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
  onSelectionChange?: (truckIds: string[]) => void;
};

export function TodayOverviewScreen({ onOpenTruck, onSelectionChange }: TodayOverviewScreenProps) {
  const { profile } = useAuth();
  const { locale, t } = useLocale();
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
  const [dateIso, setDateIso] = useState(todayDateIso);
  const [programLists, setProgramLists] = useState<ProgramListRow[]>([]);
  const [bpImportOpen, setBpImportOpen] = useState(false);
  const [bpNotice, setBpNotice] = useState<string | null>(null);
  const [bpError, setBpError] = useState<string | null>(null);
  const [bpExportBusy, setBpExportBusy] = useState(false);

  useEffect(() => {
    onSelectionChange?.([...selectedIds]);
  }, [selectedIds, onSelectionChange]);

  const load = useCallback(async (mode: 'initial' | 'silent' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();

    const { data: lists, error: listError } = await supabase
      .from('loading_lists')
      .select('id, bulletin_number, program_code, cargo_description, status')
      .eq('loading_date', dateIso)
      .order('created_at', { ascending: true });

    if (listError) {
      setError(listError.message);
      setProgramLists([]);
      setTrucks([]);
      setLoading(false);
      return;
    }

    const typedLists = (lists ?? []) as ProgramListRow[];
    setProgramLists(typedLists);

    if (typedLists.length === 0) {
      setListLabel(null);
      setTrucks([]);
      setSelectedIds(new Set());
      setLoading(false);
      setLastSyncedAt(new Date());
      return;
    }

    const listIds = typedLists.map((list) => list.id);
    setListLabel(
      typedLists
        .map(
          (list) =>
            list.program_code ?? list.bulletin_number ?? list.cargo_description ?? 'Loading Program',
        )
        .join(', '),
    );

    const { data: truckData, error: truckError } = await supabase
      .from('trucks')
      .select(
        'id, vehicle_registration, trailer_registration, driver_name, transporter_name, status, packing_list_number, program_sequence, unplanned, bags(id, net_weight_kg, verification_status)',
      )
      .in('loading_list_id', listIds)
      .order('program_sequence', { ascending: true, nullsFirst: false })
      .order('vehicle_registration', { ascending: true });

    if (truckError) {
      setError(truckError.message);
      setTrucks([]);
      setLoading(false);
      return;
    }

    const nextTrucks = [...((truckData ?? []) as TruckListItem[])].sort((a, b) => {
      const seqA = a.program_sequence ?? Number.POSITIVE_INFINITY;
      const seqB = b.program_sequence ?? Number.POSITIVE_INFINITY;
      if (seqA !== seqB) return seqA - seqB;
      return a.vehicle_registration.localeCompare(b.vehicle_registration);
    });
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
        failures.push(`${truck.vehicle_registration}: cannot go to ${truckStatusLabel(to, locale)}`);
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
        `Updated ${ok} truck(s) to ${truckStatusLabel(to, locale)}${
          failures.length > 0 ? ` · ${failures.length} skipped/failed` : ''
        }.`,
      );
      await load('silent');
    }
    if (failures.length > 0) {
      setStatusError(failures.slice(0, 4).join(' · '));
    }
  }

  async function applyReturnToYard() {
    if (!profile || selectedTrucks.length === 0) return;
    setStatusBusy(true);
    setStatusError(null);
    setStatusNotice(null);
    try {
      const result = await returnTrucksToYard({
        client: getSupabaseClient(),
        actor: profile,
        payload: { truck_ids: selectedTrucks.map((truck) => truck.id) },
      });
      setSelectedIds(new Set());
      setStatusNotice(t('loading.returnedToYard', { count: result.returned }));
      await load('silent');
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setStatusBusy(false);
    }
  }

  async function exportBulletinFiles() {
    const bpLists = programLists.filter((list) => list.bulletin_number);
    if (bpLists.length === 0) {
      setBpError(t('bp.exportNone'));
      setBpNotice(null);
      return;
    }
    setBpExportBusy(true);
    setBpError(null);
    setBpNotice(null);
    try {
      for (const [index, list] of bpLists.entries()) {
        if (index > 0) await new Promise((resolve) => window.setTimeout(resolve, 400));
        await runBulletinExcelExport(list.id);
      }
      setBpNotice(t('bp.exported', { count: bpLists.length }));
    } catch (err) {
      setBpError(err instanceof Error ? err.message : t('bp.exportFailed'));
    } finally {
      setBpExportBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-space-lg p-space-lg">
      <BulletinImportModal
        open={bpImportOpen}
        onClose={() => setBpImportOpen(false)}
        onImported={(result) => {
          setBpNotice(
            t('bp.imported', { attached: result.trucks_attached, created: result.trucks_created }),
          );
          setBpError(null);
          void load('silent');
        }}
      />
      <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-border pb-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="text-2xl font-semibold text-text-primary">{t('loading.today')}</h1>
          <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
            {t('loading.date')}
            <input
              type="date"
              value={dateIso}
              onChange={(e) => {
                if (e.target.value) setDateIso(e.target.value);
              }}
              className="border border-border bg-background px-space-md py-space-sm text-base text-text-primary"
            />
          </label>
          <p className="text-base text-text-secondary">{formatDisplayDate(dateIso)}</p>
          {listLabel ? <p className="text-sm text-text-secondary">{listLabel}</p> : null}
          <p className="text-sm text-text-secondary">
            {live ? 'Live' : 'Connecting…'}
            {lastSyncedAt ? ` · updated ${lastSyncedAt.toLocaleTimeString()}` : null}
            {profile?.display_name ? ` · ${profile.display_name}` : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <Button type="button" onClick={() => setBpImportOpen(true)}>
            {t('bp.import')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={bpExportBusy}
            onClick={() => void exportBulletinFiles()}
          >
            {t('bp.export')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void load('initial')}>
            {t('common.refresh')}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-space-md md:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(EMPTY_COUNTS) as TruckStatus[]).map((status) => (
          <div key={status} className="border border-border bg-surface p-space-md">
            <p className="text-sm text-text-secondary">{truckStatusLabel(status, locale)}</p>
            <p className="text-2xl font-semibold text-text-primary">{counts[status]}</p>
          </div>
        ))}
      </section>

      {loading ? <p className="text-base text-text-secondary">Loading trucks…</p> : null}
      {error ? <p className="text-base text-destructive">{error}</p> : null}
      {bpNotice ? <p className="text-base text-success">{bpNotice}</p> : null}
      {bpError ? <p className="text-base text-destructive">{bpError}</p> : null}

      {!loading && !error && trucks.length === 0 ? (
        <p className="text-base text-text-secondary">{t('loading.empty')}</p>
      ) : null}

      {actionsMounted ? (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-15 overflow-hidden">
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
                          {statusBusy ? 'Updating…' : `Set ${truckStatusLabel(to, locale)}`}
                        </Button>
                      );
                    })}
                    {overlayTrucks.every((truck) => truck.status === 'waiting') ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={statusBusy || !actionsOpen}
                        onClick={() => void applyReturnToYard()}
                      >
                        {t('loading.returnToYard')}
                      </Button>
                    ) : null}
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
                <th className="px-space-md py-space-sm font-medium">{t('bp.seq')}</th>
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
                    <td className="px-space-md py-space-sm text-text-secondary">
                      {truck.program_sequence ?? '—'}
                    </td>
                    <td className="px-space-md py-space-sm">
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-text-primary underline-offset-2 hover:underline"
                        onClick={() => onOpenTruck(truck.id)}
                      >
                        {truck.vehicle_registration}
                      </button>
                      {truck.unplanned ? (
                        <span className="ml-space-xs text-xs text-text-secondary">{t('bp.unplanned')}</span>
                      ) : null}
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
                      {truckStatusLabel(truck.status, locale)}
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
