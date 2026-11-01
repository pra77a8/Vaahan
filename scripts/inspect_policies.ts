import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'student_transport' });
  if (error) {
    console.log('RPC error (expected if helper does not exist):', error.message);
  } else {
    console.log('Policies for student_transport:', data);
  }

  // Check what a driver can select from student_transport
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });
  console.log('Driver login:', auth.user?.id, aErr?.message);

  const { data: stData, error: stErr } = await supabase
    .from('student_transport')
    .select('student_id, route_id, shift_id, status')
    .eq('status', 'approved');

  console.log('Driver query on student_transport:', stData?.length, 'rows. Error:', stErr?.message);
}

checkPolicies().catch(console.error);

