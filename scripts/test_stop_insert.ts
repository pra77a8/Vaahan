import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  const { data: adminAuth, error: adminErr } = await client.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  if (adminErr || !adminAuth.session) {
    console.error('Failed to sign in as admin:', adminErr);
    process.exit(1);
  }

  console.log('✅ Admin signed in:', adminAuth.user.email);

  // Test inserting Jail Road stop
  const { data: stop, error: sErr } = await client
    .from('stops')
    .upsert({
      name: 'Jail Road',
      landmark: 'Jail Road Terminal / Nashik Road',
      latitude: 19.9480,
      longitude: 73.8410,
    }, { onConflict: 'name' })
    .select();

  console.log('Upsert Jail Road stop result:', { stop, error: sErr });
}

run();

