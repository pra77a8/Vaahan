import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { dispatchTransitNotification } from '../src/services/tripService';

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Trip:', {
    id: trip.id,
    route_id: trip.route_id,
    shift_id: trip.shift_id,
    bus_id: trip.bus_id,
  });

  const priyankaStop = '13cb56c1-96f0-49d0-90d7-d690eb73415f';

  const res = await dispatchTransitNotification({
    tripId: trip.id,
    eventType: 'STOP_REACHED',
    stopId: priyankaStop,
  });

  console.log('dispatchTransitNotification result:', res);
}

test().catch(console.error);

