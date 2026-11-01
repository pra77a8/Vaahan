import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkAllTripsTriggers() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const { data, error } = await supabase.rpc('get_triggers_for_table' as any, { table_name: 'trips' }).catch(() => ({ data: null, error: null }));
  console.log('Triggers:', data, error);
}

checkAllTripsTriggers().catch(console.error);

