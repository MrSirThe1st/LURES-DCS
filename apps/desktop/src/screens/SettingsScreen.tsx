import { Button } from '@lures-dcs/ui';
import { useAuth } from '../lib/auth';

export function SettingsScreen() {
  const { profile, signOut } = useAuth();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-space-lg p-space-lg">
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-base text-text-secondary">
          Account and application preferences.
        </p>
      </div>

      <section className="flex max-w-md flex-col gap-space-md border border-border bg-surface p-space-md">
        <div className="flex flex-col gap-space-xs">
          <p className="text-sm text-text-secondary">Signed in as</p>
          <p className="text-base font-medium text-text-primary">
            {profile?.display_name ?? 'Management'}
          </p>
          <p className="text-sm text-text-secondary">{profile?.role ?? 'management'}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </section>
    </main>
  );
}
