import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function debugRpc() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const tripId = 'd0ba99ca-cd12-4e37-b825-0840692569a9';
  const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
  console.log('trip:', trip);

  const priyankaStop = '13cb56c1-96f0-49d0-90d7-d690eb73415f';

  const { data: stAll } = await supabase.from('student_transport').select('*');
  console.log('All student transports:', stAll.map(s => ({
    student_id: s.student_id,
    route_id: s.route_id,
    shift_id: s.shift_id,
    pickup_stop_id: s.pickup_stop_id,
    status: s.status,
  })));

  const { data: matchingSt } = await supabase
    .from('student_transport')
    .select('*')
    .eq('route_id', trip.route_id)
    .eq('shift_id', trip.shift_id)
    .eq('status', 'approved')
    .eq('pickup_stop_id', priyankaStop);

  console.log('Matching ST for Priyanka stop:', matchingSt);
}

debugRpc().catch(console.error);

