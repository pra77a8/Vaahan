import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { startTrip, getEligibleTripForStudent, endTrip } from '../src/services/tripService';
import { fetchDirectionalRouteStops } from '../src/services/routeService';

async function testEligibility() {
  console.log('--- TESTING STUDENT ELIGIBILITY WITH BUS 04 ---');
  // 1. Sign in as driver
  await supabase.auth.signInWithPassword({ email: 'pranitadhangle908@gmail.com', password: 'password123' });

  const routeId = '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e'; // Route 1 Jail Road
  const shiftId = 'b7742e2d-ea82-48b4-8ff4-b6e7272a950c'; // Morning Shift
  const bus04Id = '790639e9-f0f8-472b-87ae-1fcb8962ca0e'; // Bus 04 (MH-15-JK-1188)

  const stops = await fetchDirectionalRouteStops(routeId, 'TO_COLLEGE');

  // Start trip with Bus 04
  const tripRes = await startTrip({
    routeId,
    busId: bus04Id,
    shiftId,
    direction: 'TO_COLLEGE',
    orderedStops: stops,
    mode: 'SIMULATION',
  });

  console.log('startTrip result:', tripRes.success, tripRes.trip?.id, tripRes.error);
  if (!tripRes.success || !tripRes.trip) return;

  const tripId = tripRes.trip.id;

  // 2. Now check what getEligibleTripForStudent returns for Priyanka Shinde
  const priyankaPickupStopId = '13cb56c1-96f0-49d0-90d7-d690eb73415f'; // KK Wagh
  const elResult = await getEligibleTripForStudent(shiftId, routeId, priyankaPickupStopId, 'approved', 'TO_COLLEGE');

  console.log('Eligibility result for Priyanka:', {
    status: elResult.status,
    message: elResult.message,
    tripId: elResult.trip?.id,
    busNumber: elResult.trip?.bus?.busNumber,
    plateNumber: elResult.trip?.bus?.plateNumber,
  });

  // 3. Check for Varad (pickup at Sailani Baba Square)
  const varadPickupStopId = '6534d0ff-52f0-425e-9f8b-5e56e3fb3b21';
  const elResultVarad = await getEligibleTripForStudent(shiftId, routeId, varadPickupStopId, 'approved', 'TO_COLLEGE');
  console.log('Eligibility result for Varad:', {
    status: elResultVarad.status,
    message: elResultVarad.message,
    tripId: elResultVarad.trip?.id,
    busNumber: elResultVarad.trip?.bus?.busNumber,
    plateNumber: elResultVarad.trip?.bus?.plateNumber,
  });

  // 4. Clean up test trip
  await endTrip(tripId);
  console.log('Trip ended and cleaned up.');
}

testEligibility().catch(console.error);

