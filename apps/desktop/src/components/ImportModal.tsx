import { useId, useState } from 'react';
import {
  buildImportPreview,
  parseListeDeColisageMatrix,
  type ImportMode,
  type ImportPreview,
  type ImportResult,
} from '@lures-dcs/api-contracts';
import { importLoadingListBundle } from '@lures-dcs/data-access';
import { Button } from '@lures-dcs/ui';
import { useAuth } from '../lib/auth';
import { formatWeightKg, todayDateIso } from '../lib/format';
import { readSpreadsheetMatrix } from '../lib/spreadsheet';
import { getSupabaseClient } from '../lib/supabase';
import { OverlayCloseButton } from './OverlayCloseButton';

type ImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
};

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const titleId = useId();
  const { profile } = useAuth();
  const [loadingDate, setLoadingDate] = useState(todayDateIso());
  const [mode, setMode] = useState<ImportMode>('append');
  const [bulletinReference, setBulletinReference] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function resetAndClose() {
    if (busy) return;
    setMode('append');
    setBulletinReference('');
    setFileNames([]);
    setPreview(null);
    setParseError(null);
    setSubmitError(null);
    setLoadingDate(todayDateIso());
    onClose();
  }

  if (!open) return null;

  async function handleFilesSelected(fileList: FileList | null) {
    setParseError(null);
    setSubmitError(null);
    setPreview(null);

    const files = fileList ? Array.from(fileList) : [];
    setFileNames(files.map((f) => f.name));
    if (files.length === 0) return;

    try {
      const drafts = [];
      for (const file of files) {
        const matrix = await readSpreadsheetMatrix(file);
        const draft = parseListeDeColisageMatrix(matrix, file.name);
        if (!draft) {
          throw new Error(
            `Could not parse ${file.name} as a liste de colisage. Use the sample template format.`,
          );
        }
        drafts.push(draft);
      }
      setPreview(buildImportPreview({ drafts, loadingDate }));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse files.');
    }
  }

  async function handleConfirm() {
    const toImport =
      preview == null
        ? null
        : loadingDate === preview.loading_date
          ? preview
          : buildImportPreview({
              drafts: preview.trucks.map((t) => t.draft),
              loadingDate,
            });
    if (!toImport || !profile || toImport.has_errors) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const result = await importLoadingListBundle({
        client: getSupabaseClient(),
        preview: toImport,
        mode,
        actor: { id: profile.id, display_name: profile.display_name },
        bulletinReference: bulletinReference.trim() || null,
      });
      onImported(result);
      setMode('append');
      setBulletinReference('');
      setFileNames([]);
      setPreview(null);
      setParseError(null);
      setSubmitError(null);
      setLoadingDate(todayDateIso());
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  const effectivePreview =
    preview == null
      ? null
      : loadingDate === preview.loading_date
        ? preview
        : buildImportPreview({
            drafts: preview.trucks.map((t) => t.draft),
            loadingDate,
          });

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-space-lg"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) resetAndClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-4xl border border-border bg-surface shadow-lg"
      >
        <div className="flex items-start justify-between gap-space-md border-b border-border p-space-md">
          <div className="flex min-w-0 flex-col gap-space-xs">
            <h2 id={titleId} className="text-xl font-semibold text-text-primary">
              Import packing list
            </h2>
            <p className="text-sm text-text-secondary">
              Select one or more liste de colisage files (.xlsx / .csv). Each file is one truck with
              bags.
            </p>
          </div>
          <OverlayCloseButton onClick={resetAndClose} disabled={busy} />
        </div>

        <div className="flex flex-col gap-space-md p-space-md">
          <div className="grid gap-space-md md:grid-cols-2">
            <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
              Loading date
              <input
                type="date"
                value={loadingDate}
                onChange={(e) => setLoadingDate(e.target.value)}
                className="border border-border bg-background px-space-sm py-space-xs text-base text-text-primary"
              />
            </label>
            <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
              Bulletin reference (optional)
              <input
                type="text"
                value={bulletinReference}
                onChange={(e) => setBulletinReference(e.target.value)}
                placeholder="e.g. LU-EX Conc.-2026-9-4-044"
                className="border border-border bg-background px-space-sm py-space-xs text-base text-text-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-space-xs text-sm text-text-secondary">
            Liste de colisage files
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              multiple
              onChange={(e) => void handleFilesSelected(e.target.files)}
              className="text-base text-text-primary"
            />
          </label>

          {fileNames.length > 0 ? (
            <p className="text-sm text-text-secondary">Selected: {fileNames.join(', ')}</p>
          ) : null}
          {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}

          {effectivePreview ? (
            <>
              <fieldset className="flex flex-col gap-space-sm border border-border p-space-md">
                <legend className="px-space-xs text-sm font-medium text-text-primary">
                  If trucks already exist for this date
                </legend>
                <label className="flex items-start gap-space-sm text-sm text-text-primary">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === 'append'}
                    onChange={() => setMode('append')}
                  />
                  <span>
                    <span className="font-medium">Append</span> — add trucks; reject duplicates
                  </span>
                </label>
                <label className="flex items-start gap-space-sm text-sm text-text-primary">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  <span>
                    <span className="font-medium">Replace</span> — remove existing trucks on this
                    day’s list, then import
                  </span>
                </label>
              </fieldset>

              <div className="overflow-x-auto border border-border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border text-text-secondary">
                    <tr>
                      <th className="px-space-md py-space-sm font-medium">File</th>
                      <th className="px-space-md py-space-sm font-medium">Truck</th>
                      <th className="px-space-md py-space-sm font-medium">Lot</th>
                      <th className="px-space-md py-space-sm font-medium">Bags</th>
                      <th className="px-space-md py-space-sm font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectivePreview.trucks.map((truck) => (
                      <tr
                        key={`${truck.source_file}-${truck.vehicle_registration}`}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-space-md py-space-sm text-text-secondary">
                          {truck.source_file ?? '—'}
                        </td>
                        <td className="px-space-md py-space-sm font-medium text-text-primary">
                          {truck.vehicle_registration}
                        </td>
                        <td className="px-space-md py-space-sm text-text-secondary">
                          {truck.packing_list_number ?? '—'}
                        </td>
                        <td className="px-space-md py-space-sm text-text-secondary">
                          {truck.bag_count}
                        </td>
                        <td className="px-space-md py-space-sm text-text-secondary">
                          {formatWeightKg(truck.total_net_weight_kg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {effectivePreview.issues.length > 0 ? (
                <ul className="flex flex-col gap-space-xs text-sm">
                  {effectivePreview.issues.map((issue, index) => (
                    <li
                      key={`${issue.severity}-${index}-${issue.message}`}
                      className={
                        issue.severity === 'error' ? 'text-destructive' : 'text-text-secondary'
                      }
                    >
                      {issue.severity === 'error' ? 'Error' : 'Warning'}: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-success">Preview looks valid.</p>
              )}
            </>
          ) : null}

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

          <div className="flex justify-end gap-space-sm border-t border-border pt-space-md">
            <Button type="button" variant="secondary" onClick={resetAndClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy || !effectivePreview || effectivePreview.has_errors}
            >
              {busy ? 'Importing…' : mode === 'replace' ? 'Replace & import' : 'Append & import'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
