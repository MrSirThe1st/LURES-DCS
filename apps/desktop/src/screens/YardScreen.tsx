import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  assignTrucksToLoadingDate,
  cancelExpectedTruck,
  listDidNotArriveTrucks,
  listExpectedTrucks,
  listYardQueue,
  registerYardArrival,
  type YardQueueTruck,
} from '@lures-dcs/data-access';
import { isPreAlertYardMutable } from '@lures-dcs/domain';
import { Button } from '@lures-dcs/ui';
import { ActionMenu, type ActionMenuItem } from '../components/ActionMenu';
import { OverlayCloseButton } from '../components/OverlayCloseButton';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../lib/auth';
import { formatEtaDate, todayDateIso } from '../lib/format';
import { useLocale } from '../lib/locale';
import { useOperationalRealtime } from '../lib/realtime';
import { getSupabaseClient } from '../lib/supabase';

function formatArrival(value: string | null, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
}

type YardScreenProps = {
  onOpenTruck: (truckId: string) => void;
};

export function YardScreen({ onOpenTruck }: YardScreenProps) {
  const { profile } = useAuth();
  const { locale, t } = useLocale();
  const [arrived, setArrived] = useState<YardQueueTruck[]>([]);
  const [expected, setExpected] = useState<YardQueueTruck[]>([]);
  const [didNotArrive, setDidNotArrive] = useState<YardQueueTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [programDate, setProgramDate] = useState(todayDateIso());
  const [dailyCap, setDailyCap] = useState('12');
  const [unplannedOpen, setUnplannedOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async (mode: 'initial' | 'silent' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    setError(null);
    try {
      const client = getSupabaseClient();
      const [arrivedRows, expectedRows, missingRows] = await Promise.all([
        listYardQueue(client),
        listExpectedTrucks(client),
        listDidNotArriveTrucks(client),
      ]);
      setArrived(arrivedRows);
      setExpected(expectedRows);
      setDidNotArrive(missingRows);
      setSelectedIds((prev) => {
        const valid = new Set(arrivedRows.map((row) => row.id));
        const kept = [...prev].filter((id) => valid.has(id));
        return kept.length === prev.size ? prev : new Set(kept);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setArrived([]);
      setExpected([]);
      setDidNotArrive([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refreshSilent = useCallback(() => {
    void load('silent');
  }, [load]);

  const { live } = useOperationalRealtime({
    channelName: 'desktop-yard',
    subscriptions: [{ table: 'trucks' }, { table: 'pre_alerts' }],
    onChange: refreshSilent,
  });

  const selectedTrucks = useMemo(
    () => arrived.filter((truck) => selectedIds.has(truck.id)),
    [arrived, selectedIds],
  );

  const cap = Number.parseInt(dailyCap, 10);
  const capLimit = Number.isFinite(cap) && cap > 0 ? cap : null;

  function toggleOne(truckId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(truckId)) next.delete(truckId);
      else next.add(truckId);
      return next;
    });
  }

  async function onAssign() {
    if (!profile || selectedTrucks.length === 0 || busy) return;
    if (capLimit != null && selectedTrucks.length > capLimit) {
      setActionError(t('yard.capExceeded', { selected: selectedTrucks.length, cap: capLimit }));
      return;
    }
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await assignTrucksToLoadingDate({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: {
          truck_ids: selectedTrucks.map((truck) => truck.id),
          loading_date: programDate,
        },
      });
      setSelectedIds(new Set());
      setNotice(t('yard.assigned', { count: result.assigned, date: programDate }));
      await load('silent');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function onCancelExpected() {
    if (!profile || !cancelId || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await cancelExpectedTruck({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: { truck_id: cancelId, reason: cancelReason },
      });
      setNotice(t('yard.cancelled'));
      setCancelId(null);
      setCancelReason('');
      await load('silent');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-border bg-background px-space-md py-space-sm text-base text-text-primary';

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-space-lg p-space-lg">
      <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-border pb-space-md">
        <div className="flex flex-col gap-space-xs">
          <h1 className="text-2xl font-semibold text-text-primary">{t('yard.title')}</h1>
          <p className="text-base text-text-secondary">{t('yard.subtitleOffice')}</p>
          <p className="text-sm text-text-secondary">
            {live ? t('common.live') : t('common.connecting')}
            {profile?.display_name ? ` · ${profile.display_name}` : null}
          </p>
        </div>
        <div className="flex gap-space-sm">
          <Button type="button" variant="secondary" onClick={() => setUnplannedOpen(true)}>
            {t('yard.registerCta')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void load('initial')}>
            {t('common.refresh')}
          </Button>
        </div>
      </header>

      {notice ? (
        <p className="text-sm text-success" role="status">
          {notice}
        </p>
      ) : null}
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      {error ? <p className="text-base text-destructive">{error}</p> : null}
      {loading ? <p className="text-base text-text-secondary">{t('common.loading')}</p> : null}

      <section className="flex flex-col gap-space-md">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {t('yard.expected')} ({expected.length})
          </h2>
          <p className="text-sm text-text-secondary">{t('yard.expectedHelp')}</p>
        </div>
        {expected.length === 0 && !loading ? (
          <p className="text-base text-text-secondary">{t('yard.expectedEmpty')}</p>
        ) : null}
        {expected.length > 0 ? (
          <TruckTable
            trucks={expected}
            t={t}
            onOpenTruck={onOpenTruck}
            extraHeader={t('yard.eta')}
            extraCell={(truck) =>
              truck.on_site ? t('yard.onSite') : formatEtaDate(truck.eta_to_mine)
            }
            extraMenuItems={(truck) =>
              !truck.pre_alert_id || isPreAlertYardMutable(truck.pre_alert_status)
                ? [
                    {
                      label: t('yard.cancelExpected'),
                      tone: 'destructive',
                      onSelect: () => setCancelId(truck.id),
                    },
                  ]
                : []
            }
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-space-md">
        <div className="flex flex-wrap items-end justify-between gap-space-md">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {t('yard.queue')} ({arrived.length})
            </h2>
            <p className="text-sm text-text-secondary">{t('yard.queueHelp')}</p>
          </div>
          {selectedTrucks.length > 0 ? (
            <div className="flex flex-wrap items-end gap-space-sm">
              <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
                {t('yard.programDate')}
                <input
                  type="date"
                  value={programDate}
                  onChange={(e) => setProgramDate(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex w-24 flex-col gap-space-xs text-sm text-text-secondary">
                {t('yard.dailyCap')}
                <input
                  type="number"
                  min={1}
                  value={dailyCap}
                  onChange={(e) => setDailyCap(e.target.value)}
                  className={inputClass}
                />
              </label>
              <Button type="button" disabled={busy} onClick={() => void onAssign()}>
                {t('yard.assign', { count: selectedTrucks.length })}
              </Button>
              <OverlayCloseButton onClick={() => setSelectedIds(new Set())} />
            </div>
          ) : null}
        </div>
        {arrived.length === 0 && !loading ? (
          <p className="text-base text-text-secondary">{t('yard.empty')}</p>
        ) : null}
        {arrived.length > 0 ? (
          <div className="overflow-x-auto border border-border bg-surface">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border text-text-secondary">
                <tr>
                  <th className="w-12 px-space-md py-space-sm font-medium" />
                  <th className="px-space-md py-space-sm font-medium">{t('yard.col.order')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.vehicle')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.trailer')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.trailer2')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.driver')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.transporter')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.client')}</th>
                  <th className="px-space-md py-space-sm font-medium">{t('yard.arrivedAt')}</th>
                  <th className="w-12 px-space-md py-space-sm font-medium" />
                </tr>
              </thead>
              <tbody>
                {arrived.map((truck, index) => {
                  const selected = selectedIds.has(truck.id);
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
                          aria-label={truck.vehicle_registration}
                        />
                      </td>
                      <td className="px-space-md py-space-sm text-text-secondary">{index + 1}</td>
                      <td className="px-space-md py-space-sm">
                        <button
                          type="button"
                          className="cursor-pointer font-medium text-text-primary underline-offset-2 hover:underline"
                          onClick={() => onOpenTruck(truck.id)}
                        >
                          {truck.vehicle_registration}
                        </button>
                        {truck.unplanned ? (
                          <p className="text-xs text-destructive">{t('yard.unplannedBadge')}</p>
                        ) : null}
                      </td>
                      <td className="px-space-md py-space-sm text-text-secondary">
                        {truck.trailer_registration ?? '—'}
                      </td>
                      <td className="px-space-md py-space-sm text-text-secondary">
                        {truck.trailer_registration_2 ?? '—'}
                      </td>
                      <td className="px-space-md py-space-sm text-text-secondary">{truck.driver_name ?? '—'}</td>
                      <td className="px-space-md py-space-sm text-text-secondary">
                        {truck.transporter_name ?? '—'}
                      </td>
                      <td className="px-space-md py-space-sm text-text-secondary">{truck.client_name ?? '—'}</td>
                      <td className="px-space-md py-space-sm text-text-secondary">
                        {formatArrival(truck.arrived_at, locale)}
                      </td>
                      <td className="px-space-md py-space-sm">
                        <ActionMenu
                          label={t('common.actions')}
                          items={[
                            { label: t('common.open'), onSelect: () => onOpenTruck(truck.id) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-space-md">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {t('yard.notArrived')} ({didNotArrive.length})
          </h2>
          <p className="text-sm text-text-secondary">{t('yard.notArrivedHelp')}</p>
        </div>
        {didNotArrive.length === 0 && !loading ? (
          <p className="text-base text-text-secondary">{t('yard.notArrivedEmpty')}</p>
        ) : null}
        {didNotArrive.length > 0 ? (
          <TruckTable trucks={didNotArrive} t={t} onOpenTruck={onOpenTruck} />
        ) : null}
      </section>

      {unplannedOpen ? (
        <UnplannedForm
          onClose={() => setUnplannedOpen(false)}
          onRegistered={async (vehicle) => {
            setUnplannedOpen(false);
            setNotice(t('yard.confirmed', { vehicle }));
            await load('silent');
          }}
        />
      ) : null}

      {cancelId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-text-primary/20 p-space-lg">
          <div className="w-full max-w-md border border-border bg-surface p-space-lg">
            <h3 className="text-lg font-semibold text-text-primary">{t('yard.cancelExpected')}</h3>
            <label className="mt-space-md flex flex-col gap-space-xs text-sm text-text-secondary">
              {t('yard.cancelReason')}
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="mt-space-md flex gap-space-sm">
              <Button type="button" disabled={busy || cancelReason.trim().length === 0} onClick={() => void onCancelExpected()}>
                {t('yard.cancelExpected')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCancelId(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function TruckTable({
  trucks,
  t,
  onOpenTruck,
  extraHeader,
  extraCell,
  extraMenuItems,
}: {
  trucks: YardQueueTruck[];
  t: (key: 'yard.vehicle' | 'yard.driver' | 'yard.transporter' | 'yard.client') => string;
  onOpenTruck: (id: string) => void;
  extraHeader?: string;
  extraCell?: (truck: YardQueueTruck) => string;
  extraMenuItems?: (truck: YardQueueTruck) => ActionMenuItem[];
}) {
  const { t: translate } = useLocale();
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-border text-text-secondary">
          <tr>
            <th className="px-space-md py-space-sm font-medium">{t('yard.vehicle')}</th>
            <th className="px-space-md py-space-sm font-medium">{translate('yard.trailer')}</th>
            <th className="px-space-md py-space-sm font-medium">{translate('yard.trailer2')}</th>
            <th className="px-space-md py-space-sm font-medium">{t('yard.driver')}</th>
            <th className="px-space-md py-space-sm font-medium">{t('yard.transporter')}</th>
            <th className="px-space-md py-space-sm font-medium">{t('yard.client')}</th>
            {extraHeader ? <th className="px-space-md py-space-sm font-medium">{extraHeader}</th> : null}
            <th className="w-12 px-space-md py-space-sm font-medium">
              <span className="sr-only">{translate('common.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((truck) => (
            <tr key={truck.id} className="border-b border-border last:border-b-0 hover:bg-background">
              <td className="px-space-md py-space-sm">
                <button
                  type="button"
                  className="cursor-pointer font-medium text-text-primary underline-offset-2 hover:underline"
                  onClick={() => onOpenTruck(truck.id)}
                >
                  {truck.vehicle_registration}
                </button>
                {truck.pre_alert_status === 'paused' ? (
                  <p className="mt-1">
                    <StatusBadge tone="warning">{translate('yard.paused')}</StatusBadge>
                  </p>
                ) : null}
              </td>
              <td className="px-space-md py-space-sm text-text-secondary">
                {truck.trailer_registration ?? '—'}
              </td>
              <td className="px-space-md py-space-sm text-text-secondary">
                {truck.trailer_registration_2 ?? '—'}
              </td>
              <td className="px-space-md py-space-sm text-text-secondary">{truck.driver_name ?? '—'}</td>
              <td className="px-space-md py-space-sm text-text-secondary">{truck.transporter_name ?? '—'}</td>
              <td className="px-space-md py-space-sm text-text-secondary">{truck.client_name ?? '—'}</td>
              {extraCell ? (
                <td className="px-space-md py-space-sm text-text-secondary">{extraCell(truck)}</td>
              ) : null}
              <td className="px-space-md py-space-sm">
                <ActionMenu
                  label={translate('common.actions')}
                  items={[
                    { label: translate('common.open'), onSelect: () => onOpenTruck(truck.id) },
                    ...(extraMenuItems?.(truck) ?? []),
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnplannedForm({
  onClose,
  onRegistered,
}: {
  onClose: () => void;
  onRegistered: (vehicle: string) => Promise<void>;
}) {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [vehicle, setVehicle] = useState('');
  const [trailer, setTrailer] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [transporter, setTransporter] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputClass =
    'w-full rounded-md border border-border bg-background px-space-md py-space-sm text-base text-text-primary';

  async function onSubmit() {
    if (!profile || busy) return;
    setBusy(true);
    setError(null);
    try {
      await registerYardArrival({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: {
          vehicle_registration: vehicle,
          trailer_registration: trailer,
          driver_name: driver,
          driver_phone: phone,
          driver_passport_reference: null,
          transporter_name: transporter,
          client_name: client,
          notes,
        },
      });
      await onRegistered(vehicle.trim().toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-text-primary/20 p-space-lg">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto border border-border bg-surface p-space-lg">
        <div className="mb-space-md flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{t('yard.register')}</h3>
            <p className="text-sm text-destructive">{t('yard.unplannedBadge')}</p>
          </div>
          <OverlayCloseButton onClick={onClose} />
        </div>
        <div className="flex flex-col gap-space-sm">
          <Field label={t('yard.vehicle')} value={vehicle} onChange={setVehicle} className={inputClass} />
          <Field label={t('yard.trailer')} value={trailer} onChange={setTrailer} className={inputClass} />
          <Field label={t('yard.driver')} value={driver} onChange={setDriver} className={inputClass} />
          <Field label={t('yard.phone')} value={phone} onChange={setPhone} className={inputClass} />
          <Field label={t('yard.transporter')} value={transporter} onChange={setTransporter} className={inputClass} />
          <Field label={t('yard.client')} value={client} onChange={setClient} className={inputClass} />
          <Field label={t('yard.notes')} value={notes} onChange={setNotes} className={inputClass} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" disabled={busy || vehicle.trim().length === 0} onClick={() => void onSubmit()}>
            {t('yard.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className={className} />
    </label>
  );
}
