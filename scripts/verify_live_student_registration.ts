import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FATAL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import * as fs from 'fs';
import * as path from 'path';

function runDbQuery(sql: string): any {
  const tempPath = path.resolve('supabase', 'temp_exec.sql');
  fs.writeFileSync(tempPath, sql, 'utf-8');
  try {
    const cmd = `npx supabase db query --linked --project-ref fzbranclvhaxqyplbsrj -f supabase/temp_exec.sql`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const jsonStart = output.indexOf('{');
    if (jsonStart !== -1) {
      try {
        return JSON.parse(output.substring(jsonStart));
      } catch {
        return { raw: output };
      }
    }
    return { raw: output };
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

async function runVerification() {
  console.log('=============================================================================');
  console.log('VAAHAN LIVE SUPABASE STUDENT REGISTRATION & ATOMIC TRIGGER VERIFICATION');
  console.log('=============================================================================\n');

  // 1. Fetch valid relational foreign keys directly from live Supabase
  console.log('[Step 1] Fetching live Shifts, Routes, and Stops from database...');
  const { data: shifts, error: shiftErr } = await supabase.from('shifts').select('*').limit(2);
  const { data: routes, error: routeErr } = await supabase.from('routes').select('*').limit(2);
  const { data: stops, error: stopErr } = await supabase.from('stops').select('*').limit(2);

  if (shiftErr || routeErr || stopErr || !shifts?.length || !routes?.length || !stops?.length) {
    console.error('Failed to query transit data:', { shiftErr, routeErr, stopErr });
    process.exit(1);
  }

  const testShift = shifts[0];
  const testRoute = routes[0];
  const testStop = stops[0];

  console.log(`  -> Selected Shift: ${testShift.name} (${testShift.id})`);
  console.log(`  -> Selected Route: ${testRoute.name} (${testRoute.id})`);
  console.log(`  -> Selected Stop:  ${testStop.name} (${testStop.id})`);

  // 2. Prepare test student details
  const testEmail = 'pradhangle370125@kkwagh.edu.in';
  const testPassword = 'SecureStudentPassword2026!';
  const testPrn = 'PRN370125K';

  console.log(`\n[Step 2] Cleaning up any existing account for: ${testEmail}...`);
  // Remove existing test user if present to ensure clean state
  runDbQuery(`
    DO $$
    DECLARE
      v_uid UUID;
    BEGIN
      SELECT id INTO v_uid FROM auth.users WHERE email = '${testEmail}';
      IF v_uid IS NOT NULL THEN
        DELETE FROM public.student_transport WHERE student_id = v_uid;
        DELETE FROM public.students WHERE id = v_uid;
        DELETE FROM public.profiles WHERE id = v_uid;
        DELETE FROM auth.users WHERE id = v_uid;
      END IF;
    END;
    $$;
  `);

  // 3. Register the student via live Supabase Auth API
  console.log(`\n[Step 3] Submitting fresh student signup to Supabase Auth API...`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  PRN:   ${testPrn}`);
  console.log(`  Role:  student`);

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Prathamesh Dangle',
        phone: '+91 94220 37012',
        role: 'student',
        prn: testPrn,
        department: 'Computer Engineering',
        academic_year: 'TE',
        division: 'B',
        gender: 'male',
        shift_id: testShift.id,
        route_id: testRoute.id,
        pickup_stop_id: testStop.id,
        fee_receipt_path: 'std-370125/receipt.pdf',
        fee_receipt_name: 'receipt.pdf',
        fee_receipt_size: 204800,
        fee_receipt_type: 'application/pdf',
      },
    },
  });

  if (authErr) {
    console.error('❌ Supabase Auth Signup Failed:', authErr.message);
    process.exit(1);
  }

  const userId = authData?.user?.id;
  console.log(`✅ Supabase Auth signup SUCCEEDED! User ID: ${userId}`);
  console.log(`   Email Confirmed At: ${authData?.user?.email_confirmed_at ?? 'null (pending email verification)'}`);

  // 4. Verify all 3 records were created atomically by the trigger
  console.log(`\n[Step 4] Inspecting live database for all 3 student records...`);
  const dbCheck = runDbQuery(`
    SELECT json_build_object(
      'user', (SELECT row_to_json(u) FROM (SELECT id, email, created_at, raw_user_meta_data FROM auth.users WHERE id = '${userId}') u),
      'profile', (SELECT row_to_json(p) FROM (SELECT id, email, full_name, phone, role, status FROM public.profiles WHERE id = '${userId}') p),
      'student', (SELECT row_to_json(s) FROM (SELECT id, prn, department, academic_year, division, gender, approval_status FROM public.students WHERE id = '${userId}') s),
      'transport', (SELECT row_to_json(t) FROM (SELECT id, student_id, shift_id, route_id, pickup_stop_id, status FROM public.student_transport WHERE student_id = '${userId}') t)
    ) as result;
  `);

  const records = dbCheck?.rows?.[0]?.result;
  console.log('Database Inspection Results:');
  console.log('  1. profiles record:          ', records?.profile ? '✅ CREATED' : '❌ MISSING');
  console.log('     -> Name:', records?.profile?.full_name, '| Role:', records?.profile?.role, '| Status:', records?.profile?.status);

  console.log('  2. students record:          ', records?.student ? '✅ CREATED' : '❌ MISSING');
  console.log('     -> PRN:', records?.student?.prn, '| Dept:', records?.student?.department, '| Year:', records?.student?.academic_year, '| Status:', records?.student?.approval_status);

  console.log('  3. student_transport record: ', records?.transport ? '✅ CREATED' : '❌ MISSING');
  console.log('     -> Shift:', records?.transport?.shift_id, '| Route:', records?.transport?.route_id, '| Stop:', records?.transport?.pickup_stop_id, '| Status:', records?.transport?.status);

  if (!records?.profile || !records?.student || !records?.transport) {
    console.error('❌ One or more database records were not created by the trigger!');
    process.exit(1);
  }

  // 5. Verify no duplicate records created
  console.log(`\n[Step 5] Checking for record uniqueness...`);
  const dupCheck = runDbQuery(`
    SELECT 
      (SELECT count(*) FROM public.profiles WHERE id = '${userId}') as profile_count,
      (SELECT count(*) FROM public.students WHERE id = '${userId}') as student_count,
      (SELECT count(*) FROM public.student_transport WHERE student_id = '${userId}') as transport_count;
  `);
  const counts = dupCheck?.rows?.[0];
  console.log(`  profile_count: ${counts?.profile_count}, student_count: ${counts?.student_count}, transport_count: ${counts?.transport_count}`);
  if (counts?.profile_count === 1 && counts?.student_count === 1 && counts?.transport_count === 1) {
    console.log('✅ Exactly 1 atomic record exists in each table. No duplicates!');
  } else {
    console.error('❌ Duplicate records detected!');
    process.exit(1);
  }

  // 6. Verify Email Confirmation & Subsequent Student Login
  console.log(`\n[Step 6] Simulating email confirmation and student login...`);
  runDbQuery(`UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${userId}';`);

  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginErr || !loginData?.session) {
    console.error('❌ Student login failed:', loginErr?.message);
    process.exit(1);
  }

  console.log(`✅ Student login SUCCEEDED!`);
  console.log(`   Session Token issued: JWT ${loginData.session.access_token.substring(0, 20)}...`);

  // Query authenticated student profile with authenticated client
  const studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } },
  });

  const { data: myProfile, error: myProfErr } = await studentClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (myProfErr || !myProfile) {
    console.error('❌ Authenticated student profile fetch failed:', myProfErr?.message);
    process.exit(1);
  }
  console.log(`✅ Authenticated student can read own profile via RLS: ${myProfile.email} (${myProfile.status})`);

  // 7. Verify Admin visibility
  console.log(`\n[Step 7] Verifying Admin portal visibility for pending verification...`);
  const adminCheck = runDbQuery(`
    SELECT 
      p.id,
      p.full_name,
      p.email,
      p.status as profile_status,
      s.prn,
      s.department,
      s.academic_year,
      s.approval_status,
      st.status as transport_status,
      r.route_number,
      st_stop.name as pickup_stop_name
    FROM public.profiles p
    JOIN public.students s ON p.id = s.id
    JOIN public.student_transport st ON p.id = st.student_id
    JOIN public.routes r ON st.route_id = r.id
    JOIN public.stops st_stop ON st.pickup_stop_id = st_stop.id
    WHERE p.id = '${userId}';
  `);

  const adminView = adminCheck?.rows?.[0];
  if (adminView) {
    console.log('✅ Admin verification query succeeded:');
    console.log(`   Applicant:     ${adminView.full_name} (${adminView.email})`);
    console.log(`   PRN:           ${adminView.prn}`);
    console.log(`   Route:         ${adminView.route_number} | Stop: ${adminView.pickup_stop_name}`);
    console.log(`   Transport Status: ${adminView.transport_status} (Pending Admin Approval)`);
  } else {
    console.error('❌ Admin could not find the student in verification query!');
    process.exit(1);
  }

  console.log('\n=============================================================================');
  console.log('ALL VERIFICATIONS PASSED WITH 100% SUCCESS!');
  console.log('=============================================================================');
}

runVerification().catch((err) => {
  console.error('Unexpected error during verification:', err);
  process.exit(1);
});
