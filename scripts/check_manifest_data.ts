import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const { data: st, error: stErr } = await supabase.from('student_transport').select('*');
  console.log('STUDENT TRANSPORT ROWS:', JSON.stringify(st, null, 2), stErr);

  const { data: students, error: stdErr } = await supabase.from('students').select('*');
  console.log('STUDENTS ROWS:', JSON.stringify(students, null, 2), stdErr);

  const { data: routes } = await supabase.from('routes').select('id, route_number, shift_id');
  console.log('ROUTES:', JSON.stringify(routes, null, 2));

  const { data: shifts } = await supabase.from('shifts').select('id, name, code');
  console.log('SHIFTS:', JSON.stringify(shifts, null, 2));
}

run().catch(console.error);
