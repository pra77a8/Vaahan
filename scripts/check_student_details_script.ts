import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkStudentsDetails() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const { data: students, error } = await supabase
    .from('students')
    .select(`
      id,
      prn,
      approval_status,
      profiles(id, email, full_name, status)
    `);

  console.log('STUDENTS IN DB:', students, error);

  const { data: transport, error: trErr } = await supabase
    .from('student_transport')
    .select('*');
  console.log('STUDENT TRANSPORT IN DB:', transport, trErr);
}

checkStudentsDetails().catch(console.error);

