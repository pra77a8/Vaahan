import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { authenticateUser } from '../src/services/authService';
import {
  startTrip,
  updateTripGps,
  endTrip,
  getEligibleTripForStudent,
} from '../src/services/tripService';
import { fetchDirectionalRouteStops, fetchShifts, fetchRoutesByShift } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';
import { generateLegWaypoints } from '../src/services/simulationRoadService';

async function testStudentTracking() {
  console.log('=== VAAHAN STUDENT TRACKING SIMULATION TEST ===\n');

  // 1. Authenticate driver
  const driverAuth = await authenticateUser('pranitadhangle908@gmail.com', 'password123', 'driver');
  const driverId = driverAuth.profile?.id || 'a567ddbf-799d-4b51-85a1-d46201a71d8a';
  await supabase.from('trips').update({ status: 'COMPLETED' }).eq('driver_id', driverId).eq('status', 'IN_PROGRESS');

  const shifts = await fetchShifts();
  const morningShift = shifts.find((s) => s.type === 'MORNING') || shifts[0];
  const routes = await fetchRoutesByShift(morningShift.id);
  const route = routes[0]; // Route 1
  const fleet = await fetchFleetBuses();
  const directionalStops = await fetchDirectionalRouteStops(route.id, 'TO_COLLEGE');

  // 2. Start Simulated Trip
  const startRes = await startTrip({
    routeId: route.id,
    driverId,
    busId: fleet[0].id,
    shiftId: morningShift.id,
    direction: 'TO_COLLEGE',
    mode: 'SIMULATION',
    orderedStops: directionalStops,
  });

  if (!startRes.success || !startRes.trip) {
    throw new Error('Trip start failed: ' + startRes.error);
  }
  const tripId = startRes.trip.id;
  console.log('Trip started:', tripId);

  // 3. Move bus to a waypoint
  const stop0 = directionalStops[0].stop;
  const stop1 = directionalStops[1].stop;
  const waypoints = generateLegWaypoints(stop0, stop1, 8);
  const wp = waypoints[3];
  await updateTripGps(tripId, wp.latitude, wp.longitude, wp.speedKmh, wp.heading);
  console.log(`Updated bus GPS to: (${wp.latitude}, ${wp.longitude}) at ${wp.speedKmh} km/h`);

  // 4. Authenticate student
  const studentAuth = await authenticateUser('priyanka.shinde@kkwagh.edu.in', 'password123', 'student');
  console.log('Student authenticated:', studentAuth.profile?.full_name);

  // 5. Query as student
  const studentTransport = (studentAuth.profile as any)?.student?.transport;
  const studentRes = await getEligibleTripForStudent(
    studentTransport?.shiftId || morningShift.id,
    studentTransport?.routeId || route.id,
    studentTransport?.pickupStopId || stop1.id,
    'approved',
    'TO_COLLEGE'
  );

  console.log('Student Tracking Status:', studentRes.status);
  console.log('Student Received Trip:', studentRes.trip?.id);
  console.log('Student Received Latest Location:', studentRes.trip?.latestLocation);

  if (!studentRes.trip || !studentRes.trip.latestLocation) {
    throw new Error('Student tracking did not receive the active trip or latestLocation');
  }

  if (
    Math.abs(studentRes.trip.latestLocation.latitude - wp.latitude) > 0.0001 ||
    Math.abs(studentRes.trip.latestLocation.longitude - wp.longitude) > 0.0001
  ) {
    throw new Error('Student latestLocation coordinates do not match the live GPS update!');
  }

  console.log('✓ CONFIRMED: Student portal receives exact live simulated GPS coordinates!');

  // 6. Clean up
  await endTrip(tripId);
  console.log('Trip ended cleanly.');
  console.log('\n=== STUDENT TRACKING SIMULATION TEST PASSED ===');
}

testStudentTracking().catch((err) => {
  console.error('\n❌ TEST ERROR:', err);
  process.exit(1);
});
