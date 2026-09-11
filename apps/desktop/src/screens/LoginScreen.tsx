import { useState, type FormEvent } from 'react';
import { Button } from '@lures-dcs/ui';
import { useAuth } from '../lib/auth';
import { useLocale } from '../lib/locale';

export function LoginScreen() {
  const { signIn, error } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState('management@lures.local');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('auth.invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  }

  const message = localError ?? error;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-space-lg p-space-lg">
      <div className="flex flex-col gap-space-sm">
        <h1 className="text-2xl font-semibold text-text-primary">{t('app.name')}</h1>
        <p className="text-base text-text-secondary">{t('auth.signInSubtitle')}</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex w-full flex-col gap-space-md rounded-md border border-border bg-surface p-space-lg"
      >
        <label className="flex w-full flex-col gap-space-xs text-sm text-text-secondary">
          {t('auth.email')}
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-space-md py-space-sm text-base text-text-primary"
          />
        </label>

        <label className="flex w-full flex-col gap-space-xs text-sm text-text-secondary">
          {t('auth.password')}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-space-md py-space-sm text-base text-text-primary"
          />
        </label>

        {message ? <p className="text-sm text-destructive">{message}</p> : null}

        <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? t('common.loading') : t('common.signIn')}
        </Button>
      </form>
    </main>
  );
}
