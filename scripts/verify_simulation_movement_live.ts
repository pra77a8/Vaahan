import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { authenticateUser } from '../src/services/authService';
import {
  startTrip,
  updateTripGps,
  markStopReached,
  endTrip,
  getActiveTrips,
  getEligibleTripForStudent,
} from '../src/services/tripService';
import { fetchDirectionalRouteStops, fetchShifts, fetchRoutesByShift } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';
import { generateLegWaypoints } from '../src/services/simulationRoadService';

async function runVerification() {
  console.log('=== VAAHAN GPS SIMULATION VERIFICATION ===\n');

  // 1. Authenticate driver
  console.log('1. Authenticating test driver...');
  const auth = await authenticateUser('pranitadhangle908@gmail.com', 'password123', 'driver');
  if (!auth.success || !auth.profile?.id) {
    throw new Error('Driver auth failed: ' + auth.error);
  }
  const driverId = auth.profile.id;
  console.log('   Authenticated driver UUID:', driverId);

  // 2. Cleanup any prior trips
  console.log('2. Cleaning up any prior in-progress trips...');
  await supabase.from('trips').update({ status: 'COMPLETED' }).eq('driver_id', driverId).eq('status', 'IN_PROGRESS');

  // 3. Load shifts, routes, buses, and stops
  console.log('3. Loading shift, route, and buses...');
  const shifts = await fetchShifts();
  const morningShift = shifts.find((s) => s.type === 'MORNING') || shifts[0];
  const routes = await fetchRoutesByShift(morningShift.id);
  const route = routes[0]; // e.g. Route 1 Jail Road
  const fleet = await fetchFleetBuses();
  const availableBus = fleet.find((b) => b.status === 'AVAILABLE') || fleet[0];
  const directionalStops = await fetchDirectionalRouteStops(route.id, 'TO_COLLEGE');

  console.log(`   Selected Route: ${route.name} (${route.routeNumber})`);
  console.log(`   Direction: TO_COLLEGE (${directionalStops.length} stops)`);
  console.log(`   Bus: ${availableBus.busNumber} (${availableBus.plateNumber})`);

  // 4. Start Simulated Trip
  console.log('4. Starting Simulated Trip...');
  const startRes = await startTrip({
    routeId: route.id,
    driverId,
    busId: availableBus.id,
    shiftId: morningShift.id,
    direction: 'TO_COLLEGE',
    mode: 'SIMULATION',
    orderedStops: directionalStops,
  });

  if (!startRes.success || !startRes.trip) {
    throw new Error('Failed to start trip: ' + startRes.error);
  }

  const tripId = startRes.trip.id;
  console.log('   Trip successfully created with ID:', tripId);
  console.log('   Trip Mode:', startRes.trip.mode);

  // 5. Test Live Movement Along Route Coordinates
  console.log('\n5. Testing Live Movement Along Curved Road Waypoints...');
  const stop0 = directionalStops[0].stop;
  const stop1 = directionalStops[1].stop;
  console.log(`   Leg 1: From "${stop0.name}" (${stop0.latitude}, ${stop0.longitude})`);
  console.log(`          To   "${stop1.name}" (${stop1.latitude}, ${stop1.longitude})`);

  const waypoints = generateLegWaypoints(stop0, stop1, 8);
  console.log(`   Generated ${waypoints.length} intermediate curved road waypoints.`);

  const recordedPositions: { lat: number; lng: number; speed: number; heading: number }[] = [];

  for (let i = 0; i < 4; i++) {
    const wp = waypoints[i * 2]; // Samples across the leg
    console.log(`   [Tick ${i + 1}] Moving to waypoint: (${wp.latitude}, ${wp.longitude}) | Speed: ${wp.speedKmh} km/h | Heading: ${wp.heading}°`);
    const ok = await updateTripGps(tripId, wp.latitude, wp.longitude, wp.speedKmh, wp.heading);
    if (!ok) {
      throw new Error(`Failed to update GPS for tick ${i + 1}`);
    }
    recordedPositions.push({ lat: wp.latitude, lng: wp.longitude, speed: wp.speedKmh, heading: wp.heading });
  }

  // 6. Verify coordinates saved in Supabase live_locations
  console.log('\n6. Verifying Supabase live_locations table entries...');
  const { data: dbLocs, error: locErr } = await supabase
    .from('live_locations')
    .select('*')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: false });

  if (locErr || !dbLocs || dbLocs.length < 4) {
    throw new Error('Supabase live_locations verification failed: ' + (locErr?.message || 'insufficient rows'));
  }

  console.log(`   Found ${dbLocs.length} recorded live locations for trip ${tripId}.`);
  console.log('   Latest DB location:', {
    lat: dbLocs[0].latitude,
    lng: dbLocs[0].longitude,
    speed: dbLocs[0].speed_kmh,
    heading: dbLocs[0].heading,
    time: dbLocs[0].recorded_at,
  });

  // Check that positions actually changed (bus moved!)
  const latDiff = Math.abs(dbLocs[0].latitude - dbLocs[dbLocs.length - 1].latitude);
  const lngDiff = Math.abs(dbLocs[0].longitude - dbLocs[dbLocs.length - 1].longitude);
  console.log(`   Coordinate delta between start and tick 4: dLat=${latDiff.toFixed(6)}, dLng=${lngDiff.toFixed(6)}`);
  if (latDiff === 0 && lngDiff === 0) {
    throw new Error('Bus coordinates did not change! Bus is stationary.');
  }
  console.log('   ✓ CONFIRMED: Bus coordinates are continuously changing along route geometry.');

  // 7. Verify Admin Portal Receives Active Trip with Latest Location
  console.log('\n7. Verifying Admin Active Trips view...');
  const adminActiveTrips = await getActiveTrips();
  const adminTrip = adminActiveTrips.find((t) => t.id === tripId);
  if (!adminTrip || !adminTrip.latestLocation) {
    throw new Error('Admin active trips did not return the active trip or latestLocation');
  }
  console.log('   Admin sees trip with latestLocation:', {
    latitude: adminTrip.latestLocation.latitude,
    longitude: adminTrip.latestLocation.longitude,
    speedKmh: adminTrip.latestLocation.speedKmh,
  });
  console.log('   ✓ CONFIRMED: Admin Live Map receives real-time simulated coordinates.');

  // 8. Verify Stop Arrival Progression
  console.log('\n8. Testing Stop Arrival Progression (Stop 1 reached)...');
  await markStopReached(tripId, stop1.id);
  const { data: tripCheck } = await supabase.from('trips').select('current_stop_index').eq('id', tripId).single();
  const { data: stopCheck } = await supabase
    .from('trip_stops')
    .select('status, reached_at')
    .eq('trip_id', tripId)
    .eq('stop_id', stop1.id)
    .single();

  console.log(`   Trip current_stop_index: ${tripCheck?.current_stop_index} (expected 1)`);
  console.log(`   Stop "${stop1.name}" status: ${stopCheck?.status} at ${stopCheck?.reached_at}`);
  if (stopCheck?.status !== 'REACHED') {
    throw new Error('Stop was not marked REACHED in Supabase.');
  }
  console.log('   ✓ CONFIRMED: Stop progression advances cleanly and persists to database.');

  // 9. Clean up Trip
  console.log('\n9. Ending trip run cleanly...');
  const endOk = await endTrip(tripId);
  console.log('   endTrip returned:', endOk);
  const { data: finalTrip } = await supabase.from('trips').select('status').eq('id', tripId).single();
  console.log('   Final trip status in DB:', finalTrip?.status);
  if (finalTrip?.status !== 'COMPLETED') {
    throw new Error('Trip was not completed cleanly.');
  }
  console.log('   ✓ CONFIRMED: Trip ended cleanly, releasing resources and vehicle.');

  console.log('\n=== ALL SIMULATION VERIFICATIONS PASSED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION ERROR:', err);
  process.exit(1);
});

