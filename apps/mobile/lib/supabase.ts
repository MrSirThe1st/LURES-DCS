import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPublicSupabaseClient, type AppSupabaseClient } from '@lures-dcs/data-access';

function requireEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in root .env.local`);
  }
  return value;
}

let client: AppSupabaseClient | null = null;

export function getSupabaseClient(): AppSupabaseClient {
  if (!client) {
    client = createPublicSupabaseClient(
      {
        url: requireEnv('EXPO_PUBLIC_SUPABASE_URL'),
        publishableKey: requireEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
      },
      {
        storage: AsyncStorage,
        detectSessionInUrl: false,
      },
    );
  }
  return client;
}
