import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function check() {
  const { data: r1Morning } = await supabase
    .from('route_direction_stops')
    .select('direction, sequence_number, stops(name)')
    .eq('route_id', '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e')
    .order('direction')
    .order('sequence_number');
  
  console.log('Route 1 Morning route_direction_stops:');
  for (const row of r1Morning || []) {
    console.log(`  [${row.direction}] #${row.sequence_number}: ${(row.stops as any)?.name}`);
  }

  const { data: r1Stops } = await supabase
    .from('route_stops')
    .select('sequence_number, stops(name)')
    .eq('route_id', '71ef9ab8-1aec-479e-86f7-6bdeba5dd13e')
    .order('sequence_number');
  console.log('Route 1 Morning route_stops:');
  for (const row of r1Stops || []) {
    console.log(`  #${row.sequence_number}: ${(row.stops as any)?.name}`);
  }
}
check();

