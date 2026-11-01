import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkStudentTransports() {
  const { data, error } = await supabase
    .from('student_transport')
    .select(`
      id,
      student_id,
      shift_id,
      route_id,
      pickup_stop_id,
      status,
      shifts(name, code),
      routes(name, route_number),
      stops(name)
    `);

  console.log('STUDENT TRANSPORTS count:', data?.length, error);
  for (const st of data || []) {
    console.log(st);
  }
}

checkStudentTransports().catch(console.error);

