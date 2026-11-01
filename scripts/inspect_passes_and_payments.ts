import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const { data: passes, error: pErr } = await supabase.from('bus_passes').select('*');
  console.log('BUS PASSES IN DB:', passes?.length, passes, pErr);

  const { data: payments, error: payErr } = await supabase.from('payments').select('*');
  console.log('PAYMENTS IN DB:', payments?.length, payments, payErr);
}

main().catch(console.error);

