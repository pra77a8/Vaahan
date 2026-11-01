import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testErrorCases() {
  console.log('Testing Error Cases Against Live Supabase:');

  // Test 1: Non-KKWagh Email domain
  console.log('  Case 1: Attempting signup with non-KKWagh email (test@gmail.com)...');
  const { data: d1, error: e1 } = await supabase.auth.signUp({
    email: 'test.invalid@gmail.com',
    password: 'Password123!',
    options: {
      data: {
        role: 'student',
        full_name: 'Test Gmail User',
      },
    },
  });

  if (e1) {
    console.log('  ✅ Case 1 correctly rejected by database trigger:', e1.message);
  } else {
    console.error('  ❌ Case 1 failed: Expected rejection for non-college email, but got:', d1);
  }

  // Test 2: Attempting privilege escalation (assigning admin role from public signup)
  console.log('  Case 2: Attempting public signup claiming role "admin"...');
  const { data: d2, error: e2 } = await supabase.auth.signUp({
    email: 'hacker.attempt@kkwagh.edu.in',
    password: 'Password123!',
    options: {
      data: {
        role: 'admin',
        full_name: 'Privilege Escalation Attempt',
      },
    },
  });

  if (!e2 && d2?.user) {
    // Check what role was actually assigned in profiles
    const { data: p } = await supabase.from('profiles').select('role, status').eq('id', d2.user.id).single();
    if (p?.role === 'student' && p?.status === 'pending_approval') {
      console.log('  ✅ Case 2 privilege escalation prevented! Role safely forced to "student" and status "pending_approval"');
    } else {
      console.error('  ❌ Case 2 security breach! Profile assigned role:', p);
    }
    // Clean up
    await supabase.auth.admin?.deleteUser?.(d2.user.id).catch(() => {});
  }
}

testErrorCases().catch(console.error);
