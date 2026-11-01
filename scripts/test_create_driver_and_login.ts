import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'vaahan_admin_test',
    persistSession: false,
  },
});

const driverClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'vaahan_driver_test',
    persistSession: false,
  },
});

async function main() {
  console.log('1. Admin authenticating...');
  const { data: adminAuth, error: aErr } = await adminClient.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });
  if (aErr || !adminAuth.session) {
    console.error('Admin login failed:', aErr?.message);
    process.exit(1);
  }
  console.log('Admin login OK:', adminAuth.user.id);

  console.log('2. Admin creating new driver via RPC with custom password...');
  const testEmail = `driver.verification.${Date.now()}@kkwagh.edu.in`;
  const testPass = 'driverSecretPass88!';

  const { data: createRes, error: createErr } = await adminClient.rpc('admin_create_driver_with_password', {
    p_email: testEmail,
    p_full_name: 'Test Automatic Driver',
    p_phone: '+91 98230 99999',
    p_license_number: 'MH-15-2024-998877',
    p_password: testPass,
    p_status: 'active',
  });

  if (createErr || !createRes?.success) {
    console.error('Create driver RPC failed:', createErr?.message || createRes?.error);
    process.exit(1);
  }
  console.log('Driver created successfully! RPC returned:', createRes);

  console.log('3. Authenticating new driver on Driver Client with newly assigned password...');
  const { data: driverAuth, error: dErr } = await driverClient.auth.signInWithPassword({
    email: testEmail,
    password: testPass,
  });

  if (dErr || !driverAuth.session) {
    console.error('Driver login failed! Status:', dErr?.status, 'Message:', dErr?.message);
    process.exit(1);
  }
  console.log('✅ DRIVER LOGIN SUCCEEDED WITH 200 OK!');
  console.log('   Driver User ID:', driverAuth.user.id);
  console.log('   Driver Email:', driverAuth.user.email);

  console.log('4. Fetching Driver Profile...');
  const authHeaderClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${driverAuth.session.access_token}`,
      },
    },
  });

  const { data: profile, error: pErr } = await authHeaderClient
    .from('profiles')
    .select('*')
    .eq('id', driverAuth.user.id)
    .single();

  if (pErr || !profile) {
    console.error('Profile fetch failed:', pErr?.message);
    process.exit(1);
  }
  console.log('✅ Driver profile verified:', profile.full_name, profile.role, profile.status);

  console.log('5. Fetching Driver record in public.drivers...');
  const { data: driverRec, error: drvErr } = await authHeaderClient
    .from('drivers')
    .select('*')
    .eq('id', driverAuth.user.id)
    .single();

  if (drvErr || !driverRec) {
    console.error('Driver record fetch failed:', drvErr?.message);
    process.exit(1);
  }
  console.log('✅ Driver table record verified: Badge:', driverRec.badge_number, 'License:', driverRec.license_number);

  console.log('\n🎉 ENTIRE FLOW VERIFIED 100% PERFECTLY!');
}

main().catch(console.error);

