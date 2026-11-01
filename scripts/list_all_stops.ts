import * as dotenv from 'dotenv';
dotenv.config();
import { supabase } from '../src/lib/supabase';

async function main() {
  const { data, error } = await supabase.from('stops').select('id, name, latitude, longitude').order('name');
  if (error) {
    console.error('Error fetching stops:', error);
    return;
  }
  console.log(`TOTAL STOPS: ${data?.length}`);
  data?.forEach(s => {
    console.log(`${s.name} [${s.id}] => (${s.latitude}, ${s.longitude})`);
  });
}

main();

