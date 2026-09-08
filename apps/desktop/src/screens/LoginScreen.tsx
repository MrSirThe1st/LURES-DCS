import { useState, type FormEvent } from 'react';
import { Button } from '@lures-dcs/ui';
import { useAuth } from '../lib/auth';

export function LoginScreen() {
  const { signIn, error } = useAuth();
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
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  const message = localError ?? error;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-space-lg p-space-lg">
      <div className="flex flex-col gap-space-sm">
        <h1 className="text-2xl font-semibold text-text-primary">LURES-DCS</h1>
        <p className="text-base text-text-secondary">
          Management desktop — sign in to monitor today’s truck loading.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex w-full flex-col gap-space-md rounded-md border border-border bg-surface p-space-lg"
      >
        <label className="flex w-full flex-col gap-space-xs text-sm text-text-secondary">
          Email
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
          Password
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
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
