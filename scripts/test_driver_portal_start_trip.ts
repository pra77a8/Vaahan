import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import { startTrip } from '../src/services/tripService';
import { fetchShifts, fetchRoutesByShift, fetchDirectionalRouteStops } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';

async function testDriverStartTrip() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

  // Sign in as driver pranita
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });

  if (aErr || !auth.user) {
    console.error('Driver login failed:', aErr);
    return;
  }
  console.log('Driver logged in:', auth.user.id, auth.user.email);

  const shifts = await fetchShifts();
  const shift = shifts[0];
  console.log('Selected Shift:', shift.id, shift.name);

  const routes = await fetchRoutesByShift(shift.id);
  const route = routes[0];
  console.log('Selected Route:', route.id, route.routeName, route.routeNumber);

  const directionalStops = await fetchDirectionalRouteStops(route.id, 'TO_COLLEGE');
  console.log('Directional stops count:', directionalStops.length, 'first stop:', directionalStops[0]?.stop?.id, directionalStops[0]?.stop?.name);

  const buses = await fetchFleetBuses();
  const bus = buses[0];
  console.log('Selected Bus:', bus.id, bus.busNumber);

  console.log('\n--- Calling startTrip ---');
  const res = await startTrip({
    routeId: route.id,
    driverId: auth.user.id,
    busId: bus.id,
    shiftId: shift.id,
    direction: 'TO_COLLEGE',
    tripDate: new Date().toISOString().slice(0, 10),
    mode: 'SIMULATION',
    remarks: 'Test simulation drive',
    orderedStops: directionalStops,
  });

  console.log('startTrip result:', res);
}

testDriverStartTrip().catch(console.error);
