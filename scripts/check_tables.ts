import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function main() {
  const tables = [
    'routes',
    'stops',
    'route_stops',
    'route_direction_stops',
    'shifts',
    'buses',
    'drivers',
    'trips',
    'trip_stops',
    'live_locations',
    'notifications',
    'profiles',
    'students',
    'student_transport',
    'route_assignments',
    'driver_assignments',
    'bus_assignments',
  ];

  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${t}: NOT FOUND or error: ${error.message}`);
    } else {
      console.log(`Table ${t}: EXISTS (${count} rows)`);
    }
  }
}

main();

