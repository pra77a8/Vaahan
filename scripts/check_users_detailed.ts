import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkAll() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: drivers } = await supabase.from('drivers').select('*');
  const { data: students } = await supabase.from('students').select('*');

  console.log('=== ALL PROFILES ===');
  profiles?.forEach(p => console.log(`${p.id} | ${p.email} | ${p.role} | ${p.status} | ${p.full_name}`));

  console.log('\n=== ALL DRIVERS ===');
  drivers?.forEach(d => console.log(`${d.id} | badge: ${d.badge_number} | bus: ${d.assigned_bus_id} | license: ${d.license_number}`));

  console.log('\n=== ALL STUDENTS ===');
  students?.forEach(s => console.log(`${s.id} | prn: ${s.prn} | status: ${s.approval_status}`));
}

checkAll().catch(console.error);

