import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkTriggers() {
  const { data: adminAuth } = await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });
  console.log('Admin logged in:', adminAuth?.user?.email);

  // Call rpc to inspect triggers if function exists or query via select
  // Let's check trips rows
  const { data: trips, error: tErr } = await supabase.from('trips').select('*');
  console.log('Trips in DB count:', trips?.length, tErr);
  if (trips && trips.length > 0) {
    console.log('Recent trip:', trips[0]);
  }
}

checkTriggers().catch(console.error);

