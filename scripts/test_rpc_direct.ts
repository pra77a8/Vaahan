import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testRpc() {
  await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  const tripId = 'd0ba99ca-cd12-4e37-b825-0840692569a9';
  const priyankaStop = '13cb56c1-96f0-49d0-90d7-d690eb73415f';

  // Test 1: with p_trip_id only
  const res1 = await supabase.rpc('dispatch_transit_event_notification', {
    p_trip_id: tripId,
    p_event_type: 'STOP_REACHED',
    p_stop_id: priyankaStop,
  });
  console.log('Test 1 (tripId only):', res1.data);

  // Test 2: with explicit route_id and shift_id
  const res2 = await supabase.rpc('dispatch_transit_event_notification', {
    p_trip_id: tripId,
    p_event_type: 'STOP_REACHED',
    p_route_id: '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e',
    p_shift_id: 'b7742e2d-ea82-48b4-8ff4-b6e7272a950c',
    p_stop_id: priyankaStop,
  });
  console.log('Test 2 (explicit route/shift):', res2.data);
}

testRpc().catch(console.error);
