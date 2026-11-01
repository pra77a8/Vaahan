import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function listAllTrips() {
  const { data: adminAuth } = await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const { data: trips } = await supabase.from('trips').select('id, driver_id, status, created_at').order('created_at', { ascending: false });
  console.log('All trips in DB:');
  for (const t of trips || []) {
    console.log(t);
  }
}

listAllTrips().catch(console.error);

