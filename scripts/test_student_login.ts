import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fzbranclvhaxqyplbsrj.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ppdZyk-eZ7t6v5nlxt7QlQ_-FOle6fw';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    console.log(`[FAIL] ${email} with pass "${pass}":`, error.message, error.status);
    return false;
  } else {
    console.log(`[SUCCESS] ${email} with pass "${pass}": user ${data.user?.id}`);
    await supabase.auth.signOut();
    return true;
  }
}

async function run() {
  console.log('Testing student logins:');
  const candidates = [
    { email: 'pradhangle370125@kkwagh.edu.in', passes: ['SecureStudentPassword2026!', 'password123', 'Password123!', 'pradhangle123'] },
    { email: 'priyanka.shinde@kkwagh.edu.in', passes: ['Password123!', 'password123', 'priyanka123', 'Priyanka@123', 'SecureStudentPassword2026!'] },
    { email: 'akash@kkwagh.edu.in', passes: ['Password123!', 'password123', 'akash123', 'Akash@123', '123456', '12345678', '123456789'] },
  ];

  for (const c of candidates) {
    for (const p of c.passes) {
      const ok = await testLogin(c.email, p);
      if (ok) break;
    }
  }
}

run();
