import { useId, useMemo, useState } from 'react';
import { parseBulletinMatrix, type BulletinPreview } from '@lures-dcs/api-contracts';
import {
  analyzeBulletinImport,
  importLoadingProgram,
  type BulletinImportAnalysis,
} from '@lures-dcs/data-access';
import { normalizeVehicleRegistration } from '@lures-dcs/domain';
import { Button } from '@lures-dcs/ui';
import { OverlayCloseButton } from './OverlayCloseButton';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';
import { readBulletinSheet } from '../lib/spreadsheet';
import { getSupabaseClient } from '../lib/supabase';

type BulletinImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: (result: { trucks_attached: number; trucks_created: number }) => void;
};

function plateKey(plate: string): string {
  return normalizeVehicleRegistration(plate);
}

export function BulletinImportModal({ open, onClose, onImported }: BulletinImportModalProps) {
  const titleId = useId();
  const { profile } = useAuth();
  const { t } = useLocale();
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulletinPreview | null>(null);
  const [analysis, setAnalysis] = useState<BulletinImportAnalysis | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createUnplanned, setCreateUnplanned] = useState<Set<string>>(() => new Set());
  const [resolutions, setResolutions] = useState<Record<string, 'keep_current' | 'apply_incoming'>>(
    {},
  );

  function resetAndClose() {
    if (busy) return;
    setFileName(null);
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setParseError(null);
    setSubmitError(null);
    setCreateUnplanned(new Set());
    setResolutions({});
    onClose();
  }

  const unmatchedPlates = useMemo(
    () =>
      (analysis?.lines ?? [])
        .filter((line) => line.match === 'none')
        .map((line) => plateKey(line.draft.vehicle_registration)),
    [analysis],
  );

  const blocking = useMemo(() => {
    if (!analysis) return true;
    if (analysis.preview.has_errors) return true;
    for (const line of analysis.lines) {
      if (line.match === 'other_bp') return true;
      if (line.match === 'none' && !createUnplanned.has(plateKey(line.draft.vehicle_registration))) {
        return true;
      }
    }
    return analysis.issues.some((issue) => issue.severity === 'error');
  }, [analysis, createUnplanned]);

  const visibleIssues = useMemo(() => {
    if (!analysis) return preview?.issues ?? [];
    return analysis.issues.filter((issue) => {
      if (issue.severity !== 'warning') return true;
      const covered = unmatchedPlates.some(
        (plate) =>
          createUnplanned.has(plate) &&
          issue.message.toUpperCase().includes(plate.toUpperCase()) &&
          issue.message.includes('create as unplanned'),
      );
      return !covered;
    });
  }, [analysis, createUnplanned, preview?.issues, unmatchedPlates]);

  if (!open) return null;

  async function handleFile(fileList: FileList | null) {
    setParseError(null);
    setSubmitError(null);
    setPreview(null);
    setAnalysis(null);
    setCreateUnplanned(new Set());
    setResolutions({});
    const next = fileList?.[0] ?? null;
    setFile(next);
    setFileName(next?.name ?? null);
    if (!next) return;
    setBusy(true);
    try {
      const sheet = await readBulletinSheet(next);
      if (!sheet) {
        setParseError(t('bp.parseFailed'));
        return;
      }
      const parsed = parseBulletinMatrix(sheet.matrix, next.name, sheet.name);
      if (!parsed) {
        setParseError(t('bp.parseFailed'));
        return;
      }
      setPreview(parsed);
      const matched = await analyzeBulletinImport({
        client: getSupabaseClient(),
        preview: parsed,
      });
      setAnalysis(matched);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!profile || !preview || busy || blocking) return;
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
      const result = await importLoadingProgram({
        client: supabase,
        preview,
        actor: { id: profile.id, display_name: profile.display_name },
        createUnplanned: [...createUnplanned],
        resolutions: Object.entries(resolutions).map(([key, resolution]) => {
          const [vehicle_registration, ...fieldParts] = key.split('::');
          return {
            vehicle_registration: vehicle_registration ?? '',
            field: fieldParts.join('::'),
            resolution,
          };
        }),
        originalFilename: fileName,
        storagePath,
      });
      onImported({ trucks_attached: result.trucks_attached, trucks_created: result.trucks_created });
      setFileName(null);
      setFile(null);
      setPreview(null);
      setAnalysis(null);
      setParseError(null);
      setSubmitError(null);
      setCreateUnplanned(new Set());
      setResolutions({});
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  function toggleUnplanned(plate: string) {
    const key = plateKey(plate);
    setCreateUnplanned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllUnplanned() {
    setCreateUnplanned((prev) => {
      const allChecked = unmatchedPlates.every((plate) => prev.has(plate));
      if (allChecked) return new Set();
      return new Set(unmatchedPlates);
    });
  }

  const allUnplannedChecked =
    unmatchedPlates.length > 0 && unmatchedPlates.every((plate) => createUnplanned.has(plate));

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-text-primary/20"
        aria-label="Close"
        onClick={resetAndClose}
      />
      <div
        className="fixed inset-x-4 top-16 z-50 mx-auto max-h-[calc(100vh-6rem)] max-w-5xl overflow-auto border border-border bg-surface p-space-lg"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="mb-space-md flex items-start justify-between gap-space-md">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            {t('bp.previewTitle')}
          </h2>
          <OverlayCloseButton disabled={busy} onClick={resetAndClose} />
        </div>
        <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
          {t('bp.chooseFile')}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(event) => void handleFile(event.target.files)}
          />
        </label>
        {fileName ? <p className="mt-space-sm text-sm text-text-secondary">{fileName}</p> : null}
        {busy && !preview ? <p className="mt-space-sm text-sm text-text-secondary">{t('common.loading')}</p> : null}
        {parseError ? <p className="mt-space-sm text-sm text-destructive">{parseError}</p> : null}
        {submitError ? <p className="mt-space-sm text-sm text-destructive">{submitError}</p> : null}

        {preview ? (
          <div className="mt-space-md flex flex-col gap-space-md">
            <p className="text-sm text-text-secondary">
              {preview.header.program_code ?? 'BP'} · {preview.header.bulletin_number ?? '—'} ·{' '}
              {preview.header.client_name} · {preview.header.loading_date} · {preview.lines.length}{' '}
              {t('prealert.trucks')}
            </p>
            {visibleIssues.map((issue) => (
              <p
                key={issue.message}
                className={issue.severity === 'error' ? 'text-sm text-destructive' : 'text-sm text-text-secondary'}
              >
                {issue.message}
              </p>
            ))}
            {unmatchedPlates.length > 0 ? (
              <label className="flex items-center gap-space-xs text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={allUnplannedChecked}
                  onChange={toggleAllUnplanned}
                />
                {t('bp.createAllUnplanned')}
              </label>
            ) : null}
            {analysis ? (
              <div className="overflow-x-auto border border-border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border text-text-secondary">
                    <tr>
                      <th className="px-space-sm py-space-xs">{t('yard.col.order')}</th>
                      <th className="px-space-sm py-space-xs">{t('yard.vehicle')}</th>
                      <th className="px-space-sm py-space-xs">{t('history.col.packingList')}</th>
                      <th className="px-space-sm py-space-xs">{t('yard.transporter')}</th>
                      <th className="px-space-sm py-space-xs">{t('bp.match')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.lines.map((line) => {
                      const plate = line.draft.vehicle_registration;
                      const keyPlate = plateKey(plate);
                      return (
                        <tr key={keyPlate} className="border-b border-border last:border-b-0 align-top">
                          <td className="px-space-sm py-space-xs text-text-secondary">
                            {line.draft.sequence ?? '—'}
                          </td>
                          <td className="px-space-sm py-space-xs font-medium">{plate}</td>
                          <td className="px-space-sm py-space-xs text-text-secondary">
                            {line.draft.packing_list_number ?? '—'}
                          </td>
                          <td className="px-space-sm py-space-xs text-text-secondary">
                            {line.draft.transporter_name ?? '—'}
                          </td>
                          <td className="px-space-sm py-space-xs text-text-secondary">
                            {line.match === 'arrived'
                              ? t('bp.matchArrived')
                              : line.match === 'expected'
                                ? t('bp.matchExpected')
                                : line.match === 'other_bp'
                                  ? t('bp.matchOther')
                                  : t('bp.matchNone')}
                            {line.match === 'none' ? (
                              <label className="mt-space-xs flex items-center gap-space-xs text-sm">
                                <input
                                  type="checkbox"
                                  checked={createUnplanned.has(keyPlate)}
                                  onChange={() => toggleUnplanned(plate)}
                                />
                                {t('bp.createUnplanned')}
                              </label>
                            ) : null}
                            {line.conflicts.map((conflict) => {
                              const key = `${keyPlate}::${conflict.field}`;
                              const value = resolutions[key] ?? 'keep_current';
                              return (
                                <div key={key} className="mt-space-xs border border-border p-space-xs">
                                  <p className="text-xs text-destructive">
                                    {conflict.field}: {t('bp.yardValue')} “{conflict.current ?? '—'}” →{' '}
                                    {t('bp.bpValue')} “{conflict.incoming ?? '—'}”
                                  </p>
                                  <label className="mr-space-sm text-xs">
                                    <input
                                      type="radio"
                                      name={key}
                                      checked={value === 'keep_current'}
                                      onChange={() =>
                                        setResolutions((prev) => ({ ...prev, [key]: 'keep_current' }))
                                      }
                                    />{' '}
                                    {t('bp.keepYard')}
                                  </label>
                                  <label className="text-xs">
                                    <input
                                      type="radio"
                                      name={key}
                                      checked={value === 'apply_incoming'}
                                      onChange={() =>
                                        setResolutions((prev) => ({ ...prev, [key]: 'apply_incoming' }))
                                      }
                                    />{' '}
                                    {t('bp.applyBp')}
                                  </label>
                                </div>
                              );
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
            {blocking ? <p className="text-sm text-destructive">{t('bp.hasErrors')}</p> : null}
            <Button type="button" disabled={busy || blocking} onClick={() => void handleConfirm()}>
              {t('bp.confirmImport')}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}