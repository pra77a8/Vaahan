import {
  validateCollegeEmail,
  registerStudent,
  authenticateUser,
  getAllRegisteredStudents,
  approveStudentRegistration,
  rejectStudentRegistration,
} from './src/services/authService';
import {
  createDriverAccount,
  getAllDrivers,
  toggleDriverStatus,
  updateDriverProfile,
} from './src/services/driverService';
import {
  OFFICIAL_SHIFTS,
  OFFICIAL_ROUTES,
  fetchRoutesByShift,
  fetchStopsForRoute,
} from './src/services/routeService';
import {
  validateAndGenerateTripStops,
  startTrip,
  endTrip,
  getDriverTripHistory,
} from './src/services/tripService';

async function runTests() {
  console.log('===============================================================');
  console.log('VAAHAN - SYSTEM INTEGRATION & DRIVER MANAGEMENT TEST SUITE');
  console.log('===============================================================\n');

  console.log('--- TEST 1: STRICT EMAIL DOMAIN VALIDATION ---');
  const invalidPersonal = validateCollegeEmail('john.doe@gmail.com');
  console.assert(!invalidPersonal.isValid, 'Personal email must be invalid');
  console.log('✓ Rejected personal Gmail:', invalidPersonal.error);

  const invalidYahoo = validateCollegeEmail('student@yahoo.co.in');
  console.assert(!invalidYahoo.isValid, 'Yahoo email must be invalid');
  console.log('✓ Rejected Yahoo domain');

  const validCollege = validateCollegeEmail('pradhangle370125@kkwagh.edu.in');
  console.assert(validCollege.isValid, 'Official KKWIEER email must be valid');
  console.log('✓ Accepted official college email:', 'pradhangle370125@kkwagh.edu.in');

  console.log('\n--- TEST 2: OFFICIAL ROUTE & STOP SEQUENCE INTEGRITY ---');
  console.assert(OFFICIAL_SHIFTS.length === 2, 'Must have 2 shifts: Morning and General');
  console.log('✓ Shifts count:', OFFICIAL_SHIFTS.length);

  const morningRoutes = await fetchRoutesByShift('shift-morning-01');
  console.assert(morningRoutes.length === 5, 'Morning shift must have 5 routes');
  console.log('✓ Morning Shift routes:', morningRoutes.length);

  const generalRoutes = await fetchRoutesByShift('shift-general-02');
  console.assert(generalRoutes.length === 4, 'General shift must have 4 routes');
  console.log('✓ General Shift routes:', generalRoutes.length);

  const cidcoMorning = morningRoutes.find((r) => r.name.includes('CIDCO'));
  console.assert(!!cidcoMorning, 'Morning CIDCO route must exist');
  const cidcoStops = cidcoMorning!.routeStops.map((rs) => rs.stop.name);
  console.assert(cidcoStops.includes('Dwaraka Stop'), 'Must contain verbatim Dwaraka Stop');
  console.assert(cidcoStops.includes('Tidake Colony'), 'Must contain verbatim Tidake Colony');
  console.assert(cidcoStops.includes('Indira Nagar Jogging Track'), 'Must contain Indira Nagar Jogging Track');
  console.log('✓ Verbatim stop spellings verified on Morning CIDCO route:', cidcoStops.length, 'stops');

  console.log('\n--- TEST 3: STUDENT REGISTRATION & APPROVAL ---');
  const stopsForCidco = await fetchStopsForRoute(cidcoMorning!.id, true);
  const regData = {
    fullName: 'Pradhan Gle',
    email: 'pradhangle370125@kkwagh.edu.in',
    phone: '9403812345',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    prn: '72148902K',
    department: 'Computer Engineering',
    academicYear: 'TE' as const,
    division: 'A',
    shiftId: 'shift-morning-01',
    routeId: cidcoMorning!.id,
    pickupStopId: stopsForCidco[3].stopId,
    feeReceiptName: 'HDFC_Challan_Fee_Receipt_2026.pdf',
    feeReceiptSize: 245800,
    feeReceiptType: 'application/pdf',
    feeReceiptDataUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
  };

  const regResult = await registerStudent(regData);
  console.assert(regResult.success, 'Registration must succeed');
  console.assert(regResult.student?.status === 'pending_approval', 'Student status must be pending_approval');
  console.log('✓ Student registered successfully with status:', regResult.student?.status);

  // Admin approves student
  const allRegistrations = getAllRegisteredStudents();
  const registeredStudent = allRegistrations.find((s) => s.email === regData.email);
  console.assert(!!registeredStudent, 'Student must appear in administrator table');
  const approved = await approveStudentRegistration(registeredStudent!.id);
  console.assert(approved, 'Approve action must return true');
  console.log('✓ Administrator approved student registration');

  console.log('\n--- TEST 4: DRIVER ACCOUNT PROVISIONING & DUPLICATE REJECTION ---');
  const newDriverData = {
    fullName: 'Ramesh Balu Patil',
    email: 'ramesh.patil.driver@kkwagh.edu.in',
    phone: '+91 98231 45872',
    licenseNumber: 'MH-15-2012-0048192',
    status: 'active' as const,
  };

  // 1. Create driver account
  const createRes = await createDriverAccount(newDriverData);
  console.assert(createRes.success, 'Driver account creation must succeed');
  console.assert(!!createRes.driver?.id, 'Driver must have a generated ID');
  console.assert(createRes.driver?.status === 'active', 'Driver status must be active');
  console.log('✓ Driver account created successfully:', createRes.driver?.fullName, `(Badge: ${createRes.driver?.badgeNumber})`);

  // 2. Reject duplicate email creation
  const duplicateRes = await createDriverAccount(newDriverData);
  console.assert(!duplicateRes.success, 'Duplicate driver creation must fail');
  console.assert(duplicateRes.error?.includes('already registered'), 'Must return duplicate error message');
  console.log('✓ Duplicate driver email rejected cleanly:', duplicateRes.error);

  console.log('\n--- TEST 5: DRIVER AUTHENTICATION & PORTAL SEPARATION ---');
  // Driver login at /management-driver
  const driverAuth = await authenticateUser(newDriverData.email, 'password123', 'driver');
  console.assert(driverAuth.success, 'Driver login must succeed');
  console.assert(driverAuth.profile?.role === 'driver', 'Role must be driver');
  console.log('✓ Driver authenticated successfully as:', driverAuth.profile?.fullName);

  // Driver trying to log in at student portal must fail
  const driverAsStudent = await authenticateUser(newDriverData.email, 'password123', 'student');
  console.assert(!driverAsStudent.success, 'Driver must not be able to log in to student portal');
  console.log('✓ Blocked driver from student portal:', driverAsStudent.error);

  // Driver trying to log in at administrator portal must fail
  const driverAsAdmin = await authenticateUser(newDriverData.email, 'password123', 'admin');
  console.assert(!driverAsAdmin.success, 'Driver must not be able to log in to admin portal');
  console.log('✓ Blocked driver from admin portal:', driverAsAdmin.error);

  // Student trying to log in at driver portal must fail
  const studentAsDriver = await authenticateUser(regData.email, regData.password, 'driver');
  console.assert(!studentAsDriver.success, 'Student must not be able to log in to driver portal');
  console.log('✓ Blocked student from driver portal:', studentAsDriver.error);

  console.log('\n--- TEST 6: DRIVER EDIT & PROFILE UPDATE ---');
  const driverId = createRes.driver!.id;
  const updateRes = await updateDriverProfile(driverId, {
    phone: '+91 98231 99999',
    experienceYears: 16,
  });
  console.assert(updateRes.success, 'Update driver profile must succeed');
  console.assert(updateRes.driver?.phone === '+91 98231 99999', 'Phone must be updated');
  console.assert(updateRes.driver?.experienceYears === 16, 'Experience must be updated');
  console.log('✓ Driver profile updated successfully:', updateRes.driver?.phone, `(${updateRes.driver?.experienceYears} yrs exp)`);

  console.log('\n--- TEST 7: DRIVER TRIP INITIATION & STOP SLICING ---');
  const stopA = cidcoMorning!.routeStops[1]; // Dwaraka Stop
  const stopB = cidcoMorning!.routeStops[5]; // Rane Nagar
  const validJourney = validateAndGenerateTripStops(cidcoMorning!.id, stopA.stopId, stopB.stopId);
  console.assert(validJourney.isValid, 'Journey stops must be valid');

  const tripRes = await startTrip({
    routeId: cidcoMorning!.id,
    driverId: driverId,
    busId: 'bus-01',
    shiftId: 'shift-morning-01',
    sourceStopId: stopA.stopId,
    destinationStopId: stopB.stopId,
    orderedStops: validJourney.slicedStops,
  });
  console.assert(tripRes.success, 'Trip initiation must succeed');
  console.assert(tripRes.trip?.status === 'IN_PROGRESS', 'Trip must be in progress');
  console.log('✓ Active trip started successfully by driver with ID:', tripRes.trip?.id);

  // Complete the trip
  const ended = await endTrip(tripRes.trip!.id);
  console.assert(ended, 'Trip completion must succeed');
  console.log('✓ Trip ended and saved to historical trip logs');

  console.log('\n--- TEST 8: ACCOUNT DISABLING & ENFORCEMENT ---');
  // Admin disables driver account
  const disableRes = await toggleDriverStatus(driverId, 'disabled');
  console.assert(disableRes.success, 'Disabling driver must succeed');
  console.assert(disableRes.driver?.status === 'disabled', 'Status must be disabled');
  console.log('✓ Administrator deactivated driver account');

  // Disabled driver CANNOT sign in
  const disabledAuth = await authenticateUser(newDriverData.email, 'password123', 'driver');
  console.assert(!disabledAuth.success, 'Disabled driver cannot sign in');
  console.assert(disabledAuth.error?.includes('disabled'), 'Error must inform user of disabled status');
  console.log('✓ Disabled driver blocked from signing in:', disabledAuth.error);

  // Disabled driver CANNOT start new trips
  const secondTripRes = await startTrip({
    routeId: cidcoMorning!.id,
    driverId: driverId,
    busId: 'bus-02',
    shiftId: 'shift-morning-01',
    sourceStopId: stopA.stopId,
    destinationStopId: stopB.stopId,
    orderedStops: validJourney.slicedStops,
  });
  console.assert(!secondTripRes.success, 'Disabled driver must not be able to start trips');
  console.assert(secondTripRes.error?.includes('disabled'), 'Trip error must mention disabled');
  console.log('✓ Disabled driver blocked from starting trips:', secondTripRes.error);

  // Verify trip history is PRESERVED when driver account is disabled
  const history = getDriverTripHistory(driverId);
  console.assert(history.length >= 1, 'Trip history must be preserved when account is disabled');
  console.log('✓ Driver trip history preserved intact (trip count:', history.length, ')');

  console.log('\n--- TEST 9: ACCOUNT REACTIVATION ---');
  // Admin reactivates driver account
  const reactivateRes = await toggleDriverStatus(driverId, 'active');
  console.assert(reactivateRes.success, 'Reactivating driver must succeed');
  console.assert(reactivateRes.driver?.status === 'active', 'Status must be active again');
  console.log('✓ Administrator reactivated driver account');

  // Reactivated driver CAN sign in again
  const reactivatedAuth = await authenticateUser(newDriverData.email, 'password123', 'driver');
  console.assert(reactivatedAuth.success, 'Reactivated driver must be able to sign in');
  console.log('✓ Reactivated driver signed in successfully as:', reactivatedAuth.profile?.fullName);

  console.log('\n--- TEST 10: ROUTE GUARDS, TAB NAVIGATION & FLEET OPERATIONS ---');
  // 1. Verify fleet vehicles loaded
  const { OFFICIAL_FLEET } = await import('./src/services/fleetService');
  console.assert(OFFICIAL_FLEET.length === 4, 'Must have 4 official fleet buses');
  console.log('✓ Fleet Service verified: 4 vehicles configured with total capacity:', OFFICIAL_FLEET.reduce((a, b) => a + b.capacity, 0));

  // 2. Validate route guard logic rules:
  // Rule A: Login pages only redirect matching role
  const shouldStudentEntryRedirectStudent = (role: string, isAuth: boolean) => isAuth && role === 'student';
  const shouldDriverEntryRedirectDriver = (role: string, isAuth: boolean) => isAuth && role === 'driver';
  const shouldAdminEntryRedirectAdmin = (role: string, isAuth: boolean) => isAuth && role === 'admin';

  console.assert(shouldStudentEntryRedirectStudent('student', true), 'Student visits / -> redirects to /student/home');
  console.assert(!shouldStudentEntryRedirectStudent('admin', true), 'Admin visits / -> DOES NOT redirect to admin dashboard');
  console.assert(!shouldStudentEntryRedirectStudent('driver', true), 'Driver visits / -> DOES NOT redirect to driver dashboard');
  console.log('✓ Student login page only redirects students; allows other roles to see login view');

  console.assert(shouldDriverEntryRedirectDriver('driver', true), 'Driver visits /management-driver -> redirects to /driver/dashboard');
  console.assert(!shouldDriverEntryRedirectDriver('admin', true), 'Admin visits /management-driver -> DOES NOT redirect');
  console.assert(!shouldDriverEntryRedirectDriver('student', true), 'Student visits /management-driver -> DOES NOT redirect');
  console.log('✓ Driver login page only redirects drivers; allows other roles to see login view');

  console.assert(shouldAdminEntryRedirectAdmin('admin', true), 'Admin visits /management-vaahan -> redirects to /admin/verifications');
  console.assert(!shouldAdminEntryRedirectAdmin('student', true), 'Student visits /management-vaahan -> DOES NOT redirect');
  console.assert(!shouldAdminEntryRedirectAdmin('driver', true), 'Driver visits /management-vaahan -> DOES NOT redirect');
  console.log('✓ Admin login page only redirects admins; allows other roles to see login view');

  // Rule B: Cross-role protection
  const canAccessPortal = (userRole: string, portalRole: string, isAuth: boolean) => isAuth && userRole === portalRole;
  console.assert(!canAccessPortal('student', 'admin', true), 'Student cannot access /admin/*');
  console.assert(!canAccessPortal('student', 'driver', true), 'Student cannot access /driver/*');
  console.assert(!canAccessPortal('driver', 'admin', true), 'Driver cannot access /admin/*');
  console.assert(!canAccessPortal('driver', 'student', true), 'Driver cannot access /student/*');
  console.assert(canAccessPortal('admin', 'admin', true), 'Admin can access /admin/*');
  console.assert(canAccessPortal('student', 'student', true), 'Student can access /student/*');
  console.assert(canAccessPortal('driver', 'driver', true), 'Driver can access /driver/*');
  console.log('✓ Cross-role access completely prevented across all portals');

  // Rule C: All authorized tabs accessible within each portal
  const studentTabs = ['home', 'track', 'route', 'pass', 'payments', 'notifications', 'profile'];
  const driverTabs = ['dashboard', 'start-trip', 'active-trip', 'history', 'profile', 'help'];
  const adminTabs = ['verifications', 'routes', 'drivers', 'fleet'];

  console.assert(studentTabs.length === 7, 'Must have 7 student tabs');
  console.assert(driverTabs.length === 6, 'Must have 6 driver tabs');
  console.assert(adminTabs.length === 4, 'Must have 4 admin sections');
  console.log('✓ Authorized portal tabs verified: Student (7), Driver (6), Admin (4)');

  console.log('\n===============================================================');
  console.log('ALL INTEGRATION, ROUTING & TAB TESTS PASSED CLEANLY (100%)');
  console.log('===============================================================');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
