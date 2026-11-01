import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const { data: auth, error: aErr } = await client.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });
  console.log('Admin login:', auth.user?.email, aErr);

  // Check in-progress trips
  const { data: stuckTrips } = await client
    .from('trips')
    .select('*')
    .eq('status', 'IN_PROGRESS');
  console.log('Stuck in-progress trips:', stuckTrips?.length);

  // Reset any stuck in-progress trips so driver can start fresh
  if (stuckTrips && stuckTrips.length > 0) {
    for (const t of stuckTrips) {
      await client.from('trips').update({ status: 'COMPLETED', ended_at: new Date().toISOString() }).eq('id', t.id);
      await client.from('buses').update({ status: 'IDLE' }).eq('id', t.bus_id);
      console.log(`Cleaned up trip ${t.id} for bus ${t.bus_id}`);
    }
  }

  // Ensure all non-maintenance buses are set to IDLE
  await client.from('buses').update({ status: 'IDLE' }).neq('status', 'MAINTENANCE');

  // Check buses
  const { data: buses } = await client.from('buses').select('id, bus_number, status');
  console.log('All buses status:', buses);
}

run().catch(console.error);
