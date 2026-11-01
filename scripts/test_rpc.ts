import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function testRpc() {
  const { data: adminAuth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });
  console.log('Admin login error:', authErr);
  console.log('Admin user ID:', adminAuth?.user?.id);

  const { data: route1 } = await supabase
    .from('routes')
    .select('id, shift_id, name')
    .eq('route_number', 'ROUTE 1')
    .limit(1)
    .single();

  const { data: bus1 } = await supabase
    .from('buses')
    .select('id, bus_number, plate_number')
    .limit(1)
    .single();

  const { data: driver1 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'driver')
    .limit(1)
    .single();

  console.log('Params:', {
    p_route_id: route1?.id,
    p_shift_id: route1?.shift_id,
    p_bus_id: bus1?.id,
    p_driver_id: driver1?.id,
  });

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_assign_driver_bus', {
    p_route_id: route1?.id,
    p_shift_id: route1?.shift_id,
    p_bus_id: bus1?.id,
    p_driver_id: driver1?.id,
  });

  console.log('RPC RES:', rpcRes);
  console.log('RPC ERR:', rpcErr);
}

testRpc().catch(console.error);

