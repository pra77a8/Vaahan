import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';
import { fetchDirectionalRouteStops, OFFICIAL_ROUTES } from '../src/services/routeService';

async function main() {
  await supabase.auth.signInWithPassword({ email: 'pranitadhangle908@gmail.com', password: 'password123' });
  for (const r of OFFICIAL_ROUTES) {
    console.log(`=== ${r.name} (${r.shiftId}) ===`);
    const toCol = await fetchDirectionalRouteStops(r.id, 'TO_COLLEGE');
    console.log('TO_COLLEGE:');
    toCol.forEach(s => console.log(`  ${s.sequenceNumber}. ${s.stop.name}`));
    const toHome = await fetchDirectionalRouteStops(r.id, 'TO_HOME');
    console.log('TO_HOME:');
    toHome.forEach(s => console.log(`  ${s.sequenceNumber}. ${s.stop.name}`));
  }
}
main();

