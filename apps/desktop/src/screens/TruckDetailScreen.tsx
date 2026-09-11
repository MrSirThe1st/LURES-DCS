import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateTruckTotalWeightKg } from '@lures-dcs/domain';
import { type Tables } from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import {
  formBlank,
  formatPackingListDate,
  formatWeightFigure,
  truckStatusLabel,
} from '../lib/format';
import { useOperationalRealtime } from '../lib/realtime';
import { useLocale } from '../lib/locale';
import { getSupabaseClient } from '../lib/supabase';

type BagRow = Tables<'bags'>;
type TruckRow = Tables<'trucks'>;
type AuditRow = Tables<'audit_events'>;

type TruckDetailScreenProps = {
  truckId: string;
  onBack: () => void;
};

export function TruckDetailScreen({ truckId, onBack }: TruckDetailScreenProps) {
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truck, setTruck] = useState<TruckRow | null>(null);
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [bags, setBags] = useState<BagRow[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditRow[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'silent' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();

    const [truckResult, bagsResult, auditResult] = await Promise.all([
      supabase.from('trucks').select('*').eq('id', truckId).maybeSingle(),
      supabase
        .from('bags')
        .select('*')
        .eq('truck_id', truckId)
        .order('sort_order', { ascending: true })
        .order('bag_number', { ascending: true }),
      supabase
        .from('audit_events')
        .select('*')
        .eq('truck_id', truckId)
        .order('occurred_at', { ascending: false })
        .limit(20),
    ]);

    if (truckResult.error || bagsResult.error || auditResult.error) {
      setError(
        truckResult.error?.message ??
          bagsResult.error?.message ??
          auditResult.error?.message ??
          'Failed to load truck',
      );
      setLoading(false);
      return;
    }

    const truckData = truckResult.data;
    setTruck(truckData);
    setBags(bagsResult.data ?? []);
    setAuditEvents(auditResult.data ?? []);

    if (truckData?.loading_list_id) {
      const listResult = await supabase
        .from('loading_lists')
        .select('loading_date')
        .eq('id', truckData.loading_list_id)
        .maybeSingle();
      if (!listResult.error) {
        setLoadingDate(listResult.data?.loading_date ?? null);
      }
    } else {
      setLoadingDate(null);
    }

    setLastSyncedAt(new Date());
    setLoading(false);
  }, [truckId]);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refreshSilent = useCallback(() => {
    void load('silent');
  }, [load]);

  const { live } = useOperationalRealtime({
    channelName: `desktop-truck-${truckId}`,
    subscriptions: [
      { table: 'trucks', filter: `id=eq.${truckId}` },
      { table: 'bags', filter: `truck_id=eq.${truckId}` },
      { table: 'audit_events', filter: `truck_id=eq.${truckId}` },
    ],
    onChange: refreshSilent,
  });

  const totalWeight = useMemo(
    () => calculateTruckTotalWeightKg(bags.map((bag) => Number(bag.net_weight_kg))),
    [bags],
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-space-md p-space-md pb-space-xl">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex flex-wrap items-center gap-space-sm">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          {truck ? (
            <span className="text-sm text-text-secondary">
              {truckStatusLabel(truck.status, locale)}
              {' · '}
              {live ? t('common.live') : t('common.connecting')}
              {lastSyncedAt ? ` · ${lastSyncedAt.toLocaleTimeString()}` : null}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <Button type="button" variant="secondary" onClick={() => setShowAudit((v) => !v)}>
            {showAudit ? 'Hide audit' : 'Audit'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void load('initial')}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <p className="text-base text-text-secondary">Loading packing list…</p> : null}
      {error ? <p className="text-base text-destructive">{error}</p> : null}

      {truck ? (
        <article className="packing-sheet border border-border bg-surface px-space-lg py-space-lg text-text-primary shadow-sm">
          <header className="grid gap-space-md md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <p className="text-lg font-bold uppercase tracking-wide">LUILU RESSOURCES SAS</p>
              <p className="text-xs leading-snug text-text-secondary">167 AV. BUKAMA Q.MUTOSHI</p>
              <p className="text-xs leading-snug text-text-secondary">C/MANIKA, KOLWEZI</p>
              <p className="text-xs leading-snug text-text-secondary">
                Province du Lualaba, Democratic Republic of Congo
              </p>
            </div>
            <div className="flex flex-col gap-1 md:items-end md:text-right">
              <p className="text-base font-semibold">鲁依鲁资源简易股份有限公司</p>
              <p className="text-xs text-text-secondary">Tel: +243843613879</p>
              <p className="text-xs text-text-secondary">E-mail: xicboyang@hkexcelllen.com</p>
            </div>
          </header>

          <h1 className="py-space-md text-center text-xl font-bold uppercase tracking-[0.12em] underline decoration-2 underline-offset-4">
            Liste de colisage
          </h1>

          <section className="flex flex-col gap-space-sm">
            <div className="grid gap-space-sm md:grid-cols-2">
              <FormField label="DESCRIPTION" value={formBlank(truck.cargo_description)} />
              <FormField
                label="N° DE LISTE DE COLISAGE"
                value={formBlank(truck.packing_list_number)}
              />
            </div>
            <FormField label="DATE" value={formatPackingListDate(loadingDate)} />
          </section>

          <h2 className="py-space-sm text-sm font-bold uppercase tracking-wide">
            Détails du camion
          </h2>

          <section className="mb-space-md grid gap-x-space-lg gap-y-space-sm md:grid-cols-2">
            <FormField
              label="CHEVAL"
              value={formBlank(truck.vehicle_registration)}
              className="md:col-span-2"
            />
            <FormField
              label="CHARIOT-REMORQUE 1"
              value={formBlank(truck.trailer_registration)}
            />
            <FormField
              label="CHARIOT-REMORQUE 2"
              value={formBlank(truck.trailer_registration_2)}
            />
            <FormField label="CONDUCTEUR" value={formBlank(truck.driver_name)} />
            <FormField
              label="PASSPORT"
              value={formBlank(truck.driver_passport_reference)}
            />
            <FormField
              label="LIEU DE CHARGEMENT"
              value={formBlank(truck.loading_location)}
              className="md:col-span-2"
            />
            <FormField
              label="TRANSPORTEUR"
              value={formBlank(truck.transporter_name)}
              className="md:col-span-2"
            />
            <FormField label="TRANSIT" value={formBlank(truck.transit_info, '/')} />
            <FormField label="BORDER" value={formBlank(truck.border)} />
            <FormField label="AGENT" value={formBlank(truck.agent)} className="md:col-span-2" />
          </section>

          <section className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-background">
                  <th className="w-14 border border-border px-space-sm py-space-xs text-left font-semibold">
                    NO.
                  </th>
                  <th className="border border-border px-space-sm py-space-xs text-left font-semibold">
                    BAG NO.
                  </th>
                  <th className="border border-border px-space-sm py-space-xs text-right font-semibold">
                    NET WEIGHT(KG)
                  </th>
                  <th className="border border-border px-space-sm py-space-xs text-left font-semibold">
                    SEAL NO.
                  </th>
                </tr>
              </thead>
              <tbody>
                {bags.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="border border-border px-space-sm py-space-md text-center text-text-secondary"
                    >
                      No bags on this packing list yet.
                    </td>
                  </tr>
                ) : (
                  bags.map((bag, index) => (
                    <tr key={bag.id}>
                      <td className="border border-border px-space-sm py-space-xs text-text-secondary">
                        {index + 1}
                      </td>
                      <td className="border border-border px-space-sm py-space-xs font-medium">
                        {bag.bag_number}
                        {bag.verification_status !== 'pending' ? (
                          <span className="ml-space-xs text-xs font-normal uppercase text-text-secondary">
                            ({bag.verification_status})
                          </span>
                        ) : null}
                      </td>
                      <td className="border border-border px-space-sm py-space-xs text-right tabular-nums">
                        {formatWeightFigure(Number(bag.net_weight_kg))}
                      </td>
                      <td className="border border-border px-space-sm py-space-xs">
                        {formBlank(bag.seal_number)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-background font-semibold">
                  <td
                    colSpan={2}
                    className="border border-border px-space-sm py-space-sm uppercase"
                  >
                    TOTAL:
                  </td>
                  <td className="border border-border px-space-sm py-space-sm text-right tabular-nums">
                    {formatWeightFigure(totalWeight)}
                  </td>
                  <td className="border border-border px-space-sm py-space-sm" />
                </tr>
              </tbody>
            </table>
          </section>

          <footer className="mt-space-lg flex flex-col gap-space-md">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Beneficiary
              </p>
              <p className="text-base font-semibold uppercase">LUILU RESSOURCES</p>
            </div>
            <p className="text-xs italic text-text-secondary">
              Conseil chaleureux : veuillez vérifier le numéro/poids/lots/pièces du camion avant de
              signer
            </p>
            <div className="grid gap-space-lg pt-space-sm md:grid-cols-2">
              <SignatureLine label="DRIVER" />
              <SignatureLine label="SUPPLY" />
              <SignatureLine label="TRANSPORT AGENT" />
              <SignatureLine label="SECURITY" />
            </div>
          </footer>
        </article>
      ) : null}

      {showAudit ? (
        <section className="flex flex-col gap-space-sm print:hidden">
          <h2 className="text-lg font-semibold text-text-primary">Recent audit</h2>
          {auditEvents.length === 0 ? (
            <p className="text-sm text-text-secondary">No audit events for this truck yet.</p>
          ) : (
            <ul className="flex flex-col gap-space-sm border border-border bg-surface p-space-md">
              {auditEvents.map((event) => (
                <li key={event.id} className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {new Date(event.occurred_at).toLocaleTimeString()}
                  </span>
                  {' — '}
                  {event.action}
                  {event.field_name ? ` (${event.field_name})` : ''}
                  {event.previous_value || event.new_value
                    ? `: ${event.previous_value ?? '—'} → ${event.new_value ?? '—'}`
                    : ''}
                  {event.actor_display_name ? ` · ${event.actor_display_name}` : ''}
                  {event.reason ? ` · ${event.reason}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}

function FormField({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${className}`.trim()}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="text-base font-medium uppercase tracking-wide">{value}</span>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-space-xl">
      <span className="text-xs font-semibold uppercase tracking-wide">{label}:</span>
      <div className="border-b border-border" />
    </div>
  );
}
