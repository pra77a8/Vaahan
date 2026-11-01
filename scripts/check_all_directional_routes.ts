import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function checkAllRoutes() {
  const { data: routes } = await supabase
    .from('routes')
    .select('id, route_number, name, shifts(name)')
    .order('route_number');

  for (const r of routes || []) {
    console.log(`\n======================================================`);
    console.log(`ROUTE: ${r.route_number} - ${r.name} (${(r.shifts as any)?.name}) [${r.id}]`);
    console.log(`======================================================`);

    const { data: toCollege } = await supabase
      .from('route_direction_stops')
      .select('sequence_number, stops(name)')
      .eq('route_id', r.id)
      .eq('direction', 'TO_COLLEGE')
      .order('sequence_number');

    console.log('  TO_COLLEGE:');
    for (const s of toCollege || []) {
      console.log(`    #${s.sequence_number}: ${(s.stops as any)?.name}`);
    }

    const { data: toHome } = await supabase
      .from('route_direction_stops')
      .select('sequence_number, stops(name)')
      .eq('route_id', r.id)
      .eq('direction', 'TO_HOME')
      .order('sequence_number');

    console.log('  TO_HOME:');
    for (const s of toHome || []) {
      console.log(`    #${s.sequence_number}: ${(s.stops as any)?.name}`);
    }
  }
}

checkAllRoutes();

