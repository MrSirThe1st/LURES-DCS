import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletePreAlert,
  listLoadingOrderRows,
  listPreAlertTrucks,
  listPreAlerts,
  pausePreAlert,
  resumePreAlert,
  type LoadingOrderRow,
  type Tables,
} from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import { ActionMenu, type ActionMenuItem } from '../components/ActionMenu';
import { LoadingOrderSheet } from '../components/LoadingOrderDocument';
import { LoadingOrderImportModal } from '../components/LoadingOrderImportModal';
import { StatusBadge, type StatusBadgeTone } from '../components/StatusBadge';
import { useAuth } from '../lib/auth';
import { downloadLoadingOrderExcel } from '../lib/export-loading-order';
import { hydratePreAlertHeaderFromStorage } from '../lib/hydrate-loading-order';
import { useLocale } from '../lib/locale';
import { useOperationalRealtime } from '../lib/realtime';
import { getSupabaseClient } from '../lib/supabase';
import type { MessageKey } from '@lures-dcs/i18n';

const STATUS_KEY: Record<string, MessageKey> = {
  draft: 'prealert.status.draft',
  active: 'prealert.status.active',
  paused: 'prealert.status.paused',
  closed: 'prealert.status.closed',
  cancelled: 'prealert.status.cancelled',
};

function orderStatusTone(status: string): StatusBadgeTone {
  if (status === 'active') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'draft' || status === 'paused') return 'warning';
  return 'neutral';
}

type PreAlertsScreenProps = {
  onOpenTruck: (truckId: string) => void;
};

export function PreAlertsScreen({ onOpenTruck }: PreAlertsScreenProps) {
  const { profile } = useAuth();
  const { t } = useLocale();
  const [rows, setRows] = useState<Tables<'pre_alerts'>[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTrucks, setSelectedTrucks] = useState<LoadingOrderRow[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const load = useCallback(async () => {
    setError(null);
    try {
      const client = getSupabaseClient();
      const list = await listPreAlerts(client);
      setRows(list);
      const nextCounts: Record<string, number> = {};
      await Promise.all(
        list.map(async (row) => {
          const trucks = await listPreAlertTrucks(client, row.id);
          nextCounts[row.id] = trucks.length;
        }),
      );
      setCounts(nextCounts);
      const openId = selectedIdRef.current;
      if (openId) {
        setSelectedTrucks(await listLoadingOrderRows(client, openId));
      } else {
        setSelectedTrucks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTrucks([]);
      setTrucksLoading(false);
      return;
    }
    setTrucksLoading(true);
    void listLoadingOrderRows(getSupabaseClient(), selectedId)
      .then(setSelectedTrucks)
      .catch((err) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setTrucksLoading(false));
  }, [selectedId, t]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    if (selected.allocation_truck_count != null && selected.balance_truck_count != null) return;
    let cancelled = false;
    void hydratePreAlertHeaderFromStorage(getSupabaseClient(), selected)
      .then((next) => {
        if (cancelled || next === selected) return;
        setRows((list) => list.map((row) => (row.id === next.id ? next : row)));
      })
      .catch(() => {
        /* Keep existing header values; do not invent truck counts. */
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const { live } = useOperationalRealtime({
    channelName: 'desktop-prealerts',
    subscriptions: [{ table: 'pre_alerts' }, { table: 'trucks' }],
    onChange: () => {
      void load();
    },
  });

  async function onPauseOrder(id: string) {
    if (!profile || busyId) return;
    setBusyId(id);
    setNotice(null);
    try {
      await pausePreAlert({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: { pre_alert_id: id },
      });
      setNotice(t('prealert.paused'));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  }

  async function onResumeOrder(id: string) {
    if (!profile || busyId) return;
    setBusyId(id);
    setNotice(null);
    try {
      await resumePreAlert({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: { pre_alert_id: id },
      });
      setNotice(t('prealert.resumed'));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteOrder(id: string) {
    if (!profile || busyId) return;
    setBusyId(id);
    setNotice(null);
    setError(null);
    try {
      const result = await deletePreAlert({
        client: getSupabaseClient(),
        actor: { id: profile.id, display_name: profile.display_name },
        payload: { pre_alert_id: id },
      });
      setDeleteId(null);
      if (selectedIdRef.current === id) setSelectedId(null);
      setNotice(t('prealert.deleted', { count: result.trucks_removed }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusyId(null);
    }
  }

  function orderMenuItems(row: Tables<'pre_alerts'>, includeOpen: boolean): ActionMenuItem[] {
    const disabled = busyId === row.id;
    const items: ActionMenuItem[] = [];
    if (includeOpen) {
      items.push({ label: t('common.open'), onSelect: () => setSelectedId(row.id) });
    }
    if (row.status === 'active') {
      items.push({ label: t('prealert.pause'), disabled, onSelect: () => void onPauseOrder(row.id) });
    }
    if (row.status === 'paused') {
      items.push({ label: t('prealert.resume'), disabled, onSelect: () => void onResumeOrder(row.id) });
    }
    items.push({
      label: t('prealert.delete'),
      tone: 'destructive',
      disabled,
      onSelect: () => setDeleteId(row.id),
    });
    return items;
  }

  return (
    <main
      className={
        selected
          ? 'flex h-[calc(100vh-3.5rem)] min-h-0 w-full flex-col overflow-hidden p-space-md'
          : 'mx-auto flex w-full max-w-[96rem] flex-col gap-space-lg p-space-lg'
      }
    >
      {!selected ? (
        <header className="flex flex-wrap items-start justify-between gap-space-md border-b border-border pb-space-md">
          <div className="flex flex-col gap-space-xs">
            <h1 className="text-2xl font-semibold text-text-primary">{t('prealert.title')}</h1>
            <p className="text-base text-text-secondary">{t('prealert.subtitle')}</p>
            <p className="text-sm text-text-secondary">{live ? t('common.live') : t('common.connecting')}</p>
          </div>
          <Button type="button" onClick={() => setImportOpen(true)}>
            {t('prealert.import')}
          </Button>
        </header>
      ) : null}

      {notice ? (
        <p className="text-sm text-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? <p className="text-base text-destructive">{error}</p> : null}
      {loading && !selected ? <p className="text-base text-text-secondary">{t('common.loading')}</p> : null}

      {selected ? (
        trucksLoading ? (
          <p className="text-base text-text-secondary">{t('common.loading')}</p>
        ) : (
          <LoadingOrderSheet
            order={selected}
            rows={selectedTrucks}
            onBack={() => setSelectedId(null)}
            onOpenTruck={onOpenTruck}
            onPauseOrder={selected.status === 'active' ? () => void onPauseOrder(selected.id) : undefined}
            onResumeOrder={selected.status === 'paused' ? () => void onResumeOrder(selected.id) : undefined}
            onDeleteOrder={() => setDeleteId(selected.id)}
            actionsDisabled={busyId === selected.id}
            onExport={() =>
              downloadLoadingOrderExcel({
                order: selected,
                rows: selectedTrucks,
                onSiteLabel: t('yard.onSite'),
              })
            }
          />
        )
      ) : null}

      {!selected && !loading && rows.length === 0 ? (
        <p className="text-base text-text-secondary">{t('prealert.empty')}</p>
      ) : null}

      {!selected && rows.length > 0 ? (
        <div className="overflow-x-auto border border-border bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-text-secondary">
              <tr>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.client')}</th>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.month')}</th>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.loadingPoint')}</th>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.offloading')}</th>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.trucks')}</th>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.status')}</th>
                <th className="px-space-md py-space-sm font-medium">{t('prealert.file')}</th>
                <th className="px-space-md py-space-sm font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-background">
                  <td className="px-space-md py-space-sm font-medium text-text-primary">
                    <button
                      type="button"
                      className="cursor-pointer text-left underline-offset-2 hover:underline"
                      onClick={() => setSelectedId(row.id)}
                    >
                      {row.client_name ?? '—'}
                    </button>
                  </td>
                  <td className="px-space-md py-space-sm text-text-secondary">{row.period_month ?? '—'}</td>
                  <td className="px-space-md py-space-sm text-text-secondary">{row.loading_point ?? '—'}</td>
                  <td className="px-space-md py-space-sm text-text-secondary">{row.offloading_point ?? '—'}</td>
                  <td className="px-space-md py-space-sm text-text-secondary">
                    <button
                      type="button"
                      className="cursor-pointer underline-offset-2 hover:underline"
                      onClick={() => setSelectedId(row.id)}
                    >
                      {counts[row.id] ?? '—'}
                    </button>
                  </td>
                  <td className="px-space-md py-space-sm">
                    <StatusBadge tone={orderStatusTone(row.status)}>
                      {t(STATUS_KEY[row.status] ?? 'prealert.status.active')}
                    </StatusBadge>
                  </td>
                  <td className="px-space-md py-space-sm text-text-secondary">{row.original_filename ?? '—'}</td>
                  <td className="px-space-md py-space-sm">
                    <ActionMenu
                      label={t('common.actions')}
                      items={orderMenuItems(row, true)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <LoadingOrderImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(result) => {
          const parts = [t('prealert.imported', { count: result.trucks_created })];
          if (result.trucks_already_present > 0) {
            parts.push(t('prealert.alreadyPresent', { count: result.trucks_already_present }));
          }
          if (result.blocked_plates.length > 0) {
            parts.push(
              t('prealert.blockedOpen', {
                count: result.blocked_plates.length,
                plates: result.blocked_plates.slice(0, 8).join(', '),
              }),
            );
          }
          setNotice(parts.join(' '));
          void load();
        }}
      />

      {deleteId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-text-primary/20 p-space-lg">
          <div className="w-full max-w-md border border-border bg-surface p-space-lg">
            <h3 className="text-lg font-semibold text-text-primary">{t('prealert.deleteConfirmTitle')}</h3>
            <p className="mt-space-sm text-sm text-text-secondary">{t('prealert.deleteConfirmBody')}</p>
            <div className="mt-space-md flex gap-space-sm">
              <Button type="button" disabled={busyId === deleteId} onClick={() => void onDeleteOrder(deleteId)}>
                {t('prealert.deleteConfirm')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDeleteId(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
