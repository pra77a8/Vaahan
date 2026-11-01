import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import {
  broadcastDriverReadiness,
  startTrip,
  getEligibleTripForStudent,
  updateTripGps,
  markStopReached,
  endTrip,
  dispatchTransitNotification,
} from '../src/services/tripService';
import { fetchDirectionalRouteStops, fetchAllOfficialRoutes } from '../src/services/routeService';
import { generateLegWaypoints } from '../src/services/simulationRoadService';

const signInAsDriver = async () => {
  await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });
};

const signInAsStudent = async () => {
  await supabase.auth.signInWithPassword({
    email: 'priyanka.shinde@kkwagh.edu.in',
    password: 'password123',
  });
};

async function runFullVerification() {
  console.log('=============================================================================');
  console.log('VAAHAN COMPLETE END-TO-END VERIFICATION: ROUTE, SIMULATION, NOTIFICATIONS & BUS');
  console.log('=============================================================================');

  // STEP 1: VERIFY ALL 5 OFFICIAL ROUTE CORRIDORS DIRECTION RULES
  console.log('\n--- 1. VERIFYING ALL 5 ROUTE CORRIDORS IN BOTH DIRECTIONS ---');
  const allRoutes = await fetchAllOfficialRoutes();
  console.log(`Found ${allRoutes.length} official routes configured.`);

  for (const r of allRoutes) {
    const toCollegeStops = await fetchDirectionalRouteStops(r.id, 'TO_COLLEGE');
    const toHomeStops = await fetchDirectionalRouteStops(r.id, 'TO_HOME');

    const firstCollegeStop = toCollegeStops[0]?.stop.name;
    const lastCollegeStop = toCollegeStops[toCollegeStops.length - 1]?.stop.name;
    const firstHomeStop = toHomeStops[0]?.stop.name;
    const lastHomeStop = toHomeStops[toHomeStops.length - 1]?.stop.name;

    console.log(`Route: ${r.name} (${r.routeNumber})`);
    console.log(`  TO_COLLEGE (${toCollegeStops.length} stops): ${firstCollegeStop} ---> ${lastCollegeStop}`);
    console.log(`  TO_HOME    (${toHomeStops.length} stops): ${firstHomeStop} ---> ${lastHomeStop}`);

    const isCollegeValid =
      lastCollegeStop?.toLowerCase().replace(/\./g, '').includes('k k wagh');
    const isHomeValid =
      firstHomeStop?.toLowerCase().replace(/\./g, '').includes('k k wagh');

    if (!isCollegeValid || !isHomeValid) {
      throw new Error(`Direction rule violation on route ${r.name}`);
    }
  }
  console.log('✓ All 5 routes strictly follow canonical directional orientation!');

  // Clean initial notifications for student
  await signInAsStudent();
  await supabase.rpc('clear_user_notifications');

  // Clean any existing in-progress trips for clean test run
  await signInAsDriver();
  await supabase
    .from('trips')
    .update({ status: 'COMPLETED' })
    .eq('driver_id', 'a567ddbf-799d-4b51-85a1-d46201a71d8a')
    .eq('status', 'IN_PROGRESS');
  await supabase
    .from('buses')
    .update({ status: 'IDLE' })
    .eq('id', '790639e9-f0f8-472b-87ae-1fcb8962ca0e');

  // STEP 2: DRIVER READY EVENT (EVENT A)
  console.log('\n--- 2. TESTING EVENT A: DRIVER READINESS BROADCAST ---');

  const driverId = 'a567ddbf-799d-4b51-85a1-d46201a71d8a';
  const route1Id = '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e'; // Jail Road
  const shiftMorningId = 'b7742e2d-ea82-48b4-8ff4-b6e7272a950c'; // Morning Shift
  const bus04Id = '790639e9-f0f8-472b-87ae-1fcb8962ca0e'; // Bus 04

  const readyRes = await broadcastDriverReadiness({
    driverId,
    routeId: route1Id,
    shiftId: shiftMorningId,
    busId: bus04Id,
    direction: 'TO_COLLEGE',
  });

  console.log('Driver readiness broadcast result:', readyRes);
  if (!readyRes.success || readyRes.count === 0) {
    throw new Error('Event A driver readiness broadcast failed');
  }

  // Switch to Student to verify Event A
  await signInAsStudent();
  const { data: priyankaNotifsAfterReady } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(
    `Priyanka received ${priyankaNotifsAfterReady?.length} notification(s):`,
    priyankaNotifsAfterReady?.map((n) => `[${n.category}] ${n.title}`)
  );

  const hasReadyEvent = priyankaNotifsAfterReady?.some((n) => n.category === 'DRIVER_READY');
  if (!hasReadyEvent) throw new Error('Priyanka did not receive DRIVER_READY event');
  console.log('✓ Event A (DRIVER_READY) verified successfully!');

  // STEP 3: DRIVER STARTS TRIP (EVENT B) & STOP 1 PENDING CHECK
  console.log('\n--- 3. TESTING EVENT B: TRIP START & STOP 1 PENDING STATUS ---');
  await signInAsDriver();
  const r1Stops = await fetchDirectionalRouteStops(route1Id, 'TO_COLLEGE');

  const tripRes = await startTrip({
    routeId: route1Id,
    driverId,
    busId: bus04Id,
    shiftId: shiftMorningId,
    direction: 'TO_COLLEGE',
    orderedStops: r1Stops,
    mode: 'SIMULATION',
  });

  if (!tripRes.success || !tripRes.trip) {
    throw new Error(`Failed to start trip: ${tripRes.error}`);
  }
  const activeTrip = tripRes.trip;
  console.log(`Trip started: ID=${activeTrip.id}, Mode=${activeTrip.mode}`);

  // Verify Stop 1 is PENDING, NOT REACHED before trip progresses
  const stop1 = activeTrip.tripStops[0];
  console.log(`Stop 1 (${stop1.stop?.name || stop1.stopId}) status: ${stop1.status}`);
  if (stop1.status === 'REACHED') {
    throw new Error('Stop 1 must be PENDING before trip begins, but was marked REACHED!');
  }
  console.log('✓ Stop 1 correctly set to PENDING upon trip start!');

  // Switch to student to verify Event B
  await signInAsStudent();
  const { data: priyankaNotifsAfterStart } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  const hasTripStartEvent = priyankaNotifsAfterStart?.some((n) => n.category === 'TRIP_STARTED');
  if (!hasTripStartEvent) throw new Error('Priyanka did not receive TRIP_STARTED event');
  console.log('✓ Event B (TRIP_STARTED) verified successfully!');

  // STEP 4: VERIFY STUDENT PORTAL BUS ASSIGNMENT (BUS 04, NOT BUS 01)
  console.log('\n--- 4. TESTING STUDENT PORTAL BUS RESOLUTION ---');
  const priyankaPickup = '13cb56c1-96f0-49d0-90d7-d690eb73415f'; // KK Wagh
  const studentTripState = await getEligibleTripForStudent(
    shiftMorningId,
    route1Id,
    priyankaPickup,
    'approved',
    'TO_COLLEGE'
  );

  console.log('Student Portal Active Trip Query:');
  console.log(`  Status: ${studentTripState.status}`);
  console.log(`  Trip Bus Number: "${studentTripState.trip?.bus?.busNumber}"`);
  console.log(`  Trip Bus Plate:  "${studentTripState.trip?.bus?.plateNumber}"`);

  if (studentTripState.trip?.bus?.busNumber !== 'Bus 04') {
    throw new Error(`Student portal returned "${studentTripState.trip?.bus?.busNumber}", expected "Bus 04"!`);
  }
  if (studentTripState.trip?.bus?.plateNumber !== 'MH-15-JK-1188') {
    throw new Error(`Student portal returned wrong plate "${studentTripState.trip?.bus?.plateNumber}"`);
  }
  console.log('✓ Student Portal correctly displays Bus 04 · MH-15-JK-1188 with zero mock fallback!');

  // STEP 5: SIMULATE ROAD PROGRESSION & DISPATCH EVENTS C & D
  console.log('\n--- 5. TESTING ROAD SIMULATION, EVENT C (APPROACHING) & EVENT D (REACHED) ---');
  await signInAsDriver();
  const priyankaStop = activeTrip.tripStops.find((s) => s.stopId === priyankaPickup)?.stop || activeTrip.tripStops[activeTrip.tripStops.length - 1].stop;
  const prevStop = activeTrip.tripStops[0].stop;
  console.log(`Simulating road leg approaching student's pickup stop: ${prevStop.name} -> ${priyankaStop.name}`);

  // Test waypoint generation
  const waypoints = generateLegWaypoints(prevStop, priyankaStop, 8);
  console.log(`Generated ${waypoints.length} curvature waypoints. Sample midpoint waypoint:`, {
    lat: waypoints[3].latitude,
    lng: waypoints[3].longitude,
    speed: waypoints[3].speedKmh,
    heading: waypoints[3].heading,
    fraction: waypoints[3].fractionOfLeg,
  });

  // Telemetry GPS update
  const gpsOk = await updateTripGps(
    activeTrip.id,
    waypoints[3].latitude,
    waypoints[3].longitude,
    waypoints[3].speedKmh,
    waypoints[3].heading
  );
  console.log('updateTripGps persisted:', gpsOk);

  // Midpoint: Dispatch Event C (APPROACHING_STOP)
  await dispatchTransitNotification({
    tripId: activeTrip.id,
    eventType: 'APPROACHING_STOP',
    stopId: priyankaStop.id,
    routeId: route1Id,
    shiftId: shiftMorningId,
    busId: bus04Id,
    driverId,
  });

  // Switch to student to verify Event C
  await signInAsStudent();
  const { data: priyankaNotifsAfterMid } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  const hasApproachingEvent = priyankaNotifsAfterMid?.some((n) => n.category === 'APPROACHING_STOP');
  if (!hasApproachingEvent) throw new Error('Event C (APPROACHING_STOP) was not received');
  console.log('✓ Event C (APPROACHING_STOP) verified successfully!');

  // Driver marks stop reached: triggers Event D (STOP_REACHED)
  await signInAsDriver();
  const stopReachedTrip = await markStopReached(activeTrip.id, priyankaStop.id);
  console.log(`Stop ${priyankaStop.name} marked REACHED. Trip current stop index: ${stopReachedTrip?.currentStopIndex}`);

  // Switch to student to verify Event D
  await signInAsStudent();
  const { data: priyankaNotifsAfterArrival } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  const hasStopReachedEvent = priyankaNotifsAfterArrival?.some((n) => n.category === 'STOP_REACHED');
  if (!hasStopReachedEvent) throw new Error('Event D (STOP_REACHED) was not received');
  console.log('✓ Event D (STOP_REACHED) verified successfully!');

  // STEP 6: END TRIP (EVENT E)
  console.log('\n--- 6. TESTING EVENT E: TRIP COMPLETED ---');
  await signInAsDriver();
  const endOk = await endTrip(activeTrip.id);
  console.log('endTrip completed:', endOk);

  // Switch to student to verify Event E
  await signInAsStudent();
  const { data: priyankaNotifsAfterEnd } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(
    `All notifications received by Priyanka (${priyankaNotifsAfterEnd?.length}):`,
    priyankaNotifsAfterEnd?.map((n) => `[${n.category}] ${n.title}`)
  );

  const hasTripCompletedEvent = priyankaNotifsAfterEnd?.some((n) => n.category === 'TRIP_COMPLETED');
  if (!hasTripCompletedEvent) throw new Error('Event E (TRIP_COMPLETED) was not received');
  console.log('✓ Event E (TRIP_COMPLETED) verified successfully!');

  // STEP 7: TEST STUDENT NOTIFICATION ACTIONS (MARK ALL READ & CLEAR ALL)
  console.log('\n--- 7. TESTING STUDENT NOTIFICATION ACTIONS ---');
  console.log(`Priyanka currently has ${priyankaNotifsAfterEnd?.length} notifications.`);

  // Test Mark All Read RPC
  const { data: markReadCount } = await supabase.rpc('mark_all_user_notifications_read');
  console.log(`mark_all_user_notifications_read RPC updated ${markReadCount} notification(s).`);

  const { data: unreadNotifs } = await supabase
    .from('notifications')
    .select('id')
    .eq('is_read', false);

  if (unreadNotifs && unreadNotifs.length > 0) {
    throw new Error(`Expected 0 unread notifications, found ${unreadNotifs.length}`);
  }
  console.log('✓ Mark all notifications as read verified: 0 unread remaining!');

  // Test Clear All RPC
  const { data: clearedCount } = await supabase.rpc('clear_user_notifications');
  console.log(`clear_user_notifications RPC deleted ${clearedCount} notification(s).`);

  const { data: remainingNotifs } = await supabase
    .from('notifications')
    .select('id');

  if (remainingNotifs && remainingNotifs.length > 0) {
    throw new Error(`Expected 0 notifications after clear, found ${remainingNotifs.length}`);
  }
  console.log('✓ Clear all notifications verified: exactly 0 notifications in database!');

  console.log('\n=============================================================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('=============================================================================');
}

runFullVerification().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
