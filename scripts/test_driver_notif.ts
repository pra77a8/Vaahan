import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testNotif() {
  await supabase.auth.signInWithPassword({ email: 'pranitadhangle908@gmail.com', password: 'password123' });
  const { data, error } = await supabase.rpc('dispatch_transit_event_notification', {
    p_event_type: 'DRIVER_READY',
    p_route_id: '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e',
    p_shift_id: 'b7742e2d-ea82-48b4-8ff4-b6e7272a950c',
    p_bus_id: '790639e9-f0f8-472b-87ae-1fcb8962ca0e',
    p_driver_id: 'a567ddbf-799d-4b51-85a1-d46201a71d8a',
  });
  console.log('RPC DISPATCH NOTIF RESULT:', data, error);
}
testNotif();
