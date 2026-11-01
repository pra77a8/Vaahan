import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function cleanup() {
  await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });
  const { data, error } = await supabase.from('trips').delete().eq('status', 'IN_PROGRESS');
  console.log('Cleaned up in-progress trips:', data, error);
}

cleanup().catch(console.error);

