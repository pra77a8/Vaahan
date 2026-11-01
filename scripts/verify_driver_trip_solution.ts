import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { getAuthenticatedDriverProfile } from '../src/services/driverService';
import { startTrip, getDriverActiveTrip, endTrip } from '../src/services/tripService';
import { fetchShifts, fetchRoutesByShift, fetchDirectionalRouteStops } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';

async function verifySolution() {
  console.log('===============================================================');
  console.log('VAAHAN DRIVER TRIP INITIALIZATION & IDENTITY MAPPING TEST');
  console.log('===============================================================');

  // Step 1: Sign in with the authentic driver account
  const driverEmail = 'pranitadhangle908@gmail.com';
  console.log(`\n1. Authenticating driver with credentials (${driverEmail})...`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: driverEmail,
    password: 'password123',
  });

  if (authErr || !authData.user) {
    throw new Error(`Authentication failed: ${authErr?.message}`);
  }
  console.log('   Authenticated User ID:', authData.user.id);
  console.log('   Authenticated Email:', authData.user.email);

  // Step 2: Retrieve the resolved driver profile via getAuthenticatedDriverProfile
  console.log('\n2. Resolving driver profile via getAuthenticatedDriverProfile()...');
  const driverRes = await getAuthenticatedDriverProfile();
  if (!driverRes.success || !driverRes.driver || !driverRes.driverId) {
    throw new Error(`Driver profile resolution failed: ${driverRes.error}`);
  }
  console.log('   Resolved Driver ID:', driverRes.driverId);
  console.log('   Driver Full Name:', driverRes.driver.fullName);
  console.log('   Driver Badge:', driverRes.driver.badgeNumber);
  console.log('   Driver Status:', driverRes.driver.status);
  console.log('   Driver Role:', driverRes.driver.role);

  if (driverRes.driverId !== authData.user.id) {
    throw new Error(`Driver ID mismatch! Expected ${authData.user.id}, got ${driverRes.driverId}`);
  }

  // Step 3: Fetch route, shift, stops, and bus
  console.log('\n3. Fetching route prerequisites...');
  const shifts = await fetchShifts();
  const shift = shifts[0];
  console.log(`   Shift: ${shift.name} (${shift.id})`);

  const routes = await fetchRoutesByShift(shift.id);
  const route = routes[0];
  console.log(`   Route: ${route.routeNumber} - ${route.routeName} (${route.id})`);

  const directionalStops = await fetchDirectionalRouteStops(route.id, 'TO_COLLEGE');
  console.log(`   Stops count: ${directionalStops.length}`);
  console.log(`   Start stop: ${directionalStops[0]?.stop?.name}`);
  console.log(`   End stop: ${directionalStops[directionalStops.length - 1]?.stop?.name}`);

  const buses = await fetchFleetBuses();
  const bus = buses[0];
  console.log(`   Bus: ${bus.busNumber} (${bus.plateNumber}) [${bus.id}]`);

  // Ensure no active trip exists before starting
  const preCheckActive = await getDriverActiveTrip(driverRes.driverId);
  if (preCheckActive) {
    console.log(`   Cleaning up existing active trip ${preCheckActive.id} first...`);
    await endTrip(preCheckActive.id);
  }

  // Step 4: Initiate trip via startTrip()
  console.log('\n4. Initiating trip via startTrip()...');
  const startResult = await startTrip({
    routeId: route.id,
    driverId: 'intentionally-stale-or-unverified-id', // startTrip must securely resolve authentic driver session
    busId: bus.id,
    shiftId: shift.id,
    direction: 'TO_COLLEGE',
    tripDate: new Date().toISOString().slice(0, 10),
    mode: 'SIMULATION',
    remarks: 'Automated verification run',
    orderedStops: directionalStops,
  });

  if (!startResult.success || !startResult.trip) {
    throw new Error(`startTrip failed: ${startResult.error}`);
  }

  const createdTrip = startResult.trip;
  console.log('   startTrip succeeded!');
  console.log('   Trip ID:', createdTrip.id);
  console.log('   Trip Status:', createdTrip.status);
  console.log('   Trip Driver ID:', createdTrip.driverId);
  console.log('   Trip Driver Name:', createdTrip.driver?.name);
  console.log('   Trip Driver Badge:', createdTrip.driver?.badgeNumber);

  if (createdTrip.driverId !== authData.user.id) {
    throw new Error(`Created trip has wrong driverId: ${createdTrip.driverId} vs ${authData.user.id}`);
  }

  // Step 5: Verify the trip record in Supabase database
  console.log('\n5. Verifying trip in Supabase database (trips table)...');
  const { data: dbTrip, error: dbTripErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', createdTrip.id)
    .single();

  if (dbTripErr || !dbTrip) {
    throw new Error(`Trip record not found in database: ${dbTripErr?.message}`);
  }

  console.log('   Database Record Verified:');
  console.log('   DB Trip ID:', dbTrip.id);
  console.log('   DB Driver ID:', dbTrip.driver_id);
  console.log('   DB Bus ID:', dbTrip.bus_id);
  console.log('   DB Route ID:', dbTrip.route_id);
  console.log('   DB Status:', dbTrip.status);
  console.log('   DB Started At:', dbTrip.started_at);

  if (dbTrip.driver_id !== authData.user.id) {
    throw new Error(`DB record has incorrect driver_id: ${dbTrip.driver_id}`);
  }
  if (dbTrip.status !== 'IN_PROGRESS') {
    throw new Error(`DB record status is not IN_PROGRESS: ${dbTrip.status}`);
  }

  // Step 6: Verify getDriverActiveTrip retrieves this trip
  console.log('\n6. Verifying getDriverActiveTrip()...');
  const activeTrip = await getDriverActiveTrip();
  if (!activeTrip || activeTrip.id !== createdTrip.id) {
    throw new Error(`getDriverActiveTrip failed to retrieve active trip ${createdTrip.id}`);
  }
  console.log('   getDriverActiveTrip correctly retrieved active trip:', activeTrip.id);

  // Step 7: Clean up test trip
  console.log('\n7. Cleaning up test trip...');
  const ended = await endTrip(createdTrip.id);
  console.log('   endTrip result:', ended);

  // Verify trip is completed
  const { data: finalTrip } = await supabase
    .from('trips')
    .select('id, status, ended_at')
    .eq('id', createdTrip.id)
    .single();

  console.log('   Final Trip Status in DB:', finalTrip?.status, 'Ended at:', finalTrip?.ended_at);

  // Reset bus back to IDLE
  await supabase.from('buses').update({ status: 'IDLE' }).eq('id', bus.id);

  console.log('\n===============================================================');
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

verifySolution().catch((err) => {
  console.error('\nVerification failed with error:', err);
  process.exit(1);
});

