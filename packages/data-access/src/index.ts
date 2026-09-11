import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js';
import type { Database } from './database.types.js';

export type { Database, Tables } from './database.types.js';

export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export type SecretSupabaseEnv = PublicSupabaseEnv & {
  secretKey: string;
};

export type PublicSupabaseClientOptions = {
  /** Required on React Native so sessions persist across launches. */
  storage?: SupportedStorage;
  detectSessionInUrl?: boolean;
};

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Desktop-renderer / mobile-safe client (publishable key only).
 * Never pass the secret key here.
 */
export function createPublicSupabaseClient(
  env: PublicSupabaseEnv,
  options: PublicSupabaseClientOptions = {},
): AppSupabaseClient {
  return createClient<Database>(env.url, env.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: options.detectSessionInUrl ?? true,
      ...(options.storage ? { storage: options.storage } : {}),
    },
  });
}

/**
 * Privileged client for trusted tooling only.
 * Callers must ensure this never reaches the desktop UI bundle or mobile app.
 */
export function createSecretSupabaseClient(env: SecretSupabaseEnv): AppSupabaseClient {
  return createClient<Database>(env.url, env.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** @deprecated Use createSecretSupabaseClient — kept name clarity during migration. */
export const createServiceSupabaseClient = createSecretSupabaseClient;

export {
  transitionTruckStatus,
  type TransitionTruckStatusInput,
  type TruckStatusActor,
} from './truck-status.js';

export {
  importLoadingListBundle,
  type ImportActor,
  type ImportLoadingListBundleInput,
} from './import-loading-list.js';

export {
  fetchTrucksForExport,
  recordTruckExportAudit,
  type ExportActor,
  type FetchTrucksForExportInput,
  type RecordTruckExportAuditInput,
} from './export-trucks.js';
