import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const client = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  console.log('Testing Admin login and student approval RPC:');

  // Sign in as Admin
  const { data: adminAuth, error: adminErr } = await client.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  if (adminErr || !adminAuth.session) {
    console.error('Failed to sign in as admin:', adminErr);
    process.exit(1);
  }

  console.log('✅ Admin signed in:', adminAuth.user.email);

  // Call admin_approve_student on student Akash
  const { data: rpcRes, error: rpcErr } = await client.rpc('admin_approve_student', {
    p_student_id: 'f2d01f48-7472-40aa-8525-d6af4d594ab8',
  });

  if (rpcErr) {
    console.error('❌ RPC error:', rpcErr);
    process.exit(1);
  }

  console.log('✅ RPC admin_approve_student result:', rpcRes);

  await client.auth.signOut();
  console.log('All admin approval RPC tests passed!');
}

run().catch(console.error);
