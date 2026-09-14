import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { isImplausibleEta, type LoadingOrderHeader } from '@lures-dcs/api-contracts';
import type { LoadingOrderRow, Tables } from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import type { MessageKey } from '@lures-dcs/i18n';
import { ActionMenu } from './ActionMenu';
import { StatusBadge, type StatusBadgeTone } from './StatusBadge';
import { formatEtaDate, truckStatusLabel } from '../lib/format';
import { useLocale } from '../lib/locale';

const TRIP_STATUS_KEY: Record<string, MessageKey> = {
  expected: 'prealert.trip.expected',
  arrived: 'prealert.trip.arrived',
  cancelled: 'prealert.trip.cancelled',
  did_not_arrive: 'prealert.trip.did_not_arrive',
};

const STATUS_KEY: Record<string, MessageKey> = {
  draft: 'prealert.status.draft',
  active: 'prealert.status.active',
  paused: 'prealert.status.paused',
  closed: 'prealert.status.closed',
  cancelled: 'prealert.status.cancelled',
};

export type LoadingOrderHeaderFields = Pick<
  LoadingOrderHeader,
  | 'client_name'
  | 'loading_point'
  | 'offloading_point'
  | 'period_month'
  | 'allocation_mt'
  | 'booked_mt'
  | 'balance_mt'
  | 'allocation_truck_count'
  | 'booked_truck_count'
  | 'balance_truck_count'
> & {
  original_filename?: string | null;
  status?: string | null;
};

type SortKey =
  | 'sequence'
  | 'transporter'
  | 'vehicle'
  | 'driver'
  | 'tonnage'
  | 'border'
  | 'eta'
  | 'arrival'
  | 'status';

export function plateHighlightStyle(hex: string | null | undefined): CSSProperties {
  if (!hex) return {};
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return { backgroundColor: hex };
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    backgroundColor: hex,
    color: luminance > 0.55 ? '#18181b' : '#fafafa',
  };
}

function dash(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function formatStatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString();
}

function orderStatusTone(status: string | null | undefined): StatusBadgeTone {
  if (status === 'active') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'draft' || status === 'paused') return 'warning';
  return 'neutral';
}

function arrivalTone(status: string): StatusBadgeTone {
  if (status === 'arrived') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'did_not_arrive') return 'warning';
  return 'neutral';
}

function showKeptEtaWarning(row: LoadingOrderRow): boolean {
  if (row.on_site || !row.eta_to_mine) return false;
  if (!isImplausibleEta(row.eta_to_mine)) return false;
  return row.eta_review !== 'edited' && row.eta_review !== 'cleared';
}

function floorStatusTone(status: string): StatusBadgeTone {
  if (status === 'available' || status === 'completed') return 'success';
  if (status === 'loading' || status === 'on_hold') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
}

export function LoadingOrderHeaderBlock({
  header,
  sourceFilename,
  leading,
  trailing,
}: {
  header: LoadingOrderHeaderFields;
  sourceFilename?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const { t } = useLocale();
  const statusLabel = header.status
    ? t(STATUS_KEY[header.status] ?? 'prealert.status.active')
    : null;
  const file = sourceFilename ?? header.original_filename;
  const title =
    [header.client_name, header.period_month].filter(Boolean).join(' — ') || t('prealert.documentTitle');

  return (
    <div className="loading-order-header">
      <div className="loading-order-header-top">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-space-sm">
            <h2 className="loading-order-title">{title}</h2>
            {title !== t('prealert.documentTitle') ? (
              <span className="loading-order-kicker">{t('prealert.documentTitle')}</span>
            ) : null}
            {statusLabel ? <StatusBadge tone={orderStatusTone(header.status)}>{statusLabel}</StatusBadge> : null}
          </div>
        </div>
        {trailing}
      </div>
      <div className="loading-order-header-body">
        <dl className="loading-order-points">
          <dt>{t('prealert.loadingPoint')}</dt>
          <dd>{dash(header.loading_point)}</dd>
          <dt>{t('prealert.offloading')}</dt>
          <dd>{dash(header.offloading_point)}</dd>
        </dl>
        <table className="loading-order-stats">
          <thead>
            <tr>
              <th />
              <th>{t('prealert.headerMt')}</th>
              <th>{t('prealert.headerTrucks')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t('prealert.allocation')}</th>
              <td>{formatStatNumber(header.allocation_mt)}</td>
              <td>{formatStatNumber(header.allocation_truck_count)}</td>
            </tr>
            <tr>
              <th scope="row">{t('prealert.booked')}</th>
              <td>{formatStatNumber(header.booked_mt)}</td>
              <td>{formatStatNumber(header.booked_truck_count)}</td>
            </tr>
            <tr>
              <th scope="row">{t('prealert.balance')}</th>
              <td>{formatStatNumber(header.balance_mt)}</td>
              <td>{formatStatNumber(header.balance_truck_count)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {file ? (
        <p className="loading-order-source">
          {t('prealert.source')}: {file}
        </p>
      ) : null}
    </div>
  );
}

type LoadingOrderSheetProps = {
  order: Tables<'pre_alerts'>;
  rows: LoadingOrderRow[];
  onBack: () => void;
  onOpenTruck: (truckId: string) => void;
  onPauseOrder?: () => void;
  onResumeOrder?: () => void;
  onDeleteOrder?: () => void;
  onExport: () => void;
  actionsDisabled?: boolean;
};

export function LoadingOrderSheet({
  order,
  rows,
  onBack,
  onOpenTruck,
  onPauseOrder,
  onResumeOrder,
  onDeleteOrder,
  onExport,
  actionsDisabled,
}: LoadingOrderSheetProps) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState('');
  const [transporter, setTransporter] = useState('');
  const [arrival, setArrival] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('sequence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const transporters = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      if (row.transporter_name) names.add(row.transporter_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const hasHighlights = rows.some((row) => row.source_highlight);
  const showFloorStatus = rows.some((row) => row.arrival_status === 'arrived');
  const filtersActive = Boolean(query.trim() || transporter || arrival);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (transporter && row.transporter_name !== transporter) return false;
      if (arrival && row.arrival_status !== arrival) return false;
      if (!needle) return true;
      const haystack = [
        row.vehicle_registration,
        row.trailer_registration,
        row.trailer_registration_2,
        row.driver_name,
        row.driver_passport_reference,
        row.transporter_name,
        row.border,
        row.final_destination,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const pair = valueForSort(a, sortKey).localeCompare(valueForSort(b, sortKey), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return pair * dir;
    });
  }, [arrival, query, rows, sortDir, sortKey, transporter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  function clearFilters() {
    setQuery('');
    setTransporter('');
    setArrival('');
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, truckId: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onOpenTruck(truckId);
    }
  }

  const booked = order.booked_truck_count;
  const footerParts = [t('prealert.tableFooter', { shown: visible.length, total: rows.length })];
  if (booked != null && booked !== rows.length) {
    footerParts.push(t('prealert.bookedCount', { count: booked }));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-space-sm">
      <LoadingOrderHeaderBlock
        header={order}
        leading={
          <Button type="button" variant="secondary" onClick={onBack} style={{ padding: '4px 10px', fontSize: 13 }}>
            {t('prealert.back')}
          </Button>
        }
        trailing={
          <div className="flex flex-wrap items-center gap-space-sm">
            <Button type="button" variant="secondary" onClick={onExport} style={{ padding: '4px 10px', fontSize: 13 }}>
              {t('prealert.exportDocument')}
            </Button>
            {onPauseOrder || onResumeOrder || onDeleteOrder ? (
              <ActionMenu
                label={t('common.actions')}
                items={[
                  ...(onPauseOrder
                    ? [{ label: t('prealert.pause'), disabled: actionsDisabled, onSelect: onPauseOrder }]
                    : []),
                  ...(onResumeOrder
                    ? [{ label: t('prealert.resume'), disabled: actionsDisabled, onSelect: onResumeOrder }]
                    : []),
                  ...(onDeleteOrder
                    ? [
                        {
                          label: t('prealert.delete'),
                          tone: 'destructive' as const,
                          disabled: actionsDisabled,
                          onSelect: onDeleteOrder,
                        },
                      ]
                    : []),
                ]}
              />
            ) : null}
          </div>
        }
      />

      <div className="ops-toolbar">
        <input
          type="search"
          className="ops-control ops-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('prealert.searchPlaceholder')}
          aria-label={t('prealert.search')}
        />
        <select
          className="ops-control"
          value={transporter}
          onChange={(event) => setTransporter(event.target.value)}
          aria-label={t('prealert.filterTransporter')}
        >
          <option value="">{t('prealert.allTransporters')}</option>
          {transporters.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="ops-control"
          value={arrival}
          onChange={(event) => setArrival(event.target.value)}
          aria-label={t('prealert.filterArrival')}
        >
          <option value="">{t('prealert.allArrivals')}</option>
          <option value="expected">{t('prealert.trip.expected')}</option>
          <option value="arrived">{t('prealert.trip.arrived')}</option>
          <option value="cancelled">{t('prealert.trip.cancelled')}</option>
          <option value="did_not_arrive">{t('prealert.trip.did_not_arrive')}</option>
        </select>
        {filtersActive ? (
          <button type="button" className="ops-toolbar-clear" onClick={clearFilters}>
            {t('prealert.clearFilters')}
          </button>
        ) : null}
      </div>

      {hasHighlights ? <p className="ops-table-note">{t('prealert.highlightNote')}</p> : null}

      <div className="ops-table-wrap ops-table-wrap--viewport loading-order-sheet">
        <table className="ops-table loading-order-table">
          <colgroup>
            <col className="col-sn" />
            <col className="col-truck" />
            <col className="col-transporter" />
            <col className="col-trailer" />
            <col className="col-trailer" />
            <col className="col-driver" />
            <col className="col-passport" />
            <col className="col-tonnage" />
            <col className="col-border" />
            <col className="col-destination" />
            <col className="col-eta" />
            <col className="col-arrival" />
            {showFloorStatus ? <col className="col-status" /> : null}
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label={t('prealert.col.sn')} active={sortKey === 'sequence'} dir={sortDir} onClick={() => toggleSort('sequence')} sticky="sn" />
              <SortHeader label={t('prealert.col.truck')} active={sortKey === 'vehicle'} dir={sortDir} onClick={() => toggleSort('vehicle')} sticky="truck" />
              <SortHeader label={t('prealert.col.transporter')} active={sortKey === 'transporter'} dir={sortDir} onClick={() => toggleSort('transporter')} />
              <th>{t('prealert.col.trailer1')}</th>
              <th>{t('prealert.col.trailer2')}</th>
              <SortHeader label={t('prealert.col.driver')} active={sortKey === 'driver'} dir={sortDir} onClick={() => toggleSort('driver')} />
              <th>{t('prealert.col.passport')}</th>
              <SortHeader label={t('prealert.col.tonnage')} active={sortKey === 'tonnage'} dir={sortDir} onClick={() => toggleSort('tonnage')} align="end" />
              <SortHeader label={t('prealert.col.border')} active={sortKey === 'border'} dir={sortDir} onClick={() => toggleSort('border')} />
              <th>{t('prealert.col.destination')}</th>
              <SortHeader label={t('prealert.col.eta')} active={sortKey === 'eta'} dir={sortDir} onClick={() => toggleSort('eta')} />
              <SortHeader label={t('prealert.arrival')} active={sortKey === 'arrival'} dir={sortDir} onClick={() => toggleSort('arrival')} />
              {showFloorStatus ? (
                <SortHeader label={t('prealert.status')} active={sortKey === 'status'} dir={sortDir} onClick={() => toggleSort('status')} />
              ) : null}
              <th className="col-actions" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr className="ops-empty-row">
                <td colSpan={showFloorStatus ? 14 : 13}>
                  {rows.length === 0 ? t('prealert.emptyOrder') : t('prealert.noMatchingTrucks')}
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr
                  key={row.id}
                  className="ops-row"
                  tabIndex={0}
                  onClick={() => onOpenTruck(row.id)}
                  onKeyDown={(event) => onRowKeyDown(event, row.id)}
                >
                  <td className="sticky-sn tabular-nums text-text-secondary">{row.sequence ?? index + 1}</td>
                  <td className="sticky-truck">
                    <span className="ops-id" style={plateHighlightStyle(row.source_highlight)}>
                      {row.vehicle_registration}
                    </span>
                  </td>
                  <td>{dash(row.transporter_name)}</td>
                  <td className="ops-id-quiet">{dash(row.trailer_registration)}</td>
                  <td className="ops-id-quiet">{dash(row.trailer_registration_2)}</td>
                  <td>{dash(row.driver_name)}</td>
                  <td className="ops-id-quiet">{dash(row.driver_passport_reference)}</td>
                  <td className="num">{dash(row.planned_tonnage)}</td>
                  <td>{dash(row.border)}</td>
                  <td>{dash(row.final_destination)}</td>
                  <td className="whitespace-nowrap">
                    {row.on_site ? (
                      t('yard.onSite')
                    ) : (
                      <span className="ops-eta">
                        {formatEtaDate(row.eta_to_mine)}
                        {showKeptEtaWarning(row) ? (
                          <span
                            className="ops-eta-flag"
                            title={t('prealert.eta.keptHint')}
                            aria-label={t('prealert.eta.keptHint')}
                          >
                            !
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge tone={arrivalTone(row.arrival_status)}>
                      {t(TRIP_STATUS_KEY[row.arrival_status] ?? 'prealert.trip.expected')}
                    </StatusBadge>
                  </td>
                  {showFloorStatus ? (
                    <td>
                      {row.arrival_status === 'arrived' ? (
                        <StatusBadge tone={floorStatusTone(row.status)}>
                          {truckStatusLabel(row.status, locale)}
                        </StatusBadge>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                  <td
                    className="col-actions"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <ActionMenu
                      label={t('common.actions')}
                      items={[{ label: t('common.open'), onSelect: () => onOpenTruck(row.id) }]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="ops-table-footer">{footerParts.join(' · ')}</div>
    </section>
  );
}

function valueForSort(row: LoadingOrderRow, key: SortKey): string {
  switch (key) {
    case 'sequence':
      return String(row.sequence ?? '');
    case 'transporter':
      return row.transporter_name ?? '';
    case 'vehicle':
      return row.vehicle_registration;
    case 'driver':
      return row.driver_name ?? '';
    case 'tonnage':
      return String(row.planned_tonnage ?? '');
    case 'border':
      return row.border ?? '';
    case 'eta':
      return row.on_site ? '0' : (row.eta_to_mine ?? '');
    case 'arrival':
      return row.arrival_status;
    case 'status':
      return row.status;
    default:
      return '';
  }
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  sticky,
  align,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  sticky?: 'sn' | 'truck';
  align?: 'end';
}) {
  return (
    <th className={[sticky ? `sticky-${sticky}` : '', align === 'end' ? 'num' : ''].filter(Boolean).join(' ') || undefined}>
      <button type="button" className="ops-sort" onClick={onClick}>
        {label}
        {active ? <span aria-hidden="true">{dir === 'asc' ? ' ↑' : ' ↓'}</span> : null}
      </button>
    </th>
  );
}
