import { useMemo, useState } from 'react';
import {
  applyEtaReview,
  hasImplausibleEtaIssue,
  type LoadingOrderLinePreview,
  type LoadingOrderPreview,
} from '@lures-dcs/api-contracts';
import { useLocale } from '../lib/locale';

type LoadingOrderEtaReviewProps = {
  preview: LoadingOrderPreview;
  onChange: (preview: LoadingOrderPreview) => void;
};

export function LoadingOrderEtaReview({ preview, onChange }: LoadingOrderEtaReviewProps) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const rows = useMemo(() => preview.lines.filter(hasImplausibleEtaIssue), [preview.lines]);
  if (rows.length === 0) return null;

  function patchLine(plate: string, next: LoadingOrderLinePreview) {
    onChange({
      ...preview,
      lines: preview.lines.map((line) =>
        line.draft.vehicle_registration === plate ? next : line,
      ),
    });
  }

  function selectedRows(): LoadingOrderLinePreview[] {
    return rows.filter((row) => selected.has(row.draft.vehicle_registration));
  }

  function toggle(plate: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(plate)) next.delete(plate);
      else next.add(plate);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      if (current.size === rows.length) return new Set();
      return new Set(rows.map((row) => row.draft.vehicle_registration));
    });
  }

  function keepSelected() {
    const plates = new Set(selectedRows().map((row) => row.draft.vehicle_registration));
    if (plates.size === 0) return;
    onChange({
      ...preview,
      lines: preview.lines.map((line) =>
        plates.has(line.draft.vehicle_registration) ? applyEtaReview(line, 'kept') : line,
      ),
    });
  }

  function clearSelected() {
    const plates = new Set(selectedRows().map((row) => row.draft.vehicle_registration));
    if (plates.size === 0) return;
    onChange({
      ...preview,
      lines: preview.lines.map((line) =>
        plates.has(line.draft.vehicle_registration) ? applyEtaReview(line, 'cleared') : line,
      ),
    });
  }

  const allSelected = selected.size > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0;

  return (
    <section className="eta-review">
      <div className="ops-toolbar">
        <h3 className="eta-review-title">{t('prealert.eta.reviewTitle', { count: rows.length })}</h3>
        <button type="button" className="ops-action" disabled={!someSelected} onClick={keepSelected}>
          {t('prealert.eta.keepSelected')}
        </button>
        <button type="button" className="ops-action" disabled={!someSelected} onClick={clearSelected}>
          {t('prealert.eta.clearSelected')}
        </button>
      </div>
      <p className="ops-table-note">{t('prealert.eta.reviewHint')}</p>
      <div className="ops-table-wrap">
        <table className="ops-table eta-review-table">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={t('prealert.eta.selectAll')}
                />
              </th>
              <th>{t('prealert.col.truck')}</th>
              <th>{t('prealert.eta.source')}</th>
              <th>{t('prealert.eta.reason')}</th>
              <th>{t('prealert.eta.decision')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => {
              const plate = line.draft.vehicle_registration;
              const review = line.draft.eta_review;
              return (
                <tr key={plate}>
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={selected.has(plate)}
                      onChange={() => toggle(plate)}
                      aria-label={plate}
                    />
                  </td>
                  <td>
                    <span className="ops-id">{plate}</span>
                  </td>
                  <td className="tabular-nums">{line.draft.eta_raw ?? line.draft.eta_to_mine ?? '—'}</td>
                  <td>{t('prealert.eta.implausibleReason')}</td>
                  <td>
                    <input
                      type="date"
                      className="ops-control"
                      value={line.draft.eta_to_mine ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        patchLine(plate, applyEtaReview(line, { to: value || null }));
                      }}
                      aria-label={`${plate} ETA`}
                    />
                    {review === 'cleared' ? (
                      <span className="eta-review-decision">{t('prealert.eta.decision.cleared')}</span>
                    ) : review === 'edited' ? (
                      <span className="eta-review-decision">{t('prealert.eta.decision.edited')}</span>
                    ) : (
                      <span className="eta-review-decision">{t('prealert.eta.decision.kept')}</span>
                    )}
                  </td>
                  <td>
                    <div className="eta-review-actions">
                      <button
                        type="button"
                        className="ops-action"
                        onClick={() => patchLine(plate, applyEtaReview(line, 'kept'))}
                      >
                        {t('prealert.eta.keep')}
                      </button>
                      <button
                        type="button"
                        className="ops-action"
                        onClick={() => patchLine(plate, applyEtaReview(line, 'cleared'))}
                      >
                        {t('prealert.eta.clear')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
