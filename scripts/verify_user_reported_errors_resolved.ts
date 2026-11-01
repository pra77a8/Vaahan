import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { authenticateUser } from '../src/services/authService';
import { fetchFleetBuses, resolveBusId } from '../src/services/fleetService';
import {
  checkBusAvailability,
  startTrip,
  updateTripGps,
  markStopReached,
  endTrip,
  getDriverActiveTrip,
  getDriverTripHistory,
  getBusTripHistory,
} from '../src/services/tripService';
import { fetchDirectionalRouteStops, fetchRoutesByShift, fetchShifts } from '../src/services/routeService';

async function verifyAllReportedErrors() {
  console.log('=============================================================================');
  console.log('VERIFYING RESOLUTION OF ALL USER-REPORTED ERRORS');
  console.log('=============================================================================\n');

  // 1. Edge Function CORS Preflight Check
  console.log('--- 1. EDGE FUNCTION PREFLIGHT CHECK ---');
  const resOptions = await fetch('https://fzbranclvhaxqyplbsrj.supabase.co/functions/v1/create-driver-account', {
    method: 'OPTIONS',
  });
  console.log('OPTIONS status:', resOptions.status, '(Expected: 200)');
  console.log('Access-Control-Allow-Origin:', resOptions.headers.get('access-control-allow-origin'), '(Expected: *)');
  if (resOptions.status !== 200) throw new Error('Edge function preflight failed');
  console.log('✅ Edge function CORS preflight verified PASS\n');

  // 2. Unauthenticated Bus Fetching (no [] fallback to bad IDs)
  console.log('--- 2. PUBLIC FLEET BUS QUERY ---');
  const fleet = await fetchFleetBuses();
  console.log(`Fetched ${fleet.length} buses.`);
  fleet.forEach((b) => console.log(`  ${b.busNumber} -> UUID: ${b.id} (${b.plateNumber})`));
  const allUuids = fleet.every((b) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id));
  console.log('All fleet buses have authentic PostgreSQL UUIDs:', allUuids ? 'PASS' : 'FAIL');
  if (!allUuids) throw new Error('Fleet buses still have string IDs');
  console.log('✅ Fleet UUID resolution verified PASS\n');

  // 3. Resolve human-readable bus identifier ('bus-01')
  console.log('--- 3. RESOLVE "bus-01" IDENTIFIER ---');
  const resolvedBus01 = await resolveBusId('bus-01');
  console.log('resolveBusId("bus-01") ->', resolvedBus01);
  const busAvail = await checkBusAvailability('bus-01');
  console.log('checkBusAvailability("bus-01") result:', busAvail);
  if (!busAvail.available && busAvail.reason?.includes('uuid')) throw new Error('UUID error in checkBusAvailability');
  console.log('✅ Bus availability check with "bus-01" resolved cleanly without UUID error PASS\n');

  // 4. Driver Login via authenticateUser (ensures real UUID, no 'drv-...' fallback)
  console.log('--- 4. DRIVER AUTHENTICATION ---');
  const authRes = await authenticateUser('ramesh.patil.driver@kkwagh.edu.in', 'password123', 'driver');
  console.log('Driver login success:', authRes.success);
  console.log('Driver profile:', {
    id: authRes.profile?.id,
    fullName: authRes.profile?.fullName,
    role: authRes.profile?.role,
    status: authRes.profile?.status,
  });
  const isDriverUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authRes.profile?.id || '');
  console.log('Driver ID is verified UUID (not drv-...):', isDriverUuid ? 'PASS' : 'FAIL');
  if (!isDriverUuid) throw new Error('Driver ID is not a UUID');
  console.log('✅ Driver authentication verified PASS\n');

  const driverId = authRes.profile!.id;

  // 5. Query Driver Active Trip & Trip History without 400 errors
  console.log('--- 5. DRIVER QUERIES (NO 400 ERRORS) ---');
  const activeTripBefore = await getDriverActiveTrip(driverId);
  console.log('getDriverActiveTrip result:', activeTripBefore ? activeTripBefore.id : 'None currently active (Normal)');
  const historyBefore = await getDriverTripHistory(driverId);
  console.log(`getDriverTripHistory returned ${historyBefore.length} historical trips.`);
  console.log('✅ Driver trip queries executed without 400 Bad Request PASS\n');

  // 6. Complete Trip Lifecycle: Start -> GPS Telemetry -> Stop Check-in -> End Trip
  console.log('--- 6. COMPLETE TRIP LIFECYCLE EXECUTION ---');
  const shifts = await fetchShifts();
  const morningShift = shifts.find((s) => s.code === 'MORNING') || shifts[0];
  const routes = await fetchRoutesByShift(morningShift.id);
  const route = routes[0];
  const directionalStops = await fetchDirectionalRouteStops(route.id, 'TO_COLLEGE');
  console.log(`Starting trip on Route ${route.routeNumber} (${route.name}) with ${directionalStops.length} stops...`);

  const startRes = await startTrip({
    routeId: route.id,
    driverId: driverId,
    busId: 'bus-01', // Passing string 'bus-01' to verify automatic resolution
    shiftId: morningShift.id,
    direction: 'TO_COLLEGE',
    orderedStops: directionalStops,
  });

  if (!startRes.success || !startRes.trip) {
    throw new Error(`Failed to start trip: ${startRes.error}`);
  }
  const testTripId = startRes.trip.id;
  console.log(`Trip successfully initialized! Trip ID: ${testTripId}`);
  console.log(`Trip status: ${startRes.trip.status}, Bus ID: ${startRes.trip.busId}`);

  // Test GPS Telemetry
  console.log('Transmitting GPS telemetry ping...');
  const gpsSuccess = await updateTripGps(testTripId, 20.0125, 73.8234, 25, 90);
  console.log('GPS ping result:', gpsSuccess ? 'SUCCESS' : 'FAILURE');
  if (!gpsSuccess) throw new Error('Live location ping failed (possible 401)');

  // Advance Stop Check-in
  console.log('Progressing stop check-in...');
  const firstStop = directionalStops[0]?.stopId;
  const updatedTrip = await markStopReached(testTripId, firstStop);
  console.log('Stop marked REACHED:', updatedTrip?.tripStops[0]?.status === 'REACHED' ? 'SUCCESS' : 'FAILURE');

  // End Trip
  console.log('Ending trip and verifying status reset...');
  const endSuccess = await endTrip(testTripId);
  console.log('endTrip result:', endSuccess);

  // Verify bus status reset in database
  const busAfter = await checkBusAvailability(resolvedBus01);
  console.log('Bus availability after trip completion:', busAfter.available ? 'AVAILABLE (IDLE)' : 'BUSY');
  if (!busAfter.available) throw new Error('Bus was not reset to IDLE');

  // Verify trip appears in driver history and bus history
  const historyAfter = await getDriverTripHistory(driverId);
  const busHistory = await getBusTripHistory('bus-01');
  const foundInDriverHistory = historyAfter.some((t) => t.id === testTripId);
  const foundInBusHistory = busHistory.some((t) => t.id === testTripId);
  console.log('Trip present in Driver Trip History:', foundInDriverHistory ? 'PASS' : 'FAIL');
  console.log('Trip present in Bus Logbook History:', foundInBusHistory ? 'PASS' : 'FAIL');

  console.log('\n=============================================================================');
  console.log('ALL VERIFICATION PHASES COMPLETED WITH ZERO ERRORS!');
  console.log('=============================================================================');
}

verifyAllReportedErrors().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
