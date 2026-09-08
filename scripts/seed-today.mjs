#!/usr/bin/env node
/**
 * Seed a sample loading list + trucks/bags for today.
 *
 * Usage:
 *   pnpm seed:today
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../packages/data-access/package.json'),
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

function todayDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const loadingDate = todayDateIso();

const sampleBagsTruck1 = [
  ['LU-CC26082392', 1551, '116094'],
  ['LU-CC26082393', 1706, '116098'],
  ['LU-CC26082394', 1520, '116101'],
  ['LU-CC26082395', 1488, '116105'],
  ['LU-CC26082396', 1602, '116110'],
];

const sampleBagsTruck2 = [
  ['LU-CC26082401', 1490, '116201'],
  ['LU-CC26082402', 1512, '116205'],
  ['LU-CC26082403', 1475, '116209'],
];

const { data: profiles, error: profileError } = await admin
  .from('profiles')
  .select('id')
  .eq('role', 'management')
  .limit(1);

if (profileError) throw profileError;
const createdBy = profiles?.[0]?.id ?? null;

const { data: existingLists, error: existingError } = await admin
  .from('loading_lists')
  .select('id')
  .eq('loading_date', loadingDate)
  .eq('packing_list_number', 'EX202609-0376');

if (existingError) throw existingError;

if (existingLists && existingLists.length > 0) {
  console.log(`Sample list for ${loadingDate} already exists (${existingLists[0].id}).`);
  process.exit(0);
}

const { data: list, error: listError } = await admin
  .from('loading_lists')
  .insert({
    loading_date: loadingDate,
    packing_list_number: 'EX202609-0376',
    cargo_description: 'CONCENTRÉ DE CUIVRE',
    status: 'active',
    created_by: createdBy,
  })
  .select('id')
  .single();

if (listError) throw listError;

const trucks = [
  {
    loading_list_id: list.id,
    vehicle_registration: 'T681ERQ',
    trailer_registration: 'T766ERT',
    driver_name: 'AMIMU MDAILE',
    transporter_name: 'VAN MO COMPANY LIMITED',
    loading_location: "L'USINE DE LUILU",
    border: 'Dar es Salaam',
    agent: 'CONNEX',
    packing_list_number: 'EX202609-0376',
    cargo_description: 'CONCENTRÉ DE CUIVRE',
    status: 'waiting',
    created_by: createdBy,
    bags: sampleBagsTruck1,
  },
  {
    loading_list_id: list.id,
    vehicle_registration: 'T682ERQ',
    trailer_registration: 'T770ERT',
    driver_name: 'JEAN KABONGO',
    transporter_name: 'VAN MO COMPANY LIMITED',
    loading_location: "L'USINE DE LUILU",
    border: 'Dar es Salaam',
    agent: 'CONNEX',
    packing_list_number: 'EX202609-0376',
    cargo_description: 'CONCENTRÉ DE CUIVRE',
    status: 'loading',
    created_by: createdBy,
    bags: sampleBagsTruck2,
  },
  {
    loading_list_id: list.id,
    vehicle_registration: 'T683ERQ',
    trailer_registration: 'T771ERT',
    driver_name: 'PIERRE MWAMBA',
    transporter_name: 'VAN MO COMPANY LIMITED',
    loading_location: "L'USINE DE LUILU",
    border: 'Dar es Salaam',
    agent: 'CONNEX',
    packing_list_number: 'EX202609-0376',
    cargo_description: 'CONCENTRÉ DE CUIVRE',
    status: 'waiting',
    created_by: createdBy,
    bags: [
      ['LU-CC26082411', 1500, '116301'],
      ['LU-CC26082412', 1525, '116305'],
    ],
  },
];

for (const truck of trucks) {
  const { bags, ...truckRow } = truck;
  const { data: createdTruck, error: truckError } = await admin
    .from('trucks')
    .insert(truckRow)
    .select('id, vehicle_registration')
    .single();
  if (truckError) throw truckError;

  const bagRows = bags.map(([bag_number, net_weight_kg, seal_number], index) => ({
    truck_id: createdTruck.id,
    bag_number,
    net_weight_kg,
    seal_number,
    sort_order: index + 1,
    verification_status: 'pending',
  }));

  const { error: bagsError } = await admin.from('bags').insert(bagRows);
  if (bagsError) throw bagsError;

  console.log(`Seeded truck ${createdTruck.vehicle_registration} with ${bagRows.length} bags`);
}

console.log(`\nDone. Seeded loading list EX202609-0376 for ${loadingDate}.`);
