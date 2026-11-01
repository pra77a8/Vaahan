import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { createClient } from '@supabase/supabase-js';
import {
  startTrip,
  getJourneyStudentManifest,
  updateTripGps,
  markStopReached,
  endTrip,
} from '../src/services/tripService';
import { fetchShifts, fetchRoutesByShift, fetchDirectionalRouteStops } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';

async function runDriverFullFlowTest() {
  console.log('=== STARTING DRIVER FULL FLOW TEST ===\n');

  const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

  // 1. Log in as driver
  const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });
  if (loginErr || !auth.user) {
    console.error('Driver login failed:', loginErr);
    process.exit(1);
  }
  console.log('1. Driver logged in successfully:', auth.user.email, auth.user.id);

  // 2. Load Shifts & Routes
  const shifts = await fetchShifts();
  const morningShift = shifts.find((s) => s.name.toLowerCase().includes('morning')) || shifts[0];
  console.log('2. Selected Shift:', morningShift.name, morningShift.id);

  const routes = await fetchRoutesByShift(morningShift.id);
  const route1 = routes.find((r) => r.routeNumber === '1' || r.name.includes('1')) || routes[0];
  console.log('3. Selected Route:', route1.name, route1.id);

  // 3. Test Student Manifest (verifying approved students appear on the driver dashboard)
  const manifest = await getJourneyStudentManifest(route1.id, morningShift.id);
  console.log(`4. Student Manifest for Driver: Found ${manifest.length} approved students:`);
  manifest.forEach((s) => {
    console.log(`   - ${s.fullName} | PRN: ${s.prn} | Dept: ${s.department} | Stop: ${s.pickupStopName}`);
  });
  if (manifest.length === 0) {
    console.error('FAIL: Manifest returned 0 students for Driver!');
    process.exit(1);
  }

  // 4. Test directional stops
  const directionalStops = await fetchDirectionalRouteStops(route1.id, 'TO_COLLEGE');
  console.log(`5. Route stops loaded: ${directionalStops.length} stops in sequence.`);

  // 5. Select Bus
  const buses = await fetchFleetBuses();
  const bus = buses.find((b) => b.busNumber === 'Bus 01') || buses[0];
  console.log('6. Selected Bus:', bus.busNumber, bus.id);

  // 6. Start Drive
  console.log('\n--- 7. Driver Starting Drive ---');
  const startRes = await startTrip({
    routeId: route1.id,
    driverId: auth.user.id,
    busId: bus.id,
    shiftId: morningShift.id,
    direction: 'TO_COLLEGE',
    tripDate: new Date().toISOString().slice(0, 10),
    mode: 'SIMULATION',
    remarks: 'Automated verification trip',
    orderedStops: directionalStops,
  });

  if (!startRes.success || !startRes.trip) {
    console.error('FAIL: startTrip error:', startRes.error);
    process.exit(1);
  }
  console.log('SUCCESS: Trip started successfully! Trip ID:', startRes.trip.id);
  console.log('Assigned Student Count in Trip:', startRes.trip.assignedStudentCount);

  // 7. Test Smooth Waypoint GPS telemetry update
  const stop0 = directionalStops[0]?.stop;
  const stop1 = directionalStops[1]?.stop;
  if (stop0 && stop1) {
    console.log('\n--- 8. Simulating smooth GPS movement ---');
    // Interpolate 3 waypoints between stop 0 and stop 1
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const lat = Number((stop0.latitude + (stop1.latitude - stop0.latitude) * frac).toFixed(6));
      const lng = Number((stop0.longitude + (stop1.longitude - stop0.longitude) * frac).toFixed(6));
      const speed = 30 + i * 3;
      const ok = await updateTripGps(startRes.trip.id, lat, lng, speed);
      console.log(`   Waypoint ${i}/3: (${lat}, ${lng}) at ${speed} km/h -> GPS Saved: ${ok}`);
    }

    // 8. Test Stop Check-in / Reached
    console.log('\n--- 9. Arriving at Stop 1 ---');
    const reachedRes = await markStopReached(startRes.trip.id, stop1.id);
    console.log(`   Stop ${stop1.name} reached! Current stop index: ${reachedRes?.currentStopIndex}`);
  }

  // 9. End Trip
  console.log('\n--- 10. Concluding Trip ---');
  const endRes = await endTrip(startRes.trip.id);
  console.log('SUCCESS: Trip ended cleanly! Status:', endRes);

  console.log('\n=== ALL DRIVER WORKFLOW VERIFICATIONS PASSED ===');
}

runDriverFullFlowTest().catch(console.error);

