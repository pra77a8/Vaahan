import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testStartTrip() {
  console.log('Testing driver login and trip creation...');

  // 1. Sign in as driver
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'pranitadhangle908@gmail.com',
    password: 'password123',
  });

  if (authErr || !auth.user) {
    console.error('Failed to log in as driver:', authErr);
    return;
  }
  console.log('Logged in as driver:', auth.user.id, auth.user.email);

  // Check driver record
  const { data: driverRow, error: drvErr } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();
  console.log('Driver table row:', driverRow, drvErr);

  // Check buses
  const { data: buses, error: busErr } = await supabase.from('buses').select('*');
  console.log('Buses in DB:', buses?.length, busErr);

  // Check routes
  const { data: routes, error: routeErr } = await supabase.from('routes').select('*').limit(2);
  console.log('Routes in DB:', routes?.map(r => ({ id: r.id, num: r.route_number })), routeErr);

  // Check shifts
  const { data: shifts, error: shiftErr } = await supabase.from('shifts').select('*');
  console.log('Shifts in DB:', shifts?.map(s => ({ id: s.id, code: s.code })), shiftErr);

  // Check stops
  const { data: stops, error: stopErr } = await supabase.from('stops').select('*').limit(2);
  console.log('Stops in DB:', stops?.length, stopErr);

  if (!routes?.[0] || !buses?.[0] || !shifts?.[0]) {
    console.error('Missing prerequisites in database');
    return;
  }

  const tripId = crypto.randomUUID();
  const testPayload = {
    id: tripId,
    route_id: routes[0].id,
    driver_id: auth.user.id,
    bus_id: buses[0].id,
    shift_id: shifts[0].id,
    direction: 'TO_COLLEGE',
    trip_date: new Date().toISOString().slice(0, 10),
    mode: 'SIMULATION',
    remarks: 'Test script trip',
    assigned_student_count: 5,
    source_stop_id: stops?.[0]?.id || null,
    destination_stop_id: stops?.[1]?.id || null,
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString(),
    current_stop_index: 0,
  };

  console.log('\nAttempting direct trip insert with payload:', testPayload);
  const { data: insData, error: insErr } = await supabase.from('trips').insert(testPayload).select();
  if (insErr) {
    console.error('Direct Trip Insert FAILED:', insErr);
  } else {
    console.log('Direct Trip Insert SUCCESS:', insData);
    // Cleanup
    await supabase.from('trips').delete().eq('id', tripId);
  }

  console.log('\nAttempting RPC start_driver_trip...');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('start_driver_trip', {
    p_trip_id: tripId,
    p_route_id: routes[0].id,
    p_driver_id: auth.user.id,
    p_bus_id: buses[0].id,
    p_shift_id: shifts[0].id,
    p_direction: 'TO_COLLEGE',
    p_trip_date: new Date().toISOString().slice(0, 10),
    p_mode: 'SIMULATION',
    p_remarks: 'RPC test',
    p_source_stop_id: stops?.[0]?.id || null,
    p_destination_stop_id: stops?.[1]?.id || null,
    p_assigned_student_count: 5,
    p_trip_stops: [],
    p_initial_lat: stops?.[0]?.latitude || 19.99,
    p_initial_lng: stops?.[0]?.longitude || 73.78,
  });
  if (rpcErr) {
    console.error('RPC start_driver_trip FAILED:', rpcErr);
  } else {
    console.log('RPC start_driver_trip SUCCESS:', rpcData);
    await supabase.from('trips').delete().eq('id', tripId);
  }
}

testStartTrip().catch(console.error);

