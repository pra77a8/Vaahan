import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('VAAHAN END-TO-END VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}${detail ? ` (${detail})` : ''}`);
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Student Authentication & Identity Binding (Varad Andhale)
  // ---------------------------------------------------------------------------
  console.log('1. Testing Student Identity (Varad Andhale)...');
  const { data: studentAuth, error: studentAuthErr } = await supabase.auth.signInWithPassword({
    email: 'varad@kkwagh.edu.in',
    password: 'password123',
  });

  assert(!studentAuthErr && !!studentAuth.user, 'Student Auth SignIn', studentAuth.user?.email);

  if (studentAuth.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentAuth.user.id)
      .single();

    assert(profile?.full_name === 'Varad Andhale', 'Student Profile Name is Varad Andhale', profile?.full_name);
    assert(profile?.role === 'student', 'Role is student', profile?.role);

    const { data: studentRecord } = await supabase
      .from('students')
      .select('*, student_transport(*, routes(*), stops(*), shifts(*))')
      .eq('id', studentAuth.user.id)
      .single();

    const tr = Array.isArray(studentRecord?.student_transport)
      ? studentRecord.student_transport[0]
      : studentRecord?.student_transport;

    const routeName = tr?.routes?.name || '';
    const pickupStopName = tr?.stops?.name || '';

    assert(routeName.includes('JAIL ROAD'), 'Student Route is JAIL ROAD, NOT CIDCO', routeName);
    assert(pickupStopName.length > 0, 'Designated Pickup Stop Exists', pickupStopName);
    console.log(`   -> Student PRN: ${studentRecord?.prn}, Department: ${studentRecord?.department}`);
    console.log(`   -> Route: ${routeName}, Stop: ${pickupStopName}\n`);
  }

  // Sign out student
  await supabase.auth.signOut();

  // ---------------------------------------------------------------------------
  // TEST 2: Directional Stop Sequences for ALL 5 Official Corridors
  // ---------------------------------------------------------------------------
  console.log('2. Testing Directional Stop Sequences for All 5 Official Corridors...');
  const { data: allRoutes } = await supabase
    .from('routes')
    .select('id, route_number, name')
    .order('route_number');

  for (const r of allRoutes || []) {
    // Check TO_COLLEGE
    const { data: toCollegeStops } = await supabase
      .from('route_direction_stops')
      .select('sequence_number, stop:stops(name)')
      .eq('route_id', r.id)
      .eq('direction', 'TO_COLLEGE')
      .order('sequence_number');

    if (toCollegeStops && toCollegeStops.length > 0) {
      const firstStop = (toCollegeStops[0].stop as any)?.name;
      const lastStop = (toCollegeStops[toCollegeStops.length - 1].stop as any)?.name;

      const isFirstNotKKW = !firstStop.toLowerCase().includes('k k wagh');
      const isLastKKW = lastStop.toLowerCase().includes('k k wagh');

      assert(
        isFirstNotKKW && isLastKKW,
        `${r.route_number} TO_COLLEGE Direction`,
        `Start: ${firstStop} -> End: ${lastStop}`
      );
    }

    // Check TO_HOME
    const { data: toHomeStops } = await supabase
      .from('route_direction_stops')
      .select('sequence_number, stop:stops(name)')
      .eq('route_id', r.id)
      .eq('direction', 'TO_HOME')
      .order('sequence_number');

    if (toHomeStops && toHomeStops.length > 0) {
      const firstStop = (toHomeStops[0].stop as any)?.name;
      const lastStop = (toHomeStops[toHomeStops.length - 1].stop as any)?.name;

      const isFirstKKW = firstStop.toLowerCase().includes('k k wagh');
      const isLastNotKKW = !lastStop.toLowerCase().includes('k k wagh');

      assert(
        isFirstKKW && isLastNotKKW,
        `${r.route_number} TO_HOME Direction`,
        `Start: ${firstStop} -> End: ${lastStop}`
      );
    }
  }
  console.log('');

  // ---------------------------------------------------------------------------
  // TEST 3: Admin Authentication & Assignment Broadcast
  // ---------------------------------------------------------------------------
  console.log('3. Testing Admin Assignment & Real-Time Student Notifications...');
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });

  assert(!adminAuthErr && !!adminAuth.user, 'Admin Auth SignIn', adminAuth.user?.email);

  // Get Route 1 Morning, Bus 1, Driver
  const { data: route1 } = await supabase
    .from('routes')
    .select('id, shift_id, name')
    .eq('route_number', 'ROUTE 1')
    .limit(1)
    .single();

  const { data: bus1 } = await supabase
    .from('buses')
    .select('id, bus_number, plate_number')
    .limit(1)
    .single();

  const { data: driver1 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'driver')
    .limit(1)
    .single();

  assert(!!route1 && !!bus1 && !!driver1, 'Assignment Prerequisites Loaded', `${route1?.name}, Bus: ${bus1?.bus_number}, Driver: ${driver1?.full_name}`);

  if (route1 && bus1 && driver1) {
    // Call assignment RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_assign_driver_bus', {
      p_route_id: route1.id,
      p_shift_id: route1.shift_id,
      p_bus_id: bus1.id,
      p_driver_id: driver1.id,
    });

    assert(!rpcErr && !!rpcRes, 'Admin Assign Driver & Bus RPC Execution', rpcRes?.message || JSON.stringify(rpcRes));

    // Call second time to verify duplicate prevention
    const { data: rpcDupRes } = await supabase.rpc('admin_assign_driver_bus', {
      p_route_id: route1.id,
      p_shift_id: route1.shift_id,
      p_bus_id: bus1.id,
      p_driver_id: driver1.id,
    });

    assert(rpcDupRes?.updated === false, 'Duplicate Assignment Prevented', rpcDupRes?.message);

    // Verify notifications table has records for approved students
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('route_id', route1.id)
      .order('created_at', { ascending: false })
      .limit(5);

    assert(!!notifs && notifs.length > 0, 'Student Notifications Successfully Created in DB', `${notifs?.length} found`);
    if (notifs && notifs[0]) {
      console.log(`   -> Sample Notification: "${notifs[0].message}"`);
      assert(
        notifs[0].message.includes('Your transport assignment has been updated'),
        'Notification Message Content Matches Standard Format'
      );
    }
  }

  await supabase.auth.signOut();
  console.log('');

  // ---------------------------------------------------------------------------
  // TEST 4: Driver Authentication
  // ---------------------------------------------------------------------------
  console.log('4. Testing Driver Authentication...');
  const { data: driverAuth, error: driverAuthErr } = await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });

  assert(!driverAuthErr && !!driverAuth.user, 'Driver Auth SignIn', driverAuth.user?.email);

  if (driverAuth.user) {
    const { data: driverProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverAuth.user.id)
      .single();

    assert(driverProfile?.role === 'driver', 'Driver Role Verified', driverProfile?.role);
    assert(driverProfile?.status === 'active', 'Driver Status Active', driverProfile?.status);
  }

  await supabase.auth.signOut();
  console.log('');

  console.log('================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================');
}

runEndToEndTests().catch(console.error);
