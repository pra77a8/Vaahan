import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function check() {
  const { data: adminAuth } = await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });
  console.log('Admin logged in:', adminAuth?.user?.email);

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, full_name, role, status');
  console.log('PROFILES:', profiles, pErr);

  const { data: drivers, error: dErr } = await supabase.from('drivers').select('*');
  console.log('DRIVERS:', drivers, dErr);

  const { data: students, error: sErr } = await supabase.from('students').select('*');
  console.log('STUDENTS:', students, sErr);
}

check().catch(console.error);

