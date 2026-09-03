import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export type ServiceSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string;
};

/**
 * Desktop-renderer / mobile-safe client (anon key only).
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
 * Privileged client for trusted server-side or desktop-native (Rust) use only.
 * Callers must ensure this never reaches the desktop UI bundle or mobile app.
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
