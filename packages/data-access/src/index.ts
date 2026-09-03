import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export type ServiceSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string;
};

/**
 * Browser/mobile-safe client (anon key only).
 * Never pass the service-role key here.
 */
export function createPublicSupabaseClient(env: PublicSupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Server-only privileged client.
 * Callers must ensure this never reaches web or mobile bundles.
 */
export function createServiceSupabaseClient(env: ServiceSupabaseEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Placeholder until generated Database types exist. */
export type Database = Record<string, never>;
