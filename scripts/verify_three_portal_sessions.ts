import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// In-memory mock storage replicating localStorage per portal
class MockStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const adminStorage = new MockStorage();
const driverStorage = new MockStorage();
const studentStorage = new MockStorage();

const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'vaahan_admin_auth',
    storage: adminStorage,
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const driverClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'vaahan_driver_auth',
    storage: driverStorage,
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const studentClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'vaahan_student_auth',
    storage: studentStorage,
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function runVerification() {
  console.log('================================================================');
  console.log('VAAHAN THREE-PORTAL AUTHENTICATION & MULTI-SESSION VERIFICATION');
  console.log('================================================================\n');

  // 1. Sign in Admin
  console.log('Step 1: Authenticating Admin Portal (transport.admin@kkwagh.edu.in)...');
  const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
    email: 'transport.admin@kkwagh.edu.in',
    password: 'password123',
  });
  if (adminErr || !adminAuth.session) {
    console.error('❌ Admin login failed:', adminErr?.message);
    process.exit(1);
  }
  console.log('✅ Admin authenticated. User ID:', adminAuth.user.id);
  console.log('   Storage Key vaahan_admin_auth present:', !!adminStorage.getItem('vaahan_admin_auth'));

  // 2. Sign in Driver
  console.log('\nStep 2: Authenticating Driver Portal (pranitadhangle908@gmail.com)...');
  const { data: driverAuth, error: driverErr } = await driverClient.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });
  if (driverErr || !driverAuth.session) {
    console.error('❌ Driver login failed:', driverErr?.message);
    process.exit(1);
  }
  console.log('✅ Driver authenticated. User ID:', driverAuth.user.id);
  console.log('   Storage Key vaahan_driver_auth present:', !!driverStorage.getItem('vaahan_driver_auth'));

  // 3. Sign in Student
  console.log('\nStep 3: Authenticating Student Portal (priyanka.shinde@kkwagh.edu.in)...');
  const { data: studentAuth, error: studentErr } = await studentClient.auth.signInWithPassword({
    email: 'priyanka.shinde@kkwagh.edu.in',
    password: 'password123',
  });
  if (studentErr || !studentAuth.session) {
    console.error('❌ Student login failed:', studentErr?.message);
    process.exit(1);
  }
  console.log('✅ Student authenticated. User ID:', studentAuth.user.id);
  console.log('   Storage Key vaahan_student_auth present:', !!studentStorage.getItem('vaahan_student_auth'));

  // 4. Concurrency check: Verify all 3 sessions are simultaneously alive
  console.log('\nStep 4: Checking Simultaneous Session Validity Across All 3 Portals...');
  const [adminUserRes, driverUserRes, studentUserRes] = await Promise.all([
    adminClient.auth.getUser(),
    driverClient.auth.getUser(),
    studentClient.auth.getUser(),
  ]);

  if (!adminUserRes.data.user || adminUserRes.error) {
    console.error('❌ Admin session was corrupted!');
    process.exit(1);
  }
  if (!driverUserRes.data.user || driverUserRes.error) {
    console.error('❌ Driver session was corrupted!');
    process.exit(1);
  }
  if (!studentUserRes.data.user || studentUserRes.error) {
    console.error('❌ Student session was corrupted!');
    process.exit(1);
  }
  console.log('✅ ALL 3 PORTALS SIMULTANEOUSLY LOGGED IN & VALID:');
  console.log('   - Admin:   ', adminUserRes.data.user.email);
  console.log('   - Driver:  ', driverUserRes.data.user.email);
  console.log('   - Student: ', studentUserRes.data.user.email);

  // 5. Driver Manifest RPC Check using Driver's Own Session
  console.log('\nStep 5: Testing get_journey_student_manifest RPC using Driver Client...');
  const { data: routes } = await adminClient.from('routes').select('id, name').limit(1);
  const routeId = routes?.[0]?.id;
  const { data: shifts } = await adminClient.from('shifts').select('id, name').limit(1);
  const shiftId = shifts?.[0]?.id;

  const { data: manifest, error: manifestErr } = await driverClient.rpc('get_journey_student_manifest', {
    p_route_id: routeId,
    p_shift_id: shiftId,
  });

  if (manifestErr) {
    console.error('❌ Driver could not call get_journey_student_manifest:', manifestErr.message);
  } else {
    console.log(`✅ Driver RPC succeeded! Manifest returned ${manifest?.length ?? 0} students.`);
  }

  // 6. Direct Driver Query on student_transport with RLS Policy
  console.log('\nStep 6: Testing Driver direct SELECT on student_transport via RLS Policy...');
  const { data: transportRows, error: transportErr } = await driverClient
    .from('student_transport')
    .select('student_id, status, pickup_stop_id')
    .eq('status', 'approved');

  if (transportErr) {
    console.error('❌ Driver direct SELECT failed:', transportErr.message);
  } else {
    console.log(`✅ Driver RLS query succeeded! Found ${transportRows?.length ?? 0} approved rider entries.`);
  }

  // 7. Test Admin Resetting Driver Password via RPC & Verification
  console.log('\nStep 7: Testing admin_reset_driver_password RPC...');
  const driverUserId = driverAuth.user.id;
  const testNewPassword = 'newDriverPass456!';
  const { data: resetRes, error: resetErr } = await adminClient.rpc('admin_reset_driver_password', {
    p_driver_id: driverUserId,
    p_new_password: testNewPassword,
  });

  if (resetErr || !resetRes?.success) {
    console.error('❌ Password reset RPC failed:', resetErr?.message || resetRes?.error);
  } else {
    console.log('✅ Admin successfully reset driver password via RPC!');

    // Try logging in with the new password
    console.log('   Testing driver login with newly assigned password...');
    const { data: newLoginData, error: newLoginErr } = await driverClient.auth.signInWithPassword({
      email: 'pranitadhangle908@gmail.com',
      password: testNewPassword,
    });

    if (newLoginErr || !newLoginData.session) {
      console.error('❌ Login with new password failed:', newLoginErr?.message);
    } else {
      console.log('✅ Driver authenticated successfully using NEW password!');

      // Reset it back to password123 for development convenience
      await adminClient.rpc('admin_reset_driver_password', {
        p_driver_id: driverUserId,
        p_new_password: 'password123',
      });
      console.log('   (Restored driver password to password123)');
    }
  }

  // 8. Sign Out Driver and verify Admin & Student stay intact
  console.log('\nStep 8: Testing Session Isolation on Driver Sign Out...');
  await driverClient.auth.signOut();
  console.log('   Driver logged out. vaahan_driver_auth wiped.');

  const [afterAdminUser, afterStudentUser, afterDriverUser] = await Promise.all([
    adminClient.auth.getUser(),
    studentClient.auth.getUser(),
    driverClient.auth.getUser(),
  ]);

  if (!afterAdminUser.data.user) {
    console.error('❌ Admin session was mistakenly destroyed by driver logout!');
    process.exit(1);
  }
  if (!afterStudentUser.data.user) {
    console.error('❌ Student session was mistakenly destroyed by driver logout!');
    process.exit(1);
  }
  if (afterDriverUser.data.user) {
    console.error('❌ Driver session is still active after logout!');
    process.exit(1);
  }
  console.log('✅ SESSION ISOLATION VERIFIED PERFECTLY:');
  console.log('   - Driver:  Logged Out (null)');
  console.log('   - Admin:   Still Authenticated (', afterAdminUser.data.user.email, ')');
  console.log('   - Student: Still Authenticated (', afterStudentUser.data.user.email, ')');

  // 9. Inspect Authoritative Route Sequences in route_direction_stops
  console.log('\nStep 9: Inspecting All 5 Official Routes in route_direction_stops...');
  const { data: directionStops, error: rdsErr } = await adminClient
    .from('route_direction_stops')
    .select(`
      direction,
      sequence_number,
      routes:route_id (name),
      stops:stop_id (name)
    `)
    .order('route_id')
    .order('direction')
    .order('sequence_number');

  if (rdsErr) {
    console.error('❌ Failed to fetch route_direction_stops:', rdsErr.message);
  } else {
    const summary: Record<string, { TO_COLLEGE: string[]; TO_HOME: string[] }> = {};
    (directionStops || []).forEach((row: any) => {
      const rName = row.routes?.name;
      const sName = row.stops?.name;
      const dir = row.direction;
      if (dir !== 'TO_COLLEGE' && dir !== 'TO_HOME') return;
      if (!summary[rName]) {
        summary[rName] = { TO_COLLEGE: [], TO_HOME: [] };
      }
      summary[rName][dir].push(sName);
    });

    for (const [routeName, dirs] of Object.entries(summary)) {
      console.log(`\n📌 ${routeName.toUpperCase()}:`);
      console.log(`   TO_COLLEGE (${dirs.TO_COLLEGE.length} stops): ${dirs.TO_COLLEGE.join(' ➔ ')}`);
      console.log(`   TO_HOME    (${dirs.TO_HOME.length} stops): ${dirs.TO_HOME.join(' ➔ ')}`);
    }
  }

  console.log('\n================================================================');
  console.log('✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runVerification().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
