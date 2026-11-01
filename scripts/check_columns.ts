import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function check() {
  const { data: route } = await supabase.from('routes').select('*').limit(1);
  console.log('ROUTE COLS:', Object.keys(route?.[0] || {}));

  const { data: bus } = await supabase.from('buses').select('*').limit(1);
  console.log('BUS COLS:', Object.keys(bus?.[0] || {}));

  const { data: rds } = await supabase.from('route_direction_stops').select('*').limit(1);
  console.log('RDS COLS:', Object.keys(rds?.[0] || {}));

  const { data: notif } = await supabase.from('notifications').select('*').limit(1);
  console.log('NOTIF COLS:', Object.keys(notif?.[0] || {}));
}

check();

