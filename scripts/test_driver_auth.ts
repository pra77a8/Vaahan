import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'vaahan_driver_auth_test',
    persistSession: false,
  },
});

async function main() {
  console.log('Testing driver login for aher@kkwagh.edu.in with password123...');
  const res2 = await client.auth.signInWithPassword({
    email: 'aher@kkwagh.edu.in',
    password: 'password123',
  });
  console.log('aher@kkwagh.edu.in status:', res2.error?.status || 200, res2.error?.message || 'SUCCESS');
  if (res2.data.user && res2.data.session) {
    console.log('Logged in user ID:', res2.data.user.id);
    const authHeaderClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${res2.data.session.access_token}`,
        },
      },
    });

    const { data: prof, error: pErr } = await authHeaderClient
      .from('profiles')
      .select('*')
      .eq('id', res2.data.user.id)
      .single();
    console.log('Driver profile query:', prof?.full_name, prof?.role, pErr?.message);

    const { data: drv, error: dErr } = await authHeaderClient
      .from('drivers')
      .select('*')
      .eq('id', res2.data.user.id)
      .single();
    console.log('Driver table query:', drv?.id, drv?.badge_number, dErr?.message);
  }
}

main().catch(console.error);
