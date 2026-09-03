import { Button } from '@lures-dcs/ui';

/**
 * Foundation shell only — no product screens yet.
 * Management UI will be implemented against docs/blueprint.
 *
 * Product languages: Mandarin, English, French (DRC-only deployment).
 * TODO: wire i18n and set document language from the active locale.
 */
export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-md p-lg">
      <h1 className="text-2xl font-semibold text-text-primary">
        Truck Loading & Dispatch Control System
      </h1>
      <p className="text-md text-text-secondary">
        Management desktop foundation is ready. Product features are intentionally not implemented
        yet.
      </p>
      <div>
        <Button type="button" disabled>
          Foundation shell
        </Button>
      </div>
    </main>
  );
}
