import { useCallback, useRef, useState } from 'react';
import type { ImportResult } from '@lures-dcs/api-contracts';
import { ImportModal } from './components/ImportModal';
import { OverlayCloseButton } from './components/OverlayCloseButton';
import { TopNav, type AppPage } from './components/TopNav';
import { AuthProvider, useAuth } from './lib/auth';
import { runPackingListExport } from './lib/export-packing-list';
import { HistoryScreen } from './screens/HistoryScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayOverviewScreen } from './screens/TodayOverviewScreen';
import { TruckDetailScreen } from './screens/TruckDetailScreen';

type Screen =
  | { name: 'page'; page: AppPage }
  | { name: 'truck'; truckId: string; from: AppPage };

function AuthenticatedApp() {
  const { loading, session, profile } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'page', page: 'loading' });
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  const [selectedTruckIds, setSelectedTruckIds] = useState<string[]>([]);
  const [exportBusy, setExportBusy] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);

  const activePage: AppPage = screen.name === 'truck' ? screen.from : screen.page;

  const clearActionNotice = useCallback(() => {
    if (noticeTimerRef.current != null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setActionNotice(null);
  }, []);

  const showActionNotice = useCallback(
    (message: string) => {
      clearActionNotice();
      setActionNotice(message);
      noticeTimerRef.current = window.setTimeout(() => {
        setActionNotice(null);
        noticeTimerRef.current = null;
      }, 5000);
    },
    [clearActionNotice],
  );

  const navigate = useCallback((page: AppPage) => {
    setScreen({ name: 'page', page });
  }, []);

  const handleImported = useCallback(
    (result: ImportResult) => {
      setOverviewRefreshKey((key) => key + 1);
      setScreen({ name: 'page', page: 'loading' });
      const removed =
        result.trucks_removed && result.trucks_removed > 0
          ? ` · removed ${result.trucks_removed}`
          : '';
      showActionNotice(
        `Imported ${result.trucks_created} truck(s), ${result.bags_created} bag(s) (${result.mode})${removed}.`,
      );
    },
    [showActionNotice],
  );

  const handleExport = useCallback(async () => {
    if (!profile || exportBusy) return;

    const truckIds =
      screen.name === 'truck'
        ? [screen.truckId]
        : selectedTruckIds.length > 0
          ? selectedTruckIds
          : [];

    if (truckIds.length === 0) {
      showActionNotice('Select one or more trucks on Loading, or open a truck, then Export.');
      return;
    }

    setExportBusy(true);
    try {
      const result = await runPackingListExport({
        truckIds,
        actor: { id: profile.id, display_name: profile.display_name },
        print: true,
      });
      const statusNote =
        result.nonCompletedCount > 0
          ? ` · ${result.nonCompletedCount} not completed (status shown on PDF)`
          : '';
      showActionNotice(
        `Exported ${result.truckCount} truck(s) as PDF (${result.filename})${statusNote}.`,
      );
    } catch (err) {
      showActionNotice(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportBusy(false);
    }
  }, [exportBusy, profile, screen, selectedTruckIds, showActionNotice]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-space-lg">
        <p className="text-base text-text-secondary">Restoring session…</p>
      </main>
    );
  }

  if (!session || !profile) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        activePage={activePage}
        onNavigate={navigate}
        onUpload={() => setImportOpen(true)}
        onExport={() => {
          void handleExport();
        }}
        onSend={() => showActionNotice('Send will be available in a later slice.')}
      />
      {actionNotice ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            aria-label="Dismiss notice"
            onClick={clearActionNotice}
          />
          <div
            className="fixed left-0 right-0 top-14 z-40 flex items-center gap-space-md border-b border-border bg-surface/95 px-space-md py-space-sm text-sm text-text-secondary shadow-sm backdrop-blur-sm"
            role="status"
          >
            <p className="min-w-0 flex-1">{actionNotice}</p>
            <OverlayCloseButton onClick={clearActionNotice} />
          </div>
        </>
      ) : null}
      <div className="flex-1 overflow-auto">
        {screen.name === 'truck' ? (
          <TruckDetailScreen
            truckId={screen.truckId}
            onBack={() => setScreen({ name: 'page', page: screen.from })}
          />
        ) : null}
        {screen.name === 'page' && screen.page === 'loading' ? (
          <TodayOverviewScreen
            key={overviewRefreshKey}
            onOpenTruck={(truckId) => setScreen({ name: 'truck', truckId, from: 'loading' })}
            onSelectionChange={setSelectedTruckIds}
          />
        ) : null}
        {screen.name === 'page' && screen.page === 'reports' ? <ReportsScreen /> : null}
        {screen.name === 'page' && screen.page === 'history' ? (
          <HistoryScreen
            onOpenTruck={(truckId) => setScreen({ name: 'truck', truckId, from: 'history' })}
          />
        ) : null}
        {screen.name === 'page' && screen.page === 'settings' ? <SettingsScreen /> : null}
      </div>
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
