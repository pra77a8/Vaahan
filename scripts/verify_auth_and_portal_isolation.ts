import * as dotenv from 'dotenv';
dotenv.config();
import { authenticateUser } from '../src/services/authService';
import { getAuthenticatedDriverProfile } from '../src/services/driverService';
import { startTrip, endTrip, getDriverActiveTrip } from '../src/services/tripService';
import { fetchDirectionalRouteStops, fetchShifts } from '../src/services/routeService';
import { fetchFleetBuses } from '../src/services/fleetService';
import { supabase } from '../src/lib/supabase';

async function runVerification() {
  console.log('================================================================');
  console.log('VAAHAN - AUTHENTICATION, ISOLATION & TRIP VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       ${detail}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Driver Authentication via Driver Portal
    // -------------------------------------------------------------------------
    console.log('--- TEST GROUP 1: Canonical Driver Authentication ---');
    const driverAuth = await authenticateUser('pranitadhangle908@gmail.com', 'password123', 'driver');
    assert(driverAuth.success === true, 'Driver signs in successfully through driver portal');
    assert(driverAuth.profile?.role === 'driver', 'Driver profile role is strictly "driver"', `Role: ${driverAuth.profile?.role}`);
    assert(driverAuth.profile?.id === 'a567ddbf-799d-4b51-85a1-d46201a71d8a', 'Driver ID matches institutional UUID', `ID: ${driverAuth.profile?.id}`);

    // Verify getAuthenticatedDriverProfile() reads active Supabase user directly
    const authProfileRes = await getAuthenticatedDriverProfile();
    assert(authProfileRes.success === true, 'getAuthenticatedDriverProfile() succeeds for authenticated driver');
    assert(authProfileRes.driverId === 'a567ddbf-799d-4b51-85a1-d46201a71d8a', 'getAuthenticatedDriverProfile() resolves canonical driver UUID', `Resolved driverId: ${authProfileRes.driverId}`);
    assert(Boolean(authProfileRes.driver?.badgeNumber || authProfileRes.driver?.fullName), 'Driver operational record loaded from drivers table', `Badge: ${authProfileRes.driver?.badgeNumber}`);

    // -------------------------------------------------------------------------
    // TEST 2: Cross-Portal Isolation & Rejection of Wrong Roles
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Cross-Portal Isolation Enforcement ---');

    // Attempt to log in with driver credentials on student portal
    const crossDriverToStudent = await authenticateUser('pranitadhangle908@gmail.com', 'password123', 'student');
    assert(crossDriverToStudent.success === false, 'Driver credentials rejected on Student portal');
    assert(
      crossDriverToStudent.error?.includes('registered as a driver, not an student') === true,
      'Helpful portal redirect message returned for driver accessing student portal',
      crossDriverToStudent.error
    );

    // Attempt to log in with student credentials on driver portal
    const crossStudentToDriver = await authenticateUser('priyanka.shinde@kkwagh.edu.in', 'password123', 'driver');
    assert(crossStudentToDriver.success === false, 'Student credentials rejected on Driver portal');
    assert(
      crossStudentToDriver.error?.includes('registered as a student, not an driver') === true,
      'Helpful portal redirect message returned for student accessing driver portal',
      crossStudentToDriver.error
    );

    // Attempt to log in with student credentials on admin portal
    const crossStudentToAdmin = await authenticateUser('priyanka.shinde@kkwagh.edu.in', 'password123', 'admin');
    assert(crossStudentToAdmin.success === false, 'Student credentials rejected on Admin portal');
    assert(
      crossStudentToAdmin.error?.includes('registered as a student, not an admin') === true,
      'Helpful portal redirect message returned for student accessing admin portal',
      crossStudentToAdmin.error
    );

    // -------------------------------------------------------------------------
    // TEST 3: Switching Between Accounts (Zero Stale Role Contamination)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Rapid Role Switching Without Session Leakage ---');

    // 1. Log in as Student
    const studentLogin = await authenticateUser('priyanka.shinde@kkwagh.edu.in', 'password123', 'student');
    assert(studentLogin.success === true, 'Student signs in cleanly');
    assert(studentLogin.profile?.role === 'student', 'Active user profile is student');

    // Verify driverService rejects the student user session
    const driverCheckOnStudent = await getAuthenticatedDriverProfile();
    assert(driverCheckOnStudent.success === false, 'getAuthenticatedDriverProfile() strictly rejects active student session');
    assert(
      driverCheckOnStudent.error?.includes('registered as "student", not a driver') === true,
      'Diagnostic correctly detects role mismatch on active student session',
      driverCheckOnStudent.error
    );

    // 2. Now immediately log in as Driver
    const driverRelogin = await authenticateUser('pranitadhangle908@gmail.com', 'password123', 'driver');
    assert(driverRelogin.success === true, 'Driver signs in immediately after student');
    assert(driverRelogin.profile?.role === 'driver', 'Role switched cleanly to driver');

    // Verify driverService now recognizes the newly logged in driver!
    const driverCheckAfterSwitch = await getAuthenticatedDriverProfile();
    assert(driverCheckAfterSwitch.success === true, 'getAuthenticatedDriverProfile() recognizes driver immediately after switch');
    assert(driverCheckAfterSwitch.driverId === 'a567ddbf-799d-4b51-85a1-d46201a71d8a', 'Driver UUID resolved without any stale student ID cache');

    // -------------------------------------------------------------------------
    // TEST 4: Driver Trip Operations With Verified Identity
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Driver Trip Operations With Verified Identity ---');

    // Clean up any stale active trips first
    const existingActiveTrip = await getDriverActiveTrip('a567ddbf-799d-4b51-85a1-d46201a71d8a');
    if (existingActiveTrip) {
      console.log(`Cleaning up existing active trip ${existingActiveTrip.id}...`);
      await endTrip(existingActiveTrip.id);
    }

    // Fetch verified fleet buses and shifts from database
    const fleetBuses = await fetchFleetBuses();
    assert(fleetBuses.length > 0, `Loaded ${fleetBuses.length} fleet vehicles from database`);
    const validBusId = fleetBuses[0].id;

    const availableShifts = await fetchShifts();
    assert(availableShifts.length > 0, `Loaded ${availableShifts.length} official shifts`);
    const validShiftId = availableShifts[0].id;

    // Fetch Jail Road TO_COLLEGE stops
    const jailRoadRouteId = '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e';
    const directionalStops = await fetchDirectionalRouteStops(jailRoadRouteId, 'TO_COLLEGE');
    assert(directionalStops.length > 0, `Fetched ${directionalStops.length} directional stops for Jail Road TO_COLLEGE`);

    // Start a simulated trip
    const startTripRes = await startTrip({
      driverId: 'a567ddbf-799d-4b51-85a1-d46201a71d8a',
      busId: validBusId,
      routeId: jailRoadRouteId,
      shiftId: validShiftId,
      direction: 'TO_COLLEGE',
      mode: 'SIMULATION',
      remarks: 'Automated verification test trip',
      orderedStops: directionalStops,
    });

    assert(startTripRes.success === true, 'startTrip() completes successfully with verified driver session');
    assert(startTripRes.trip?.id !== undefined, `Created trip ID: ${startTripRes.trip?.id}`);
    assert(startTripRes.trip?.driverId === 'a567ddbf-799d-4b51-85a1-d46201a71d8a', 'Trip driver ID matches institutional driver');

    if (startTripRes.trip?.id) {
      console.log(`Ending active test trip ${startTripRes.trip.id}...`);
      const endRes = await endTrip(startTripRes.trip.id);
      assert(endRes === true, 'endTrip() completed cleanly');
    }

    // -------------------------------------------------------------------------
    // TEST 5: Complete Sign Out & Session Teardown
    // -------------------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Session Termination ---');
    await supabase.auth.signOut();
    const afterSignOutCheck = await getAuthenticatedDriverProfile();
    assert(afterSignOutCheck.success === false, 'After signOut(), getAuthenticatedDriverProfile() returns false');
    assert(
      afterSignOutCheck.error?.includes('No active driver session') === true,
      'Correctly reports no active driver session after sign out',
      afterSignOutCheck.error
    );

  } catch (err: any) {
    console.error('Fatal error during verification:', err);
    totalTests++;
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification();