import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { authenticateUser } from '../src/services/authService';
import { startTrip, updateTripGps, getLatestLocation, endTrip } from '../src/services/tripService';
import { fetchDirectionalRouteStops, fetchShifts } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';

async function diagnose() {
  console.log('--- 1. Authenticate as Driver ---');
  const auth = await authenticateUser('pranitadhangle908@gmail.com', 'password123', 'driver');
  console.log('Driver auth success:', auth.success, auth.profile?.id);

  console.log('--- 2. Check Trips in Database ---');
  const { data: trips, error: tErr } = await supabase
    .from('trips')
    .select('id, mode, status, driver_id, bus_id, current_stop_index')
    .order('started_at', { ascending: false })
    .limit(5);
  console.log('Trips error:', tErr?.message);
  console.log('Trips count:', trips?.length);
  console.log('Trips:', trips);

  console.log('--- 3. Check Live Locations in Database ---');
  const { data: locs, error: lErr } = await supabase
    .from('live_locations')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(5);
  console.log('Live locations error:', lErr?.message);
  console.log('Live locations count:', locs?.length);
  console.log('Latest live locations:', locs);

  if (trips && trips.length > 0) {
    const tripId = trips[0].id;
    console.log(`--- 4. Test Inserting Location for Trip ${tripId} as Driver ---`);
    const ok = await updateTripGps(tripId, 20.0258, 73.8268, 30, 45);
    console.log('updateTripGps result:', ok);

    const { data: checkLoc, error: cErr } = await supabase
      .from('live_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('recorded_at', { ascending: false })
      .limit(2);
    console.log('Query inserted location error:', cErr?.message);
    console.log('Inserted location rows:', checkLoc);
  }
}

diagnose().catch(console.error);
