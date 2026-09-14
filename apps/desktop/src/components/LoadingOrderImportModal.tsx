import { useId, useState } from 'react';
import {
  applyPlateHighlights,
  parseLoadingOrderMatrix,
  ETA_IMPLAUSIBLE_CODE,
  type LoadingOrderPreview,
} from '@lures-dcs/api-contracts';
import { importLoadingOrder } from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import { LoadingOrderHeaderBlock, plateHighlightStyle } from './LoadingOrderDocument';
import { LoadingOrderEtaReview } from './LoadingOrderEtaReview';
import { OverlayCloseButton } from './OverlayCloseButton';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';
import { readLoadingOrderSpreadsheet } from '../lib/spreadsheet';
import { getSupabaseClient } from '../lib/supabase';

type LoadingOrderImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: (result: {
    trucks_created: number;
    trucks_already_present: number;
    blocked_plates: string[];
  }) => void;
};

export function LoadingOrderImportModal({
  open,
  onClose,
  onImported,
}: LoadingOrderImportModalProps) {
  const titleId = useId();
  const { profile } = useAuth();
  const { t } = useLocale();
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LoadingOrderPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function resetAndClose() {
    if (busy) return;
    setFileName(null);
    setFile(null);
    setPreview(null);
    setParseError(null);
    setSubmitError(null);
    onClose();
  }

  if (!open) return null;

  async function handleFile(fileList: FileList | null) {
    setParseError(null);
    setSubmitError(null);
    setPreview(null);
    const next = fileList?.[0] ?? null;
    setFile(next);
    setFileName(next?.name ?? null);
    if (!next) return;
    try {
      const { matrix, plateHighlights } = await readLoadingOrderSpreadsheet(next);
      const parsed = parseLoadingOrderMatrix(matrix, next.name);
      if (!parsed) {
        setParseError(t('prealert.parseFailed'));
        return;
      }
      setPreview(applyPlateHighlights(parsed, plateHighlights));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function handleConfirm() {
    if (!profile || !preview || busy || preview.has_errors) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const supabase = getSupabaseClient();
      let storagePath: string | null = null;
      if (file) {
        const path = `${profile.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('operational-documents')
          .upload(path, file);
        if (!uploadError) storagePath = path;
      }
      const result = await importLoadingOrder({
        client: supabase,
        preview,
        actor: { id: profile.id, display_name: profile.display_name },
        originalFilename: fileName,
        storagePath,
      });
      onImported({
        trucks_created: result.trucks_created,
        trucks_already_present: result.trucks_already_present,
        blocked_plates: result.blocked_plates,
      });
      setFileName(null);
      setFile(null);
      setPreview(null);
      setParseError(null);
      setSubmitError(null);
      setBusy(false);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-text-primary/20"
        aria-label="Close"
        onClick={resetAndClose}
      />
      <div
        className="fixed inset-x-4 top-16 z-50 mx-auto max-h-[calc(100vh-6rem)] max-w-[96rem] overflow-auto border border-border bg-surface p-space-lg"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="mb-space-md flex items-start justify-between gap-space-md">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            {t('prealert.previewTitle')}
          </h2>
          <OverlayCloseButton onClick={resetAndClose} />
        </div>
        <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
          {t('prealert.chooseFile')}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void handleFile(event.target.files)}
          />
        </label>
        {fileName ? <p className="mt-space-sm text-sm text-text-secondary">{fileName}</p> : null}
        {parseError ? <p className="mt-space-sm text-sm text-destructive">{parseError}</p> : null}
        {submitError ? <p className="mt-space-sm text-sm text-destructive">{submitError}</p> : null}

        {preview ? (
          <div className="mt-space-md flex flex-col gap-space-md">
            <LoadingOrderHeaderBlock header={preview.header} sourceFilename={preview.source_filename} />
            <LoadingOrderEtaReview preview={preview} onChange={setPreview} />
            {preview.issues.map((issue) => (
              <p
                key={issue.message}
                className={issue.severity === 'error' ? 'text-sm text-destructive' : 'text-sm text-text-secondary'}
              >
                {issue.message}
              </p>
            ))}
            <div className="ops-table-wrap loading-order-sheet">
              <table className="ops-table loading-order-table">
                <thead>
                  <tr>
                    <th>{t('prealert.col.sn')}</th>
                    <th>{t('prealert.col.transporter')}</th>
                    <th>{t('prealert.col.truck')}</th>
                    <th>{t('prealert.col.trailer1')}</th>
                    <th>{t('prealert.col.trailer2')}</th>
                    <th>{t('prealert.col.driver')}</th>
                    <th>{t('prealert.col.passport')}</th>
                    <th>{t('prealert.col.tonnage')}</th>
                    <th>{t('prealert.col.border')}</th>
                    <th>{t('prealert.col.destination')}</th>
                    <th>{t('prealert.col.eta')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lines.map((line) => (
                    <tr key={line.draft.vehicle_registration}>
                      <td className="tabular-nums text-text-secondary">{line.draft.sequence ?? '—'}</td>
                      <td>{line.draft.transporter_name ?? '—'}</td>
                      <td>
                        <span className="inline-block px-1 font-mono font-semibold" style={plateHighlightStyle(line.draft.plate_highlight)}>
                          {line.draft.vehicle_registration}
                        </span>
                      </td>
                      <td className="font-mono">{line.draft.trailer_registration ?? '—'}</td>
                      <td className="font-mono">{line.draft.trailer_registration_2 ?? '—'}</td>
                      <td>{line.draft.driver_name ?? '—'}</td>
                      <td className="font-mono">{line.draft.driver_passport_reference ?? '—'}</td>
                      <td className="tabular-nums">{line.draft.planned_tonnage ?? '—'}</td>
                      <td>{line.draft.border ?? '—'}</td>
                      <td>{line.draft.final_destination ?? '—'}</td>
                      <td>
                        {line.draft.on_site
                          ? t('yard.onSite')
                          : line.draft.eta_to_mine
                            ? line.draft.eta_to_mine
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.lines.flatMap((line) =>
              line.issues
                .filter((issue) => issue.code !== ETA_IMPLAUSIBLE_CODE)
                .map((issue) => (
                <p
                  key={`${line.draft.vehicle_registration}-${issue.message}`}
                  className={issue.severity === 'error' ? 'text-sm text-destructive' : 'text-sm text-text-secondary'}
                >
                  {line.draft.vehicle_registration}: {issue.message}
                </p>
              )),
            )}
            {preview.has_errors ? (
              <p className="text-sm text-destructive">{t('prealert.hasErrors')}</p>
            ) : null}
            <Button type="button" disabled={busy || preview.has_errors} onClick={() => void handleConfirm()}>
              {t('prealert.confirmImport')}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
