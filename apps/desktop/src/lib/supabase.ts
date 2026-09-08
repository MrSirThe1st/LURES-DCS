import { createPublicSupabaseClient, type AppSupabaseClient } from '@lures-dcs/data-access';

function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in root .env.local`);
  }
  return value;
}

let client: AppSupabaseClient | null = null;

export function getSupabaseClient(): AppSupabaseClient {
  if (!client) {
    client = createPublicSupabaseClient({
      url: requireEnv('VITE_SUPABASE_URL'),
      publishableKey: requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
    });
  }
  return client;
}
