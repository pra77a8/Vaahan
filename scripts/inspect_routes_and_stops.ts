import * as dotenv from 'dotenv';
dotenv.config();

import { supabase } from '../src/lib/supabase';

async function check() {
  const { data: routes, error: rErr } = await supabase
    .from('routes')
    .select('id, route_number, name, shift_id, shifts(code, name)')
    .order('route_number');
  console.log('ROUTES ERROR:', rErr);
  console.log('ROUTES COUNT:', routes?.length);
  if (routes) {
    for (const r of routes) {
      console.log(`Route: ${r.route_number} - ${r.name} (${(r.shifts as any)?.name}) [${r.id}]`);
    }
  }

  const { data: stops, error: sErr } = await supabase
    .from('stops')
    .select('id, name, latitude, longitude')
    .order('name');
  console.log('TOTAL STOPS IN DB:', stops?.length);

  const terminalNames = [
    'Jail Road',
    'Pune Road',
    'CIDCO',
    'College Road',
    'Gangapur Road',
    'K K Wagh Education Society'
  ];
  const foundTerminals = stops?.filter(s => terminalNames.includes(s.name)) || [];
  console.log('FOUND TERMINALS:', foundTerminals.map(s => `${s.name} (${s.latitude}, ${s.longitude})`));
  const missing = terminalNames.filter(t => !foundTerminals.some(f => f.name === t));
  console.log('MISSING TERMINALS:', missing);

  // Check route_direction_stops if it exists
  const { data: rds, error: rdsErr } = await supabase
    .from('route_direction_stops')
    .select('*');
  console.log('route_direction_stops table count:', rds?.length, 'error:', rdsErr?.message);

  // Check route_stops
  const { data: rs, error: rsErr } = await supabase
    .from('route_stops')
    .select('id, route_id, stop_id, sequence_number, stops(name)')
    .order('sequence_number');
  console.log('route_stops count:', rs?.length, 'error:', rsErr?.message);

  // Check student transport assignments
  const { data: st, error: stErr } = await supabase
    .from('student_transport')
    .select('id, student_id, route_id, pickup_stop_id, shift_id, status, routes(name), stops(name)');
  console.log('STUDENT TRANSPORT count:', st?.length);
  if (st) {
    for (const item of st) {
      console.log(`Student ${item.student_id}: Route: ${(item.routes as any)?.name}, Stop: ${(item.stops as any)?.name}, Status: ${item.status}`);
    }
  }
}

check();
