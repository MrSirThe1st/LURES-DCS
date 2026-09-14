#!/usr/bin/env node
/**
 * Bootstrap first Auth users + profiles using the secret key.
 *
 * Usage (from repo root):
 *   pnpm bootstrap:users
 *
 * Optional overrides in the shell / .env.local:
 *   BOOTSTRAP_MANAGEMENT_EMAIL / BOOTSTRAP_MANAGEMENT_PASSWORD / BOOTSTRAP_MANAGEMENT_NAME
 *   BOOTSTRAP_LOADING_EMAIL / BOOTSTRAP_LOADING_PASSWORD / BOOTSTRAP_LOADING_NAME
 *   BOOTSTRAP_YARD_EMAIL / BOOTSTRAP_YARD_PASSWORD / BOOTSTRAP_YARD_NAME
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../packages/data-access/package.json',
  ),
);
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  {
    email: process.env.BOOTSTRAP_MANAGEMENT_EMAIL ?? 'management@lures.local',
    password: process.env.BOOTSTRAP_MANAGEMENT_PASSWORD ?? 'ChangeMe-Management-1',
    displayName: process.env.BOOTSTRAP_MANAGEMENT_NAME ?? 'Management User',
    role: 'management',
  },
  {
    email: process.env.BOOTSTRAP_LOADING_EMAIL ?? 'loading@lures.local',
    password: process.env.BOOTSTRAP_LOADING_PASSWORD ?? 'ChangeMe-Loading-1',
    displayName: process.env.BOOTSTRAP_LOADING_NAME ?? 'Loading Operator',
    role: 'loading_staff',
  },
  {
    email: process.env.BOOTSTRAP_YARD_EMAIL ?? 'yard@lures.local',
    password: process.env.BOOTSTRAP_YARD_PASSWORD ?? 'ChangeMe-Yard-1',
    displayName: process.env.BOOTSTRAP_YARD_NAME ?? 'Yard Agent',
    role: 'yard_agent',
  },
];

async function ensureUser(user) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  const existing = listed.users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.displayName, role: user.role },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created auth user: ${user.email}`);
  } else {
    console.log(`Auth user already exists: ${user.email}`);
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      role: user.role,
      display_name: user.displayName,
      preferred_locale: 'en',
      is_active: true,
    },
    { onConflict: 'id' },
  );
  if (profileError) throw profileError;
  console.log(`Upserted profile (${user.role}): ${user.displayName}`);
}

for (const user of users) {
  await ensureUser(user);
}

console.log('\nDone. Change default passwords before any real use.');
